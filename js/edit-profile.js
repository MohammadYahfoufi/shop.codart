/**
 * Edit Profile Page JavaScript
 * Handles loading and updating user profile information
 */

(function($) {
  'use strict';

  // Map variables
  let map = null;
  let marker = null;
  let defaultCenter = [33.8938, 35.5018]; // Beirut, Lebanon default location

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

    // Load user profile first, then initialize map after form is shown
    loadUserProfile();

    // Handle form submission
    $('#edit-profile-form').on('submit', handleFormSubmit);

    // Handle current location button (will be set up after map initializes)
    $(document).on('click', '#use-current-location-btn', useCurrentLocation);

    // Handle clear marker button
    $(document).on('click', '#clear-map-marker-btn', clearMarker);
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

      // Load map coordinates if available
      // Handle both formats: separate latitude/longitude or coordinates string
      let lat = null;
      let lng = null;
      
      if (userData.latitude && userData.longitude) {
        // Direct latitude/longitude fields
        lat = parseFloat(userData.latitude);
        lng = parseFloat(userData.longitude);
      } else if (userData.coordinates && typeof userData.coordinates === 'string') {
        // Coordinates as string "lat,lng"
        const coords = userData.coordinates.split(',');
        if (coords.length >= 2) {
          lat = parseFloat(coords[0].trim());
          lng = parseFloat(coords[1].trim());
        }
      }
      
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lng;
        
        // Set marker on map (wait for map to be initialized)
        // The map initialization will handle this after it loads
      }

      // Hide loading, show form
      loadingEl.style.display = 'none';
      formEl.style.display = 'block';

      // Initialize map after form is visible
      setTimeout(() => {
        if (typeof L !== 'undefined') {
          initializeMap();
        } else {
          console.error('Leaflet library not loaded');
          // Try again after a short delay
          setTimeout(() => {
            if (typeof L !== 'undefined') {
              initializeMap();
            }
          }, 1000);
        }
      }, 100);

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
      const latitude = document.getElementById('latitude').value.trim();
      const longitude = document.getElementById('longitude').value.trim();
      
      if (phone) {
        userData.phone = phone;
      }
      
      if (address) {
        userData.address = address;
      }

      // Add coordinates if marker is set
      // API expects coordinates as a string in format "lat,lng"
      if (latitude && longitude) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          // Format as "latitude,longitude" string (API expects this format)
          userData.coordinates = `${lat},${lng}`;
        }
      }

      // Validate required fields
      if (!userData.firstName || !userData.lastName) {
        throw new Error('First name and last name are required');
      }

      // Update user profile
      const response = await window.ECommerceAPI.Auth.updateCurrentUser(userData);

      // Fetch updated user data from API to ensure we have the latest information
      try {
        const updatedUser = await window.ECommerceAPI.Auth.getCurrentUser();
        if (updatedUser) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error('Error fetching updated user:', error);
        // Fallback: update localStorage with what we sent
        const currentUser = window.ECommerceAPI.Auth.getUser();
        if (currentUser) {
          const lat = userData.latitude;
          const lng = userData.longitude;
          const updatedUser = {
            ...currentUser,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone || currentUser.phone,
            address: userData.address || currentUser.address,
            latitude: lat || currentUser.latitude,
            longitude: lng || currentUser.longitude,
            coordinates: userData.coordinates || currentUser.coordinates
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
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

  /**
   * Initialize Leaflet map
   */
  function initializeMap() {
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
      console.error('Leaflet library is not loaded');
      return;
    }

    const mapContainer = document.getElementById('address-map');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    // Check if map is already initialized
    if (map) {
      map.remove();
      map = null;
    }

    try {
      // Initialize map centered on Beirut, Lebanon
      map = L.map('address-map', {
        zoomControl: true,
        doubleClickZoom: true,
        scrollWheelZoom: true
      }).setView(defaultCenter, 13);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Force map to resize after initialization
      setTimeout(() => {
        if (map) {
          map.invalidateSize();
        }
      }, 100);

      // Handle map clicks to place marker
      map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        setMarker(lat, lng);
      });

      // Load existing marker if coordinates exist
      const latInput = document.getElementById('latitude');
      const lngInput = document.getElementById('longitude');
      if (latInput && lngInput && latInput.value && lngInput.value) {
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);
        if (!isNaN(lat) && !isNaN(lng)) {
          setTimeout(() => {
            setMarker(lat, lng);
          }, 200);
        }
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  /**
   * Set marker on map at specified coordinates
   */
  function setMarker(lat, lng) {
    // Remove existing marker
    if (marker) {
      map.removeLayer(marker);
    }

    // Create custom icon
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #4A9EFF; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div><div style="background-color: #4A9EFF; width: 8px; height: 8px; border-radius: 50%; margin: -15px auto 0; border: 2px solid white;"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    // Add new marker
    marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

    // Center map on marker
    map.setView([lat, lng], 15);

    // Update hidden inputs
    document.getElementById('latitude').value = lat.toFixed(6);
    document.getElementById('longitude').value = lng.toFixed(6);

    // Show coordinates display
    document.getElementById('map-coordinates').style.display = 'block';
    document.getElementById('lat-lng-display').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    // Try to get address from coordinates (reverse geocoding)
    getAddressFromCoordinates(lat, lng);
  }

  /**
   * Get address from coordinates using Nominatim (OpenStreetMap)
   */
  async function getAddressFromCoordinates(lat, lng) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      
      if (data && data.display_name) {
        const addressTextarea = document.getElementById('address');
        if (!addressTextarea.value.trim()) {
          addressTextarea.value = data.display_name;
        }
      }
    } catch (error) {
      console.log('Could not fetch address from coordinates:', error);
    }
  }

  /**
   * Use current location
   */
  function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    const btn = document.getElementById('use-current-location-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="margin-right: 8px;"></span>Getting location...';

    navigator.geolocation.getCurrentPosition(
      function(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMarker(lat, lng);
        btn.disabled = false;
        btn.innerHTML = originalText;
      },
      function(error) {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please allow location access or click on the map to mark your location.');
        btn.disabled = false;
        btn.innerHTML = originalText;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  /**
   * Clear marker from map
   */
  function clearMarker() {
    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }
    
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
    document.getElementById('map-coordinates').style.display = 'none';
  }

})(jQuery);

