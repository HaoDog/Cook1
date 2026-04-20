export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { prompt } = req.body;
    const apiKey = process.env.QWEN_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "QWEN_API_KEY is not set in Vercel" });
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

    res.status(200).json({ taskId });
  } catch (error) {
    console.error("Vercel Submit Error:", error);
    res.status(500).json({ error: error.message });
  }
}
