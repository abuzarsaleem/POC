import mariadb from 'mariadb';
import logger from './logger.js';

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'razashan',
  database: process.env.DB_NAME || 'poc',
  connectionLimit: 20,
  waitForConnections: true,
  queueLimit: 0,
  connectTimeout: 10000,
  acquireTimeout: 20000,
  timeout: 10000,
  // Enable prepared statements for SQL injection protection
  prepareCache: true,
  // Enable connection pooling for better performance
  connectionLimit: 10,
  // Enable connection timeout
  connectTimeout: 10000
});

const testConnection = async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    logger.info('Database connection successful');
    return true;
  } catch (err) {
    logger.error('Error connecting to the database:', err);
    return false;
  } finally {
    if (conn) conn.release();
  }
};

// Add connection error handling
pool.on('error', (err) => {
  logger.error('Database pool error:', err);
});

export { pool, testConnection }; 