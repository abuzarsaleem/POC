import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { sessionQueue } from '../config/redis.js';
import logger from '../config/logger.js';

export const validateSession = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const sessionId = decoded.sessionId;

    // Check if session exists and is valid
    const [sessions] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ? AND session_id = ? AND is_valid = true AND expires_at > NOW()',
      [userId, sessionId]
    );

    if (!sessions.length) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Refresh session if it's about to expire (within 1 hour)
    const session = sessions[0];
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    
    if (session.expires_at < oneHourFromNow) {
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await sessionQueue.add('refreshSession', {
        sessionId,
        userId,
        expiresAt: newExpiresAt
      });

      // Generate new token with updated expiration
      const newToken = jwt.sign(
        { userId, sessionId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.setHeader('X-New-Token', newToken);
    }

    req.user = { id: userId };
    req.session = { id: sessionId };
    next();
  } catch (error) {
    logger.error('Session validation error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      const [users] = await pool.query(
        'SELECT role FROM users WHERE id = ?',
        [req.user.id]
      );

      if (!users.length || !roles.includes(users[0].role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}; 