import mongoose from 'mongoose';

const verdictSchema = new mongoose.Schema({
  complaint: String,
  crime: String,
  suggestion: String,
  judgement: String,
}, {
  timestamps: true  // ✅ 自動加 createdAt / updatedAt
});

const Verdict = mongoose.model("Verdict", verdictSchema);
export default Verdict;
