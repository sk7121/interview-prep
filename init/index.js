// init/index.js

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("../models/user");
const Category = require("../models/category");
const Question = require("../models/Question");

const { categories, adminUser, questions } = require("./data");

// ✅ Correct MongoDB connection (NO deprecated options)
mongoose.connect("mongodb://127.0.0.1:27017/interview-prep");
  
const seedDatabase = async () => {
  try {
    console.log("🌱 Seeding database...");

    // Clear old data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Question.deleteMany({});

    // Create Admin
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    const admin = await User.create({
      ...adminUser,
      password: hashedPassword
    });

    console.log("✅ Admin created");

    // Insert Categories
    await Category.insertMany(categories);
    console.log("✅ Categories added");

    // Insert Questions
    const questionsWithAdmin = questions.map(q => ({
      ...q,
      createdBy: admin._id
    }));

    await Question.insertMany(questionsWithAdmin);
    console.log("✅ Questions added");

    console.log("🎉 Database seeded successfully!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
