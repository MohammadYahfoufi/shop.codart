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

    // Get items count
    const itemsCount = order.items && Array.isArray(order.items) ? order.items.length : 0;

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
                <span class="small">${itemsCount} item${itemsCount !== 1 ? 's' : ''}</span>
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
    if (order) {
      // Show order details in modal or alert for now
      const details = `
Order ID: ${order.id || order.orderId || 'N/A'}
Status: ${order.status || 'N/A'}
Total: $${(order.totalPrice || order.total || 0).toFixed(2)}
Date: ${order.createdAt || order.created_at || 'N/A'}
      `;
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

