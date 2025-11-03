/**
 * Orders Page Script
 */

$(document).ready(function() {
  // Check if user is authenticated
  if (!window.ECommerceAPI || !window.ECommerceAPI.Auth || !window.ECommerceAPI.Auth.isAuthenticated()) {
    // Redirect to home if not authenticated
    window.location.href = 'index.html';
    return;
  }

  // Load orders on page load
  loadOrders();
});

/**
 * Load user orders from API
 */
async function loadOrders() {
  const loadingEl = document.getElementById('orders-loading');
  const emptyEl = document.getElementById('orders-empty');
  const listEl = document.getElementById('orders-list');

  try {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';
    if (listEl) listEl.style.display = 'none';

    // Fetch orders from API
    const orders = await window.ECommerceAPI.Orders.getMyOrders();
    
    // Debug logging to understand API response structure
    console.log('Orders API response:', orders);

    // Hide loading state
    if (loadingEl) loadingEl.style.display = 'none';

    // Handle different response formats
    let ordersList = [];
    if (orders && Array.isArray(orders)) {
      ordersList = orders;
    } else if (orders && orders.data && Array.isArray(orders.data)) {
      ordersList = orders.data;
    } else if (orders && orders.orders && Array.isArray(orders.orders)) {
      ordersList = orders.orders;
    }
    
    // Log first order structure for debugging
    if (ordersList.length > 0) {
      console.log('First order structure:', ordersList[0]);
      console.log('First order keys:', Object.keys(ordersList[0]));
    }

    if (ordersList.length === 0) {
      // Show empty state
      if (emptyEl) emptyEl.style.display = 'block';
      if (listEl) listEl.style.display = 'none';
    } else {
      // Render orders
      if (emptyEl) emptyEl.style.display = 'none';
      if (listEl) listEl.style.display = 'block';
      renderOrders(ordersList);
    }
  } catch (error) {
    console.error('Error loading orders:', error);
    
    // Hide loading state
    if (loadingEl) loadingEl.style.display = 'none';
    
    // Show empty state or error message
    if (emptyEl) {
      emptyEl.style.display = 'block';
      const errorMsg = emptyEl.querySelector('h3');
      if (errorMsg) {
        errorMsg.textContent = 'Unable to load orders';
      }
    }
  }
}

/**
 * Render orders list
 */
function renderOrders(orders) {
  const listEl = document.getElementById('orders-list');
  if (!listEl) return;

  const ordersHTML = orders.map(order => {
    const orderId = order.id || order.orderId || order._id;
    const totalPrice = order.totalPrice || order.total || 0;
    const status = order.status || 'Pending';
    const createdAt = order.createdAt || order.created_at || order.date || 'N/A';
    
    // Format date
    let formattedDate = 'N/A';
    if (createdAt !== 'N/A') {
      try {
        const date = new Date(createdAt);
        formattedDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        formattedDate = createdAt;
      }
    }

    // Get items count - check multiple possible property names
    let items = null;
    let itemsCount = 0;
    let totalQuantity = 0;
    
    // Check various possible property names for items
    if (order.items && Array.isArray(order.items)) {
      items = order.items;
    } else if (order.orderItems && Array.isArray(order.orderItems)) {
      items = order.orderItems;
    } else if (order.order_items && Array.isArray(order.order_items)) {
      items = order.order_items;
    } else if (order.products && Array.isArray(order.products)) {
      items = order.products;
    }
    
    if (items) {
      itemsCount = items.length;
      // Calculate total quantity if items have quantity property
      totalQuantity = items.reduce((sum, item) => {
        return sum + (item.quantity || item.qty || 1);
      }, 0);
    }
    
    // Debug logging to understand API response structure
    if (!items && totalPrice > 0) {
      console.log('Order has total price but no items found:', {
        orderId,
        totalPrice,
        orderKeys: Object.keys(order),
        order: order
      });
    }

    // Status badge color
    let statusClass = 'bg-secondary';
    if (status.toLowerCase() === 'completed' || status.toLowerCase() === 'delivered') {
      statusClass = 'bg-success';
    } else if (status.toLowerCase() === 'cancelled' || status.toLowerCase() === 'refunded') {
      statusClass = 'bg-danger';
    } else if (status.toLowerCase() === 'processing' || status.toLowerCase() === 'shipped') {
      statusClass = 'bg-primary';
    } else if (status.toLowerCase() === 'pending') {
      statusClass = 'bg-warning';
    }

    return `
      <div class="col">
        <div class="card h-100 shadow-sm border-0" style="transition: transform 0.2s, box-shadow 0.2s;">
          <div class="card-body d-flex flex-column p-4">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 class="card-title mb-1 fw-bold">Order #${orderId}</h5>
                <p class="text-muted mb-0 small">${formattedDate}</p>
              </div>
              <span class="badge ${statusClass} rounded-pill px-3 py-2">${status}</span>
            </div>
            
            <div class="mb-3 pb-3 border-bottom">
              <div class="d-flex align-items-center text-muted">
                <svg width="18" height="18" viewBox="0 0 24 24" class="me-2">
                  <use xlink:href="#box"></use>
                </svg>
                <span class="small">${totalQuantity > 0 ? totalQuantity : itemsCount} ${(totalQuantity > 0 ? totalQuantity : itemsCount) !== 1 ? 'items' : 'item'}</span>
              </div>
            </div>
            
            <div class="mt-auto">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="text-muted small">Total Amount</span>
                <h4 class="text-primary mb-0 fw-bold">$${totalPrice.toFixed(2)}</h4>
              </div>
              <div class="d-grid gap-2">
                <button class="btn btn-outline-primary order-details-btn" data-order-id="${orderId}">
                  View Details
                </button>
                ${status.toLowerCase() !== 'cancelled' && status.toLowerCase() !== 'delivered' && status.toLowerCase() !== 'completed' ? `
                  <button class="btn btn-outline-danger cancel-order-btn" data-order-id="${orderId}">
                    Cancel Order
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  listEl.innerHTML = ordersHTML;
}

// Event handler for view details button
$(document).on('click', '.order-details-btn', async function() {
  const orderId = $(this).data('order-id');
  
  try {
    const order = await window.ECommerceAPI.Orders.getById(orderId);
    console.log('Order details response:', order);
    
    if (order) {
      // Handle nested response structure
      const orderData = order.data || order.order || order;
      
      // Get items from various possible property names and nested structures
      let items = null;
      
      // Check direct properties
      if (orderData.items && Array.isArray(orderData.items)) {
        items = orderData.items;
      } else if (orderData.orderItems && Array.isArray(orderData.orderItems)) {
        items = orderData.orderItems;
      } else if (orderData.order_items && Array.isArray(orderData.order_items)) {
        items = orderData.order_items;
      } else if (orderData.products && Array.isArray(orderData.products)) {
        items = orderData.products;
      } else if (orderData.cartItems && Array.isArray(orderData.cartItems)) {
        items = orderData.cartItems;
      } else if (orderData.cart_items && Array.isArray(orderData.cart_items)) {
        items = orderData.cart_items;
      }
      
      // Also check original order object
      if (!items) {
        if (order.items && Array.isArray(order.items)) {
          items = order.items;
        } else if (order.orderItems && Array.isArray(order.orderItems)) {
          items = order.orderItems;
        } else if (order.order_items && Array.isArray(order.order_items)) {
          items = order.order_items;
        } else if (order.products && Array.isArray(order.products)) {
          items = order.products;
        }
      }
      
      // Debug logging
      if (!items) {
        console.log('Items not found in order. Order structure:', {
          orderKeys: Object.keys(orderData),
          orderData: orderData,
          fullOrder: order
        });
      }
      
      // Format date
      let formattedDate = 'N/A';
      const createdAt = orderData.createdAt || orderData.created_at || orderData.date || order.createdAt || order.created_at || order.date;
      if (createdAt && createdAt !== 'N/A') {
        try {
          const date = new Date(createdAt);
          formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (e) {
          formattedDate = createdAt;
        }
      }
      
      // Build items list
      let itemsList = 'No items found in order details';
      if (items && items.length > 0) {
        itemsList = items.map((item, index) => {
          // Try multiple ways to get product name
          const productName = 
            item.product?.name || 
            item.product?.productName ||
            item.name || 
            item.productName || 
            item.product?.title ||
            item.title ||
            'Unknown Product';
          
          // Try multiple ways to get quantity
          const quantity = item.quantity || item.qty || item.Quantity || 1;
          
          // Try multiple ways to get price
          const price = 
            item.price || 
            item.productPrice || 
            item.totalPrice ||
            item.product?.price || 
            item.product?.productPrice ||
            (item.quantity && item.price ? (item.quantity * item.price) : 0);
          
          const itemTotal = (quantity * price).toFixed(2);
          return `${index + 1}. ${productName}\n   Qty: ${quantity} × $${price.toFixed(2)} = $${itemTotal}`;
        }).join('\n\n');
      } else {
        // If no items found but total exists, show a message
        const total = orderData.totalPrice || orderData.total || order.totalPrice || order.total || 0;
        if (total > 0) {
          itemsList = `Items information not available in API response.\nTotal order value: $${total.toFixed(2)}`;
        }
      }
      
      // Get order details
      const orderIdDisplay = orderData.id || orderData.orderId || order.id || order.orderId || 'N/A';
      const status = orderData.status || order.status || 'N/A';
      const total = orderData.totalPrice || orderData.total || order.totalPrice || order.total || 0;
      
      // Show order details in modal or alert for now
      const details = `ORDER DETAILS

Order ID: ${orderIdDisplay}
Status: ${status}
Date: ${formattedDate}
Total: $${total.toFixed(2)}

ITEMS:
${itemsList}`;
      alert(details);
    }
  } catch (error) {
    console.error('Error fetching order details:', error);
    alert('Unable to load order details. Please try again.');
  }
});

// Event handler for cancel order button
$(document).on('click', '.cancel-order-btn', async function() {
  const orderId = $(this).data('order-id');
  
  if (!confirm('Are you sure you want to cancel this order?')) {
    return;
  }
  
  try {
    await window.ECommerceAPI.Orders.cancel(orderId);
    alert('Order cancelled successfully!');
    // Reload orders
    loadOrders();
  } catch (error) {
    console.error('Error cancelling order:', error);
    const errorMessage = error?.message || error?.data?.message || 'Failed to cancel order';
    alert(`Unable to cancel order: ${errorMessage}. Please try again.`);
  }
});

