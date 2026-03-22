// ✅ ES Module 語法
import 'dotenv/config';
console.log("KEY:", process.env.OPENAI_API_KEY);
import 'dotenv/config';
import express from 'express';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import verdictRouter from './verdict-gpt.js';
import logRouter from './routes/log.js';

// ✅ 初始化
dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ 連接 MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ 已連接到 MongoDB'))
.catch((err) => console.error('❌ MongoDB 連接錯誤', err));

// ✅ 中介層
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ✅ 路由設定
app.use('/api/verdict', verdictRouter); // AI 判決 API
app.use('/', logRouter);                // 後台紀錄頁面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

