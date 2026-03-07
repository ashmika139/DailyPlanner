const connectDB = require('../../_lib/db');
const authMiddleware = require('../../_lib/auth');
const Comment = require('../../_lib/models/Comment');
const setCors = require('../../_lib/cors');

// GET /api/comments/:plannerId
module.exports = async function handler(req, res) {
    if (setCors(req, res)) return;
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
        console.error('[/api/comments/:plannerId]', err);
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
