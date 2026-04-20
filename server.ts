import express from "express";
import { createServer as createViteServer } from "vite";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env if it exists
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Qwen Text Generation (Recipe)
  app.post("/api/generate-recipe", async (req, res) => {
    try {
      const { query } = req.body;
      const apiKey = process.env.QWEN_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "QWEN_API_KEY is not set" });
      }

      const systemPrompt = `你是一个专门为青少年和儿童设计的健康饮食营养师兼魔法厨师。
请根据用户的输入，生成一份健康、美味、有趣的菜谱，并包含营养分析。
必须严格返回合法的 JSON 格式对象，不要包含任何 markdown 标记（例如 \`\`\`json），不能有任何前言后语。严格返回如下 JSON 结构：
{
  "recipeName": "菜谱名称，尽量可爱有趣",
  "description": "菜谱的简单描述，吸引小朋友",
  "imageSeed": "一个简短的英文单词或词组，代表菜品的主体（例如 'fried rice'），用于后续生成美食图片",
  "ingredients": ["食材1", "食材2"],
  "steps": ["第一步", "第二步"],
  "nutrition": {
    "calories": "卡路里估算，如 '300千卡'",
    "protein": "蛋白质估算，如 '15克'",
    "fat": "脂肪估算，如 '10克'",
    "advice": "给小朋友的健康饮食建议"
  }
}`;

      const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "qwen-plus", // Using Qwen Plus for much faster and stable responses (avoids frontend timeout)
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `用户想吃或者有这些食材："${query}"` }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Qwen API Recipe Error:", errorText);
        return res.status(response.status).json({ error: `Qwen API Recipe Error: ${errorText}` });
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (content) {
        let jsonStr = content.trim();
        // Fallback to strip markdown if the model mistakenly included it
        if (jsonStr.startsWith("```json")) {
          jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/```$/, '').trim();
        } else if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```\n?/, '').replace(/```$/, '').trim();
        }
        res.json(JSON.parse(jsonStr));
      } else {
        res.status(500).json({ error: "No recipe generated in response" });
      }

    } catch (error: any) {
      console.error("Server Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for Qwen (Wanx) Image Generation - Step 1: Submit Task
  app.post("/api/generate-image/submit", async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.QWEN_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "QWEN_API_KEY is not set" });
      }

      const submitResponse = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-DashScope-Async": "enable"
        },
        body: JSON.stringify({
          model: "wanx-v1",
          input: { prompt },
          parameters: {
            style: "<photography>",
            size: "1024*1024",
            n: 1
          }
        })
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        return res.status(submitResponse.status).json({ error: `Qwen API Task Submit Error: ${errorText}` });
      }

      const submitData = await submitResponse.json();
      const taskId = submitData.output?.task_id;

      if (!taskId) {
         return res.status(500).json({ error: "Failed to get task ID from DashScope" });
      }

      res.json({ taskId });
    } catch (error: any) {
      console.error("Server Submit Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for Qwen (Wanx) Image Generation - Step 2: Check Status
  app.get("/api/generate-image/status", async (req, res) => {
    try {
      const { taskId } = req.query;
      const apiKey = process.env.QWEN_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "QWEN_API_KEY is not set" });
      }

      if (!taskId) {
        return res.status(400).json({ error: "Missing taskId" });
      }

      const pollResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
         method: "GET",
         headers: {
           "Authorization": `Bearer ${apiKey}`
         }
      });

      if (!pollResponse.ok) {
         const pollError = await pollResponse.text();
         return res.status(pollResponse.status).json({ error: `Polling error: ${pollError}` });
      }

      const pollData = await pollResponse.json();
      const taskStatus = pollData.output?.task_status;
      
      if (taskStatus === 'SUCCEEDED') {
         const resultData = pollData.output?.results;
         if (resultData && resultData.length > 0) {
           res.json({ status: 'SUCCEEDED', url: resultData[0].url });
         } else {
           res.json({ status: 'FAILED', error: "No image generated" });
         }
      } else if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
         res.json({ status: 'FAILED', error: `Task failed with status: ${taskStatus}` });
      } else {
         res.json({ status: taskStatus }); // PENDING or RUNNING
      }

    } catch (error: any) {
      console.error("Server Status Fetch Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
