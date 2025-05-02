import { db } from '../config/database.js';
import { redisClient } from '../config/redis.js';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Initialize test database
beforeAll(async () => {
  try {
    await db.authenticate();
    console.log('Test database connection established');
  } catch (error) {
    console.error('Unable to connect to test database:', error);
    throw error;
  }
});

// Clean up after tests
afterAll(async () => {
  try {
    await db.close();
    await redisClient.quit();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Error closing test database connection:', error);
  }
}); 