const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Planner = require('../models/Planner');
const Comment = require('../models/Comment');
const Message = require('../models/Message');

// GET /users – list all users (public info, excluding self)
router.get('/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user.id } })
            .select('name profileImage about lifestyleType');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// GET /shared-planners – all shared planners with owner info
router.get('/shared-planners', authMiddleware, async (req, res) => {
    try {
        const planners = await Planner.find({ shared: true })
            .sort({ createdAt: -1 })
            .populate('userId', 'name profileImage');
        res.json(planners);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// POST /comment – add comment to a planner
router.post('/comment', authMiddleware, async (req, res) => {
    try {
        const { plannerId, commentText } = req.body;
        if (!plannerId || !commentText) {
            return res.status(400).json({ message: 'plannerId and commentText are required.' });
        }
        // Verify planner exists and is shared (or owned by commenter)
        const planner = await Planner.findById(plannerId);
        if (!planner) return res.status(404).json({ message: 'Planner not found.' });

        const comment = await Comment.create({ plannerId, userId: req.user.id, commentText });
        const populated = await Comment.findById(comment._id).populate('userId', 'name profileImage');
        res.status(201).json({ message: 'Comment added.', comment: populated });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// GET /comments/:plannerId – get all comments for a planner
router.get('/comments/:plannerId', authMiddleware, async (req, res) => {
    try {
        const comments = await Comment.find({ plannerId: req.params.plannerId })
            .sort({ createdAt: 1 })
            .populate('userId', 'name profileImage');
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// POST /message – send a direct message and persist in MongoDB
router.post('/message', authMiddleware, async (req, res) => {
    try {
        const { receiverId, message } = req.body;
        if (!receiverId || !message || !message.trim()) {
            return res.status(400).json({ message: 'receiverId and message are required.' });
        }
        // Ensure receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) return res.status(404).json({ message: 'Recipient user not found.' });

        const msg = new Message({
            senderId: req.user.id,
            receiverId,
            message: message.trim()
        });
        await msg.save();  // explicit save so timestamps are written

        // Return with string IDs for easy client-side comparison
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

// GET /messages/:userId – full conversation history between two users
router.get('/messages/:userId', authMiddleware, async (req, res) => {
    try {
        const otherId = req.params.userId;

        // Ensure the other user exists
        const otherUser = await User.findById(otherId);
        if (!otherUser) return res.status(404).json({ message: 'User not found.' });

        const messages = await Message.find({
            $or: [
                { senderId: req.user.id, receiverId: otherId },
                { senderId: otherId, receiverId: req.user.id }
            ]
        }).sort({ createdAt: 1 });

        // Serialize ObjectIds to strings so client-side === comparison works
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

module.exports = router;
