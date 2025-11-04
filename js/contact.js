/**
 * Contact Form Handler with Brevo Email Integration
 */

// Brevo API Configuration
// Load from contact-config.js if available, otherwise use defaults
let BREVO_CONFIG;
if (typeof window.BREVO_CONFIG !== 'undefined') {
  // Config loaded from contact-config.js
  BREVO_CONFIG = window.BREVO_CONFIG;
} else {
  // Fallback configuration (user should create contact-config.js from contact-config.example.js)
  BREVO_CONFIG = {
    API_KEY: 'YOUR_BREVO_API_V3_KEY', // Copy contact-config.example.js to contact-config.js and add your API key
    SENDER_EMAIL: 'yahfoufim91@gmail.com',
    SENDER_NAME: 'Codart Shop',
    RECIPIENT_EMAIL: 'yahfoufim91@gmail.com',
    API_URL: 'https://api.brevo.com/v3/smtp/email'
  };
}

/**
 * Send email using Brevo Transactional Email API
 */
async function sendContactEmail(formData) {
  try {
    const emailData = {
      sender: {
        name: BREVO_CONFIG.SENDER_NAME,
        email: BREVO_CONFIG.SENDER_EMAIL
      },
      to: [
        {
          email: BREVO_CONFIG.RECIPIENT_EMAIL,
          name: 'Codart Support'
        }
      ],
      replyTo: {
        email: formData.email,
        name: formData.name
      },
      subject: `Contact Form: ${formData.subject}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #4A9EFF; margin-top: 0;">New Contact Form Submission</h2>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #333; font-size: 16px; margin-bottom: 10px;">From:</h3>
              <p style="margin: 5px 0; color: #666;">
                <strong>Name:</strong> ${escapeHtml(formData.name)}<br>
                <strong>Email:</strong> <a href="mailto:${escapeHtml(formData.email)}">${escapeHtml(formData.email)}</a>
              </p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #333; font-size: 16px; margin-bottom: 10px;">Subject:</h3>
              <p style="margin: 5px 0; color: #666;">${escapeHtml(formData.subject)}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #333; font-size: 16px; margin-bottom: 10px;">Message:</h3>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #4A9EFF; color: #333; white-space: pre-wrap;">
                ${escapeHtml(formData.message)}
              </div>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #999;">
              <p style="margin: 0;">This email was sent from the Codart Shop contact form.</p>
              <p style="margin: 5px 0 0 0;">Submitted on: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      `,
      textContent: `
New Contact Form Submission

From:
Name: ${formData.name}
Email: ${formData.email}

Subject:
${formData.subject}

Message:
${formData.message}

---
This email was sent from the Codart Shop contact form.
Submitted on: ${new Date().toLocaleString()}
      `
    };

    const response = await fetch(BREVO_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_CONFIG.API_KEY
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Initialize contact form handler
 */
function initContactForm() {
  const contactForm = document.querySelector('#contact-form');
  
  if (!contactForm) {
    console.warn('Contact form not found');
    return;
  }

  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form elements
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const subjectInput = document.getElementById('subject');
    const messageInput = document.getElementById('message');
    const submitButton = contactForm.querySelector('button[type="submit"]');
    
    // Validate form
    if (!nameInput.value.trim() || !emailInput.value.trim() || 
        !subjectInput.value.trim() || !messageInput.value.trim()) {
      showMessage('Please fill in all fields', 'error');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value)) {
      showMessage('Please enter a valid email address', 'error');
      return;
    }
    
    // Disable submit button and show loading state
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa fa-spinner fa-spin" style="margin-right: 8px;"></i>Sending...';
    
    // Prepare form data
    const formData = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      subject: subjectInput.value.trim(),
      message: messageInput.value.trim()
    };
    
    try {
      // Check if API key is configured
      if (BREVO_CONFIG.API_KEY === 'YOUR_BREVO_API_V3_KEY') {
        throw new Error('Brevo API key not configured. Please copy js/contact-config.example.js to js/contact-config.js and add your API key.');
      }
      
      // Send email
      await sendContactEmail(formData);
      
      // Show success message
      showMessage('Thank you for your message! We will get back to you soon.', 'success');
      
      // Reset form
      contactForm.reset();
      
    } catch (error) {
      console.error('Contact form error:', error);
      
      // Show error message
      let errorMessage = 'Failed to send message. Please try again later.';
      
      if (error.message.includes('API key')) {
        errorMessage = 'Email service not configured. Please contact the administrator.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Invalid API credentials. Please contact the administrator.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Too many requests. Please try again in a few minutes.';
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
  });
}

/**
 * Show message to user
 */
function showMessage(message, type = 'success') {
  // Remove existing messages
  const existingMessage = document.querySelector('.contact-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create message element
  const messageDiv = document.createElement('div');
  messageDiv.className = `contact-message alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
  messageDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
  messageDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Add to page
  document.body.appendChild(messageDiv);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.classList.remove('show');
      setTimeout(() => messageDiv.remove(), 150);
    }
  }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContactForm);
} else {
  initContactForm();
}

