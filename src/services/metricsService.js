import { pool } from '../config/database.js';
import { redisClient } from '../config/redis.js';
import logger from '../config/logger.js';

class MetricsService {
  static async getSystemMetrics() {
    try {
      // Get cached metrics if available
      const cachedMetrics = await redisClient.get('system_metrics');
      if (cachedMetrics) {
        return JSON.parse(cachedMetrics);
      }

      // Calculate fresh metrics
      const metrics = await this.calculateMetrics();
      
      // Cache metrics for 5 minutes
      await redisClient.set('system_metrics', JSON.stringify(metrics), 'EX', 300);
      
      return metrics;
    } catch (error) {
      logger.error('Error getting system metrics:', error);
      throw error;
    }
  }

  static async calculateMetrics() {
    try {
      const [
        totalUsers,
        activeSessions,
        recentLogins,
        systemHealth
      ] = await Promise.all([
        this.getTotalUsers(),
        this.getActiveSessions(),
        this.getRecentLogins(),
        this.getSystemHealth()
      ]);

      return {
        totalUsers,
        activeSessions,
        recentLogins,
        systemHealth,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating metrics:', error);
      throw error;
    }
  }

  static async getTotalUsers() {
    const [result] = await pool.query('SELECT COUNT(*) as count FROM users');
    return result[0].count;
  }

  static async getActiveSessions() {
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM sessions WHERE is_valid = true AND expires_at > NOW()'
    );
    return result[0].count;
  }

  static async getRecentLogins(limit = 10) {
    const [logins] = await pool.query(`
      SELECT 
        a.user_id,
        u.email,
        a.action,
        a.ip_address,
        a.created_at
      FROM audit_logs a
      JOIN users u ON a.user_id = u.id
      WHERE a.action = 'login'
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [limit]);
    return logins;
  }

  static async getSystemHealth() {
    try {
      // Check database connection
      await pool.query('SELECT 1');
      
      // Check Redis connection
      await redisClient.ping();
      
      return {
        status: 'healthy',
        database: 'connected',
        redis: 'connected',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      logger.error('System health check failed:', error);
      return {
        status: 'unhealthy',
        database: error.message.includes('database') ? 'disconnected' : 'connected',
        redis: error.message.includes('redis') ? 'disconnected' : 'connected',
        lastChecked: new Date().toISOString()
      };
    }
  }
}

export default MetricsService; 