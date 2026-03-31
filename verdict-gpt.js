import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import { fileURLToPath } from 'url';
import Verdict, { CATEGORY_VALUES } from './models/Verdict.js';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const CASE_TYPES = [
  '人生方向',
  '安全感',
  '過去回憶與心碎',
  '戀愛進行式與鬥嘴',
];

const CASE_TYPE_TO_FOLDER = {
  '人生方向': '人生方向',
  '安全感': '安全感',
  '過去回憶與心碎': '過去回憶／心碎',
  '戀愛進行式與鬥嘴': '戀愛進行式:情侶鬥嘴',
};

const LISTEN_NOW_URL = 'https://linktr.ee/Yutin_Huang';

/** 依 public 內音檔檔名（去副檔名）對應指定 Spotify 單曲連結 */
const SPOTIFY_TRACK_URLS = {
  小說: 'https://open.spotify.com/track/5UIpEUlQp7NMs3v7rAik5S?si=e2ac48793b5a4fb9',
  日常: 'https://open.spotify.com/track/7bmcfTEqrgEzDLp3rMvo9O?si=136a6fa2bf274dd4',
  藍色氣球: 'https://open.spotify.com/track/0tlMp1uzbEdX2Vn37rHkFR?si=98e268fc99b64c72',
  罪魁禍首: 'https://open.spotify.com/track/6twHeiShRAwbQ9HHU4Uthc?si=97c640ed39044524',
  單單: 'https://open.spotify.com/track/1yN6inJZPHw0REmJCafYCe?si=d79f4c4b56354c43',
  'safe place': 'https://open.spotify.com/track/4HlDLM6yrlY6ZaGaNthH9g?si=89e185f53afd4def',
};

function normalizeSongStem(audioFile) {
  return audioFile
    .replace(/\.[a-z0-9]+$/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function spotifyUrlForAudioFile(audioFile) {
  const stem = normalizeSongStem(audioFile);
  if (SPOTIFY_TRACK_URLS[stem]) return SPOTIFY_TRACK_URLS[stem];
  if (stem.startsWith('safe place')) return SPOTIFY_TRACK_URLS['safe place'];
  return null;
}

function buildSystemPrompt(category, accused) {
  const accusedLine = accused?.trim()
    ? `使用者填寫的「控訴對象」：${accused.trim()}（請在判決中適度帶入，可暱稱化）。`
    : '使用者未填寫控訴對象：請不要捏造具名人物；若需要「被告／對方」，請用「對方」「曖昧對象」等通稱，或把重點放在當事人自己的心情與行動。';

  const categoryBlock =
    category === '單身無罪'
      ? `本案分類為「單身無罪」：請以幽默、肯定單身／自我認同為主，不要強迫配對戀愛；被告意象可改為「孤獨小惡魔」「戀愛市場」等玩笑，避免羞辱單身。`
      : `本案分類為「${category}」：請依分類調整比喻與建議，仍維持法庭口吻與心理測驗趣味。`;

  return `你是 LoveCourt 戀愛法庭的法官，同時也是一位「溫柔但誠實的戀愛教練」。

你的任務不是給戀愛語錄，而是：
👉 先理解真實情境，再做有幫助的判決。

——————————————

📌 Step 1：理解情境（最重要）

在回應前，請先判斷：

* 使用者在意的核心是什麼？
  （例如：安全感、被重視、被忽略、溝通落差、界線）

* 對方「具體做了什麼行為」？

* 這個行為讓使用者產生什麼感受？

❗所有輸出都必須圍繞這個核心
❗禁止自行腦補不存在的情節

——————————————

📌 Step 1.5：場景鎖定（關鍵）

如果這是一個「具體生活場景」（例如：走路、聊天、回訊息、約會）：

請務必：

* 明確指出該行為本身的問題
* 所有裁定與建議都要回到這個場景

❗禁止抽象化（例如：人生、節奏、成長）
❗禁止離開原情境

例：
走在馬路上沒讓內側 → 要討論「安全感與行為」
不是「人生步調」

——————————————

📌 Step 2：裁定（必須準確）

裁定必須：

* 直接對應行為本質
* 用具體描述

✅ 正確：

* 忽略伴侶安全感
* 缺乏基本體貼
* 溝通失衡

❌ 禁止：

* 曖昧症
* 愛情問題
* 空泛標籤

——————————————

📌 Step 3：建議（核心升級版）

建議必須提供「能被對方接受的溝通方式」，而不是只有一句話。

請同時包含：

1️⃣ 怎麼說（語氣與句子）
2️⃣ 什麼時候說（時機）
3️⃣ 如果對方沒反應，可以怎麼做（備案）

——————————————

請依情境判斷溝通難度：

🟢 願意溝通型
→ 給直接但溫和的說法

🟡 普通型（可能不太敏感）
→ 用「描述感受 + 輕需求」方式

🔴 不太在意型
→ 給「界線 + 觀察策略」

——————————————

✅ 建議範例結構：

* 語氣：不要指責，以第三方的角色表達
* 句子：一句可直接說的話
* 時機：建議在什麼情境說（例如：不是當下吵架時）
* 備案：如果對方沒改，下一步怎麼做


——————————————

❗禁止：

* 空泛建議（對自己好一點、順其自然）
* 沒有具體行動
* 沒有考慮對方個性

——————————————

❗所有建議必須：

👉 回到原始情境
👉 能實際使用
👉 目標是「讓對方更容易理解，而不是只是表達自己」


——————————————

📌 Step 4：語氣風格

* 心理測驗 + 法庭宣判
* 可幽默，但不能失焦
* 有溫度，但要誠實
* 不逃避問題

——————————————

📌 輸出格式（嚴格遵守）

只能五行，不可多段：

心理測驗結果：[10–20字，貼近情境]

裁定：[一句點出問題本質]

建議：[具體可執行（可含對話或行動）]

判決：[法庭式收尾，可微幽默但要合理]

案件類型：只填入其中一個文字（人生方向/安全感/過去回憶與心碎/戀愛進行式與鬥嘴）

——————————————

📌 格式限制

* 使用繁體中文
* 總長約 120–220 字
* 不要解釋
* 不要提問
* 不要多段落

——————————————

📌 category 補充

若分類為「單身無罪」：

* 不強迫戀愛
* 以自我理解為主
* 仍需提出具體觀點（不能只是安慰）

——————————————

📌 控訴對象

若有提供：

* 自然帶入（他 / 她 / 對方）
* 增加真實感
* 不可捏造細節

——————————————

📌 最重要原則

❗所有內容必須「回到使用者描述的具體情境」
❗建議必須「可以在現實中使用」
❗禁止生成抽象或無關內容

請直接進行判決，不需詢問補充資訊。


${categoryBlock}
${accusedLine}

請先給一句「心理測驗式」標籤（像測驗題結果），再給戀愛法庭的裁定。整體像：測出你是哪一型戀人／心態，再由法官半開玩笑地下判決。

輸出必須嚴格使用以下五行格式（不要多段解說、不要編號以外的段落）：
心理測驗結果：「（一句，20 字內，像測驗結果標題）」
裁定：【（趣味罪名或榮譽頭銜，8～16 字）】
建議：「（療癒＋具體小行動，一句）」
判決：本庭裁定：「（一句，可含輕微懲罰感或自我疼愛任務，一句）」
案件類型：【只能填入一個選項文字（不要包含其他選項）人生方向/安全感/過去回憶與心碎/戀愛進行式與鬥嘴】

使用繁體中文；總長度約 120～220 字；避免髒話與真實仇恨言論。`;
}

function parseVerdictText(verdictText) {
  const psychTest =
    verdictText.match(/心理測驗結果：「([\s\S]+?)」/)?.[1]?.trim() || '';
  const crime = verdictText.match(/裁定：【([\s\S]+?)】/)?.[1]?.trim() || '';
  const suggestion =
    verdictText.match(/建議：「([\s\S]+?)」/)?.[1]?.trim() || '';
  const judgement =
    verdictText.match(/判決：本庭裁定：「([\s\S]+?)」/)?.[1]?.trim() || '';

  const caseTypeRaw =
    verdictText.match(/案件類型：\s*【([\s\S]+?)】/)?.[1]?.trim() || '';

  const caseType = (() => {
    if (!caseTypeRaw) return '';
    for (const t of CASE_TYPES) {
      if (caseTypeRaw.includes(t)) return t;
    }
    return '';
  })();

  return { psychTest, crime, suggestion, judgement, caseType };
}

function pickRandom(arr) {
  if (!arr?.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function inferCaseTypeFromText(text) {
  const content = (text || '').toLowerCase();
  if (!content) return '';

  // User requested these scenarios to always map to 罪魁禍首 (戀愛進行式與鬥嘴)
  if (
    /(曖昧|現任|男友|女友|戀愛中|小抱怨|打情罵俏|鬥嘴|吵嘴|拌嘴)/.test(content)
  ) {
    return '戀愛進行式與鬥嘴';
  }

  if (/(安全感|不安|焦慮|忽冷忽熱|已讀|未讀|回覆|回訊息|在不在乎)/.test(content)) {
    return '安全感';
  }

  if (/(前任|分手|失戀|心碎|回憶|放不下|過去)/.test(content)) {
    return '過去回憶與心碎';
  }

  if (/(人生|方向|夢想|工作|目標|未來|選擇)/.test(content)) {
    return '人生方向';
  }

  return '';
}

function pickCoverForAudio(audioFile, coverFiles) {
  if (!audioFile || !coverFiles?.length) return null;
  const stem = audioFile.replace(/\.[a-z0-9]+$/i, '').trim().toLowerCase();
  const exact = coverFiles.find(
    (f) => f.replace(/\.[a-z0-9]+$/i, '').trim().toLowerCase() === stem
  );
  return exact || pickRandom(coverFiles);
}

function listFolderMedia(folderName) {
  const folderPath = path.join(publicDir, folderName);
  let entries = [];
  try {
    entries = fs.readdirSync(folderPath);
  } catch {
    return { audioFiles: [], coverFiles: [] };
  }
  return {
    audioFiles: entries.filter((f) => /\.(wav|mp3|ogg|m4a|flac)$/i.test(f)),
    coverFiles: entries.filter((f) => /\.(png|jpe?g|webp)$/i.test(f)),
  };
}

function buildMusicPayload(folderName, caseType, audioFile, coverFile) {
  if (!audioFile || !coverFile) return null;
  const songTitle = audioFile.replace(/\.[a-z0-9]+$/i, '').trim();
  const spotifyUrl = spotifyUrlForAudioFile(audioFile);
  return {
    caseType,
    songTitle,
    artistName: '黃于庭',
    streamQuery: `${songTitle} 黃于庭`,
    spotifyUrl,
    audioUrl: `/${encodeURIComponent(folderName)}/${encodeURIComponent(audioFile)}`,
    coverUrl: `/${encodeURIComponent(folderName)}/${encodeURIComponent(coverFile)}`,
    listenUrl: LISTEN_NOW_URL,
  };
}

function pickRecommendedMusic(caseType, textForFallback) {
  const content = (textForFallback || '').toLowerCase();
  const forceBoyfriendToKuikui = /(男友|男朋友|現任|另一半)/.test(content);
  const inferredType = inferCaseTypeFromText(textForFallback);
  const normalizedType =
    (forceBoyfriendToKuikui && '戀愛進行式與鬥嘴') ||
    CASE_TYPES.find((t) => caseType?.includes?.(t)) ||
    inferredType ||
    '';

  // 1) Try normalized/inferred folder first
  if (normalizedType) {
    const folderName = CASE_TYPE_TO_FOLDER[normalizedType];
    if (folderName) {
      const { audioFiles, coverFiles } = listFolderMedia(folderName);
      const audioFile =
        forceBoyfriendToKuikui && normalizedType === '戀愛進行式與鬥嘴'
          ? audioFiles.find((f) => /罪魁禍首/i.test(f)) || pickRandom(audioFiles)
          : pickRandom(audioFiles);
      const coverFile = pickCoverForAudio(audioFile, coverFiles);
      const payload = buildMusicPayload(
        folderName,
        normalizedType,
        audioFile,
        coverFile
      );
      if (payload) return payload;
    }
  }

  // 2) Hard fallback: always return something if any folder has media
  for (const type of CASE_TYPES) {
    const folderName = CASE_TYPE_TO_FOLDER[type];
    const { audioFiles, coverFiles } = listFolderMedia(folderName);
    const audioFile = pickRandom(audioFiles);
    const coverFile = pickCoverForAudio(audioFile, coverFiles);
    const payload = buildMusicPayload(folderName, type, audioFile, coverFile);
    if (payload) return payload;
  }

  return null;
}

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const story = (body.story ?? body.complaint ?? '').trim();
    const accused = (body.accused ?? '').trim();
    let category = (body.category ?? '一般').trim();

    if (!CATEGORY_VALUES.includes(category)) {
      category = '一般';
    }

    if (!story) {
      return res.status(400).json({ error: '缺少戀愛心事（story 或 complaint）' });
    }

    const userContent = `【分類】${category}
【控訴對象】${accused || '（未填）'}

戀愛心事：
${story}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildSystemPrompt(category, accused) },
        { role: 'user', content: userContent },
      ],
      temperature: 0.85,
      max_tokens: 400,
    });

    const verdictText = completion.choices?.[0]?.message?.content?.trim() || '';
    const { psychTest, crime, suggestion, judgement, caseType } =
      parseVerdictText(verdictText);

    const newVerdict = new Verdict({
      story,
      complaint: story,
      accused,
      category,
      psychTest,
      crime,
      suggestion,
      judgement,
      rawVerdict: verdictText,
    });
    await newVerdict.save();

    const recommendedMusic = pickRecommendedMusic(
      caseType,
      `${story}\n${accused}\n${verdictText}`
    );

    res.status(200).json({
      verdictId: newVerdict._id.toString(),
      verdict: verdictText,
      psychTest,
      crime,
      suggestion,
      judgement,
      category,
      accused,
      caseType,
      recommendedMusic,
    });
  } catch (err) {
    console.error('GPT 錯誤：', err.message);
    if (err.response) {
      console.error('GPT response status:', err.response.status);
      console.error('GPT response data:', err.response.data);
    }
    res.status(500).json({ error: 'GPT 回應失敗' });
  }
});

export default router;
