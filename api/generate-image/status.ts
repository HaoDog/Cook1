export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { taskId } = req.query;
    const apiKey = process.env.QWEN_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "QWEN_API_KEY is not set in Vercel" });
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
         res.status(200).json({ status: 'SUCCEEDED', url: resultData[0].url });
       } else {
         res.status(200).json({ status: 'FAILED', error: "No image generated" });
       }
    } else if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
       res.status(200).json({ status: 'FAILED', error: `Task failed with status: ${taskStatus}` });
    } else {
       res.status(200).json({ status: taskStatus }); 
    }

  } catch (error) {
    console.error("Vercel Status Fetch Error:", error);
    res.status(500).json({ error: error.message });
  }
}
