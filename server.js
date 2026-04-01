import 'dotenv/config';

import express from 'express';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import verdictRouter from './verdict-gpt.js';
import mediationRouter from './routes/mediation.js';
import logRouter from './routes/log.js';
import adminRouter from './routes/admin.js';

// ✅ 初始化
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ 連接 MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ 已連接到 MongoDB'))
.catch((err) => console.error('❌ MongoDB 連接錯誤', err));

// ✅ 監控／健康檢查（放在 static 之前：純 server 回應、不受前端與靜態檔影響）
app.get('/health', (req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.get('/db-check', async (req, res) => {
  try {
    const readyState = mongoose.connection.readyState;
    if (readyState !== 1) {
      return res.status(503).json({
        ok: false,
        db: 'not_ready',
        readyState,
      });
    }
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err?.message || 'db ping failed',
    });
  }
});

// ✅ 中介層
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ✅ 路由設定
app.use('/api/verdict', verdictRouter); // AI 判決 API
app.use('/api/mediation', mediationRouter); // 調停 API
app.use('/', adminRouter);              // 管理資料 API
app.use('/', logRouter);                // 後台紀錄頁面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});