const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// Multer storage for profile images
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `profile_${req.user.id}_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files allowed.'));
    }
});

// GET /profile
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// PUT /profile
router.put('/', authMiddleware, upload.single('profileImage'), async (req, res) => {
    try {
        const { name, about, goals, lifestyleType } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (about !== undefined) updateData.about = about;
        if (goals !== undefined) updateData.goals = goals;
        if (lifestyleType) updateData.lifestyleType = lifestyleType;
        if (req.file) updateData.profileImage = `/uploads/${req.file.filename}`;

        const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
        res.json({ message: 'Profile updated.', user });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

module.exports = router;
