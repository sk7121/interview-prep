// init/data.js

const categories = [
  // Difficulty
  { type: "difficulty", name: "Beginner" },
  { type: "difficulty", name: "Intermediate" },
  { type: "difficulty", name: "Advanced" },

  // Interview Type
  { type: "interviewType", name: "Technical" },
  { type: "interviewType", name: "Behavioral" },
  { type: "interviewType", name: "Managerial" },
  { type: "interviewType", name: "Case Study" },

  // Technologies
  { type: "technology", name: "C++" },
  { type: "technology", name: "DSA" },
  { type: "technology", name: "Web Development" },
  { type: "technology", name: "DBMS" },

  // Companies
  { type: "company", name: "Google" },
  { type: "company", name: "Amazon" },
  { type: "company", name: "TCS" }
];

const adminUser = {
  name: "Admin",
  email: "admin@example.com",
  password: "admin123",   // hash later
  role: "admin"
};

const questions = [
  {
    questionText: "What is the difference between let, var and const?",
    difficulty: "beginner",
    interviewType: ["technical"],
    companyTags: ["Google", "Amazon"],
    technologyTags: ["Web Development"],
    answerType: "text",
    correctAnswer: "var is function scoped, let and const are block scoped...",
    explanation: "let and const were introduced in ES6.",
  },
  {
    questionText: "Explain OOP concepts in C++.",
    difficulty: "intermediate",
    interviewType: ["technical"],
    companyTags: ["TCS"],
    technologyTags: ["C++"],
    answerType: "text",
    correctAnswer: "Encapsulation, Inheritance, Polymorphism, Abstraction",
    explanation: "These are the four pillars of OOP."
  }
];

module.exports = {
  categories,
  adminUser,
  questions
};
