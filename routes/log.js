// routes/log.js
import express from 'express';
import Verdict from '../models/Verdict.js'; // ⬅️ 注意路徑要從 routes 夾往上找

const router = express.Router();

router.get("/verdicts-log", async (req, res) => {
  try {
    const verdicts = await Verdict.find().sort({ createdAt: -1 }).limit(100); // 顯示最新100筆
    let html = `
      <html><head>
        <meta charset="UTF-8">
        <title>戀愛判決紀錄</title>
        <style>
          body { font-family: "Noto Sans TC", sans-serif; padding: 2em; background-color: #fff0f5; }
          h1 { color: #ff66cc; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px 12px; border: 1px solid #ccc; }
          th { background-color: #ffe0ec; }
          tr:nth-child(even) { background-color: #fff7fa; }
        </style>
      </head><body>
        <h1>💘 戀愛法庭判決紀錄</h1>
        <table>
          <tr>
            <th>時間</th>
            <th>控訴內容</th>
            <th>罪名</th>
            <th>建議</th>
            <th>判決</th>
          </tr>
    `;

    verdicts.forEach((v) => {
      html += `
        <tr>
          <td>${new Date(v.createdAt).toLocaleString("zh-TW")}</td>
          <td>${v.complaint}</td>
          <td>${v.crime}</td>
          <td>${v.suggestion}</td>
          <td>${v.judgement}</td>
        </tr>`;
    });

    html += "</table></body></html>";
    res.send(html);
  } catch (err) {
    res.status(500).send("⚠️ 後台資料讀取錯誤");
  }
});

export default router;
