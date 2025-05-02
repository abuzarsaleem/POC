import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { redisClient, sessionQueue } from '../config/redis.js';

class User {
  static async createTable() {
    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          password VARCHAR(255),
          name VARCHAR(255),
          role ENUM('user', 'admin') DEFAULT 'user',
          is_verified BOOLEAN DEFAULT false,
          verification_token VARCHAR(255),
          reset_token VARCHAR(255),
          reset_token_expires TIMESTAMP,
          google_id VARCHAR(255),
          avatar_url VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      await pool.query(createTableSQL);
      console.log('Users table created or already exists');
    } catch (error) {
      console.error('Error creating users table:', error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const { email, password, name, role = 'user' } = userData;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await pool.query(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, name, role]
      );
      
      // Convert BigInt to Number
      return Number(result.insertId);
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error in findByEmail:', error);
      return null;
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error in findById:', error);
      return null;
    }
  }

  static async update(id, userData) {
    try {
      const fields = Object.keys(userData)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = [...Object.values(userData), id];
      
      await pool.query(
        `UPDATE users SET ${fields} WHERE id = ?`,
        values
      );
      
      return await this.findById(id);
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    try {
      return await bcrypt.compare(candidatePassword, hashedPassword);
    } catch (error) {
      console.error('Error in comparePassword:', error);
      return false;
    }
  }

  static async createSession(userId, sessionData) {
    try {
      console.log('=== Creating Session ===');
      console.log('User ID:', userId);
      console.log('Session Data:', sessionData);
      
      const sessionId = `session:${userId}:${Date.now()}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      const sessionJobData = {
        action: 'createSession',
        sessionId,
        userId,
        ip: sessionData.ip,
        userAgent: sessionData.userAgent,
        expiresAt
      };
      
      console.log('Adding session job to queue with data:', sessionJobData);
      
      await sessionQueue.add('createSession', sessionJobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      });
      
      console.log('Session job added to queue successfully');
      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  static async getSessions(userId) {
    try {
      const [sessions] = await pool.query(
        'SELECT * FROM sessions WHERE user_id = ? AND is_valid = true AND expires_at > NOW()',
        [userId]
      );
      return sessions;
    } catch (error) {
      console.error('Error in getSessions:', error);
      return [];
    }
  }

  static async deleteSession(sessionId) {
    try {
      await sessionQueue.add('invalidateSession', {
        sessionId,
        userId: sessionId.split(':')[1] // Extract userId from sessionId
      });
    } catch (error) {
      console.error('Error in deleteSession:', error);
      throw error;
    }
  }

  static async logActivity(userId, activity) {
    try {
      const logKey = `activity:${userId}:${Date.now()}`;
      await redisClient.hmset(logKey, {
        userId,
        ...activity,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error in logActivity:', error);
      throw error;
    }
  }

  static async getActivities(userId, limit = 100) {
    try {
      const pattern = `activity:${userId}:*`;
      const keys = await redisClient.keys(pattern);
      const activities = await Promise.all(
        keys.slice(-limit).map(async (key) => {
          const activity = await redisClient.hgetall(key);
          return { id: key, ...activity };
        })
      );
      return activities;
    } catch (error) {
      console.error('Error in getActivities:', error);
      return [];
    }
  }
}

export default User; 