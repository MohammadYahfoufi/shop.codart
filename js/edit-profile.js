/**
 * Edit Profile Page JavaScript
 * Handles loading and updating user profile information
 */

(function($) {
  'use strict';

  // Initialize when DOM is ready
  $(document).ready(function() {
    if (!window.ECommerceAPI) {
      console.error('ECommerceAPI not loaded');
      showError('API not available. Please refresh the page.');
      return;
    }

    // Check if user is authenticated
    if (!window.ECommerceAPI.Auth || !window.ECommerceAPI.Auth.isAuthenticated()) {
      window.location.href = 'index.html';
      return;
    }

    // Load user profile
    loadUserProfile();

    // Handle form submission
    $('#edit-profile-form').on('submit', handleFormSubmit);
  });

  /**
   * Load user profile from API
   */
  async function loadUserProfile() {
    const loadingEl = document.getElementById('profile-loading');
    const errorEl = document.getElementById('profile-error');
    const formEl = document.getElementById('edit-profile-form');

    try {
      // Show loading, hide error and form
      loadingEl.style.display = 'block';
      errorEl.style.display = 'none';
      formEl.style.display = 'none';

      // Fetch current user data
      const user = await window.ECommerceAPI.Auth.getCurrentUser();

      if (!user) {
        throw new Error('Failed to load user profile');
      }

      // Handle different response formats
      const userData = user.user || user.data || user;

      // Populate form fields
      document.getElementById('firstName').value = userData.firstName || userData.first_name || '';
      document.getElementById('lastName').value = userData.lastName || userData.last_name || '';
      document.getElementById('email').value = userData.email || '';
      document.getElementById('phone').value = userData.phone || '';
      document.getElementById('address').value = userData.address || '';

      // Hide loading, show form
      loadingEl.style.display = 'none';
      formEl.style.display = 'block';

    } catch (error) {
      console.error('Error loading profile:', error);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'block';
      document.getElementById('profile-error-message').textContent = 
        error?.message || error?.data?.message || 'Failed to load profile. Please try again.';
    }
  }

  /**
   * Handle form submission
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = $('#edit-profile-form button[type="submit"]');
    const originalText = submitBtn.html();
    
    // Disable submit button and show loading
    submitBtn.prop('disabled', true);
    submitBtn.html(`
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="margin-right: 8px;"></span>
      Saving...
    `);

    const errorEl = document.getElementById('profile-error');
    errorEl.style.display = 'none';

    try {
      // Get form values
      const userData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
      };

      // Add optional fields if they have values
      const phone = document.getElementById('phone').value.trim();
      const address = document.getElementById('address').value.trim();
      
      if (phone) {
        userData.phone = phone;
      }
      
      if (address) {
        userData.address = address;
      }

      // Validate required fields
      if (!userData.firstName || !userData.lastName) {
        throw new Error('First name and last name are required');
      }

      // Update user profile
      const response = await window.ECommerceAPI.Auth.updateCurrentUser(userData);

      // Update localStorage user data
      const currentUser = window.ECommerceAPI.Auth.getUser();
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone || currentUser.phone,
          address: userData.address || currentUser.address
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // Show success message
      showSuccess('Profile updated successfully!');

      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);

    } catch (error) {
      console.error('Error updating profile:', error);
      errorEl.style.display = 'block';
      document.getElementById('profile-error-message').textContent = 
        error?.message || error?.data?.message || 'Failed to update profile. Please try again.';
      
      // Re-enable submit button
      submitBtn.prop('disabled', false);
      submitBtn.html(originalText);
    }
  }

  /**
   * Show success message
   */
  function showSuccess(message) {
    const existingMsg = document.querySelector('.profile-success-message');
    if (existingMsg) {
      existingMsg.remove();
    }
    
    const successMsg = document.createElement('div');
    successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 profile-success-message';
    successMsg.style.zIndex = '9999';
    successMsg.innerHTML = `
      <strong>${message}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 3000);
  }

  /**
   * Show error message
   */
  function showError(message) {
    const errorEl = document.getElementById('profile-error');
    errorEl.style.display = 'block';
    document.getElementById('profile-error-message').textContent = message;
  }

})(jQuery);

