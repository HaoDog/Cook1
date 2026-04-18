import fetch from "node-fetch";

async function test() {
  const apiKey = "sk-7f817d20d19d489b90996a1c648f4865";
  console.log("Testing DashScope Native API...");
  
  try {
    const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable"
      },
      body: JSON.stringify({
        model: "wanx-v1",
        input: {
          prompt: "A cute dog"
        },
        parameters: {
          style: "<photography>",
          size: "1024*1024",
          n: 1
        }
      })
    });

    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
  } catch (e) {
    console.error(e);
  }
}

test();
