import express from 'express';
import crypto from 'crypto';
import { OpenAI } from 'openai';
import Verdict from '../models/Verdict.js';
import Mediation from '../models/Mediation.js';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function generateToken() {
  // 128-bit token is plenty for this MVP (hex => 32 chars).
  return crypto.randomBytes(16).toString('hex');
}

async function generateSoftenedStory({ category, accused, originalStory }) {
  const accusedText = accused?.trim() ? accused.trim() : '（未填）';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 350,
    messages: [
      {
        role: 'system',
        content:
          '你是 LoveCourt 的調停官，擅長把控訴改寫成更柔和、適合給對方看的版本。請保持核心事實，不要捏造新情節，不要做人身攻擊。',
      },
      {
        role: 'user',
        content: `【分類】${category || '一般'}\n【控訴對象】${accusedText}\n\n【原始控訴/戀愛心事】\n${originalStory}\n\n請把上面內容改寫成「較柔和、適合給對方看的版本」。\n要求：\n- 保留核心事實與具體行為（不得捏造）\n- 把指責語氣改成描述感受與需求\n- 避免羞辱、避免推測對方意圖\n- 用繁體中文\n- 只輸出改寫後內容（不要標題、不要解釋）。`,
      },
    ],
  });

  return completion.choices?.[0]?.message?.content?.trim() || '';
}

async function generateSettlementText({ softenedStory, response }) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.75,
    max_tokens: 500,
    messages: [
      {
      
          role: 'system',
          content:`你是 LoveCourt 的調停官。

          你的任務不是分析關係，而是幫助兩個人「願意再靠近一點」。
          請記住：
          很多衝突的背後，其實只是「在意的方式不同」。
          你要做到的不是平衡對錯，而是：
          
          讓人讀完之後，心會稍微變柔軟，
          願意為對方多做一點點，而不是覺得被要求。
          
          請特別做到：
          
          - 把指責轉成「其實是在在意」
          - 把立場轉成「其實在保護自己」
          - 不用抽象分析語言（避免：表達方式不同、需求差異）
          - 用人會說的話，而不是心理學報告
          - 讓句子有一點點溫度與餘韻
          
          語氣：
          
          - 溫柔
          - 真誠
          - 像一個真的理解愛的人
          
         ⚠️【輸出格式規則（必須嚴格遵守）】

你只能輸出以下五個區塊，且標題文字必須完全一致，不可更改：

【案件摘要】
（一句柔化的控訴，不要指責，以原告稱呼）

【雙方感受】
（用柔和理解的方式轉譯雙方感受以原告及被告稱呼）

【誤解核心】
（用一句人話說明卡住的地方，不可抽象）

【調停建議】
（提供具體、小且做得到的行動，不可使用「應該」）

【溫柔條款】
（2–3句，像提醒，也像祝福）

⚠️ 不可新增其他段落
⚠️ 不可省略任何段落
⚠️ 標題格式必須完整包含【】

最後一句需帶有情感收束（讓人有被理解的感覺）

請用繁體中文，只輸出內容，不要解釋。`,
      
      },
      {
        role: 'user',
        content: `【柔和控訴版本（給對方看的內容）】\n${softenedStory}\n\n【對方答辯】\n${response}\n\n請生成「戀愛和解書」。建議包含：\n- 我理解的重點（簡短）\n- 對彼此的感受/立場給予對齊（溫柔但不敷衍）\n- 我們可以怎麼約定/行動（具體、可執行）\n- 收尾承諾（短句即可）\n\n要求：用繁體中文；整體不要太長；只輸出和解書全文，不要附加說明。`,
      },
    ],
  });

  return completion.choices?.[0]?.message?.content?.trim() || '';
}

router.post('/create', async (req, res) => {
  try {
    const body = req.body || {};
    const verdictId = body.verdictId;

    if (!verdictId) {
      return res.status(400).json({ error: '缺少 verdictId' });
    }

    const verdict = await Verdict.findById(verdictId).exec();
    if (!verdict) {
      return res.status(404).json({ error: '找不到對應的 verdict' });
    }

    const originalStory = (verdict.story || verdict.complaint || '').trim();
    if (!originalStory) {
      return res.status(400).json({ error: '該 verdict 缺少戀愛心事內容' });
    }

    const category = verdict.category || '一般';
    const accused = verdict.accused || '';

    const softenedStory = await generateSoftenedStory({
      category,
      accused,
      originalStory,
    });

    let token = generateToken();
    for (let i = 0; i < 5; i += 1) {
      // Extremely unlikely to collide, but we keep it safe for MVP.
      // eslint-disable-next-line no-await-in-loop
      const exists = await Mediation.exists({ token });
      if (!exists) break;
      token = generateToken();
    }

    const mediation = new Mediation({
      verdictId,
      token,
      originalStory,
      softenedStory,
      accused,
      category,
      status: 'created',
    });

    await mediation.save();

    return res.status(200).json({
      token,
      link: `/?mediationToken=${token}`,
    });
  } catch (err) {
    console.error('Mediation create error:', err?.message || err);
    if (err.response) {
      console.error('GPT response status:', err.response.status);
      console.error('GPT response data:', err.response.data);
    }
    return res.status(500).json({ error: 'GPT 回應失敗' });
  }
});

router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params || {};
    if (!token) return res.status(400).json({ error: '缺少 token' });

    const mediation = await Mediation.findOne({ token }).exec();
    if (!mediation) return res.status(404).json({ error: '找不到該調停記錄' });

    return res.status(200).json({
      verdictId: mediation.verdictId?.toString?.() || mediation.verdictId,
      token: mediation.token,
      originalStory: mediation.originalStory,
      softenedStory: mediation.softenedStory,
      accused: mediation.accused,
      category: mediation.category,
      response: mediation.response,
      settlementText: mediation.settlementText,
      status: mediation.status,
      createdAt: mediation.createdAt,
      updatedAt: mediation.updatedAt,
    });
  } catch (err) {
    console.error('Mediation get error:', err?.message || err);
    return res.status(500).json({ error: '讀取調停失敗' });
  }
});

router.post('/:token/respond', async (req, res) => {
  try {
    const { token } = req.params || {};
    const body = req.body || {};
    const response = (body.response || '').trim();

    if (!token) return res.status(400).json({ error: '缺少 token' });
    if (!response) return res.status(400).json({ error: '缺少 response' });

    const mediation = await Mediation.findOne({ token }).exec();
    if (!mediation) return res.status(404).json({ error: '找不到該調停記錄' });
    if (mediation.status !== 'created') {
      return res.status(409).json({ error: '此調停已完成回覆' });
    }

    const settlementText = await generateSettlementText({
      softenedStory: mediation.softenedStory,
      response,
    });

    mediation.response = response;
    mediation.settlementText = settlementText;
    mediation.status = 'responded';

    await mediation.save();

    return res.status(200).json({
      token,
      status: mediation.status,
      settlementText,
    });
  } catch (err) {
    console.error('Mediation respond error:', err?.message || err);
    if (err.response) {
      console.error('GPT response status:', err.response.status);
      console.error('GPT response data:', err.response.data);
    }
    return res.status(500).json({ error: 'GPT 回應失敗' });
  }
});

export default router;

