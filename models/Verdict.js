import mongoose from 'mongoose';

/** LoveCourt 2.0：戀愛心事、可選控訴對象、分類（含「單身無罪」） */
const CATEGORY_VALUES = [
  '一般',
  '曖昧糾紛',
  '遠距與溝通',
  '單身無罪',
  '其他',
];

const verdictSchema = new mongoose.Schema(
  {
    /** 戀愛心事（主內容）；舊資料可能只有 complaint */
    story: { type: String, default: '' },
    complaint: { type: String, default: '' },
    /** 控訴對象，可空白 */
    accused: { type: String, default: '' },
    /** 案件分類 */
    category: {
      type: String,
      enum: CATEGORY_VALUES,
      default: '一般',
    },
    /** 心理測驗風格標籤（例如：你是「慢熱型戀人」） */
    psychTest: { type: String, default: '' },
    crime: { type: String, default: '' },
    suggestion: { type: String, default: '' },
    judgement: { type: String, default: '' },
    /** 完整 GPT 原文（除錯／日後改版） */
    rawVerdict: { type: String, default: '' },
    /** 判決當下推薦曲（供調停頁等沿用，與 API 回傳結構一致） */
    recommendedMusic: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
  }
);

const Verdict = mongoose.model('Verdict', verdictSchema);
export default Verdict;
export { CATEGORY_VALUES };
