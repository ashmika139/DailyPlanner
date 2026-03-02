const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    "https://daily-planner.vercel.app"
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/', require('./routes/auth'));
app.use('/planner', require('./routes/planner'));
app.use('/profile', require('./routes/profile'));
app.use('/', require('./routes/connect'));
app.use('/ai', require('./routes/ai'));

// Fallback for SPA (serve index.html for unmatched routes)
app.get('*', (req, res) => {
  // Only fallback for non-API routes
  if (!req.path.startsWith('/planner') && !req.path.startsWith('/profile') &&
    !req.path.startsWith('/ai') && !req.path.startsWith('/users') &&
    !req.path.startsWith('/messages') && !req.path.startsWith('/comments') &&
    !req.path.startsWith('/comment') && !req.path.startsWith('/message') &&
    !req.path.startsWith('/shared') && !req.path.startsWith('/uploads') &&
    !req.path.startsWith('/register') && !req.path.startsWith('/login')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.json({ message: "User registered successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    res.json({ message: "Login successful", user });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
const User = mongoose.model("User", userSchema);
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
