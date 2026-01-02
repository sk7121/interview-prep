// app.js
const express = require("express");
const app = express();
require('dotenv').config();

// for password hashing
const bcrypt = require("bcrypt");
const User = require("./models/user");
const Question = require("./models/Question");
const Category = require("./models/category");
const PracticeSession = require("./models/PracticeSession");
const Submission = require("./models/Submission");
const Result = require("./models/Result");


// express body parser middleware
app.use(express.urlencoded({extended:true}));
app.use(express.json());


// ejs view engine setup
const path = require("path");
const ejsMate = require("ejs-mate");
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "views"));



// mongoose setup
const mongoose = require("mongoose");

const port = 8080;
const MONGO_URL = process.env.ATLASDB_URL;

mongoose.connect(MONGO_URL)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch(err => {
        console.log("Error connecting to MongoDB:", err);
    })




// Login Page Route
app.get("/", (req, res) => {
    res.render("login.ejs");
});

// Query Page Route
app.get("/queryPage", (req, res) => {
    res.render("queryPage.ejs");
});

// signup Page Route
app.get("/signup", (req, res) => {
    res.render("sign-up.ejs");
});

// Admin Login Page Route
app.get("/admin-login", (req, res) => {
    res.render("admin-login.ejs");
});


// show Questions Page Route
app.get("/show-questions", async (req, res) => {
    const questions = await Question.find({});
    return res.render("show-questions.ejs",{questions});
});

// Add Question Page Route
app.get("/add-question", (req, res) => {
    res.render("add-question.ejs");
});

// Home Page Route
app.post ("/home", async(req, res) => {
    const UserDetails = req.body;
    return res.render("home.ejs", {UserDetails});
});


// back to login panel page
app.get("/back-to-admin-panel", (req, res) => {
    res.render("admin-home.ejs");
});

// Delete Question Route
app.get("/delete/question/:id", async (req, res) => {
    const { id } = req.params;
    await Question.findByIdAndDelete(id);
    return res.redirect("/show-questions");
});


// quiz page route
app.get("/take-quiz", async (req, res) => {
    const questions = await Question.find({});
    res.render("take-quiz.ejs", { questions});
});

// query page route
app.get("/query-page/:id", async(req, res) => {
    const {id} = req.params;
    res.render("query-page.ejs",{id});
});

// redirect user home page route
app.get("/user-login/:userId",async(req,res)=>{
  const userId = req.params.userId.replace(/^:/, '');
  const UserDetails = await User.findById(userId);
  if (!UserDetails) {
    return res.status(404).send("User not found");
  }
  return res.render("user-home.ejs",{UserDetails});
});

// view scores
app.get("/view-scores/:userId",async(req,res)=>{
  const {userId} = req.params;
  const results = await Result.find({userId});
  return res.render("show-results.ejs",{results,userId});
});


// expand question route
app.get("/quiz/question/:questionId/:practiceSessionId",async (req,res)=>{
    const {questionId,practiceSessionId} = req.params;

    const question = await Question.findOne({_id:questionId});
    const practiceSession = await PracticeSession.findOne({_id:practiceSessionId});

    if(!question|| !practiceSession){
      return res.status(404).send("Question or Practice Session not found");
    }
    return res.render("quiz-question.ejs",{question,practiceSession});
});

// redirect take-quiz route
app.get("/take-quiz/:practiceSessionId", async (req, res) => {
  const { practiceSessionId } = req.params;

  const practiceSession = await PracticeSession.findById(practiceSessionId);
  if(!practiceSession){
    return res.send("session not found!");
  }

  const filteredQuestions = await Question.find({
    difficulty: practiceSession.filters.difficulty,
    interviewType: practiceSession.filters.interviewType
  });

  const submissions = await Submission.find(
    { sessionId: practiceSessionId },
    "questionId"
  );

  const submittedQuestionIds = new Set(
    submissions.map(s => s.questionId.toString())
  );

  res.render("take-quiz.ejs", {
    questions: filteredQuestions,
    practiceSession,
    submittedQuestionIds
  });
});


// submit quiz route
app.get("/submit/quiz/:practiceSessionId", async(req,res)=>{
  try{
    const {practiceSessionId} = req.params;

    const practiceSession = await PracticeSession.findById(practiceSessionId);

    if(!practiceSession){
      return res.status(404).send("Practice session not found!");
    }


    const questions = await Question.find({
      difficulty: practiceSession.filters.difficulty,
      interviewType: practiceSession.filters.interviewType
    });


    const questionIds = questions.map(q => q._id);

    const submissions = await Submission.find({
      questionId:{$in:questionIds},
      sessionId: practiceSessionId
    });



    const no_of_correct_ans = submissions.reduce((count, s) => count + (s.isCorrect? 1 : 0),0);
    const no_of_wrong_ans = submissions.length - no_of_correct_ans;
    const score_percent = (no_of_correct_ans/submissions.length)*100;

    const result = new Result({
      userId: practiceSession.userId,
      sessionId: practiceSessionId,
      totalQuestions: submissions.length,
      correctAnswers: no_of_correct_ans,
      wrongAnswers: no_of_wrong_ans,
      scorePercentage: score_percent,
    });

    await result.save();

    return res.redirect(`/user-login/${practiceSession.userId}`);
  }catch(error){
    console.error(error);
    res.status(500).send("Server error");
  }
});


// Admin Home Page Route
app.post("/admin/home", async (req, res) => {
  try {
    const { "admin-email": email, "admin-password": password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Email and password are required");
    }

    const admin = await User.findOne({ email });

    if (!admin) {
      return res.status(401).send("Invalid credentials");
    }

    const isMatch = await password === admin.password;

    if (!isMatch) {
      return res.status(401).send("Invalid credentials");
    }

    if (admin.role !== "admin") {
      return res.status(403).send("Access denied. Admin only.");
    }

    return res.render("admin-home.ejs", {
      AdminDetails: admin
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});


// create Question Route
app.post("/admin/add-question", async (req, res) => {
  try {
    const {
      questionText,
      difficulty,
      interviewType,
      companyTags,
      technologyTags,
      answerType,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation
    } = req.body;

    const admin = await User.findOne({ email: "admin@example.com" });

    if (!admin || admin.role !== "admin") {
      return res.status(403).send("Unauthorized");
    }

    const question = new Question({
      questionText,
      difficulty,
      interviewType,
      companyTags,
      technologyTags,
      answerType,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      createdBy: admin._id
    });

    await question.save();
    res.redirect("/show-questions");

  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).send("Error adding question");
  }
});


// user sign-up route
app.post("/sign-up", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send("User already exists");
        }

        const newUser = new User({
            name,
            email,
            password
        });

        await newUser.save();
        res.redirect("/");
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).send("Error creating user");
    }
});


// user login route
app.post("/user-login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).send("Invalid credentials");
        }

        const isMatch = await password === user.password;

        if (!isMatch) {
            return res.status(401).send("Invalid credentials");
        }

        return res.render("user-home.ejs", {
            UserDetails: user
        });
    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).send("Error logging in user");
    }
});

// query post route
app.post("/query-page/query/:id", async (req, res) => {
    const {id} = req.params;
    const UserDetails = req.body;
    const filteredQuestions = await Question.find({
        difficulty: UserDetails.difficulty,
        interviewType: UserDetails.interviewType,
    });

    const practiceSession = new PracticeSession({
        userId:id,
        filters:{
            difficulty:UserDetails.difficulty,
            interviewType:UserDetails.interviewType,
        },
    });
    await practiceSession.save();

    const submittedQuestionIds = new Set();

    return res.render("take-quiz.ejs",{questions:filteredQuestions,practiceSession,submittedQuestionIds});
});

// user answer post route
app.post("/submit/question/:questionId/:practiceSessionId", async(req,res)=>{
    const {questionId,practiceSessionId} = req.params;
    const ans = req.body;


    const question = await Question.findOne({_id:questionId});
    const practiceSession = await PracticeSession.findOne({_id:practiceSessionId});

    const is_correct = question.correctAnswer===ans.correctAnswer;
    let score=0;
    is_correct ? score = 1 : score = 0;

    const alreadySubmitted = await Submission.exists({
        userId: practiceSession.userId,
        questionId,
        sessionId: practiceSessionId
    });

    if(!alreadySubmitted){
        await Submission.create({
            userId: practiceSession.userId,
            questionId,
            sessionId: practiceSessionId,
            userAnswer: ans.correctAnswer,
            isCorrect: is_correct,
            score
        });
    }
    res.redirect(`/take-quiz/${practiceSessionId}`);
});

// server setup
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});