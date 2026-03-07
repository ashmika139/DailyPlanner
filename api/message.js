const connectDB = require('./_lib/db');
const authMiddleware = require('./_lib/auth');
const User = require('./_lib/models/User');
const Message = require('./_lib/models/Message');

// POST /api/message – send a direct message
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
        const { receiverId, message } = req.body;
        if (!receiverId || !message || !message.trim()) {
            return res.status(400).json({ message: 'receiverId and message are required.' });
        }
        const receiver = await User.findById(receiverId);
        if (!receiver) return res.status(404).json({ message: 'Recipient user not found.' });

        const msg = new Message({
            senderId: user.id,
            receiverId,
            message: message.trim()
        });
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
};
