const connectDB = require('./_lib/db');
const authMiddleware = require('./_lib/auth');
const User = require('./_lib/models/User');

// GET /api/users – list all users excluding self
module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed.' });
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
        const users = await User.find({ _id: { $ne: user.id } })
            .select('name profileImage about lifestyleType');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
