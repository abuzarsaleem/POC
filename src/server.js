import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import swaggerUi from 'swagger-ui-express';
import specs from './config/swagger.js';
import { pool, testConnection } from './config/database.js';
import { redisClient } from './config/redis.js';
import logger from './config/logger.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { sessionQueue } from './config/redis.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For multipart/form-data
app.use(morgan('dev'));
app.use(express.static(join(__dirname, 'public')));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MERN + MySQL Backend API Documentation'
}));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    const redisStatus = await redisClient.ping();
    
    res.json({
      status: 'healthy',
      database: dbStatus ? 'connected' : 'disconnected',
      redis: redisStatus === 'PONG' ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Test Redis connection
    await redisClient.ping();
    
    logger.info(`Server running on port ${PORT}`);
    logger.info('Database connection established');
    logger.info('Redis connection established');
    logger.info(`Swagger documentation available at http://localhost:${PORT}/api-docs`);

    // Schedule session cleanup job
    setInterval(async () => {
      try {
        await sessionQueue.add('cleanupExpiredSessions', {}, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        });
        logger.info('Scheduled session cleanup job added to queue');
      } catch (error) {
        logger.error('Error scheduling session cleanup:', error);
      }
    }, 60 * 60 * 1000); // Run every hour

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}); 