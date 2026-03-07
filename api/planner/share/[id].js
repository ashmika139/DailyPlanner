const connectDB = require('../../../_lib/db');
const authMiddleware = require('../../../_lib/auth');
const Planner = require('../../../_lib/models/Planner');
const setCors = require('../../../_lib/cors');

// POST /api/planner/share/:id
module.exports = async function handler(req, res) {
    if (setCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
        const { id } = req.query;
        const planner = await Planner.findOne({ _id: id, userId: user.id });
        if (!planner) return res.status(404).json({ message: 'Planner not found or access denied.' });

        const newSharedState = req.body.shared !== undefined
            ? (req.body.shared === true || req.body.shared === 'true')
            : !planner.shared;

        planner.shared = newSharedState;
        await planner.save();

        res.json({
            message: `Planner ${newSharedState ? 'shared to Connect feed' : 'unshared'} successfully.`,
            planner
        });
    } catch (err) {
        console.error('[/api/planner/share/:id]', err);
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
