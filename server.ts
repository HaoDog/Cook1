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

  // API Route for Qwen (Wanx) Image Generation
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.QWEN_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "QWEN_API_KEY is not set" });
      }

      // Step 1: Submit the task
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
        console.error("Qwen API Task Submit Error:", errorText);
        return res.status(submitResponse.status).json({ error: `Qwen API Task Submit Error: ${errorText}` });
      }

      const submitData = await submitResponse.json();
      const taskId = submitData.output?.task_id;

      if (!taskId) {
         return res.status(500).json({ error: "Failed to get task ID from DashScope" });
      }

      // Step 2: Poll for completion
      let taskStatus = 'PENDING';
      let resultData: any = null;
      let pings = 0;

      while (taskStatus === 'PENDING' || taskStatus === 'RUNNING') {
        if (pings > 30) {
           throw new Error("Task timeout");
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2 seconds
        
        const pollResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
           method: "GET",
           headers: {
             "Authorization": `Bearer ${apiKey}`
           }
        });

        if (!pollResponse.ok) {
           const pollError = await pollResponse.text();
           throw new Error(`Polling error: ${pollError}`);
        }

        const pollData = await pollResponse.json();
        taskStatus = pollData.output?.task_status;
        
        if (taskStatus === 'SUCCEEDED') {
           resultData = pollData.output?.results;
           break;
        } else if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
           throw new Error(`Task failed with status: ${taskStatus}`);
        }
        pings++;
      }

      if (resultData && resultData.length > 0) {
        res.json({ url: resultData[0].url });
      } else {
        res.status(500).json({ error: "No image generated" });
      }

    } catch (error: any) {
      console.error("Server Error:", error);
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
