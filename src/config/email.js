import nodemailer from 'nodemailer';

// Debug SMTP configuration
console.log('SMTP Configuration:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  from: process.env.SMTP_FROM
});

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: 'bytebenefit@infatica.io',
    pass: 'hTv4IJMWygSxkBa5'
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false
  },
  // Timeout in milliseconds
  connectionTimeout: 90000,
  // Additional SSL options
  socketTimeout: 90000,
  // Debug mode for troubleshooting
  debug: true
});

const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: '"ByteBenefit" <admin@bytebenefit.io>',
      to,
      subject,
      html
    });
    console.log('Email sent successfully:', info);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

export { sendEmail }; 