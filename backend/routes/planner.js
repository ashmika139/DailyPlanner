const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Planner = require('../models/Planner');

const DEFAULT_SCHEDULE = [
    '5:00-6:00', '6:00-7:00', '7:00-8:00', '8:00-9:00', '9:00-10:00',
    '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00',
    '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00'
].map(time => ({ time, task: '' }));

// POST /planner/create – upsert by user+date
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { date, schedule, priorities, todos, note, tomorrow, shared } = req.body;
        if (!date) return res.status(400).json({ message: 'Date is required.' });

        const planner = await Planner.findOneAndUpdate(
            { userId: req.user.id, date },
            {
                schedule: schedule || DEFAULT_SCHEDULE,
                priorities: priorities || [],
                todos: todos || [],
                note: note || '',
                tomorrow: tomorrow || '',
                shared: shared === true || shared === 'true' ? true : false
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json({ message: 'Planner saved.', planner });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// GET /planner/all – all planners for logged-in user
router.get('/all', authMiddleware, async (req, res) => {
    try {
        const planners = await Planner.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(planners);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// POST /planner/share/:id – toggle shared flag on a specific planner
router.post('/share/:id', authMiddleware, async (req, res) => {
    try {
        const planner = await Planner.findOne({ _id: req.params.id, userId: req.user.id });
        if (!planner) return res.status(404).json({ message: 'Planner not found or access denied.' });

        // Allow explicit value or toggle
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
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// GET /planner/:id – fetch single planner (must be owner OR planner must be shared)
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const planner = await Planner.findById(req.params.id).populate('userId', 'name profileImage');
        if (!planner) return res.status(404).json({ message: 'Planner not found.' });

        const ownerId = planner.userId?._id?.toString() || planner.userId?.toString();
        const isOwner = ownerId === req.user.id;

        if (!isOwner && !planner.shared) {
            return res.status(403).json({ message: 'Access denied. This planner is private.' });
        }
        res.json(planner);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// DELETE /planner/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const planner = await Planner.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!planner) return res.status(404).json({ message: 'Planner not found.' });
        res.json({ message: 'Planner deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

module.exports = router;
