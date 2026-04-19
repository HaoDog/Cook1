import fetch from "node-fetch";

async function testWanx() {
  const apiKey = "sk-7f817d20d19d489b90996a1c648f4865";
  console.log("Submitting task...");
  
  const submitRes = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-DashScope-Async": "enable"
    },
    body: JSON.stringify({
      model: "wanx-v1",
      input: { prompt: "A simple red apple" },
      parameters: { size: "1024*1024", n: 1 }
    })
  });

  const submitData = await submitRes.json();
  console.log("Submit Response:", JSON.stringify(submitData, null, 2));

  const taskId = submitData.output?.task_id;
  if (!taskId) return;

  console.log(`Polling task ${taskId}...`);
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const pollData = await pollRes.json();
    console.log("Poll Status:", pollData.output?.task_status);
    
    if (pollData.output?.task_status === 'SUCCEEDED' || pollData.output?.task_status === 'FAILED') {
      console.log("Final Polling Data:", JSON.stringify(pollData, null, 2));
      break;
    }
  }
}

testWanx();
