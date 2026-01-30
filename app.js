require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const path = require("path");
const flash = require("connect-flash");

// Models
const User = require("./models/user");
const Question = require("./models/Question");
const PracticeSession = require("./models/PracticeSession");
const Submission = require("./models/Submission");
const Result = require("./models/Result");

const app = express();
const PORT = process.env.PORT || 8080;

/* ===================== BASIC ===================== */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ===================== DB ===================== */
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/interview-prep";

mongoose
  .connect(process.env.ATLASDB_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Mongo Error:", err));

/* ===================== SESSION ===================== */
app.set("trust proxy", 1); // needed if behind a proxy

// SESSION
app.use(
  session({
    name: "interview-prep-session",
    secret: process.env.SESSION_SECRET, // keep stable
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.ATLASDB_URL,
      // optional: remove crypto if not needed
      // crypto: { secret: process.env.SESSION_SECRET },
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  })
);


app.use(flash());

/* ===================== PASSPORT ===================== */
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    const user = await User.findOne({ email });

    if (!user) return done(null, false);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return done(null, false);

    return done(null, user);
  })
);


passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

/* ===================== MIDDLEWARE ===================== */


const isUser = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }

  if (req.user.role === "admin") {
    return res.redirect("/admin-home");
  }

  next();
};

const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/admin-login");
  }

  if (req.user.role !== "admin") {
    return res.redirect("/user-home");
  }

  next();
};

/* ===================== DEBUG ===================== */
app.get("/debug-session", (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    session: req.session,
    user: req.user,
  });
});

app.get("/log-out", (req, res, next) => {
  req.logout?.(err => {
    if (err) return next(err);

    req.session.destroy(err => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.redirect("/user-home");
      }

      res.clearCookie("connect.sid"); // default session cookie name
      res.redirect("/");
    });
  });
});



/* ===================== VIEW ENGINE ===================== */
const ejsMate = require("ejs-mate");
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ===================== AUTH ===================== */
app.get("/", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/user-home");
  res.render("login.ejs");
});

app.get("/signup", (req, res) => res.render("sign-up.ejs"));

app.post("/sign-up", async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 12);
  await User.create({ name, email, password: hash, role: "user" });
  res.redirect("/");
});

app.post("/user-login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.render("login.ejs", { error: "Invalid email or password" });

    req.logIn(user, (err) => {
      if (err) return next(err);
      req.session.save(() => res.redirect("/user-home"));
    });
  })(req, res, next);
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    req.session.destroy(() => res.redirect("/"));
  });
});

/* ===================== USER ===================== */
app.get("/user-home", isUser, (req, res) => {
  res.render("user-home.ejs", { UserDetails: req.user });
});

app.get("/query-page", isUser, (req, res) => {
  res.render("query-page.ejs");
});

app.get("/view-scores", isUser, async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user._id });

    return res.render("show-results.ejs", {
      results,
      userId: req.user._id
    });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).send("Server Error");
  }
});

app.get("/show-results/result/:id", isUser, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).send("Result not found");

    if (result.userId.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized");
    }

    const submissions = await Submission.find({
      sessionId: result.sessionId,
      userId: req.user._id,
    }).populate("questionId");

    res.render("show-detailed-result.ejs", {
      result,
      submissions,
    });
  } catch (err) {
    console.error("Error fetching result:", err);
    res.status(500).send("Server Error");
  }
});



app.get("/quiz/question/:questionId/:sessionId", isUser, async (req, res) => {
  const { questionId, sessionId } = req.params;

  const question = await Question.findById(questionId);

  const submittedIds = await Submission.distinct("questionId", {
    sessionId,
  });

  const practiceSession = await PracticeSession.findById(sessionId);

  const submittedQuestionIds = new Set(
    submittedIds.map(id => id.toString())
  );

  console.log(question, submittedQuestionIds);

  res.render("quiz-question.ejs", {
    question,
    practiceSession,
    submittedQuestionIds,
  });
});



app.post("/query-page/query", isUser, async (req, res) => {
  try {
    const { interviewType, difficulty } = req.body;

    const questions = await Question.find({ interviewType, difficulty });

    const practiceSession = await PracticeSession.create({
      userId: req.user._id,
      filters: { interviewType, difficulty },
    });

    // no submissions yet
    const submittedQuestionIds = new Set();

    res.render("take-quiz.ejs", {
      questions,
      sessionId: practiceSession._id,
      submittedQuestionIds,
    });
  } catch (err) {
    console.error("Query Page Error:", err);
    res.status(500).send("Server error");
  }
});

app.post(
  "/submit/question/:questionId/:sessionId",
  isUser,
  async (req, res) => {
    const { questionId, sessionId } = req.params;
    const { userAnswer } = req.body;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).send("Question not found");
    }

    const isCorrect = question.correctAnswer === userAnswer;
    const score = isCorrect ? 1 : 0;

    // prevent duplicate submission (VERY important)
    const alreadySubmitted = await Submission.findOne({
      userId: req.user._id,
      questionId,
      sessionId,
    });

    if (!alreadySubmitted) {
      await Submission.create({
        userId: req.user._id,
        questionId,
        sessionId,
        userAnswer,
        isCorrect,
        score,
      });
    }

    res.redirect(`/take-quiz/${sessionId}`);
  }
);






/* ===================== ADMIN ===================== */


// Admin login page
app.get("/admin-login", (req, res) => {
  res.render("admin-login.ejs");
});

// Admin login handler
app.post(
  "/admin-home",
  passport.authenticate("local", {
    failureRedirect: "/admin-login",
    failureFlash: true,
  }),
  (req, res) => {
    // 🔒 Ensure admin only
    if (req.user.role !== "admin") {
      req.logout(() => { });
      return res.status(403).send("Admin only");
    }

    res.redirect("/admin-home");
  }
);

// Admin dashboard
app.get("/admin-home", isAdmin, (req, res) => {
  res.render("admin-home.ejs", {
    AdminDetails: req.user,
  });
});

app.get("/show-questions", isAdmin, async (req, res) => {
  const questions = await Question.find();
  res.render("admin-show-questions.ejs", {
    questions,
  });
});

app.get("/delete/question/:questionId", isAdmin, async (req, res) => {
  const question = await Question.findByIdAndDelete(req.params.questionId);
  res.redirect("/show-questions");
});


app.get("/add-question", isAdmin, (req, res) => {
  res.render("admin-add-question.ejs");
});

app.post("/admin/add-question", isAdmin, async (req, res) => {
  try {
    await Question.create({ ...req.body, createdBy: req.user._id });
    console.log("Question added");
    res.redirect("/admin-home");
  } catch (err) {
    res.render("schema-error.ejs", { err });
  }
});


/* ===================== QUIZ ===================== */
app.post("/start-quiz", isUser, async (req, res) => {
  const ps = await PracticeSession.create({ userId: req.user._id, filters: req.body });
  res.redirect(`/ take - quiz / ${ps._id}`);
});

app.get("/take-quiz/:id", isUser, async (req, res) => {
  const ps = await PracticeSession.findById(req.params.id);
  if (!ps) {
    return res.status(404).send("Practice session not found");
  }

  const questions = await Question.find(ps.filters);

  const subs = await Submission.find({
    sessionId: ps._id,
    userId: req.user._id,
  });

  const done = new Set(subs.map(s => s.questionId.toString()));

  res.render("take-quiz.ejs", {
    questions,
    practiceSession: ps,
    sessionId: ps._id,              // ✅ THIS FIXES EVERYTHING
    submittedQuestionIds: done,
  });
});


/* ===================== RESULT ===================== */
app.get("/submit/quiz/:id", isUser, async (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user._id;

  // 1️⃣ Get ONLY this user's submissions
  const subs = await Submission.find({
    sessionId,
    userId,
  });

  if (subs.length === 0) {
    return res.redirect("/user-home");
  }

  const correct = subs.filter(s => s.isCorrect).length;

  // 2️⃣ Prevent duplicate result creation
  const existingResult = await Result.findOne({
    sessionId,
    userId,
  });

  if (!existingResult) {
    await Result.create({
      userId,
      sessionId,
      totalQuestions: subs.length,
      correctAnswers: correct,
      wrongAnswers: subs.length - correct,
      scorePercentage: subs.length
        ? Math.round((correct / subs.length) * 100)
        : 0,
    });
  }

  res.redirect("/user-home");
});


/* ===================== ERRORS ===================== */
app.use((req, res) => res.status(404).render("error-404.ejs"));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error-500.ejs");
});

/* ===================== SERVER ===================== */
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
