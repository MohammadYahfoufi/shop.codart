/**
 * Wishlist Page JavaScript
 * Handles loading and managing wishlist items on the wishlist page
 */

(function($) {
  'use strict';

  let wishlistItems = [];
  let allProducts = [];

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

    // Load wishlist
    loadWishlist();

    // Clear all wishlist button
    $('#clear-wishlist-btn').on('click', function() {
      if (confirm('Are you sure you want to clear all items from your wishlist?')) {
        clearAllWishlist();
      }
    });
  });

  /**
   * Load wishlist from API
   */
  async function loadWishlist() {
    const loadingEl = document.getElementById('wishlist-loading');
    const emptyEl = document.getElementById('wishlist-empty');
    const itemsEl = document.getElementById('wishlist-items');
    const clearBtn = document.getElementById('clear-wishlist-btn');

    try {
      // Show loading state
      loadingEl.style.display = 'block';
      emptyEl.style.display = 'none';
      itemsEl.style.display = 'none';
      clearBtn.style.display = 'none';

      // Fetch wishlist
      const wishlist = await window.ECommerceAPI.Wishlist.getAll();
      
      // Handle different response formats
      let items = wishlist;
      if (wishlist && Array.isArray(wishlist)) {
        items = wishlist;
      } else if (wishlist && wishlist.items && Array.isArray(wishlist.items)) {
        items = wishlist.items;
      } else if (wishlist && wishlist.data && Array.isArray(wishlist.data)) {
        items = wishlist.data;
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        // Empty wishlist
        loadingEl.style.display = 'none';
        emptyEl.style.display = 'block';
        itemsEl.style.display = 'none';
        clearBtn.style.display = 'none';
        return;
      }

      // Extract product IDs
      const productIds = items.map(item => {
        return item.productId || item.product?.id || item.id;
      }).filter(id => id);

      if (productIds.length === 0) {
        loadingEl.style.display = 'none';
        emptyEl.style.display = 'block';
        itemsEl.style.display = 'none';
        clearBtn.style.display = 'none';
        return;
      }

      // Fetch all products to get details
      const productsResponse = await window.ECommerceAPI.Products.getAll();
      let products = productsResponse;
      if (productsResponse && Array.isArray(productsResponse)) {
        products = productsResponse;
      } else if (productsResponse && productsResponse.data && Array.isArray(productsResponse.data)) {
        products = productsResponse.data;
      } else if (productsResponse && productsResponse.products && Array.isArray(productsResponse.products)) {
        products = productsResponse.products;
      }

      allProducts = products || [];

      // Filter products that are in wishlist
      wishlistItems = allProducts.filter(product => {
        return productIds.includes(String(product.id)) || productIds.includes(product.id);
      });

      // Render wishlist items
      renderWishlistItems();

    } catch (error) {
      console.error('Error loading wishlist:', error);
      loadingEl.style.display = 'none';
      showError('Failed to load wishlist. Please try again.');
    }
  }

  /**
   * Render wishlist items
   */
  function renderWishlistItems() {
    const loadingEl = document.getElementById('wishlist-loading');
    const emptyEl = document.getElementById('wishlist-empty');
    const itemsEl = document.getElementById('wishlist-items');
    const clearBtn = document.getElementById('clear-wishlist-btn');

    // Clear existing items
    itemsEl.innerHTML = '';

    if (wishlistItems.length === 0) {
      loadingEl.style.display = 'none';
      emptyEl.style.display = 'block';
      itemsEl.style.display = 'none';
      clearBtn.style.display = 'none';
      return;
    }

    // Hide loading and empty, show items
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'none';
    itemsEl.style.display = 'flex';
    clearBtn.style.display = 'block';

    // Render each wishlist item
    wishlistItems.forEach(product => {
      const productCard = createWishlistProductCard(product);
      itemsEl.insertAdjacentHTML('beforeend', productCard);
    });
  }

  /**
   * Create a product card for wishlist item
   */
  function createWishlistProductCard(product) {
    const defaultImage = 'images/product-thumb-1.png';
    const productImage = product.image || product.images?.[0] || product.imageUrl || defaultImage;
    const price = product.price || 0;
    const discount = product.discount || 0;
    const discountPercentage = discount > 0 ? Math.round((discount / (price + discount)) * 100) : 0;

    return `
      <div class="col">
        <div class="product-item" data-product-id="${product.id}">
          ${discountPercentage > 0 ? `<span class="badge bg-success position-absolute m-3">-${discountPercentage}%</span>` : ''}
          <button class="btn-wishlist position-absolute top-0 end-0 m-3 bg-white rounded-circle border-0 p-2" 
                  data-product-id="${product.id}" 
                  style="z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <svg width="20" height="20" viewBox="0 0 24 24" style="color: #e91e63;">
              <path fill="currentColor" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78l1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/>
            </svg>
          </button>
          <figure>
            <a href="#" class="product-link" data-product-id="${product.id}" title="${product.name || 'Product'}">
              <img src="${productImage}" alt="${product.name || 'Product'}" class="tab-image" onerror="this.src='${defaultImage}'">
            </a>
          </figure>
          <h3>${product.name || 'Product Name'}</h3>
          ${product.description ? `<p class="text-muted small">${product.description.substring(0, 60)}...</p>` : ''}
          <span class="qty">${product.quantity || '1'} ${product.unit || 'Unit'}</span>
          <span class="rating">
            <svg width="24" height="24" class="text-primary"><use xlink:href="#star-solid"></use></svg>
            ${product.rating || '4.5'}
          </span>
          <span class="price">$${price.toFixed(2)}</span>
          ${discount > 0 ? `<span class="old-price text-muted text-decoration-line-through">$${(price + discount).toFixed(2)}</span>` : ''}
          <div class="d-flex align-items-center justify-content-between mt-2">
            <a href="#" class="nav-link add-to-cart-btn" data-product-id="${product.id}">
              Add to Cart <iconify-icon icon="uil:shopping-cart"></iconify-icon>
            </a>
            <button class="btn btn-outline-danger btn-sm remove-wishlist-item" data-product-id="${product.id}" title="Remove from wishlist">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <use xlink:href="#trash"></use>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Remove item from wishlist
   */
  async function removeFromWishlist(productId) {
    if (!window.ECommerceAPI || !window.ECommerceAPI.Wishlist) {
      showError('Wishlist service not available');
      return;
    }

    try {
      await window.ECommerceAPI.Wishlist.remove(productId);
      
      // Remove from local array
      wishlistItems = wishlistItems.filter(item => item.id !== productId && String(item.id) !== String(productId));
      
      // Re-render
      renderWishlistItems();
      
      showSuccess('Product removed from wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      const errorMessage = error?.message || error?.data?.message || 'Failed to remove item';
      showError(errorMessage);
    }
  }

  /**
   * Clear all wishlist items
   */
  async function clearAllWishlist() {
    if (!window.ECommerceAPI || !window.ECommerceAPI.Wishlist) {
      showError('Wishlist service not available');
      return;
    }

    try {
      await window.ECommerceAPI.Wishlist.clear();
      
      // Clear local array
      wishlistItems = [];
      
      // Re-render (will show empty state)
      renderWishlistItems();
      
      showSuccess('All items removed from wishlist');
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      const errorMessage = error?.message || error?.data?.message || 'Failed to clear wishlist';
      showError(errorMessage);
    }
  }

  /**
   * Show success message
   */
  function showSuccess(message) {
    const existingMsg = document.querySelector('.wishlist-message');
    if (existingMsg) {
      existingMsg.remove();
    }
    
    const successMsg = document.createElement('div');
    successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 wishlist-message';
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
    const existingMsg = document.querySelector('.wishlist-message');
    if (existingMsg) {
      existingMsg.remove();
    }
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 wishlist-message';
    errorMsg.style.zIndex = '9999';
    errorMsg.innerHTML = `
      <strong>${message}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(errorMsg);
    setTimeout(() => errorMsg.remove(), 3000);
  }

  // Event delegation for remove buttons
  $(document).on('click', '.remove-wishlist-item', function(e) {
    e.preventDefault();
    const productId = $(this).data('product-id');
    if (productId) {
      removeFromWishlist(productId);
    }
  });

  // Event delegation for wishlist button (toggle)
  $(document).on('click', '.btn-wishlist', function(e) {
    e.preventDefault();
    const productId = $(this).data('product-id');
    if (productId) {
      removeFromWishlist(productId);
    }
  });

  // Event delegation for add to cart
  $(document).on('click', '.add-to-cart-btn', async function(e) {
    e.preventDefault();
    
    if (!window.ECommerceAPI || !window.ECommerceAPI.Cart) {
      showError('Cart service not available');
      return;
    }
    
    if (!window.ECommerceAPI.Auth || !window.ECommerceAPI.Auth.isAuthenticated()) {
      showError('Please login to add items to cart');
      return;
    }
    
    const productId = $(this).data('product-id');
    if (productId) {
      try {
        await window.ECommerceAPI.Cart.add(productId, 1);
        showSuccess('Product added to cart!');
      } catch (error) {
        console.error('Error adding to cart:', error);
        const errorMessage = error?.message || error?.data?.message || 'Failed to add product to cart';
        showError(errorMessage);
      }
    }
  });

})(jQuery);

