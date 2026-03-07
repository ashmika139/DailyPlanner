const connectDB = require('../../_lib/db');
const authMiddleware = require('../../_lib/auth');
const Planner = require('../../_lib/models/Planner');
const setCors = require('../../_lib/cors');

// GET /api/planner/:id  – fetch single planner (owner or shared)
// DELETE /api/planner/:id – delete planner (owner only)
module.exports = async function handler(req, res) {
    if (setCors(req, res)) return;
    if (!['GET', 'DELETE'].includes(req.method)) {
        return res.status(405).json({ message: 'Method not allowed.' });
    }
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;

    const { id } = req.query;

    try {
        if (req.method === 'GET') {
            const planner = await Planner.findById(id).populate('userId', 'name profileImage');
            if (!planner) return res.status(404).json({ message: 'Planner not found.' });

            const ownerId = planner.userId?._id?.toString() || planner.userId?.toString();
            const isOwner = ownerId === user.id;

            if (!isOwner && !planner.shared) {
                return res.status(403).json({ message: 'Access denied. This planner is private.' });
            }
            return res.json(planner);
        }

        if (req.method === 'DELETE') {
            const planner = await Planner.findOneAndDelete({ _id: id, userId: user.id });
            if (!planner) return res.status(404).json({ message: 'Planner not found.' });
            return res.json({ message: 'Planner deleted.' });
        }
    } catch (err) {
        console.error('[/api/planner/:id]', err);
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
