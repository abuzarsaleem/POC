import { Worker } from 'bullmq';
import logger from '../config/logger.js';
import { pool } from '../config/database.js';

const sessionWorker = new Worker('session', async (job) => {
  try {
    console.log('=== Session Worker Processing ===');
    console.log('Job Name:', job.name);
    console.log('Job Data:', job.data);

    const { action, sessionId, userId, ip, userAgent, expiresAt } = job.data;
    
    switch (action) {
      case 'createSession':
        console.log('Creating session in database...');
        console.log('SQL Query:', 'INSERT INTO sessions (user_id, session_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)');
        console.log('Parameters:', [userId, sessionId, ip, userAgent, expiresAt]);
        
        const [result] = await pool.query(
          'INSERT INTO sessions (user_id, session_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
          [userId, sessionId, ip, userAgent, expiresAt]
        );
        
        console.log('Database Insert Result:', result);
        console.log('Session created successfully in database');
        logger.info(`Session created for user ${userId}`);
        break;

      case 'refreshSession':
        console.log('Refreshing session:', sessionId);
        const [updateResult] = await pool.query(
          'UPDATE sessions SET expires_at = ? WHERE session_id = ? AND user_id = ? AND is_valid = true',
          [expiresAt, sessionId, userId]
        );
        console.log('Session refreshed:', updateResult.affectedRows);
        logger.info(`Session ${sessionId} refreshed for user ${userId}`);
        break;
        
      case 'cleanupExpiredSessions':
        console.log('Cleaning up expired sessions...');
        const [deleteResult] = await pool.query(
          'DELETE FROM sessions WHERE expires_at < NOW()'
        );
        console.log('Expired sessions deleted:', deleteResult.affectedRows);
        logger.info('Expired sessions cleaned up');
        break;
        
      case 'invalidateSession':
        console.log('Invalidating session:', sessionId);
        const [invalidateResult] = await pool.query(
          'UPDATE sessions SET is_valid = false WHERE session_id = ? AND user_id = ?',
          [sessionId, userId]
        );
        console.log('Session invalidated:', invalidateResult.affectedRows);
        logger.info(`Session ${sessionId} invalidated for user ${userId}`);
        break;
        
      case 'invalidateAllSessions':
        console.log('Invalidating all sessions for user:', userId);
        const [allUpdateResult] = await pool.query(
          'UPDATE sessions SET is_valid = false WHERE user_id = ?',
          [userId]
        );
        console.log('All sessions invalidated:', allUpdateResult.affectedRows);
        logger.info(`All sessions invalidated for user ${userId}`);
        break;
        
      default:
        console.warn(`Unknown session action: ${action}`);
        logger.warn(`Unknown session action: ${action}`);
    }
  } catch (error) {
    console.error('Session worker error:', error);
    logger.error(`Session job error: ${error.message}`);
    throw error;
  }
});

// Handle worker events
sessionWorker.on('completed', (job) => {
  console.log(`Session job ${job.id} completed`);
  logger.info(`Session job ${job.id} completed`);
});

sessionWorker.on('failed', (job, error) => {
  console.error(`Session job ${job.id} failed:`, error);
  logger.error(`Session job ${job.id} failed: ${error.message}`);
});

export default sessionWorker; 