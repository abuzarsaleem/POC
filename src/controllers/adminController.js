import MetricsService from '../services/metricsService.js';
import { pool } from '../config/database.js';
import logger from '../config/logger.js';

class AdminController {
  static async getDashboardMetrics(req, res) {
    try {
      const metrics = await MetricsService.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      res.status(500).json({ error: 'Failed to get dashboard metrics' });
    }
  }

  static async getUsers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const [users] = await pool.query(
        'SELECT id, email, name, role, is_verified, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [parseInt(limit), offset]
      );

      const [total] = await pool.query('SELECT COUNT(*) as count FROM users');
      
      res.json({
        users,
        pagination: {
          total: total[0].count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total[0].count / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting users:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  }

  static async getAuditLogs(req, res) {
    try {
      const { page = 1, limit = 20, userId, action } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          a.*,
          u.email as user_email
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (userId) {
        query += ' AND a.user_id = ?';
        params.push(userId);
      }

      if (action) {
        query += ' AND a.action = ?';
        params.push(action);
      }

      query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [logs] = await pool.query(query, params);
      const [total] = await pool.query(
        'SELECT COUNT(*) as count FROM audit_logs' + 
        (userId || action ? ' WHERE ' + (userId ? 'user_id = ?' : '') + 
        (userId && action ? ' AND ' : '') + 
        (action ? 'action = ?' : '') : ''),
        [userId, action].filter(Boolean)
      );

      res.json({
        logs,
        pagination: {
          total: total[0].count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total[0].count / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      res.status(500).json({ error: 'Failed to get audit logs' });
    }
  }

  static async getSessions(req, res) {
    try {
      const { page = 1, limit = 20, userId } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          s.*,
          u.email as user_email
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (userId) {
        query += ' AND s.user_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const [sessions] = await pool.query(query, params);
      const [total] = await pool.query(
        'SELECT COUNT(*) as count FROM sessions' + 
        (userId ? ' WHERE user_id = ?' : ''),
        [userId].filter(Boolean)
      );

      res.json({
        sessions,
        pagination: {
          total: total[0].count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total[0].count / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting sessions:', error);
      res.status(500).json({ error: 'Failed to get sessions' });
    }
  }
}

export default AdminController; 