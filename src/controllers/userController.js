import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../config/email.js';
import { emailQueue, auditQueue } from '../config/redis.js';
import logger from '../config/logger.js';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields'
      });
    }

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists'
      });
    }

    // Create user
    const userId = await User.create({ email, password, name });
    if (!userId) {
      throw new Error('Failed to create user');
    }

    // Generate verification token with numeric ID
    const verificationToken = jwt.sign(
      { id: Number(userId) },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Update user with verification token
    await User.update(userId, { verification_token: verificationToken });

    // Add email job to queue
    await emailQueue.add('sendVerificationEmail', {
      email,
      name,
      verificationToken
    });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please check your email for verification.'
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error registering user'
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Create session
    const sessionId = await User.createSession(user.id, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Add audit log
    await auditQueue.add('login', {
      userId: user.id,
      action: 'login',
      details: {
        success: true,
        sessionId
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_verified: user.is_verified
        },
        token
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error logging in'
    });
  }
};

export const googleAuth = (req, res) => {
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email']
  });
  res.redirect(url);
};

export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await googleClient.getToken(code);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    // Check if user exists
    let user = await User.findByEmail(payload.email);
    if (!user) {
      // Create new user
      const userId = await User.create({
        email: payload.email,
        name: payload.name,
        google_id: payload.sub,
        is_verified: true
      });
      user = await User.findById(userId);
    } else if (!user.google_id) {
      // Link Google account
      await User.update(user.id, { google_id: payload.sub });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    logger.error('Google auth error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error with Google authentication'
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    await User.update(decoded.id, {
      is_verified: true,
      verification_token: null
    });

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(400).json({
      status: 'error',
      message: 'Invalid or expired verification token'
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Update user with reset token
    await User.update(user.id, {
      reset_token: resetToken,
      reset_token_expires: new Date(Date.now() + 60 * 60 * 1000)
    });

    // Add email job to queue
    await emailQueue.add('sendPasswordResetEmail', {
      email: user.email,
      name: user.name,
      resetToken
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset email sent'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error sending password reset email'
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.reset_token !== token || new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    await User.update(user.id, {
      password,
      reset_token: null,
      reset_token_expires: null
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error resetting password'
    });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        }
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error getting profile'
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);

    if (email && email !== user.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already in use'
        });
      }
    }

    await User.update(req.user.id, { name, email });
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating profile'
    });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await User.update(req.user.id, { avatar_url: avatarUrl });

    res.status(200).json({
      status: 'success',
      data: {
        avatar_url: avatarUrl
      }
    });
  } catch (error) {
    logger.error('Avatar upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading avatar'
    });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.list();
    res.status(200).json({
      status: 'success',
      data: {
        users
      }
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error getting users'
    });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    await User.delete(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting user'
    });
  }
}; 