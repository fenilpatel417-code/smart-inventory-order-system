const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: Number(process.env.EMAIL_PORT) || 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Development fallback mock transporter
    transporter = {
      sendMail: async (options) => {
        console.log(`[Email Mock Sent] To: ${options.to} | Subject: ${options.subject}`);
        return { messageId: `mock-${Date.now()}` };
      },
    };
  }

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailClient = await getTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Smart Inventory" <no-reply@smartinventory.com>',
      to,
      subject,
      text: text || '',
      html: html || '',
    };

    const info = await mailClient.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}: ${error.message}`);
    return null;
  }
};

module.exports = { sendEmail };
