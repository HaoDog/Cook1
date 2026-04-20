export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { query } = req.body;
    const apiKey = process.env.QWEN_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "QWEN_API_KEY is not set in Vercel Environment Variables" });
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
        model: "qwen-plus", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `用户想吃或者有这些食材："${query}"` }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Qwen API Recipe Error: ${errorText}` });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (content) {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/```$/, '').trim();
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```\n?/, '').replace(/```$/, '').trim();
      }
      res.status(200).json(JSON.parse(jsonStr));
    } else {
      res.status(500).json({ error: "No recipe generated in response" });
    }

  } catch (error) {
    console.error("Vercel Serverless Error:", error);
    res.status(500).json({ error: error.message });
  }
}
