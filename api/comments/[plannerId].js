const connectDB = require('../../_lib/db');
const authMiddleware = require('../../_lib/auth');
const Comment = require('../../_lib/models/Comment');

// GET /api/comments/:plannerId
module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed.' });
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
        const { plannerId } = req.query;
        const comments = await Comment.find({ plannerId })
            .sort({ createdAt: 1 })
            .populate('userId', 'name profileImage');
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
