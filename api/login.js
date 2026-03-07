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
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

        const token = jwt.sign(
            { id: user._id, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('[/api/login]', err);
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};
