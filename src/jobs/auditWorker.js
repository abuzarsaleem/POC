import { Worker } from 'bullmq';
import logger from '../config/logger.js';
import { pool } from '../config/database.js';

const auditWorker = new Worker('audit', async (job) => {
  try {
    const { userId, action = job.name, details = {}, ip, userAgent } = job.data;
    
    if (!action) {
      throw new Error('Action is required for audit log');
    }
    
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [userId, action, JSON.stringify(details), ip, userAgent]
    );
    
    logger.info(`Audit log created: ${action} by user ${userId}`);
  } catch (error) {
    logger.error(`Audit job error: ${error.message}`);
    throw error;
  }
});

// Handle worker events
auditWorker.on('completed', (job) => {
  logger.info(`Audit job ${job.id} completed`);
});

auditWorker.on('failed', (job, error) => {
  logger.error(`Audit job ${job.id} failed: ${error.message}`);
});

export default auditWorker; 