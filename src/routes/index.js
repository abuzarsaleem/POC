import express from 'express';
import userRoutes from './userRoutes.js';

const router = express.Router();

// Define routes
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the POC API',
    version: '1.0.0',
  });
});

// Use route modules
router.use('/users', userRoutes);

export default router; 