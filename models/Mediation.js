import mongoose from 'mongoose';

const mediationSchema = new mongoose.Schema(
  {
    verdictId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Verdict',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    originalStory: { type: String, default: '' },
    softenedStory: { type: String, default: '' },

    accused: { type: String, default: '' },
    category: { type: String, default: '' },

    response: { type: String, default: '' },
    responseAt: { type: Date },

    settlementText: { type: String, default: '' },

    status: {
      type: String,
      enum: ['created', 'responded'],
      default: 'created',
    },

    viewCount: { type: Number, default: 0 },

    /** 行為紀錄（後台／除錯）：申請、開啟連結、答辯、下載等 */
    events: [
      {
        action: { type: String, required: true },
        at: { type: Date, default: () => new Date() },
        detail: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Mediation = mongoose.model('Mediation', mediationSchema);

export default Mediation;