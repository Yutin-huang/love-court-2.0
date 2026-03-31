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
  },
  {
    timestamps: true,
  }
);

const Mediation = mongoose.model('Mediation', mediationSchema);

export default Mediation;