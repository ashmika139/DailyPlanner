const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDB = require('./_lib/db');
const User = require('./_lib/models/User');
const setCors = require('./_lib/cors');

module.exports = async function handler(req, res) {
    if (setCors(req, res)) return; // handle OPTIONS preflight
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed.' });
    }
    await connectDB();
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: 'Email already registered.' });
        }
        const hashed = await bcrypt.hash(password, 12);
        const user = await User.create({ name, email, password: hashed });
        const token = jwt.sign(
            { id: user._id, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('[/api/register]', err);
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
