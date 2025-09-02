// src/models/index.js
import mongoose from 'mongoose';

const contestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
);

const participantSchema = new mongoose.Schema(
  {
    codeName: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    about: { type: String, required: true },
    photo: { type: String, default: null },
    contestId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Contest' },
    evicted: { type: Boolean, default: false },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vote', default: [] }], // Array of Vote references
  },
  { timestamps: true }
);

const voteSchema = new mongoose.Schema(
  {
    contestId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Contest' },
    participantId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Participant' },
    voteCount: { type: Number, required: true },
    voterName: { type: String, required: true },
    paymentReference: { type: String, default: null, unique: true, sparse: true },
  },
  { timestamps: true }
);

export const Contest = mongoose.model('Contest', contestSchema);
export const Participant = mongoose.model('Participant', participantSchema);
export const Vote = mongoose.model('Vote', voteSchema);