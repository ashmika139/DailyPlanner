const connectDB = require('./_lib/db');
const authMiddleware = require('./_lib/auth');
const Planner = require('./_lib/models/Planner');
const Comment = require('./_lib/models/Comment');

// POST /api/comment – add a comment to a shared planner
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
        const { plannerId, commentText } = req.body;
        if (!plannerId || !commentText) {
            return res.status(400).json({ message: 'plannerId and commentText are required.' });
        }
        const planner = await Planner.findById(plannerId);
        if (!planner) return res.status(404).json({ message: 'Planner not found.' });

        const comment = await Comment.create({ plannerId, userId: user.id, commentText });
        const populated = await Comment.findById(comment._id).populate('userId', 'name profileImage');
        res.status(201).json({ message: 'Comment added.', comment: populated });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
