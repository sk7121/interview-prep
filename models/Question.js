const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const questionSchema = new Schema({
    questionText: {
        type: String,
        required: true,
    },
    difficulty: {
        type: String,
        required: true,
        enum: ["beginner", "intermediate", "advanced"],
    },
    interviewType: [{
        type: String,
        enum: ["technical", "behavioral", "managerial", "case-study"]
    }],
    companyTags: [{
        type: String,
    }],
    technologyTags: [{
        type: String,
    }],
    answerType: {
        type: String,
        enum: ["mcq", "text", "code"],
        required: true,
    },
    optionA: {
        type: String,
    },
    optionB: {
        type: String,
    },
    optionC: {
        type: String,
    },
    optionD: {
        type: String,
    },

    correctAnswer: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    explanation: {
        type: String,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);