import Redis from 'ioredis';
import { Queue } from 'bullmq';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Create BullMQ queues
const emailQueue = new Queue('email', { connection: redisClient });
const auditQueue = new Queue('audit', { connection: redisClient });
const sessionQueue = new Queue('session', { connection: redisClient });

// Test Redis connection
const testConnection = async () => {
  try {
    await redisClient.ping();
    console.log('Redis connection successful');
    return true;
  } catch (error) {
    console.error('Redis connection error:', error);
    return false;
  }
};

export { redisClient, emailQueue, auditQueue, sessionQueue, testConnection }; 