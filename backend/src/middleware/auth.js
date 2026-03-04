const { auth } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'yorisoi-secret-key-12345';

/**
 * Middleware to verify Firebase ID Token in Authorization header.
 * Expected format: "Authorization: Bearer <token>"
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Allow bypassing auth for development/testing if needed,
    // or for specific public endpoints (can be handled in routes).
    // For now, strict check.

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // BYPASS FOR DEMO / MOCK MODE
    if (token.startsWith('MOCK_TOKEN_')) {
        // Extract ID from token if possible, or just assign a dummy user
        const dummyUid = token.replace('MOCK_TOKEN_', '');
        req.user = { uid: dummyUid, email: 'mock@local', displayName: 'Mock User' };
        return next();
    }

    try {
        // Verify Custom JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { uid, email, name, iat, exp }
        next();
    } catch (error) {
        console.error('VERIFY TOKEN ERROR:', error.message);
        console.error('Rate Limit or Token Expiry? Token:', token.substring(0, 10) + '...');
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = { verifyToken };
