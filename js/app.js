/**
 * Main Application Integration
 * Connects the API with the UI
 */

(function($) {
  'use strict';

  // Initialize app when DOM is ready
  $(document).ready(function() {
    initApp();
  });

  function initApp() {
    // Check if APIs are loaded
    if (!window.ECommerceAPI) {
      console.error('ECommerceAPI not loaded. Check if api.js is loaded correctly.');
      return;
    }
    
    if (!window.ProductRenderer) {
      console.error('ProductRenderer not loaded. Check if product-renderer.js is loaded correctly.');
      return;
    }
    
    // Wait a bit for everything to be ready
    setTimeout(() => {
      // Load products on page load
      loadProducts();
      loadCategories();
      
      // Setup event handlers (includes auth handlers)
      setupEventHandlers();
      
      // Setup profile handlers
      setupProfileHandlers();
      
      // Update user display on page load
      updateUserDisplay();
      
    // Update cart count and load cart if user is logged in
    if (window.ECommerceAPI && window.ECommerceAPI.Auth && window.ECommerceAPI.Auth.isAuthenticated()) {
      updateCartCount();
      loadCart();
      loadWishlist();
    }
    }, 100);
  }

  // Wishlist state management
  let wishlistItems = new Set(); // Store product IDs in wishlist
  
  // Retry configuration
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  
  /**
   * Load products from API with retry mechanism
   */
  async function loadProducts(retryCount = 0) {
    
    // Check if API is available
    if (!window.ECommerceAPI || !window.ECommerceAPI.Products) {
      console.warn('ECommerceAPI.Products not available');
      return;
    }
    
    try {
      // Show loading state (optional)
      const productGrid = document.querySelector('.product-grid');
      const existingProducts = productGrid ? productGrid.children.length : 0;
      
      if (productGrid && retryCount === 0) {
        // Only show loading if there are no existing products
        if (existingProducts === 0) {
          productGrid.innerHTML = '<div class="col-12"><p class="text-center">Loading products...</p></div>';
        }
      }

      console.log('Loading products from API...');
      const response = await window.ECommerceAPI.Products.getAll();
      console.log('Products API response:', response);
      
      // Handle different response formats
      let products = response;
      if (response && response.data && Array.isArray(response.data)) {
        products = response.data;
      } else if (response && Array.isArray(response)) {
        products = response;
      } else if (response && response.products && Array.isArray(response.products)) {
        products = response.products;
      }
      
      console.log('Processed products:', products);
      
      if (products && Array.isArray(products) && products.length > 0) {
        // Render products in the main product grid
        if (productGrid) {
          productGrid.innerHTML = '';
          products.forEach(product => {
            window.ProductRenderer.renderProduct(product, productGrid);
          });
          
          // Reinitialize product quantity controls
          if (window.initProductQty) {
            window.initProductQty();
          }
          
          // Update wishlist buttons after products are rendered
          updateWishlistButtons();
        }

        // Render products in carousels
        const carousels = document.querySelectorAll('.products-carousel .swiper-wrapper');
        carousels.forEach((carousel, index) => {
          // Clear existing products in carousel
          carousel.innerHTML = '';
          
          // Get the parent products-carousel element
          const productsCarouselEl = carousel.closest('.products-carousel');
          if (!productsCarouselEl) {
            console.warn('Could not find products-carousel parent for carousel', index);
            return;
          }
          
          // Render first 6-10 products directly in carousel
          const carouselProducts = products.slice(0, Math.min(10, products.length));
          carouselProducts.forEach(product => {
            const defaultImage = 'images/powerbank.png';
            const productImage = product.image || product.images?.[0] || defaultImage;
            const price = product.price || 0;
            const discount = product.discount || 0;
            
            const slide = document.createElement('div');
            slide.className = 'product-item swiper-slide';
            slide.setAttribute('data-product-id', product.id);
            
            slide.innerHTML = `
              <a href="#" class="btn-wishlist" data-product-id="${product.id}">
                <svg width="24" height="24"><use xlink:href="#heart"></use></svg>
              </a>
              <figure>
                <a href="#" class="product-link" data-product-id="${product.id}" title="${product.name || 'Product'}">
                  <img src="${productImage}" alt="${product.name || 'Product'}" class="tab-image" onerror="this.src='${defaultImage}'">
                </a>
              </figure>
              <h3>${product.name || 'Product Name'}</h3>
              <span class="qty">${product.quantity || '1'} ${product.unit || 'Unit'}</span>
              <span class="price">$${price.toFixed(2)}</span>
              <div class="d-flex align-items-center justify-content-between">
                <div class="input-group product-qty">
                  <span class="input-group-btn">
                    <button type="button" class="quantity-left-minus btn btn-danger btn-number" data-type="minus" data-product-id="${product.id}">
                      <svg width="16" height="16"><use xlink:href="#minus"></use></svg>
                    </button>
                  </span>
                  <input type="text" id="quantity-${product.id}" name="quantity" class="form-control input-number" value="1" min="1">
                  <span class="input-group-btn">
                    <button type="button" class="quantity-right-plus btn btn-success btn-number" data-type="plus" data-product-id="${product.id}">
                      <svg width="16" height="16"><use xlink:href="#plus"></use></svg>
                    </button>
                  </span>
                </div>
                <a href="#" class="nav-link add-to-cart-btn" data-product-id="${product.id}">
                  Add to Cart <iconify-icon icon="uil:shopping-cart"></iconify-icon>
                </a>
              </div>
            `;
            
            carousel.appendChild(slide);
          });
          
          // Reinitialize Swiper for this carousel after products are added
          setTimeout(() => {
            const carouselEl = carousel.parentElement;
            if (carouselEl && window.Swiper) {
              // Destroy existing instance if it exists
              if (carouselEl.swiper) {
                carouselEl.swiper.destroy(true, true);
              }
              
              // Reinitialize Swiper
              try {
                new Swiper(carouselEl, {
                  slidesPerView: 4,
                  spaceBetween: 30,
                  speed: 500,
                  navigation: {
                    nextEl: carouselEl.querySelector('.swiper-next'),
                    prevEl: carouselEl.querySelector('.swiper-prev'),
                  },
                  breakpoints: {
                    0: {
                      slidesPerView: 1,
                    },
                    768: {
                      slidesPerView: 2,
                    },
                    991: {
                      slidesPerView: 3,
                    },
                    1500: {
                      slidesPerView: 4,
                    },
                  }
                });
                console.log(`Product carousel ${index + 1} reinitialized successfully`);
              } catch (swiperError) {
                console.warn(`Could not reinitialize product carousel ${index + 1}:`, swiperError);
              }
            }
            
            // Update wishlist buttons after carousel is initialized
            updateWishlistButtons();
          }, 200 * (index + 1)); // Stagger initialization to avoid conflicts
        });
      } else {
        console.warn('No products found');
        // Show message in product grid
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) {
          productGrid.innerHTML = '<div class="col-12"><p class="text-center text-muted">No products available</p></div>';
        }
        
        // Show message in carousels
        const carousels = document.querySelectorAll('.products-carousel .swiper-wrapper');
        carousels.forEach(carousel => {
          carousel.innerHTML = '<div class="col-12"><p class="text-center text-muted">No products available</p></div>';
        });
      }
    } catch (error) {
      console.error('Error loading products:', error);
      const productGrid = document.querySelector('.product-grid');
      if (productGrid) {
        const errorMessage = error?.message || error?.error || 'Unknown error';
        const status = error?.status || '';
        
        // Special handling for 500 errors
        if (status === 500) {
          // Retry if we haven't exceeded max retries
          if (retryCount < MAX_RETRIES) {
            console.log(`Retrying product load... (${retryCount + 1}/${MAX_RETRIES})`);
            
            if (productGrid) {
              productGrid.innerHTML = `
                <div class="col-12">
                  <div class="alert alert-info text-center" role="alert">
                    <p class="mb-2">⏳ API server error detected. Retrying in ${RETRY_DELAY / 1000} seconds...</p>
                    <p class="small text-muted mb-0">Attempt ${retryCount + 1} of ${MAX_RETRIES}</p>
                  </div>
                </div>
              `;
            }
            
            // Retry after delay
            setTimeout(() => {
              loadProducts(retryCount + 1);
            }, RETRY_DELAY);
            return;
          }
          
          // Show error message with retry button
          if (productGrid) {
            productGrid.innerHTML = `
              <div class="col-12">
                <div class="alert alert-warning text-center" role="alert">
                  <h5 class="alert-heading">⚠️ API Server Error</h5>
                  <p>The API server is experiencing issues (Error 500). This is a server-side problem.</p>
                  <hr>
                  <button class="btn btn-primary btn-sm mt-2" onclick="window.loadProducts()">
                    🔄 Retry Loading Products
                  </button>
                  <p class="mb-0 small text-muted mt-3">
                    The website will continue to work, but products cannot be loaded from the API at this time.
                    <br><strong>What you can do:</strong>
                    <br>• Click the retry button above
                    <br>• Refresh the page in a few moments
                    <br>• Check back later when the API server is fixed
                    <br>• Contact the API administrator if the issue persists
                  </p>
                </div>
                <p class="text-center text-muted small mt-3">Technical details: ${errorMessage}</p>
              </div>
            `;
          }
        } else {
          // For other errors, show message with retry option
          const statusText = status ? ` (${status})` : '';
          if (productGrid) {
            productGrid.innerHTML = `
              <div class="col-12">
                <div class="alert alert-danger text-center" role="alert">
                  <h6 class="alert-heading">Unable to load products${statusText}</h6>
                  <p class="mb-2">
                    ${errorMessage.includes('Network') ? 'Check your internet connection.' : 'The API might be temporarily unavailable.'}
                  </p>
                  <button class="btn btn-primary btn-sm mt-2" onclick="window.loadProducts()">
                    🔄 Retry Loading Products
                  </button>
                  <p class="text-center text-muted small mt-3">Error: ${errorMessage}</p>
                </div>
              </div>
            `;
          }
        }
      }
      // Don't throw error - let page continue working
    }
  }

  /**
   * Load categories from API and populate dropdown and carousel
   */
  async function loadCategories() {
    // Check if API is available
    if (!window.ECommerceAPI || !window.ECommerceAPI.Categories) {
      console.warn('ECommerceAPI.Categories not available');
      return;
    }
    
    try {
      console.log('Loading categories from API...');
      const response = await window.ECommerceAPI.Categories.getAll();
      console.log('Categories API response:', response);
      
      // Handle different response formats
      let categories = response;
      if (response && response.data && Array.isArray(response.data)) {
        categories = response.data;
      } else if (response && Array.isArray(response)) {
        categories = response;
      } else if (response && response.categories && Array.isArray(response.categories)) {
        categories = response.categories;
      }
      
      console.log('Processed categories:', categories);
      
      if (categories && Array.isArray(categories) && categories.length > 0) {
        // Populate category dropdown menu
        const categoryDropdownMenu = document.getElementById('categoryDropdownMenu');
        if (categoryDropdownMenu) {
          // Keep "All Categories" option, then add API categories
          const allCategoriesOption = categoryDropdownMenu.querySelector('.dropdown-option[data-value="All Categories"]');
          categoryDropdownMenu.innerHTML = '';
          
          // Re-add "All Categories" option
          if (allCategoriesOption) {
            categoryDropdownMenu.appendChild(allCategoriesOption.cloneNode(true));
          } else {
            const allCatOption = document.createElement('li');
            allCatOption.className = 'dropdown-option active';
            allCatOption.setAttribute('data-value', 'All Categories');
            allCatOption.innerHTML = '<span class="dropdown-option-text">All Categories</span>';
            categoryDropdownMenu.appendChild(allCatOption);
          }
          
          // Add categories from API
          categories.forEach(category => {
            const categoryOption = document.createElement('li');
            categoryOption.className = 'dropdown-option';
            categoryOption.setAttribute('data-value', category.name || category.id);
            categoryOption.setAttribute('data-category-id', category.id);
            
            const iconHtml = category.image ? 
              `<img src="${category.image}" alt="" class="dropdown-icon" onerror="this.style.display='none'">` : '';
            
            categoryOption.innerHTML = `
              ${iconHtml}
              <span class="dropdown-option-text">${category.name || 'Unnamed Category'}</span>
            `;
            categoryDropdownMenu.appendChild(categoryOption);
          });
          
          // Reinitialize dropdown
          if (window.initCustomDropdown) {
            window.initCustomDropdown();
          }
        }
        
        // Populate category carousel
        const categoryCarousel = document.querySelector('.category-carousel .swiper-wrapper');
        if (categoryCarousel) {
          console.log('Found category carousel wrapper, clearing and populating...');
          categoryCarousel.innerHTML = '';
          
          categories.forEach((category, index) => {
            console.log(`Adding category ${index + 1}:`, category.name || category.id);
            const categoryItem = document.createElement('a');
            categoryItem.href = '#';
            categoryItem.className = 'nav-link category-item swiper-slide';
            categoryItem.setAttribute('data-category-id', category.id);
            
            // Get Photoroom icon path
            const photoroomIcon = category.image || (window.ProductRenderer ? window.ProductRenderer.getCategoryIcon(category.name) : null);
            // Get fallback icon (Photoroom icons)
            const fallbackIcon = window.ProductRenderer ? window.ProductRenderer.getFallbackIcon(category.name) : 'images/icons/electronics-Photoroom.png';
            
            // Use Photoroom icon if available, otherwise use fallback
            const iconSrc = photoroomIcon || fallbackIcon;

            categoryItem.innerHTML = `
              <img src="${iconSrc}" alt="${category.name || 'Category'}" onerror="console.log('Failed to load ${iconSrc}, using fallback'); this.src='${fallbackIcon}';" style="width: auto; height: 80px; object-fit: contain; display: block;">
              <h3 class="category-title">${category.name || 'Unnamed Category'}</h3>
            `;
            categoryCarousel.appendChild(categoryItem);
          });
          
          console.log(`Added ${categories.length} categories to carousel. DOM element children count:`, categoryCarousel.children.length);
          
          // Reinitialize Swiper if it exists
          if (window.Swiper) {
            const swiperEl = document.querySelector('.category-carousel');
            if (swiperEl) {
              // Destroy existing instance if it exists
              if (swiperEl.swiper) {
                swiperEl.swiper.destroy(true, true);
              }
              
              // Wait a bit for DOM to update, then reinitialize
              setTimeout(() => {
                try {
                  console.log('Reinitializing category Swiper with', categories.length, 'categories');
                  const categorySwiper = new Swiper(".category-carousel", {
                    slidesPerView: 6,
                    spaceBetween: 30,
                    speed: 500,
                    navigation: {
                      nextEl: ".category-carousel-next",
                      prevEl: ".category-carousel-prev",
                    },
                    breakpoints: {
                      0: {
                        slidesPerView: 2,
                      },
                      768: {
                        slidesPerView: 3,
                      },
                      991: {
                        slidesPerView: 4,
                      },
                      1500: {
                        slidesPerView: 6,
                      },
                    }
                  });
                  console.log('Category Swiper initialized successfully');
                } catch (swiperError) {
                  console.error('Could not reinitialize category Swiper:', swiperError);
                }
              }, 200); // Increased timeout to ensure DOM is updated
            } else {
              console.warn('Category carousel element not found');
            }
          } else {
            console.warn('Swiper library not available');
          }
        }
      } else {
        console.warn('No categories found or empty array:', categories);
        // Show a message in the carousel if no categories
        const categoryCarousel = document.querySelector('.category-carousel .swiper-wrapper');
        if (categoryCarousel) {
          categoryCarousel.innerHTML = '<div class="col-12 text-center p-4"><p class="text-muted">No categories available</p></div>';
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Show error message in carousel
      const categoryCarousel = document.querySelector('.category-carousel .swiper-wrapper');
      if (categoryCarousel) {
        categoryCarousel.innerHTML = '<div class="col-12 text-center p-4"><p class="text-danger">Failed to load categories. Please refresh the page.</p></div>';
      }
      // Don't throw error - page should still work without categories
    }
  }

  /**
   * Setup authentication handlers
   */
  function setupAuthHandlers() {
    // Check if API is available
    if (!window.ECommerceAPI || !window.ECommerceAPI.Auth) {
      console.warn('ECommerceAPI.Auth not available');
      return;
    }
    
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        if (!window.ECommerceAPI || !window.ECommerceAPI.Auth) {
          errorDiv.textContent = 'Authentication service not available. Please refresh the page.';
          errorDiv.classList.remove('d-none');
          return;
        }
        
        try {
          // Clear previous errors
          errorDiv.classList.add('d-none');
          errorDiv.textContent = '';
          
          const response = await window.ECommerceAPI.Auth.login({ email, password });
          
          // Log response for debugging
          console.log('Login response:', response);
          
          // Check various response formats - API might return different structures
          const tokenInResponse = response && (
            response.accessToken || 
            response.token || 
            response.data?.accessToken ||
            response.data?.token
          );
          
          const userInResponse = response && (
            response.user || 
            response.data?.user ||
            response.data
          );
          
          // Check if token was actually saved (most reliable check)
          const tokenSaved = window.ECommerceAPI.TokenManager.getToken();
          const userSaved = window.ECommerceAPI.Auth.getUser();
          const isAuthenticated = window.ECommerceAPI.Auth.isAuthenticated();
          
          console.log('Auth check:', {
            tokenInResponse,
            tokenSaved,
            userInResponse,
            userSaved,
            isAuthenticated
          });
          
          // Login successful if we have ANY indication of success
          // Check if response exists (not null/undefined) - means API call succeeded
          if (response) {
            // Check if token was saved during API call (most reliable)
            const tokenWasSaved = response._tokenSaved || tokenSaved || isAuthenticated;
            
            // If we have a token anywhere, save it and proceed
            if (tokenInResponse || tokenWasSaved || isAuthenticated) {
              // Wait a moment for token to be stored
              await new Promise(resolve => setTimeout(resolve, 150));
              
              // Double check authentication after wait
              const finalAuthCheck = window.ECommerceAPI.Auth.isAuthenticated();
              
              if (finalAuthCheck || tokenSaved || tokenInResponse) {
                // Close modal - try multiple methods
                const authModalEl = document.getElementById('authModal');
                if (authModalEl) {
                  // Try Bootstrap 5 method
                  const modal = bootstrap?.Modal?.getInstance(authModalEl);
                  if (modal) {
                    modal.hide();
                  } else {
                    // Fallback: manually hide modal
                    authModalEl.classList.remove('show');
                    authModalEl.setAttribute('aria-hidden', 'true');
                    authModalEl.removeAttribute('aria-modal');
                    authModalEl.style.display = 'none';
                    
                    // Remove backdrop
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) {
                      backdrop.remove();
                    }
                    
                    // Restore body
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                  }
                }
                
                // Clear form
                document.getElementById('loginEmail').value = '';
                document.getElementById('loginPassword').value = '';
                
                // Update UI immediately
                updateUserDisplay();
                
                // Update cart after a short delay
                setTimeout(() => {
                  updateCartCount();
                  loadCart();
                  loadWishlist();
                }, 200);
                
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
                successMsg.style.zIndex = '9999';
                successMsg.innerHTML = `
                  <strong>Login successful!</strong> Welcome back!
                  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                document.body.appendChild(successMsg);
                setTimeout(() => successMsg.remove(), 3000);
                return; // Exit successfully
              }
            }
            
            // If we get here, response exists but no token - try to extract manually
            // This handles cases where API returns success but token isn't extracted properly
            const possibleToken = 
              response.accessToken || 
              response.token || 
              response.data?.accessToken ||
              response.data?.token ||
              response.access_token;
            
            if (possibleToken) {
              console.log('Manually saving token from response');
              window.ECommerceAPI.TokenManager.setToken(possibleToken);
              
              const possibleRefreshToken = 
                response.refreshToken || 
                response.refresh || 
                response.data?.refreshToken ||
                response.refresh_token;
              
              if (possibleRefreshToken) {
                window.ECommerceAPI.TokenManager.setRefreshToken(possibleRefreshToken);
              }
              
              // Save user data if available
              if (userInResponse) {
                const user = response.user || response.data?.user || response.data;
                if (user && typeof user === 'object' && !user.accessToken) {
                  localStorage.setItem('user', JSON.stringify(user));
                }
              }
              
              // Wait and check again
              await new Promise(resolve => setTimeout(resolve, 150));
              
              if (window.ECommerceAPI.Auth.isAuthenticated()) {
                // Close modal - try multiple methods
                const authModalEl = document.getElementById('authModal');
                if (authModalEl) {
                  const modal = bootstrap?.Modal?.getInstance(authModalEl);
                  if (modal) {
                    modal.hide();
                  } else {
                    authModalEl.classList.remove('show');
                    authModalEl.setAttribute('aria-hidden', 'true');
                    authModalEl.removeAttribute('aria-modal');
                    authModalEl.style.display = 'none';
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) backdrop.remove();
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                  }
                }
                
                document.getElementById('loginEmail').value = '';
                document.getElementById('loginPassword').value = '';
                
                setTimeout(() => {
                  updateUserDisplay();
                  updateCartCount();
                  loadCart();
                  loadWishlist();
                }, 200);
                
                const successMsg = document.createElement('div');
                successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
                successMsg.style.zIndex = '9999';
                successMsg.innerHTML = `<strong>Login successful!</strong> Welcome back!<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
                document.body.appendChild(successMsg);
                setTimeout(() => successMsg.remove(), 3000);
                return;
              }
            }
          }
          
          // If we get here, login likely failed
          console.error('Login failed - Response structure:', response);
          console.error('Available fields:', Object.keys(response || {}));
          
          // Check if response has error message
          const errorMsg = response?.message || response?.error || response?.data?.message || response?.data?.error;
          if (errorMsg) {
            throw new Error(errorMsg);
          }
          
          throw new Error('Login failed - No authentication token received. Please check your credentials and try again.');
        } catch (error) {
          let errorMessage = error?.message || error?.data?.message || 'Login failed. Please check your credentials.';
          
          // Special handling for 500 errors
          if (error?.status === 500) {
            errorMessage = 'Server error - The API server encountered an error. Please try again later.';
          }
          
          const status = error?.status && error.status !== 500 ? ` (Error ${error.status})` : '';
          errorDiv.textContent = `${errorMessage}${status}`;
          errorDiv.classList.remove('d-none');
          console.error('Login error:', error);
        }
      });
    }

    // Register form handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const firstName = document.getElementById('registerFirstName').value.trim();
        const lastName = document.getElementById('registerLastName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const errorDiv = document.getElementById('registerError');
        
        // Validation
        if (!firstName || !lastName) {
          errorDiv.textContent = 'Please enter both first name and last name.';
          errorDiv.classList.remove('d-none');
          return;
        }
        
        if (password !== confirmPassword) {
          errorDiv.textContent = 'Passwords do not match.';
          errorDiv.classList.remove('d-none');
          return;
        }

        try {
          const response = await window.ECommerceAPI.Auth.register({ 
            firstName,
            lastName,
            email, 
            password 
          });
          // Check if registration was successful
          const hasTokens = response && (response.accessToken || window.ECommerceAPI.TokenManager.getToken());
          const hasUser = response && (response.user || window.ECommerceAPI.Auth.getUser());
          
          if (hasTokens || hasUser) {
            // Verify authentication
            if (window.ECommerceAPI.Auth.isAuthenticated()) {
              // Close modal - try multiple methods
              const authModalEl = document.getElementById('authModal');
              if (authModalEl) {
                const modal = bootstrap?.Modal?.getInstance(authModalEl);
                if (modal) {
                  modal.hide();
                } else {
                  authModalEl.classList.remove('show');
                  authModalEl.setAttribute('aria-hidden', 'true');
                  authModalEl.removeAttribute('aria-modal');
                  authModalEl.style.display = 'none';
                  const backdrop = document.querySelector('.modal-backdrop');
                  if (backdrop) backdrop.remove();
                  document.body.classList.remove('modal-open');
                  document.body.style.overflow = '';
                  document.body.style.paddingRight = '';
                }
              }
              
              // Clear form
              document.getElementById('registerFirstName').value = '';
              document.getElementById('registerLastName').value = '';
              document.getElementById('registerEmail').value = '';
              document.getElementById('registerPassword').value = '';
              document.getElementById('registerConfirmPassword').value = '';
              
              // Update UI
              setTimeout(() => {
                updateUserDisplay();
                updateCartCount();
                loadCart();
                loadWishlist();
              }, 100);
              
              // Show success message
              const successMsg = document.createElement('div');
              successMsg.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
              successMsg.style.zIndex = '9999';
              successMsg.innerHTML = `
                <strong>Registration successful!</strong> You are now logged in.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
              `;
              document.body.appendChild(successMsg);
              setTimeout(() => successMsg.remove(), 3000);
            } else {
              throw new Error('Registration succeeded but authentication failed. Please login manually.');
            }
          } else {
            throw new Error('Registration failed - Invalid response from server.');
          }
        } catch (error) {
          let errorMessage = error?.message || error?.data?.message || 'Registration failed. Please try again.';
          
          // Special handling for 500 errors
          if (error?.status === 500) {
            errorMessage = 'Server error - The API server encountered an error. Please try again later.';
          }
          
          const status = error?.status && error.status !== 500 ? ` (Error ${error.status})` : '';
          errorDiv.textContent = `${errorMessage}${status}`;
          errorDiv.classList.remove('d-none');
          console.error('Registration error:', error);
        }
      });
    }

    // Update user display on page load
    updateUserDisplay();
  }

  /**
   * Update user display in header
   */
  function updateUserDisplay() {
    if (!window.ECommerceAPI || !window.ECommerceAPI.Auth) {
      return;
    }
    
    const userIconLink = document.getElementById('user-icon-link');
    const userInfoDisplay = document.getElementById('user-info-display');
    const userProfileMenu = document.getElementById('user-profile-menu');
    
    if (window.ECommerceAPI.Auth.isAuthenticated()) {
      const user = window.ECommerceAPI.Auth.getUser();
      if (user && userIconLink) {
        // Ensure it's a button (not anchor)
        if (userIconLink.tagName === 'A') {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = userIconLink.className;
          button.id = userIconLink.id;
          button.innerHTML = userIconLink.innerHTML;
          // Copy inline styles
          if (userIconLink.getAttribute('style')) {
            button.setAttribute('style', userIconLink.getAttribute('style'));
          }
          // Copy hover event handlers
          if (userIconLink.getAttribute('onmouseover')) {
            button.setAttribute('onmouseover', userIconLink.getAttribute('onmouseover'));
          }
          if (userIconLink.getAttribute('onmouseout')) {
            button.setAttribute('onmouseout', userIconLink.getAttribute('onmouseout'));
          }
          button.setAttribute('data-bs-toggle', 'dropdown');
          button.setAttribute('aria-expanded', 'false');
          userIconLink.parentNode.replaceChild(button, userIconLink);
          return updateUserDisplay(); // Recall with new button
        }
        
        // Remove modal attributes completely to prevent modal from opening
        // Do this BEFORE setting dropdown attributes to ensure no conflicts
        userIconLink.removeAttribute('data-bs-target');
        // Remove and re-add data-bs-toggle to ensure it's set correctly
        const currentToggle = userIconLink.getAttribute('data-bs-toggle');
        if (currentToggle === 'modal') {
          userIconLink.removeAttribute('data-bs-toggle');
        }
        
        // Set dropdown attributes
        userIconLink.setAttribute('data-bs-toggle', 'dropdown');
        userIconLink.setAttribute('aria-expanded', 'false');
        userIconLink.setAttribute('title', 'Profile Menu');
        
        // Dispose any existing modal instance that might be attached
        try {
          const authModal = document.getElementById('authModal');
          if (authModal) {
            const modalInstance = bootstrap?.Modal?.getInstance(authModal);
            if (modalInstance) {
              modalInstance.hide(); // Ensure modal is closed
            }
          }
        } catch (e) {
          // Ignore errors
        }
        
        // Show dropdown menu (it will be shown/hidden by Bootstrap dropdown)
        // Just make sure it's in the DOM and not hidden by our d-none class
        if (userProfileMenu) {
          userProfileMenu.classList.remove('d-none');
        }
        
        // Initialize Bootstrap dropdown
        try {
          const existingDropdown = bootstrap?.Dropdown?.getInstance(userIconLink);
          if (existingDropdown) {
            existingDropdown.dispose();
          }
          setTimeout(() => {
            try {
              new bootstrap.Dropdown(userIconLink);
            } catch (err) {
              console.log('Dropdown init error:', err);
            }
          }, 10);
        } catch (e) {
          console.log('Could not initialize dropdown:', e);
        }
        
        // Display user info if element exists
        if (userInfoDisplay) {
          let userName = user.name;
          if (!userName && user.firstName) {
            userName = user.firstName + (user.lastName ? ' ' + user.lastName : '');
          }
          if (!userName) {
            userName = user.email || 'User';
          }
          userInfoDisplay.textContent = userName;
          userInfoDisplay.classList.remove('d-none');
        }
      }
    } else {
      // Not logged in - setup login modal
      if (userIconLink) {
        // Hide dropdown menu
        if (userProfileMenu) {
          userProfileMenu.classList.add('d-none');
        }
        
        // Dispose dropdown if exists
        try {
          const dropdown = bootstrap?.Dropdown?.getInstance(userIconLink);
          if (dropdown) {
            dropdown.dispose();
          }
        } catch (e) {
          // Ignore errors
        }
        
        // If it's a button, convert to anchor for modal
        if (userIconLink.tagName === 'BUTTON') {
          const anchor = document.createElement('a');
          anchor.href = '#';
          anchor.className = userIconLink.className.replace('border-0', '');
          anchor.id = userIconLink.id;
          anchor.innerHTML = userIconLink.innerHTML;
          // Copy inline styles
          if (userIconLink.getAttribute('style')) {
            anchor.setAttribute('style', userIconLink.getAttribute('style'));
          }
          // Copy hover event handlers
          if (userIconLink.getAttribute('onmouseover')) {
            anchor.setAttribute('onmouseover', userIconLink.getAttribute('onmouseover'));
          }
          if (userIconLink.getAttribute('onmouseout')) {
            anchor.setAttribute('onmouseout', userIconLink.getAttribute('onmouseout'));
          }
          anchor.setAttribute('data-bs-toggle', 'modal');
          anchor.setAttribute('data-bs-target', '#authModal');
          anchor.setAttribute('title', 'Login / Register');
          userIconLink.parentNode.replaceChild(anchor, userIconLink);
        } else {
          userIconLink.setAttribute('data-bs-toggle', 'modal');
          userIconLink.setAttribute('data-bs-target', '#authModal');
          userIconLink.setAttribute('title', 'Login / Register');
        }
      }
      
      // Hide user info
      if (userInfoDisplay) {
        userInfoDisplay.classList.add('d-none');
        userInfoDisplay.textContent = '';
      }
    }
  }
  
  // Setup profile dropdown handlers (using event delegation)
  function setupProfileHandlers() {
    // Handle profile icon click - check auth and show appropriate menu
    // Use capture phase to intercept before Bootstrap's handlers
    document.addEventListener('click', function(e) {
      const userIconLink = document.getElementById('user-icon-link');
      if (!userIconLink) return;
      
      // Check if click is on the profile icon
      if (userIconLink === e.target || userIconLink.contains(e.target)) {
        // ALWAYS check authentication status FIRST before any other action
        const isAuthenticated = window.ECommerceAPI && window.ECommerceAPI.Auth && window.ECommerceAPI.Auth.isAuthenticated();
        
        if (isAuthenticated) {
          // User is logged in - prevent modal from opening at all costs
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Ensure modal attributes are removed immediately before any Bootstrap handlers run
          userIconLink.removeAttribute('data-bs-target');
          if (userIconLink.getAttribute('data-bs-toggle') === 'modal') {
            userIconLink.removeAttribute('data-bs-toggle');
          }
          
          // Ensure dropdown is set up correctly
          updateUserDisplay();
          
          // User is logged in - show dropdown menu
          const userProfileMenu = document.getElementById('user-profile-menu');
          
          // Show the dropdown menu
          if (userProfileMenu) {
            userProfileMenu.classList.remove('d-none');
            
            // Initialize or toggle Bootstrap dropdown
            setTimeout(() => {
              // Double-check modal attributes are still removed
              userIconLink.removeAttribute('data-bs-target');
              
              let dropdown = bootstrap?.Dropdown?.getInstance(userIconLink);
              if (!dropdown) {
                try {
                  dropdown = new bootstrap.Dropdown(userIconLink);
                } catch (err) {
                  console.log('Could not create dropdown:', err);
                }
              }
              if (dropdown) {
                dropdown.toggle();
              }
            }, 10);
          }
          
          return false;
        } else {
          // User is not logged in - show login modal
          // Ensure modal attributes are set
          if (userIconLink.tagName === 'A') {
            if (!userIconLink.getAttribute('data-bs-toggle') || userIconLink.getAttribute('data-bs-toggle') !== 'modal') {
              userIconLink.setAttribute('data-bs-toggle', 'modal');
              userIconLink.setAttribute('data-bs-target', '#authModal');
            }
          }
          
          // Don't prevent default - let Bootstrap handle the modal
          const modalElement = document.getElementById('authModal');
          if (modalElement && bootstrap?.Modal) {
            const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
            modal.show();
          }
          
          return false;
        }
      }
    }, true);
    
    // Use event delegation on document to handle dynamically shown elements
    document.addEventListener('click', async function(e) {
      // Edit Profile button - now navigates to edit-profile.html (handled by href link)
      // No need to handle click event since it's a regular link
      
      // Logout button in dropdown
      if (e.target.closest('#logout-btn-dropdown')) {
        e.preventDefault();
        e.stopPropagation();
        
        if (window.ECommerceAPI && window.ECommerceAPI.Auth) {
          await window.ECommerceAPI.Auth.logout();
          wishlistItems.clear();
          updateWishlistButtons();
          location.reload();
        }
      }
    });
  }

  /**
   * Setup event handlers
   */
  function setupEventHandlers() {
    // Setup authentication handlers
    setupAuthHandlers();
    // Add to cart buttons - handles both API products and static template products
    $(document).on('click', '.add-to-cart-btn, .nav-link:contains("Add to Cart")', async function(e) {
      e.preventDefault();
      
      if (!window.ECommerceAPI) {
        alert('API not loaded. Please refresh the page.');
        return;
      }
      
      if (!window.ECommerceAPI.Auth || !window.ECommerceAPI.Auth.isAuthenticated()) {
        alert('Please login to add items to cart');
        return;
      }

      if (!window.ECommerceAPI.Cart) {
        alert('Cart service not available. Please refresh the page.');
        return;
      }

      // Check if user has location/address set (warn but don't block)
      const user = window.ECommerceAPI.Auth.getUser();
      if (user && (!user.address || !user.latitude || !user.longitude)) {
        const setLocationNow = confirm('You haven\'t set your delivery address yet. You will need to set it before checkout.\n\nClick OK to set your address now, or Cancel to continue adding to cart.');
        if (setLocationNow) {
          window.location.href = 'edit-profile.html';
          return;
        }
      }

      // Check if product has API product ID
      const productId = $(this).data('product-id') || $(this).closest('.product-item').data('product-id');
      
      if (productId) {
        // Product from API - add directly to cart
        try {
          // Check authentication first
          if (!window.ECommerceAPI || !window.ECommerceAPI.Auth || !window.ECommerceAPI.Auth.isAuthenticated()) {
            alert('Please login to add items to your cart.');
            // Optionally open login modal
            const authModal = document.getElementById('authModal');
            if (authModal) {
              const bsModal = new bootstrap.Modal(authModal);
              bsModal.show();
            }
            return;
          }
          
          const quantityInput = $(`#quantity-${productId}`);
          const quantity = quantityInput.length ? parseInt(quantityInput.val()) || 1 : 1;
          
          // Get product price - fetch product details first
          let productPrice = 0;
          try {
            const product = await window.ECommerceAPI.Products.getById(productId);
            if (product && product.price !== undefined && product.price !== null) {
              productPrice = parseFloat(product.price) || 0;
            }
            
            // If product price is still 0, try to get it from the product card
            if (productPrice === 0) {
              const $productItem = $(this).closest('.product-item');
              const priceText = $productItem.find('.price').first().text().trim();
              if (priceText) {
                productPrice = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
              }
            }
          } catch (err) {
            console.warn('Could not fetch product price, trying to extract from DOM:', err);
            // Fallback: try to get price from DOM
            const $productItem = $(this).closest('.product-item');
            const priceText = $productItem.find('.price').first().text().trim();
            if (priceText) {
              productPrice = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
            }
          }
          
          // Validate price before adding to cart
          if (productPrice <= 0) {
            throw new Error('Product price is invalid. Please ensure the product has a valid price.');
          }
          
          // Ensure quantity is valid
          if (quantity <= 0) {
            quantity = 1;
          }
          
          await window.ECommerceAPI.Cart.add(productId, productPrice, quantity);
          
          // Update cart count and load cart
          await updateCartCount();
          await loadCart();
          
          // Show success message
          showSuccessMessage('Product added to cart!');
          
          // Optionally open cart offcanvas to show the item was added
          const cartOffcanvas = document.getElementById('offcanvasCart');
          if (cartOffcanvas) {
            const bsOffcanvas = bootstrap.Offcanvas.getInstance(cartOffcanvas);
            if (!bsOffcanvas) {
              const newOffcanvas = new bootstrap.Offcanvas(cartOffcanvas);
              newOffcanvas.show();
            } else {
              bsOffcanvas.show();
            }
          }
        } catch (error) {
          console.error('Error adding to cart:', error);
          let errorMessage = 'Failed to add product to cart';
          
          // Extract error message from various possible locations
          if (error?.message) {
            errorMessage = error.message;
          } else if (error?.data?.message) {
            errorMessage = error.data.message;
          } else if (error?.data?.error) {
            errorMessage = error.data.error;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          // Show user-friendly error message
          if (error?.status === 500) {
            errorMessage = 'Server error: ' + (errorMessage || 'The server encountered an error. Please try again.');
          } else if (error?.status === 400) {
            errorMessage = 'Invalid request: ' + (errorMessage || 'Please check product details.');
          } else if (error?.status === 401) {
            errorMessage = 'Please login to add items to cart';
            // Optionally redirect to login
          } else if (error?.status === 404) {
            errorMessage = 'Product not found. Please refresh the page.';
          }
          
          alert(`${errorMessage}\n\nIf this problem persists, please contact support.`);
        }
      } else {
        // Static template product - extract data and create/find in API first
        const $productItem = $(this).closest('.product-item');
        const productName = $productItem.find('h3').text().trim() || 'Product';
        const priceText = $productItem.find('.price').text().trim();
        const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
        const description = $productItem.find('p.text-muted').text().trim() || '';
        const imageSrc = $productItem.find('img').attr('src') || '';
        const quantityInput = $productItem.find('input[name="quantity"], #quantity');
        const quantity = quantityInput.length ? parseInt(quantityInput.val()) || 1 : 1;
        
        try {
          // First, try to find product in API by name
          let product = null;
          try {
            const allProducts = await window.ECommerceAPI.Products.getAll();
            product = allProducts.find(p => p.name && p.name.toLowerCase() === productName.toLowerCase());
          } catch (err) {
            console.warn('Could not search products:', err);
          }
          
          let apiProductId;
          
          if (product) {
            // Product exists in API - use it
            apiProductId = product.id;
            showSuccessMessage('Product found in catalog. Adding to cart...');
          } else {
            // Product doesn't exist - create it in API first
            showSuccessMessage('Creating product in catalog...');
            
            const newProduct = {
              name: productName,
              description: description || `${productName} - Available now`,
              price: price,
              stock: 100,
              imageUrl: imageSrc || 'images/powerbank.png',
              categoryId: '' // You might want to set a default category
            };
            
            const createdProduct = await window.ECommerceAPI.Products.create(newProduct);
            apiProductId = createdProduct.id || createdProduct._id;
            
            // Update the product item in HTML with the new ID
            $productItem.attr('data-product-id', apiProductId);
            $(this).attr('data-product-id', apiProductId);
            $(this).addClass('add-to-cart-btn');
            
            showSuccessMessage('Product created in catalog!');
          }
          
          // Now add to cart with price
          await window.ECommerceAPI.Cart.add(apiProductId, price, quantity);
          await loadCart();
          updateCartCount();
          
          showSuccessMessage('Product added to cart!');
        } catch (error) {
          console.error('Error processing static product:', error);
          alert(`Failed to add product to cart: ${error?.message || 'Unknown error'}. The product may need to exist in the API first.`);
        }
      }
    });
    
    // Wishlist button click handler
    $(document).on('click', '.btn-wishlist', async function(e) {
      e.preventDefault();
      
      if (!window.ECommerceAPI || !window.ECommerceAPI.Wishlist) {
        alert('Wishlist service not available. Please refresh the page.');
        return;
      }
      
      if (!window.ECommerceAPI.Auth || !window.ECommerceAPI.Auth.isAuthenticated()) {
        alert('Please login to add items to wishlist');
        return;
      }
      
      const productId = $(this).data('product-id') || $(this).closest('.product-item').data('product-id');
      
      if (!productId) {
        console.error('Product ID not found for wishlist button');
        return;
      }
      
      const productIdStr = String(productId);
      const isInWishlist = wishlistItems.has(productIdStr);
      
      try {
        if (isInWishlist) {
          // Remove from wishlist
          await window.ECommerceAPI.Wishlist.remove(productId);
          wishlistItems.delete(productIdStr);
          showSuccessMessage('Product removed from wishlist');
        } else {
          // Add to wishlist
          await window.ECommerceAPI.Wishlist.add(productId);
          wishlistItems.add(productIdStr);
          showSuccessMessage('Product added to wishlist');
        }
        
        updateWishlistButtons();
      } catch (error) {
        console.error('Error updating wishlist:', error);
        const errorMessage = error?.message || error?.data?.message || 'Failed to update wishlist';
        alert(`${errorMessage}. Please try again.`);
      }
    });

    // Helper function to show success messages
    function showSuccessMessage(message) {
      const existingMsg = document.querySelector('.cart-success-message');
      if (existingMsg) {
        existingMsg.remove();
      }
      
      const addedMessage = document.createElement('div');
      addedMessage.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 cart-success-message';
      addedMessage.style.zIndex = '9999';
      addedMessage.innerHTML = `
        <strong>${message}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      document.body.appendChild(addedMessage);
      setTimeout(() => addedMessage.remove(), 3000);
    }

    // Category click handlers
    $(document).on('click', '.category-item, [data-category-id]', async function(e) {
      e.preventDefault();
      const categoryId = $(this).closest('[data-category-id]').data('category-id') || 
                         $(this).data('category-id');
      
      if (!categoryId || categoryId === 'All Categories' || categoryId === 'All') {
        // Load all products
        loadProducts();
        return;
      }
      
      try {
        // Get category name for display
        const categoryName = $(this).find('.category-title')?.text() || 
                           $(this).find('.dropdown-option-text')?.text() || 
                           'Category';
        
        // Show loading state
        const productGrid = document.querySelector('#nav-all .product-grid, .product-grid');
        if (productGrid) {
          productGrid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-3 text-muted">Loading products...</p></div>';
        }
        
        // Fetch products for this category
        const products = await window.ECommerceAPI.Products.getByCategory(categoryId);
        
        // Handle different response formats
        let productsList = products;
        if (products && products.data && Array.isArray(products.data)) {
          productsList = products.data;
        } else if (products && Array.isArray(products)) {
          productsList = products;
        } else if (products && products.products && Array.isArray(products.products)) {
          productsList = products.products;
        }
        
        // Find the trending products section grid (in the "All" tab)
        const trendingProductsSection = document.querySelector('#nav-all .product-grid') || 
                                       document.querySelector('.product-grid');
        
        if (trendingProductsSection) {
          trendingProductsSection.innerHTML = '';
          
          if (productsList && productsList.length > 0) {
            // Render products
            productsList.forEach(product => {
              window.ProductRenderer.renderProduct(product, trendingProductsSection);
            });
            
            // Reinitialize product quantity controls
            if (window.initProductQty) {
              window.initProductQty();
            }
            
            // Update wishlist buttons
            updateWishlistButtons();
            
            // Switch to "All" tab if not already active
            const allTab = document.getElementById('nav-all-tab');
            if (allTab && !allTab.classList.contains('active')) {
              allTab.click();
            }
            
            // Scroll to trending products section smoothly
            const trendingSection = document.querySelector('.bootstrap-tabs.product-tabs');
            if (trendingSection) {
              trendingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              
              // Update the section title to show filtered category
              const sectionTitle = trendingSection.querySelector('h3');
              if (sectionTitle) {
                const originalTitle = sectionTitle.getAttribute('data-original-title') || 'Trending Products';
                sectionTitle.setAttribute('data-original-title', originalTitle);
                sectionTitle.textContent = `Trending Products - ${categoryName}`;
                
                // Reset title after 3 seconds (optional)
                setTimeout(() => {
                  sectionTitle.textContent = originalTitle;
                }, 3000);
              }
            }
          } else {
            trendingProductsSection.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">No products found in this category.</p><a href="#" class="btn btn-outline-primary mt-3" onclick="window.location.reload()">View All Products</a></div>';
          }
        }
      } catch (error) {
        console.error('Error loading category products:', error);
        const productGrid = document.querySelector('#nav-all .product-grid, .product-grid');
        if (productGrid) {
          productGrid.innerHTML = '<div class="col-12 text-center py-5"><p class="text-danger">Failed to load products. Please try again.</p><a href="#" class="btn btn-outline-primary mt-3" onclick="window.location.reload()">Reload</a></div>';
        }
      }
    });

    // Product link handlers
    $(document).on('click', '.product-link', function(e) {
      e.preventDefault();
      const productId = $(this).data('product-id');
      // Handle product detail view (you can create a product detail page)
      console.log('View product:', productId);
    });

    // Quantity plus/minus buttons
    $(document).on('click', '.quantity-right-plus', function(e) {
      e.preventDefault();
      const productId = $(this).data('product-id');
      const quantityInput = $(`#quantity-${productId}`);
      const currentVal = parseInt(quantityInput.val()) || 1;
      quantityInput.val(currentVal + 1);
    });

    $(document).on('click', '.quantity-left-minus', function(e) {
      e.preventDefault();
      const productId = $(this).data('product-id');
      const quantityInput = $(`#quantity-${productId}`);
      const currentVal = parseInt(quantityInput.val()) || 1;
      if (currentVal > 1) {
        quantityInput.val(currentVal - 1);
      }
    });

    // Search functionality
    const searchForm = document.querySelector('#search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const searchTerm = this.querySelector('input[type="text"]').value;
        if (searchTerm) {
          searchProducts(searchTerm);
        }
      });
    }
    
    // Cart item actions
    // Cart item increase quantity
    $(document).on('click', '.cart-item-increase', async function(e) {
      e.preventDefault();
      const cartItemId = $(this).data('cart-item-id');
      const currentQty = parseInt($(this).data('current-qty')) || 1;
      const newQty = currentQty + 1;
      
      if (!cartItemId) {
        alert('Cart item ID not found');
        return;
      }
      
      try {
        await window.ECommerceAPI.Cart.update(cartItemId, newQty);
        await loadCart();
        updateCartCount();
        showSuccessMessage('Quantity updated!');
      } catch (error) {
        console.error('Error updating cart:', error);
        const errorMessage = error?.message || error?.data?.message || 'Failed to update cart';
        alert(`${errorMessage}. Please try again.`);
      }
    });
    
    // Cart item decrease quantity
    $(document).on('click', '.cart-item-decrease', async function(e) {
      e.preventDefault();
      const cartItemId = $(this).data('cart-item-id');
      const currentQty = parseInt($(this).data('current-qty')) || 1;
      
      if (!cartItemId) {
        alert('Cart item ID not found');
        return;
      }
      
      if (currentQty <= 1) {
        // If quantity is 1, remove the item instead
        if (confirm('Remove this item from cart?')) {
          try {
            await window.ECommerceAPI.Cart.remove(cartItemId);
            await loadCart();
            updateCartCount();
            showSuccessMessage('Item removed from cart');
          } catch (error) {
            console.error('Error removing from cart:', error);
            const errorMessage = error?.message || error?.data?.message || 'Failed to remove item';
            alert(`${errorMessage}. Please try again.`);
          }
        }
        return;
      }
      
      const newQty = currentQty - 1;
      try {
        await window.ECommerceAPI.Cart.update(cartItemId, newQty);
        await loadCart();
        updateCartCount();
        showSuccessMessage('Quantity updated!');
      } catch (error) {
        console.error('Error updating cart:', error);
        const errorMessage = error?.message || error?.data?.message || 'Failed to update cart';
        alert(`${errorMessage}. Please try again.`);
      }
    });
    
    // Cart item remove
    $(document).on('click', '.cart-item-remove', async function(e) {
      e.preventDefault();
      let cartItemId = $(this).data('cart-item-id');
      
      if (!cartItemId) {
        // Fallback: try to find cartItemId from the list item
        const listItem = $(this).closest('[data-cart-item-id]');
        if (listItem.length) {
          cartItemId = listItem.data('cart-item-id');
        }
      }
      
      if (!cartItemId) {
        alert('Cart item ID not found');
        return;
      }
      
      if (confirm('Remove this item from cart?')) {
        try {
          await window.ECommerceAPI.Cart.remove(cartItemId);
          await loadCart();
          updateCartCount();
          showSuccessMessage('Item removed from cart');
        } catch (error) {
          console.error('Error removing from cart:', error);
          const errorMessage = error?.message || error?.data?.message || 'Failed to remove item';
          alert(`${errorMessage}. Please try again.`);
        }
      }
    });
    
    // Clear cart button
    $(document).on('click', '#clear-cart-btn', async function(e) {
      e.preventDefault();
      
      if (!confirm('Are you sure you want to clear all items from your cart?')) {
        return;
      }
      
      try {
        await window.ECommerceAPI.Cart.clear();
        await loadCart();
        updateCartCount();
        showSuccessMessage('Cart cleared successfully');
      } catch (error) {
        console.error('Error clearing cart:', error);
        const errorMessage = error?.message || error?.data?.message || 'Failed to clear cart';
        alert(`${errorMessage}. Please try again.`);
      }
    });
    
    // Checkout button
    $(document).on('click', '#checkout-btn', async function(e) {
      e.preventDefault();
      
      if (!window.ECommerceAPI || !window.ECommerceAPI.Auth.isAuthenticated()) {
        alert('Please login to checkout');
        return;
      }
      
      // Check if user has location/address set
      const user = window.ECommerceAPI.Auth.getUser();
      if (!user || !user.address || !user.latitude || !user.longitude) {
        const confirmSetLocation = confirm('Please set your delivery address and location before proceeding to checkout. Would you like to go to your profile to set it now?');
        if (confirmSetLocation) {
          window.location.href = 'edit-profile.html';
        }
        return;
      }
      
      // Check if cart is empty before proceeding
      try {
        const cart = await window.ECommerceAPI.Cart.get();
        let cartItems = [];
        if (cart && Array.isArray(cart)) {
          cartItems = cart;
        } else if (cart && cart.items && Array.isArray(cart.items)) {
          cartItems = cart.items;
        } else if (cart && cart.data && Array.isArray(cart.data)) {
          cartItems = cart.data;
        } else if (cart && cart.cart && cart.cart.items && Array.isArray(cart.cart.items)) {
          cartItems = cart.cart.items;
        }
        
        if (!cartItems || cartItems.length === 0) {
          alert('Your cart is empty. Please add items to cart before checkout.');
          return;
        }
      } catch (cartError) {
        console.error('Error checking cart:', cartError);
        alert('Unable to load cart. Please try again.');
        return;
      }
      
      try {
        // Create order from cart
        const order = await window.ECommerceAPI.Orders.create();
        if (order) {
          // Close the cart offcanvas
          const cartOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasCart'));
          if (cartOffcanvas) {
            cartOffcanvas.hide();
          }
          
          // Clear cart and redirect to orders page
          await window.ECommerceAPI.Cart.clear();
          window.location.href = 'orders.html';
        }
      } catch (error) {
        console.error('Error creating order:', error);
        const errorMessage = error?.message || error?.data?.message || 'Failed to create order';
        alert(`Order failed: ${errorMessage}. Please try again.`);
      }
    });
    
    // Load cart when cart offcanvas is opened
    const cartOffcanvas = document.getElementById('offcanvasCart');
    if (cartOffcanvas) {
      cartOffcanvas.addEventListener('show.bs.offcanvas', function() {
        if (window.ECommerceAPI && window.ECommerceAPI.Auth.isAuthenticated()) {
          loadCart();
        }
      });
    }
  }

  /**
   * Search products
   */
  async function searchProducts(searchTerm) {
    try {
      const allProducts = await window.ECommerceAPI.Products.getAll();
      const filteredProducts = allProducts.filter(product => 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const productGrid = document.querySelector('.product-grid');
      if (productGrid) {
        productGrid.innerHTML = '';
        if (filteredProducts.length > 0) {
          filteredProducts.forEach(product => {
            window.ProductRenderer.renderProduct(product, productGrid);
          });
          window.initProductQty();
        } else {
          productGrid.innerHTML = '<div class="col-12"><p class="text-center text-muted">No products found matching your search.</p></div>';
        }
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }
  }

  /**
   * Load cart items and display them
   */
  async function loadCart() {
    if (!window.ECommerceAPI || !window.ECommerceAPI.Cart || !window.ECommerceAPI.Auth.isAuthenticated()) {
      return;
    }
    
    try {
      const cart = await window.ECommerceAPI.Cart.get();
      
      // Handle different response formats
      let cartItems = [];
      if (cart && Array.isArray(cart)) {
        cartItems = cart;
      } else if (cart && cart.items && Array.isArray(cart.items)) {
        cartItems = cart.items;
      } else if (cart && cart.data && Array.isArray(cart.data)) {
        cartItems = cart.data;
      } else if (cart && cart.cart && cart.cart.items && Array.isArray(cart.cart.items)) {
        cartItems = cart.cart.items;
      } else {
        cartItems = [];
      }
      
      const cartItemsList = document.getElementById('cart-items-list');
      const cartItemsContainer = document.getElementById('cart-items-container');
      const cartTotalContainer = document.getElementById('cart-total-container');
      
      if (cartItems.length === 0) {
        if (cartItemsContainer) {
          cartItemsContainer.innerHTML = `
            <div class="text-center text-muted py-5">
              <p>Your cart is empty</p>
              <p class="small mt-2">Add some products to get started!</p>
            </div>
          `;
          cartItemsContainer.style.display = 'block';
        }
        if (cartTotalContainer) {
          cartTotalContainer.classList.add('d-none');
        }
        // Update cart badge to 0
        const cartBadge = document.getElementById('cart-badge-count');
        if (cartBadge) {
          cartBadge.textContent = '0';
          cartBadge.style.display = 'none';
        }
        // Update cart header total
        const cartTotalHeader = document.getElementById('cart-total-header');
        if (cartTotalHeader) {
          cartTotalHeader.textContent = '$0.00';
        }
        return;
      }
      
      // Load product details for cart items
      // Note: Products MUST exist in API for cart to display properly (name, price, etc.)
      let totalPrice = 0;
      const cartItemsHTML = [];
      
      for (const item of cartItems) {
        try {
          // Check if cart item already has product data embedded
          let product = item.product;
          const productId = item.productId || item.product?.id;
          
          // If no embedded product data, fetch from API
          if (!product && productId) {
            product = await window.ECommerceAPI.Products.getById(productId);
          }
          
          if (product) {
            // Get price from product (required for money to show)
            const price = product.price || item.price || 0;
            const quantity = item.quantity || 1;
            const itemTotal = price * quantity;
            totalPrice += itemTotal;
            
            // Get product info (required for display)
            const productName = product.name || 'Product';
            const productIdValue = product.id || productId;
            
            // Get cartItemId - required for remove/update operations
            const cartItemId = item.id || item.cartItemId || item._id;
            
            const productImage = product.image || product.images?.[0] || product.imageUrl || 'images/powerbank.png';
            
            cartItemsHTML.push(`
              <li class="list-group-item d-flex justify-content-between align-items-start" data-cart-item-id="${cartItemId}" data-product-id="${productIdValue}">
                <div class="flex-grow-1 d-flex gap-3">
                  <img src="${productImage}" alt="${productName}" class="rounded" style="width: 60px; height: 60px; object-fit: cover;" onerror="this.src='images/powerbank.png'">
                  <div class="flex-grow-1">
                    <h6 class="my-0 mb-1">${productName}</h6>
                    <small class="text-body-secondary d-block mb-2">$${price.toFixed(2)} each</small>
                    <div class="d-flex gap-2 align-items-center">
                      <button class="btn btn-sm btn-outline-secondary cart-item-decrease" data-cart-item-id="${cartItemId}" data-current-qty="${quantity}" title="Decrease quantity">
                        <svg width="14" height="14" viewBox="0 0 24 24"><use xlink:href="#minus"></use></svg>
                      </button>
                      <span class="cart-item-qty fw-bold" style="min-width: 30px; text-align: center;">${quantity}</span>
                      <button class="btn btn-sm btn-outline-secondary cart-item-increase" data-cart-item-id="${cartItemId}" data-current-qty="${quantity}" title="Increase quantity">
                        <svg width="14" height="14" viewBox="0 0 24 24"><use xlink:href="#plus"></use></svg>
                      </button>
                      <button class="btn btn-sm btn-outline-danger cart-item-remove ms-2" data-cart-item-id="${cartItemId}" title="Remove item">
                        <svg width="14" height="14" viewBox="0 0 24 24"><use xlink:href="#trash"></use></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="text-end">
                  <span class="text-body-secondary fw-bold fs-5">$${itemTotal.toFixed(2)}</span>
                </div>
              </li>
            `);
          } else {
            // Product not found in API - show error message
            console.warn(`Product not found in API for cart item: ${productId}`);
            cartItemsHTML.push(`
              <li class="list-group-item d-flex justify-content-between lh-sm text-danger">
                <div>
                  <h6 class="my-0">Product Not Found</h6>
                  <small class="text-body-secondary">Product ID: ${productId || 'Unknown'}</small>
                  <p class="text-danger small mb-0 mt-1">This product needs to exist in the API to display properly.</p>
                </div>
                <button class="btn btn-sm btn-outline-danger cart-item-remove" data-cart-item-id="${item.id || item.cartItemId || item._id}">
                  <svg width="14" height="14" viewBox="0 0 24 24"><use xlink:href="#trash"></use></svg>
                  Remove
                </button>
              </li>
            `);
          }
        } catch (error) {
          console.error('Error loading product for cart:', error);
          // Show error item
          const productId = item.productId || item.product?.id || 'Unknown';
          cartItemsHTML.push(`
            <li class="list-group-item d-flex justify-content-between lh-sm text-warning">
              <div>
                <h6 class="my-0">Error Loading Product</h6>
                <small class="text-body-secondary">Product ID: ${productId}</small>
              </div>
              <button class="btn btn-sm btn-outline-danger cart-item-remove" data-cart-item-id="${item.id || item.cartItemId || item._id}">
                <svg width="14" height="14" viewBox="0 0 24 24"><use xlink:href="#trash"></use></svg>
              </button>
            </li>
          `);
        }
      }
      
      // Display cart items
      if (cartItemsList && cartItemsHTML.length > 0) {
        cartItemsList.innerHTML = cartItemsHTML.join('');
      }
      
      // Hide empty state message when there are items
      if (cartItemsContainer) {
        cartItemsContainer.innerHTML = '';
        cartItemsContainer.style.display = 'none';
      }
      
      // Show cart total container if there are items
      if (cartTotalContainer) {
        if (totalPrice > 0 && cartItemsHTML.length > 0) {
          cartTotalContainer.classList.remove('d-none');
          const totalPriceEl = document.getElementById('cart-total-price');
          if (totalPriceEl) {
            totalPriceEl.textContent = `$${totalPrice.toFixed(2)}`;
          }
        } else {
          cartTotalContainer.classList.add('d-none');
        }
      }
      
      // Update cart header total
      const cartTotalHeader = document.getElementById('cart-total-header');
      if (cartTotalHeader) {
        cartTotalHeader.textContent = `$${totalPrice.toFixed(2)}`;
      }
      
      // Update cart badge count
      const cartBadge = document.getElementById('cart-badge-count');
      if (cartBadge) {
        cartBadge.textContent = cartItemsHTML.length;
        cartBadge.style.display = cartItemsHTML.length > 0 ? 'inline-block' : 'none';
      }
      
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  }

  /**
   * Load wishlist from API
   */
  async function loadWishlist() {
    if (!window.ECommerceAPI || !window.ECommerceAPI.Wishlist || !window.ECommerceAPI.Auth.isAuthenticated()) {
      wishlistItems.clear();
      updateWishlistButtons();
      return;
    }
    
    try {
      const wishlist = await window.ECommerceAPI.Wishlist.getAll();
      wishlistItems.clear();
      
      // Handle different response formats
      let items = wishlist;
      if (wishlist && Array.isArray(wishlist)) {
        items = wishlist;
      } else if (wishlist && wishlist.items && Array.isArray(wishlist.items)) {
        items = wishlist.items;
      } else if (wishlist && wishlist.data && Array.isArray(wishlist.data)) {
        items = wishlist.data;
      }
      
      // Extract product IDs
      if (items && Array.isArray(items)) {
        items.forEach(item => {
          const productId = item.productId || item.product?.id || item.id;
          if (productId) {
            wishlistItems.add(String(productId));
          }
        });
      }
      
      updateWishlistButtons();
    } catch (error) {
      console.error('Error loading wishlist:', error);
      wishlistItems.clear();
      updateWishlistButtons();
    }
  }
  
  /**
   * Update wishlist button UI based on wishlist state
   */
  function updateWishlistButtons() {
    document.querySelectorAll('.btn-wishlist').forEach(btn => {
      const productId = btn.getAttribute('data-product-id');
      if (!productId) return;
      
      const isInWishlist = wishlistItems.has(String(productId));
      const svg = btn.querySelector('svg');
      
      if (svg) {
        // Update the heart icon - use filled heart if in wishlist
        if (isInWishlist) {
          svg.innerHTML = '<path fill="currentColor" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78l1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/>';
          btn.classList.add('in-wishlist');
          btn.style.color = '#e91e63'; // Pink/red color for filled heart
        } else {
          svg.innerHTML = '<path fill="currentColor" d="M20.16 4.61A6.27 6.27 0 0 0 12 4a6.27 6.27 0 0 0-8.16 9.48l7.45 7.45a1 1 0 0 0 1.42 0l7.45-7.45a6.27 6.27 0 0 0 0-8.87Zm-1.41 7.46L12 18.81l-6.75-6.74a4.28 4.28 0 0 1 3-7.3a4.25 4.25 0 0 1 3 1.25a1 1 0 0 0 1.42 0a4.27 4.27 0 0 1 6 6.05Z"/>';
          btn.classList.remove('in-wishlist');
          btn.style.color = ''; // Reset to default color
        }
      }
    });
  }

  /**
   * Update cart count in UI
   */
  async function updateCartCount() {
    if (!window.ECommerceAPI || !window.ECommerceAPI.Cart || !window.ECommerceAPI.Auth.isAuthenticated()) {
      // Set count to 0 if not authenticated
      const cartBadge = document.getElementById('cart-badge-count');
      if (cartBadge) {
        cartBadge.textContent = '0';
      }
      return;
    }
    
    try {
      const cart = await window.ECommerceAPI.Cart.get();
      
      // Handle different response formats
      let cartItems = [];
      if (cart && Array.isArray(cart)) {
        cartItems = cart;
      } else if (cart && cart.items && Array.isArray(cart.items)) {
        cartItems = cart.items;
      } else if (cart && cart.data && Array.isArray(cart.data)) {
        cartItems = cart.data;
      } else if (cart && cart.cart && cart.cart.items && Array.isArray(cart.cart.items)) {
        cartItems = cart.cart.items;
      }
      
      const cartCount = cartItems.length;
      
      // Update cart badge
      const cartBadge = document.getElementById('cart-badge-count');
      if (cartBadge) {
        cartBadge.textContent = cartCount;
        cartBadge.style.display = cartCount > 0 ? 'inline-block' : 'none';
      }
      
      // Update cart count in navbar
      const cartIcons = document.querySelectorAll('.cart-count, [data-cart-count]');
      cartIcons.forEach(icon => {
        icon.textContent = cartCount;
        icon.style.display = cartCount > 0 ? 'inline-block' : 'none';
      });
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  }

  // Make functions available globally for manual calls
  window.loadProducts = loadProducts;
  window.loadCategories = loadCategories;
  window.updateCartCount = updateCartCount;
  window.loadCart = loadCart;

  // Search functionality
  let searchTimeout;
  let allProducts = [];
  
  // Load all products for search
  async function loadProductsForSearch() {
    try {
      const response = await window.ECommerceAPI.Products.getAll();
      allProducts = Array.isArray(response) ? response : (response.data || response.products || []);
    } catch (error) {
      console.error('Error loading products for search:', error);
      allProducts = [];
    }
  }
  
  // Search products - works for both desktop and mobile
  function searchProducts(query, isMobile = false) {
    const resultsContainerId = isMobile ? 'search-results-mobile' : 'search-results';
    const resultsContainer = document.getElementById(resultsContainerId);
    
    if (!query || query.trim().length < 2) {
      if (resultsContainer) {
        resultsContainer.style.display = 'none';
      }
      return;
    }
    
    const searchTerm = query.toLowerCase().trim();
    const filtered = allProducts.filter(product => {
      const name = (product.name || '').toLowerCase();
      const description = (product.description || '').toLowerCase();
      return name.includes(searchTerm) || description.includes(searchTerm);
    }).slice(0, 5); // Limit to 5 results
    
    displaySearchResults(filtered, isMobile);
  }
  
  // Display search results - works for both desktop and mobile
  function displaySearchResults(products, isMobile = false) {
    const resultsContainerId = isMobile ? 'search-results-mobile' : 'search-results';
    const resultsContainer = document.getElementById(resultsContainerId);
    
    if (!resultsContainer) return;
    
    if (products.length === 0) {
      resultsContainer.innerHTML = '<div class="p-3 text-muted text-center">No products found</div>';
      resultsContainer.style.display = 'block';
      return;
    }
    
    resultsContainer.innerHTML = products.map(product => {
      const productImage = product.image || product.images?.[0] || 'images/powerbank.png';
      const price = product.price || 0;
      const productName = product.name || 'Product';
      const productId = product.id || product._id;
      
      return `
        <div class="search-result-item search-product-link p-3 border-bottom" style="cursor: pointer; transition: background-color 0.2s;" 
             onmouseover="this.style.backgroundColor='#f8f9fa'" 
             onmouseout="this.style.backgroundColor='white'"
             data-product-id="${productId}">
          <div class="d-flex align-items-center gap-3">
            <img src="${productImage}" alt="${productName}" 
                 style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" 
                 onerror="this.src='images/powerbank.png'">
            <div class="flex-grow-1">
              <h6 class="mb-1" style="font-size: 14px; font-weight: 600;">${productName}</h6>
              <p class="mb-0 text-primary fw-bold" style="font-size: 14px;">$${price.toFixed(2)}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    resultsContainer.style.display = 'block';
  }
  
  // Setup search event listeners for both desktop and mobile
  function setupSearch() {
    // Setup desktop search
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    if (searchInput) {
      setupSearchInput(searchInput, searchResults, false);
    }
    
    // Setup mobile search
    const searchInputMobile = document.getElementById('search-input-mobile');
    const searchResultsMobile = document.getElementById('search-results-mobile');
    
    if (searchInputMobile) {
      setupSearchInput(searchInputMobile, searchResultsMobile, true);
    }
    
    // Setup form submissions
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput?.value || '';
        if (query.trim()) {
          searchProducts(query, false);
        }
      });
    }
    
    const searchFormMobile = document.getElementById('search-form-mobile');
    if (searchFormMobile) {
      searchFormMobile.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInputMobile?.value || '';
        if (query.trim()) {
          searchProducts(query, true);
        }
      });
    }
  }
  
  // Helper function to setup individual search input
  function setupSearchInput(searchInput, searchResults, isMobile) {
    if (!searchInput) return;
    
    // Load products when search input is focused
    searchInput.addEventListener('focus', () => {
      if (allProducts.length === 0) {
        loadProductsForSearch();
      }
    });
    
    // Search as user types
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value;
      
      searchTimeout = setTimeout(() => {
        searchProducts(query, isMobile);
      }, 300); // Debounce for 300ms
    });
  }
  
  // Setup click-outside handler to close search dropdowns and profile menu
  function setupClickOutsideHandlers() {
    document.addEventListener('click', (e) => {
      // Get all elements to check
      const searchInput = document.getElementById('search-input');
      const searchResults = document.getElementById('search-results');
      const searchInputMobile = document.getElementById('search-input-mobile');
      const searchResultsMobile = document.getElementById('search-results-mobile');
      const userIconLink = document.getElementById('user-icon-link');
      const userProfileMenu = document.getElementById('user-profile-menu');
      
      // Check if click is outside search elements (desktop)
      if (searchInput && searchResults) {
        const searchBar = searchInput.closest('.search-bar');
        if (searchBar && !searchBar.contains(e.target) && !searchResults.contains(e.target)) {
          searchResults.style.display = 'none';
        }
      }
      
      // Check if click is outside search elements (mobile)
      if (searchInputMobile && searchResultsMobile) {
        const searchBarMobile = searchInputMobile.closest('.search-bar');
        if (searchBarMobile && !searchBarMobile.contains(e.target) && !searchResultsMobile.contains(e.target)) {
          searchResultsMobile.style.display = 'none';
        }
      }
      
      // Check if click is outside profile menu
      if (userIconLink && userProfileMenu) {
        const isClickOnIcon = userIconLink === e.target || userIconLink.contains(e.target);
        const isClickInMenu = userProfileMenu.contains(e.target);
        
        if (!isClickOnIcon && !isClickInMenu) {
          // Close dropdown if it's open
          try {
            const dropdown = bootstrap?.Dropdown?.getInstance(userIconLink);
            if (dropdown) {
              dropdown.hide();
            }
          } catch (e) {
            // If dropdown instance doesn't exist, just hide the menu
            userProfileMenu.classList.add('d-none');
          }
        }
      }
    });
  }
  
  // Handle search result clicks
  $(document).on('click', '.search-product-link', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const productId = this.getAttribute('data-product-id');
    
    // Hide search results first (both desktop and mobile)
    const searchResults = document.getElementById('search-results');
    const searchResultsMobile = document.getElementById('search-results-mobile');
    const searchInput = document.getElementById('search-input');
    const searchInputMobile = document.getElementById('search-input-mobile');
    if (searchResults) searchResults.style.display = 'none';
    if (searchResultsMobile) searchResultsMobile.style.display = 'none';
    if (searchInput) searchInput.value = '';
    if (searchInputMobile) searchInputMobile.value = '';
    
    // Convert productId to string for comparison
    const searchId = String(productId);
    
    // Function to find product card
    function findProductCard() {
      let productCard = null;
      
      // First, try direct selector in product-grid (trending section)
      const productGrid = document.querySelector('.product-grid');
      if (productGrid) {
        productCard = productGrid.querySelector(`.product-item[data-product-id="${searchId}"]`);
      }
      
      // If not found, try direct selector anywhere
      if (!productCard) {
        productCard = document.querySelector(`.product-item[data-product-id="${searchId}"]`);
      }
      
      // If not found, search through all product items (including in trending section)
      if (!productCard) {
        const allProductItems = document.querySelectorAll('.product-item');
        for (let i = 0; i < allProductItems.length; i++) {
          const item = allProductItems[i];
          const itemId = String(item.getAttribute('data-product-id') || '');
          if (itemId === searchId) {
            productCard = item;
            break;
          }
        }
      }
      
      // Also check parent .col elements that might contain the product-item
      if (!productCard) {
        const allCols = document.querySelectorAll('.product-grid .col, .col');
        for (let i = 0; i < allCols.length; i++) {
          const col = allCols[i];
          const productItem = col.querySelector('.product-item');
          if (productItem) {
            const itemId = String(productItem.getAttribute('data-product-id') || '');
            if (itemId === searchId) {
              productCard = productItem;
              break;
            }
          }
        }
      }
      
      return productCard;
    }
    
    // Function to scroll and highlight product
    function scrollToProduct(card) {
      setTimeout(() => {
        const cardPosition = card.getBoundingClientRect().top + window.pageYOffset;
        const offset = 150; // Offset from top
        
        window.scrollTo({
          top: cardPosition - offset,
          behavior: 'smooth'
        });
        
        // Highlight the product card with animation
        card.style.transition = 'box-shadow 0.3s ease, transform 0.3s ease';
        card.style.boxShadow = '0 0 30px rgba(0, 123, 255, 0.8)';
        card.style.transform = 'scale(1.02)';
        card.style.zIndex = '10';
        card.style.position = 'relative';
        
        setTimeout(() => {
          card.style.boxShadow = '';
          card.style.transform = '';
          card.style.zIndex = '';
          card.style.position = '';
        }, 3000);
      }, 100);
    }
    
    // Check if we're on index.html
    const isIndexPage = window.location.pathname.endsWith('index.html') || 
                        window.location.pathname.endsWith('/') || 
                        window.location.pathname === '';
    
    // Try to find the product card on current page
    let productCard = findProductCard();
    
    // If not found, wait a bit for products to load and try again
    if (!productCard) {
      setTimeout(() => {
        productCard = findProductCard();
        if (productCard) {
          scrollToProduct(productCard);
        } else {
          // Product not found on current page - navigate to index.html
          if (!isIndexPage) {
            // Navigate to index.html with product ID in hash
            window.location.href = `index.html#product-${productId}`;
          } else {
            // On index.html but product not found - wait longer for products to load
            setTimeout(() => {
              productCard = findProductCard();
              if (productCard) {
                scrollToProduct(productCard);
              } else {
                console.log('Product card not found on page, ID:', productId);
              }
            }, 2000);
          }
        }
      }, 500);
      return;
    }
    
    // Product found on current page - scroll to it
    scrollToProduct(productCard);
  });
  
  // Handle product scroll when page loads with hash (e.g., index.html#product-123)
  function scrollToProductFromHash() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#product-')) {
      const productId = hash.replace('#product-', '');
      const searchId = String(productId);
      
      // Wait for products to load
      setTimeout(() => {
        function findProductCard() {
          let productCard = null;
          
          const productGrid = document.querySelector('.product-grid');
          if (productGrid) {
            productCard = productGrid.querySelector(`.product-item[data-product-id="${searchId}"]`);
          }
          
          if (!productCard) {
            productCard = document.querySelector(`.product-item[data-product-id="${searchId}"]`);
          }
          
          if (!productCard) {
            const allProductItems = document.querySelectorAll('.product-item');
            for (let i = 0; i < allProductItems.length; i++) {
              const item = allProductItems[i];
              const itemId = String(item.getAttribute('data-product-id') || '');
              if (itemId === searchId) {
                productCard = item;
                break;
              }
            }
          }
          
          return productCard;
        }
        
        let productCard = findProductCard();
        
        // Try multiple times with increasing delays
        let attempts = 0;
        const maxAttempts = 10;
        
        function tryScroll() {
          productCard = findProductCard();
          if (productCard) {
            const cardPosition = productCard.getBoundingClientRect().top + window.pageYOffset;
            const offset = 150;
            
            window.scrollTo({
              top: cardPosition - offset,
              behavior: 'smooth'
            });
            
            productCard.style.transition = 'box-shadow 0.3s ease, transform 0.3s ease';
            productCard.style.boxShadow = '0 0 30px rgba(0, 123, 255, 0.8)';
            productCard.style.transform = 'scale(1.02)';
            productCard.style.zIndex = '10';
            productCard.style.position = 'relative';
            
            setTimeout(() => {
              productCard.style.boxShadow = '';
              productCard.style.transform = '';
              productCard.style.zIndex = '';
              productCard.style.position = '';
            }, 3000);
            
            // Clear hash after scrolling
            setTimeout(() => {
              window.history.replaceState(null, null, window.location.pathname);
            }, 1000);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(tryScroll, 500);
          }
        }
        
        tryScroll();
      }, 500);
    }
  }
  
  // Initialize search when DOM is ready
  $(document).ready(function() {
    setupSearch();
    setupClickOutsideHandlers();
    // Load products for search after a delay
    setTimeout(() => {
      loadProductsForSearch();
    }, 1000);
    
    // Check for product hash on page load
    scrollToProductFromHash();
  });
  
  // Also check hash when page is fully loaded
  window.addEventListener('load', () => {
    scrollToProductFromHash();
  });

})(jQuery);

