import { Worker } from 'bullmq';
import { sendEmail } from '../config/email.js';
import logger from '../config/logger.js';

const emailWorker = new Worker('email', async (job) => {
  try {
    switch (job.name) {
      case 'sendTestEmail':
        await sendEmail(
          job.data.email,
          job.data.subject,
          job.data.html
        );
        logger.info('Test email sent successfully');
        break;

      case 'sendVerificationEmail':
        await sendEmail(
          job.data.email,
          'Verify your email address',
          `
            <h1>Welcome to our platform!</h1>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${process.env.APP_URL}/api/users/verify-email?token=${job.data.verificationToken}">
              Verify Email
            </a>
          `
        );
        break;

      case 'sendPasswordResetEmail':
        await sendEmail(
          job.data.email,
          'Reset your password',
          `
            <h1>Password Reset Request</h1>
            <p>Click the link below to reset your password:</p>
            <a href="${process.env.APP_URL}/reset-password?token=${job.data.resetToken}">
              Reset Password
            </a>
            <p>This link will expire in 1 hour.</p>
          `
        );
        break;

      default:
        logger.warn(`Unknown email job: ${job.name}`);
    }
  } catch (error) {
    logger.error(`Email job error: ${error.message}`);
    throw error;
  }
});

export default emailWorker; 