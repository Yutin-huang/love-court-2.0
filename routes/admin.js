import express from 'express';
import Verdict from '../models/Verdict.js';

const router = express.Router();

router.get('/api/admin-data', async (req, res) => {
  try {
    const verdicts = await Verdict.find()
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    res.json(verdicts);
  } catch (err) {
    console.error('admin-data 讀取失敗', err);
    res.status(500).json({ error: '讀取資料失敗' });
  }
});

export default router;
