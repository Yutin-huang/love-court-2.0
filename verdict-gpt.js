import 'dotenv/config';
import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import Verdict from "./models/Verdict.js"; // ✅ ES module 匯入模型

dotenv.config();

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { complaint } = req.body;

    if (!complaint) {
      return res.status(400).json({ error: "缺少控訴內容" });
    }

    const prompt = `你是一位戀愛法官，請根據使用者的控訴內容給出戀愛罪名，給予如心理諮商師般的建議，帶有輕微處罰性質的判決。請記得被判決對象都是「對方」。請使用以下格式回覆：

被告被起訴為【罪名】
建議：「」
判決：本庭判定被告需「判決內容」
請使用繁體中文回答，總字數不超過 100 字，語氣溫柔中帶點俏皮懲罰感。`;


    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: complaint },
      ],
      temperature: 0.9,
      max_tokens: 100,
    });

    const verdictText = completion.choices?.[0]?.message?.content || "";

    // ✅ 使用正規表達式抓出三段文字
    const crime = verdictText.match(/被告被起訴為【(.+?)】/)?.[1] || "";
    const suggestion = verdictText.match(/建議：「(.+?)」/)?.[1] || "";
    const judgement = verdictText.match(/判決：本庭判定被告需「(.+?)」/)?.[1] || "";

    // ✅ 儲存進資料庫
    const newVerdict = new Verdict({
      complaint,
      crime,
      suggestion,
      judgement
    });
    await newVerdict.save();

    // ✅ 回傳給前端
    res.status(200).json({ verdict: verdictText, crime, suggestion, judgement });
  } catch (err) {
    console.error("GPT 錯誤：", err.message);

    if (err.response) {
      console.error("GPT response status:", err.response.status);
      console.error("GPT response data:", err.response.data);
    }

    res.status(500).json({ error: "GPT 回應失敗" });
  }
});

export default router;
