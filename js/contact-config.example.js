/**
 * Brevo API Configuration Example
 * 
 * Copy this file to contact-config.js and add your actual API key
 * contact-config.js is gitignored and won't be pushed to GitHub
 */

const BREVO_CONFIG = {
  // Replace with your Brevo API V3 Key
  // Get it from: https://app.brevo.com/settings/keys/api
  API_KEY: 'YOUR_BREVO_API_V3_KEY',
  
  // Your sender email (must be verified in Brevo)
  SENDER_EMAIL: 'yahfoufim91@gmail.com',
  SENDER_NAME: 'Codart Shop',
  
  // Recipient email (where contact form submissions will be sent)
  RECIPIENT_EMAIL: 'yahfoufim91@gmail.com',
  
  // Brevo API endpoint
  API_URL: 'https://api.brevo.com/v3/smtp/email'
};

