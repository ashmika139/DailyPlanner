const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    // Stored as a base64 data URL (e.g. "data:image/jpeg;base64,...")
    profileImage: { type: String, default: '' },
    about: { type: String, default: '' },
    goals: { type: String, default: '' },
    lifestyleType: {
        type: String,
        enum: ['Student', 'Working Professional', 'Freelancer', 'Entrepreneur', 'Other'],
        default: 'Student'
    }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
