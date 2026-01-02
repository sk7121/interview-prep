const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PracticeSession",
    required: true
  },

  totalQuestions: {
    type: Number,
    required: true
  },

  correctAnswers: {
    type: Number,
    required: true
  },

  wrongAnswers: {
    type: Number,
    required: true
  },

  scorePercentage: {
    type: Number,
    required: true
  },

  feedback: {
    type: String
  }

}, { timestamps: true });

module.exports = mongoose.model("Result", resultSchema);
