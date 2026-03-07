const connectDB = require('./_lib/db');
const authMiddleware = require('./_lib/auth');
const Planner = require('./_lib/models/Planner');

// GET /api/shared-planners – all shared planners with owner info
module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed.' });
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
        const planners = await Planner.find({ shared: true })
            .sort({ createdAt: -1 })
            .populate('userId', 'name profileImage');
        res.json(planners);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
