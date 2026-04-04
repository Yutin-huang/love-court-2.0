import { OpenAI } from 'openai';

/** 延遲建立：避免 import 階段就 new OpenAI，Render 上較穩 */
let cached = null;

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error('OPENAI_API_KEY missing');
  }
  if (!cached) {
    cached = new OpenAI({ apiKey: key });
  }
  return cached;
}
