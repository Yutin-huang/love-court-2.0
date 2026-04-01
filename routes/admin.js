import express from 'express';
import Verdict from '../models/Verdict.js';
import Mediation from '../models/Mediation.js';

const router = express.Router();

router.get('/api/admin-data', async (req, res) => {
  try {
    const verdicts = await Verdict.find()
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    const verdictIds = verdicts.map((v) => v._id);
    const mediations = await Mediation.find({ verdictId: { $in: verdictIds } })
      .sort({ createdAt: -1 })
      .lean();

    const latestMediationByVerdict = new Map();
    for (const m of mediations) {
      const key = m.verdictId.toString();
      if (!latestMediationByVerdict.has(key)) {
        latestMediationByVerdict.set(key, m);
      }
    }

    const enriched = verdicts.map((v) => {
      const m = latestMediationByVerdict.get(v._id.toString()) || null;
      return { ...v, mediation: m };
    });

    res.json(enriched);
  } catch (err) {
    console.error('admin-data 讀取失敗', err);
    res.status(500).json({ error: '讀取資料失敗' });
  }
});

export default router;
