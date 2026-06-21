/* ============================================================
   WANDERLUST — JWT Auth Middleware v2.0
   Accepts token from: Bearer header, cookie, or query param
   ============================================================ */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        let token;

        // 1. Authorization header (Bearer token)
        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // 2. Cookie (wl_token — set by backend after login)
        else if (req.cookies?.wl_token) {
            token = req.cookies.wl_token;
        }
        // 3. Query param (for special cases like email verification links)
        else if (req.query?.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-passwordHash');

        if (!user) {
            return res.status(401).json({ success: false, message: 'User no longer exists.' });
        }

        if (!user.isActive) {
            return res.status(401).json({ success: false, message: 'Account has been deactivated.' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

module.exports = protect;
