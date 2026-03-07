// JWT auth helper for serverless handlers (replaces Express middleware)
const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer token in the request and returns the decoded user.
 * If invalid, sends 401 and returns null (caller should return immediately).
 */
function authMiddleware(req, res) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return null;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded; // { id, name, iat, exp }
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token.' });
        return null;
    }
}

module.exports = authMiddleware;
