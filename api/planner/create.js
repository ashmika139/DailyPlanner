const connectDB = require('../../_lib/db');
const authMiddleware = require('../../_lib/auth');
const Planner = require('../../_lib/models/Planner');

const DEFAULT_SCHEDULE = [
    '5:00-6:00', '6:00-7:00', '7:00-8:00', '8:00-9:00', '9:00-10:00',
    '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00',
    '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00'
].map(time => ({ time, task: '' }));

// POST /api/planner/create
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
        const { date, schedule, priorities, todos, note, tomorrow, shared } = req.body;
        if (!date) return res.status(400).json({ message: 'Date is required.' });

        const planner = await Planner.findOneAndUpdate(
            { userId: user.id, date },
            {
                schedule: schedule || DEFAULT_SCHEDULE,
                priorities: priorities || [],
                todos: todos || [],
                note: note || '',
                tomorrow: tomorrow || '',
                shared: shared === true || shared === 'true'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json({ message: 'Planner saved.', planner });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
