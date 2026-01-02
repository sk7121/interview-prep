const mongoose = require("mongoose");

const practiceSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  filters: {
    difficulty: String,
    interviewType: String,
  },

  startedAt: {
    type: Date,
    default: Date.now
  },

  completedAt: {
    type: Date
  }

});

module.exports = mongoose.model("PracticeSession", practiceSessionSchema);
