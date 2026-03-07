const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
require('dotenv').config();

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors({
  origin: [
    "https://daily-planner-lime-tau.vercel.app",
    "http://localhost:3000",
    "http://localhost:5500"
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ================= AUTH MIDDLEWARE ================= */

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/* ================= MODELS ================= */

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  profileImage: String,
  about: String,
  goals: String,
  lifestyleType: String
});
const User = mongoose.models.User || mongoose.model("User", userSchema);

const plannerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: String,
  schedule: Array,
  priorities: Array,
  todos: Array,
  note: String,
  tomorrow: String,
  shared: { type: Boolean, default: false }
}, { timestamps: true });
const Planner = mongoose.models.Planner || mongoose.model("Planner", plannerSchema);

const commentSchema = new mongoose.Schema({
  plannerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Planner' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  commentText: String
}, { timestamps: true });
const Comment = mongoose.models.Comment || mongoose.model("Comment", commentSchema);

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String
}, { timestamps: true });
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

/* ================= MULTER (Profile Image Upload) ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${req.user.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed.'));
  }
});

/* ================= AUTH ROUTES ================= */

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: newUser._id, name: newUser.name, email: newUser.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= PROFILE ROUTES ================= */

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

app.put('/api/profile', authMiddleware, upload.single('profileImage'), async (req, res) => {
  try {
    const { name, about, goals, lifestyleType } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (about !== undefined) updateData.about = about;
    if (goals !== undefined) updateData.goals = goals;
    if (lifestyleType) updateData.lifestyleType = lifestyleType;
    if (req.file) updateData.profileImage = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
    res.json({ message: 'Profile updated.', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

/* ================= PLANNER ROUTES ================= */

const DEFAULT_SCHEDULE = [
  '5:00-6:00', '6:00-7:00', '7:00-8:00', '8:00-9:00', '9:00-10:00',
  '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00',
  '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00'
].map(time => ({ time, task: '' }));

app.post('/api/planner/create', authMiddleware, async (req, res) => {
  try {
    const { date, schedule, priorities, todos, note, tomorrow, shared } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required.' });

    const planner = await Planner.findOneAndUpdate(
      { userId: req.user.id, date },
      {
        schedule: schedule || DEFAULT_SCHEDULE,
        priorities: priorities || [],
        todos: todos || [],
        note: note || '',
        tomorrow: tomorrow || '',
        shared: shared === true || shared === 'true' ? true : false
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: 'Planner saved.', planner });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

app.get('/api/planner/all', authMiddleware, async (req, res) => {
  try {
    const planners = await Planner.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(planners);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

app.post('/api/planner/share/:id', authMiddleware, async (req, res) => {
  try {
    const planner = await Planner.findOne({ _id: req.params.id, userId: req.user.id });
    if (!planner) return res.status(404).json({ message: 'Planner not found or access denied.' });

    const newSharedState = req.body.shared !== undefined
      ? (req.body.shared === true || req.body.shared === 'true')
      : !planner.shared;

    planner.shared = newSharedState;
    await planner.save();
    res.json({ message: `Planner ${newSharedState ? 'shared' : 'unshared'} successfully.`, planner });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

app.get('/api/planner/:id', authMiddleware, async (req, res) => {
  try {
    const planner = await Planner.findById(req.params.id).populate('userId', 'name profileImage');
    if (!planner) return res.status(404).json({ message: 'Planner not found.' });

    const ownerId = planner.userId?._id?.toString() || planner.userId?.toString();
    const isOwner = ownerId === req.user.id;
    if (!isOwner && !planner.shared) return res.status(403).json({ message: 'Access denied.' });

    res.json(planner);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

app.delete('/api/planner/:id', authMiddleware, async (req, res) => {
  try {
    const planner = await Planner.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!planner) return res.status(404).json({ message: 'Planner not found.' });
    res.json({ message: 'Planner deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

/* ================= CONNECT ROUTES ================= */

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('name profileImage about lifestyleType');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

app.get('/api/shared-planners', authMiddleware, async (req, res) => {
  try {
    const planners = await Planner.find({ shared: true })
      .sort({ createdAt: -1 })
      .populate('userId', 'name profileImage');
    res.json(planners);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

app.post('/api/comment', authMiddleware, async (req, res) => {
  try {
    const { plannerId, commentText } = req.body;
    if (!plannerId || !commentText) return res.status(400).json({ message: 'plannerId and commentText are required.' });

    const planner = await Planner.findById(plannerId);
    if (!planner) return res.status(404).json({ message: 'Planner not found.' });

    const comment = await Comment.create({ plannerId, userId: req.user.id, commentText });
    const populated = await Comment.findById(comment._id).populate('userId', 'name profileImage');
    res.status(201).json({ message: 'Comment added.', comment: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

app.get('/api/comments/:plannerId', authMiddleware, async (req, res) => {
  try {
    const comments = await Comment.find({ plannerId: req.params.plannerId })
      .sort({ createdAt: 1 })
      .populate('userId', 'name profileImage');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

app.post('/api/message', authMiddleware, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    if (!receiverId || !message || !message.trim()) return res.status(400).json({ message: 'receiverId and message are required.' });

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: 'Recipient user not found.' });

    const msg = new Message({ senderId: req.user.id, receiverId, message: message.trim() });
    await msg.save();

    res.status(201).json({
      message: 'Message sent.',
      msg: {
        _id: msg._id.toString(),
        senderId: msg.senderId.toString(),
        receiverId: msg.receiverId.toString(),
        message: msg.message,
        createdAt: msg.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

app.get('/api/messages/:userId', authMiddleware, async (req, res) => {
  try {
    const otherId = req.params.userId;
    const otherUser = await User.findById(otherId);
    if (!otherUser) return res.status(404).json({ message: 'User not found.' });

    const messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: otherId },
        { senderId: otherId, receiverId: req.user.id }
      ]
    }).sort({ createdAt: 1 });

    const serialized = messages.map(m => ({
      _id: m._id.toString(),
      senderId: m.senderId.toString(),
      receiverId: m.receiverId.toString(),
      message: m.message,
      createdAt: m.createdAt
    }));

    res.json(serialized);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

/* ================= ROOT CHECK ================= */

app.get('/', (req, res) => {
  res.json({ message: "Planner Backend Running 🚀" });
});

/* ================= DATABASE ================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});