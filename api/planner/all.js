const connectDB = require('../../_lib/db');
const authMiddleware = require('../../_lib/auth');
const Planner = require('../../_lib/models/Planner');

// GET /api/planner/all – all planners for logged-in user
module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed.' });
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
        const planners = await Planner.find({ userId: user.id }).sort({ date: -1 });
        res.json(planners);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
