/**
 * Configuration file to handle environment variables
 */

require('dotenv').config();

module.exports = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB configuration
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/echo',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  
  // Cors configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
}; 