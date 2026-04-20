import fetch from "node-fetch";

async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/generate-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "土豆" })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
test();
