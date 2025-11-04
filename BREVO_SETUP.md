# Brevo Email Setup Guide

This guide will help you configure Brevo (formerly Sendinblue) to send emails from your contact form.

## Step 1: Get Your Brevo API Key

1. Go to [Brevo](https://www.brevo.com/) and sign up or log in
2. Navigate to **Settings** → **SMTP & API** → **API keys**
3. Click **Generate a new API key**
4. Give it a name (e.g., "Contact Form API")
5. Copy the API key (you'll only see it once!)

## Step 2: Configure Your API Key

1. Open `js/contact.js`
2. Find the `BREVO_CONFIG` object at the top of the file
3. Replace `'YOUR_BREVO_API_V3_KEY'` with your actual API key:

```javascript
const BREVO_CONFIG = {
  API_KEY: 'xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Your API key here
  SENDER_EMAIL: 'support@codart.com',
  SENDER_NAME: 'Codart Shop',
  RECIPIENT_EMAIL: 'support@codart.com',
  // ...
};
```

## Step 3: Verify Your Sender Email

1. In Brevo, go to **Settings** → **SMTP & API** → **SMTP**
2. Under **Sender**, click **Add a sender**
3. Add and verify your sender email address (e.g., `support@codart.com`)
4. You'll receive a verification email - click the link to verify

## Step 4: Update Email Addresses

Update the following in `js/contact.js`:

- `SENDER_EMAIL`: The email address that will send the emails (must be verified in Brevo)
- `SENDER_NAME`: The display name for the sender
- `RECIPIENT_EMAIL`: Where contact form submissions will be sent

## Step 5: Test the Contact Form

1. Open `contact.html` in your browser
2. Fill out the contact form
3. Submit it
4. Check if you receive the email at your `RECIPIENT_EMAIL`

## Important Notes

### Security Warning
⚠️ **API keys exposed in client-side JavaScript are visible to anyone who views your source code.**

For production use, consider:
- Creating a backend API endpoint that handles email sending
- Using environment variables on the server
- Implementing rate limiting to prevent abuse

### SMTP vs API
- **API Method (Current)**: Uses Brevo's REST API directly from the browser
  - Pros: Easy setup, no backend needed
  - Cons: API key is exposed in client code
  
- **SMTP Method**: Requires a backend server
  - Pros: More secure, API key stays on server
  - Cons: Requires backend setup

### Rate Limits
Brevo has rate limits on free accounts:
- Free plan: 300 emails/day
- Lite plan: 10,000 emails/month
- Premium plans: Higher limits

## Troubleshooting

### "API key not configured" error
- Make sure you've replaced `'YOUR_BREVO_API_V3_KEY'` with your actual API key
- Check that there are no extra spaces or quotes

### "Unauthorized" error (401)
- Verify your API key is correct
- Make sure you're using the **API v3 key** (not SMTP password)

### "Sender email not verified" error
- Go to Brevo → Settings → SMTP & API → SMTP
- Verify your sender email address
- Wait a few minutes after verification

### Emails not received
- Check your spam folder
- Verify the recipient email address is correct
- Check Brevo dashboard for delivery status
- Review browser console for error messages

## Support

For Brevo-specific issues, visit:
- [Brevo Documentation](https://developers.brevo.com/)
- [Brevo Support](https://help.brevo.com/)

