const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: true
  },

  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PracticeSession",
    required: true
  },

  userAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  isCorrect: {
    type: Boolean,
    default: false
  },

  score: {
    type: Number,
    default: 0
  },

  evaluatedAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Submission", submissionSchema);
