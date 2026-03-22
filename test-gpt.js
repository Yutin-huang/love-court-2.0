import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

console.log("💡 環境變數載入：", process.env.OPENAI_API_KEY ? "✅ 有讀到 key" : "❌ 沒讀到 key");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  console.log("🚀 開始呼叫 GPT...");
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "你是誰？" }],
  });

  console.log("✅ GPT 回應：", completion.choices[0].message.content);
}

test().catch(err => {
  console.error("❌ GPT 測試失敗：", err.message);
  if (err.response) {
    console.error("Status:", err.response.status);
    console.error("Data:", err.response.data);
  } else {
    console.error("錯誤物件：", err);
  }
});
