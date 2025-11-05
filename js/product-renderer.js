/**
 * Product Renderer Utility
 * Renders products from API data to HTML
 */

const ProductRenderer = {
  /**
   * Render a single product card
   */
  renderProduct: (product, container) => {
    // Default image if product doesn't have one
    const defaultImage = 'images/powerbank.png';
    const productImage = product.image || product.images?.[0] || defaultImage;
    const price = product.price || 0;
    const discount = product.discount || 0;
    const discountPercentage = discount > 0 ? Math.round((discount / (price + discount)) * 100) : 0;
    
    const productCard = `
      <div class="col">
        <div class="product-item" data-product-id="${product.id}">
          ${discountPercentage > 0 ? `<span class="badge bg-success position-absolute m-3">-${discountPercentage}%</span>` : ''}
          <a href="#" class="btn-wishlist" data-product-id="${product.id}">
            <svg width="24" height="24"><use xlink:href="#heart"></use></svg>
          </a>
          <figure>
            <a href="#" class="product-link" data-product-id="${product.id}" title="${product.name || 'Product'}">
              <img src="${productImage}" alt="${product.name || 'Product'}" class="tab-image" onerror="this.src='${defaultImage}'">
            </a>
          </figure>
          <h3>${product.name || 'Product Name'}</h3>
          ${product.description ? `<p class="text-muted small">${product.description.substring(0, 60)}...</p>` : ''}
          <span class="qty">${product.quantity || '1'} ${product.unit || 'Unit'}</span>
          <span class="price">$${price.toFixed(2)}</span>
          ${discount > 0 ? `<span class="old-price text-muted text-decoration-line-through">$${(price + discount).toFixed(2)}</span>` : ''}
          <div class="d-flex align-items-center justify-content-between mt-2">
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
        </div>
      </div>
    `;
    
    if (container) {
      container.insertAdjacentHTML('beforeend', productCard);
    }
    
    return productCard;
  },
  
  /**
   * Render multiple products
   */
  renderProducts: (products, containerSelector) => {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error(`Container not found: ${containerSelector}`);
      return;
    }
    
    // Clear existing products (optional, depends on use case)
    // container.innerHTML = '';
    
    if (!products || products.length === 0) {
      container.innerHTML = '<div class="col-12"><p class="text-center text-muted">No products found.</p></div>';
      return;
    }
    
    products.forEach(product => {
      this.renderProduct(product, container);
    });
    
    // Reinitialize product quantity controls for new products
    if (window.initProductQty) {
      window.initProductQty();
    }
  },
  
  /**
   * Render products in a swiper carousel
   */
  renderProductsCarousel: (products, swiperSelector) => {
    const swiperWrapper = document.querySelector(`${swiperSelector} .swiper-wrapper`);
    if (!swiperWrapper) {
      console.error(`Swiper wrapper not found: ${swiperSelector}`);
      return;
    }
    
    if (!products || products.length === 0) {
      swiperWrapper.innerHTML = '<div class="swiper-slide"><p class="text-center text-muted">No products found.</p></div>';
      return;
    }
    
    products.forEach(product => {
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
      
      swiperWrapper.appendChild(slide);
    });
  },
  
  /**
   * Get appropriate icon for category based on name
   * Uses Photoroom icons from icons folder
   */
  getCategoryIcon: (categoryName) => {
    if (!categoryName) return 'images/icons/electronics-Photoroom.png';
    
    const name = categoryName.toLowerCase();
    
    // Map category names to Photoroom icons
    if (name.includes('phone') && name.includes('case')) {
      return 'images/icons/phone%20cases-Photoroom.png';
    } else if (name.includes('charger') || name.includes('charging') || name.includes('power')) {
      return 'images/icons/phone%20charger-Photoroom.png';
    } else if (name.includes('watch') || name.includes('smartwatch')) {
      return 'images/icons/smart%20watches-Photoroom.png';
    } else if (name.includes('accessories') || name.includes('accessory')) {
      return 'images/icons/electronics-Photoroom.png';
    } else if (name.includes('phone')) {
      return 'images/icons/phone%20cases-Photoroom.png';
    } else if (name.includes('device') || name.includes('gadget') || name.includes('electronics')) {
      return 'images/icons/electronics-Photoroom.png';
    } else if (name.includes('audio') || name.includes('headphone') || name.includes('headset') || name.includes('speaker')) {
      return 'images/icons/electronics-Photoroom.png';
    } else if (name.includes('cable') || name.includes('wire')) {
      return 'images/icons/phone%20charger-Photoroom.png';
    } else if (name.includes('book')) {
      return 'images/icons/electronics-Photoroom.png';
    } else if (name.includes('car')) {
      return 'images/icons/car%20accessories-Photoroom.png';
    } else {
      return 'images/icons/electronics-Photoroom.png';
    }
  },
  
  /**
   * Get fallback icon based on category name (uses Photoroom icons or existing images)
   */
  getFallbackIcon: (categoryName) => {
    if (!categoryName) return 'images/icons/electronics-Photoroom.png';
    
    const name = categoryName.toLowerCase();
    
    // Use Photoroom icons as fallbacks
    if (name.includes('charger') || name.includes('charging') || name.includes('power')) {
      return 'images/icons/phone%20charger-Photoroom.png';
    } else if (name.includes('audio') || name.includes('headphone') || name.includes('headset') || name.includes('speaker')) {
      return 'images/icons/electronics-Photoroom.png';
    } else if (name.includes('accessories') || name.includes('accessory')) {
      return 'images/icons/electronics-Photoroom.png';
    } else if (name.includes('phone') || name.includes('case')) {
      return 'images/icons/phone%20cases-Photoroom.png';
    } else if (name.includes('watch') || name.includes('smartwatch')) {
      return 'images/icons/smart%20watches-Photoroom.png';
    } else if (name.includes('car')) {
      return 'images/icons/car%20accessories-Photoroom.png';
    } else {
      return 'images/icons/electronics-Photoroom.png';
    }
  },

  /**
   * Render categories
   */
  renderCategories: (categories, containerSelector) => {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error(`Container not found: ${containerSelector}`);
      return;
    }
    
    if (!categories || categories.length === 0) {
      return;
    }
    
    categories.forEach(category => {
      const categoryIcon = category.image || ProductRenderer.getCategoryIcon(category.name);
      const fallbackIcon = ProductRenderer.getFallbackIcon(category.name);
      const categoryCard = `
        <div class="col">
          <a href="#" class="category-item" data-category-id="${category.id}">
            <div class="category-icon">
              <img src="${categoryIcon}" alt="${category.name}" onerror="if (this.src !== '${fallbackIcon}') { this.src = '${fallbackIcon}'; }" style="width: auto; height: 80px; object-fit: contain; display: block;">
            </div>
            <h4>${category.name}</h4>
          </a>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', categoryCard);
    });
  }
};

// Export for use in other scripts
window.ProductRenderer = ProductRenderer;

