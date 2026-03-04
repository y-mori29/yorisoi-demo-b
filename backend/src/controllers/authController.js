const db = require('../utils/jsonDb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Secret key
const JWT_SECRET = process.env.JWT_SECRET || 'yorisoi-secret-key-12345';

exports.login = async (req, res) => {
    try {
        const { id, password } = req.body;
        if (!id || !password) {
            return res.status(400).json({ error: 'ID and password are required' });
        }

        // 1. Find user in Local DB
        const userData = db.getById(id);

        if (!userData) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }


        // 2. Verify Password
        const isMatch = await bcrypt.compare(password, userData.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 3. Generate Token
        // Payload: uid, role (optional)
        const userRole = userData.role || 'admin';
        const token = jwt.sign(
            { uid: id, email: userData.email, name: userData.displayName, role: userRole },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                uid: id,
                displayName: userData.displayName,
                email: userData.email,
                role: userRole
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};
