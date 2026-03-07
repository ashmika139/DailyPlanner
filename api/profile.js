const multer = require('multer');
const connectDB = require('./_lib/db');
const authMiddleware = require('./_lib/auth');
const User = require('./_lib/models/User');

// Use memory storage – no disk writing needed (serverless compatible)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files allowed.'));
    }
});

// Helper to run multer as a promise
function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
}

// GET or PUT /api/profile
module.exports = async function handler(req, res) {
    if (!['GET', 'PUT'].includes(req.method)) {
        return res.status(405).json({ message: 'Method not allowed.' });
    }
    await connectDB();
    const user = authMiddleware(req, res);
    if (!user) return;

    try {
        if (req.method === 'GET') {
            const found = await User.findById(user.id).select('-password');
            if (!found) return res.status(404).json({ message: 'User not found.' });
            return res.json(found);
        }

        if (req.method === 'PUT') {
            // Parse multipart form data using multer memory storage
            await runMiddleware(req, res, upload.single('profileImage'));

            const { name, about, goals, lifestyleType } = req.body;
            const updateData = {};
            if (name) updateData.name = name;
            if (about !== undefined) updateData.about = about;
            if (goals !== undefined) updateData.goals = goals;
            if (lifestyleType) updateData.lifestyleType = lifestyleType;

            // Convert uploaded image buffer to base64 data URL
            if (req.file) {
                const base64 = req.file.buffer.toString('base64');
                updateData.profileImage = `data:${req.file.mimetype};base64,${base64}`;
            }

            const updated = await User.findByIdAndUpdate(user.id, updateData, { new: true }).select('-password');
            return res.json({ message: 'Profile updated.', user: updated });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
