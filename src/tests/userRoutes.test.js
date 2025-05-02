import supertest from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { db } from '../config/database.js';

const request = supertest(app);

describe('User Routes', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    try {
      // Create a test user
      testUser = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
      console.log('Test user created:', testUser.id);
    } catch (error) {
      console.error('Error creating test user:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data
      await User.destroy({ where: { email: 'test@example.com' } });
      console.log('Test user cleaned up');
    } catch (error) {
      console.error('Error cleaning up test user:', error);
    }
  });

  describe('Public Routes', () => {
    // Register endpoint
    describe('POST /api/users/register', () => {
      it('should register a new user', async () => {
        const response = await request
          .post('/api/users/register')
          .field('email', 'newuser@example.com')
          .field('password', 'password123')
          .field('name', 'New User');

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe('newuser@example.com');

        // Clean up the test user
        await User.destroy({ where: { email: 'newuser@example.com' } });
      });

      it('should return 400 for invalid input', async () => {
        const response = await request
          .post('/api/users/register')
          .field('email', 'invalid-email')
          .field('password', '123')
          .field('name', '');

        expect(response.status).toBe(400);
      });
    });

    // Login endpoint
    describe('POST /api/users/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request
          .post('/api/users/login')
          .field('email', 'test@example.com')
          .field('password', 'password123');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        authToken = response.body.token; // Store token for protected routes
      });

      it('should return 401 for invalid credentials', async () => {
        const response = await request
          .post('/api/users/login')
          .field('email', 'test@example.com')
          .field('password', 'wrongpassword');

        expect(response.status).toBe(401);
      });
    });

    // Forgot Password endpoint
    describe('POST /api/users/forgot-password', () => {
      it('should send password reset email', async () => {
        const response = await request
          .post('/api/users/forgot-password')
          .field('email', 'test@example.com');

        expect(response.status).toBe(200);
      });

      it('should return 404 for non-existent email', async () => {
        const response = await request
          .post('/api/users/forgot-password')
          .field('email', 'nonexistent@example.com');

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Protected Routes', () => {
    // Get Profile endpoint
    describe('GET /api/users/profile', () => {
      it('should get user profile with valid token', async () => {
        const response = await request
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('email', 'test@example.com');
      });

      it('should return 401 without token', async () => {
        const response = await request
          .get('/api/users/profile');

        expect(response.status).toBe(401);
      });
    });

    // Update Profile endpoint
    describe('PUT /api/users/profile', () => {
      it('should update user profile', async () => {
        const response = await request
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Name',
            email: 'test@example.com'
          });

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Name');
      });

      it('should return 401 without token', async () => {
        const response = await request
          .put('/api/users/profile')
          .send({
            name: 'Updated Name'
          });

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Admin Routes', () => {
    // Get All Users endpoint
    describe('GET /api/users', () => {
      it('should return 403 for non-admin user', async () => {
        const response = await request
          .get('/api/users')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(403);
      });
    });

    // Delete User endpoint
    describe('DELETE /api/users/:id', () => {
      it('should return 403 for non-admin user', async () => {
        const response = await request
          .delete(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(403);
      });
    });
  });
}); 