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

// Render / 反向代理後取得正確協定與 IP（可選，利於日誌與安全中介層）
app.set('trust proxy', 1);

// ✅ 連接 MongoDB（較長逾時、適度連線池，減少 Atlas 瞬斷或冷啟時失敗）
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('❌ 缺少 MONGO_URI，請在 Render Environment 設定');
}

mongoose.set('strictQuery', true);

if (mongoUri) {
  mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 45_000,
      socketTimeoutMS: 120_000,
      maxPoolSize: 10,
      minPoolSize: 1,
    })
    .then(() => console.log('✅ 已連接到 MongoDB'))
    .catch((err) => console.error('❌ MongoDB 連接錯誤', err));
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB 連線中斷（將自動重連）');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB 連線錯誤', err?.message || err);
});

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
app.use(express.json({ limit: '1mb' }));

// ✅ 路由設定
app.use('/api/verdict', verdictRouter); // AI 判決 API
app.use('/api/mediation', mediationRouter); // 調停 API
app.use('/', adminRouter);              // 管理資料 API
app.use('/', logRouter);                // 後台紀錄頁面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ 集中處理未預期錯誤（避免回應掛死；Render 上也能從 log 追查）
app.use((err, req, res, next) => {
  console.error('❌ 未處理錯誤', err?.stack || err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: '伺服器錯誤' });
});

// ✅ 啟動伺服器
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ HTTP server error', err);
});

function shutdown(signal) {
  console.log(`收到 ${signal}，正在關閉…`);
  server.close((closeErr) => {
    if (closeErr) console.error('關閉 HTTP 時發生錯誤', closeErr);
    mongoose.connection
      .close(false)
      .then(() => {
        console.log('MongoDB 連線已關閉');
        process.exit(0);
      })
      .catch((e) => {
        console.error('關閉 MongoDB 時發生錯誤', e);
        process.exit(1);
      });
  });
  setTimeout(() => {
    console.error('強制結束（逾時）');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException', err);
  process.exit(1);
});