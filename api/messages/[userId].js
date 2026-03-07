const connectDB = require('../../_lib/db');
const authMiddleware = require('../../_lib/auth');
const User = require('../../_lib/models/User');
const Message = require('../../_lib/models/Message');
const setCors = require('../../_lib/cors');

// GET /api/messages/:userId
module.exports = async function handler(req, res) {
    if (setCors(req, res)) return;
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed.' });
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
        const { userId: otherId } = req.query;

        const otherUser = await User.findById(otherId);
        if (!otherUser) return res.status(404).json({ message: 'User not found.' });

        const messages = await Message.find({
            $or: [
                { senderId: user.id, receiverId: otherId },
                { senderId: otherId, receiverId: user.id }
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
        console.error('[/api/messages/:userId]', err);
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
