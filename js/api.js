/**
 * E-Commerce API Service
 * Base URL: https://ecommerce-app-8usx.onrender.com
 */

const API_BASE_URL = 'https://ecommerce-app-8usx.onrender.com/api';

// Token management
const TokenManager = {
  getToken: () => localStorage.getItem('accessToken'),
  setToken: (token) => localStorage.setItem('accessToken', token),
  removeToken: () => localStorage.removeItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setRefreshToken: (token) => localStorage.setItem('refreshToken', token),
  removeRefreshToken: () => localStorage.removeItem('refreshToken'),
  clear: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};

// API request helper
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = TokenManager.getToken();
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    credentials: 'include', // Include cookies in all requests
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  // Debug logging for requests
  if (endpoint.includes('/cart')) {
    console.log('API Request:', {
      url,
      method: config.method || 'GET',
      headers: config.headers,
      body: config.body ? JSON.parse(config.body) : null
    });
  }
  
  try {
    const response = await fetch(url, config);
    
    // Check if response has content
    const contentType = response.headers.get('content-type');
    
    // Debug logging for responses
    if (endpoint.includes('/cart')) {
      console.log('API Response:', {
        url,
        status: response.status,
        statusText: response.statusText,
        contentType
      });
    }
    
    // Read response body once
    let data;
    try {
      const text = await response.text();
      
      if (contentType && contentType.includes('application/json')) {
        // Try to parse as JSON
        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseError) {
          // Failed to parse JSON even though content-type says JSON
          console.warn('Failed to parse JSON response:', parseError);
          data = { 
            message: text || 'Failed to parse server response', 
            status: response.status,
            error: parseError.message 
          };
        }
      } else {
        // Not JSON response, create error object with text
        data = { 
          message: text || 'Unknown error', 
          status: response.status 
        };
      }
    } catch (readError) {
      // Failed to read response body
      console.warn('Failed to read response:', readError);
      data = { 
        message: 'Failed to read server response', 
        status: response.status,
        error: readError.message 
      };
    }
    
    if (!response.ok) {
      // If unauthorized and we have a refresh token, try to refresh
      if (response.status === 401 && TokenManager.getRefreshToken()) {
        try {
          const refreshed = await AuthService.refresh();
          if (refreshed) {
            // Retry the original request
            config.headers['Authorization'] = `Bearer ${TokenManager.getToken()}`;
            const retryResponse = await fetch(url, config);
            let retryData;
            
            try {
              const retryText = await retryResponse.text();
              const retryContentType = retryResponse.headers.get('content-type');
              
              if (retryContentType && retryContentType.includes('application/json')) {
                retryData = retryText ? JSON.parse(retryText) : null;
              } else {
                retryData = { message: retryText || 'Unknown error', status: retryResponse.status };
              }
            } catch (e) {
              retryData = { message: 'Failed to parse response', status: retryResponse.status, error: e.message };
            }
            
            return retryResponse.ok ? retryData : Promise.reject(retryData);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Continue with original error
        }
      }
      
      // Create a proper error object
      let errorMessage = data?.message || data?.error || data?.error?.message;
      
      // Provide user-friendly messages for common errors
      if (response.status === 500) {
        errorMessage = errorMessage || 'Internal server error - The API server encountered an error. Please try again later.';
        console.error('API Server Error (500):', {
          endpoint,
          status: response.status,
          data: data
        });
      } else if (response.status === 404) {
        errorMessage = errorMessage || 'Resource not found';
      } else if (response.status === 401) {
        errorMessage = errorMessage || 'Unauthorized - Please login';
      } else if (response.status === 403) {
        errorMessage = errorMessage || 'Forbidden - Access denied';
      } else if (response.status >= 400 && response.status < 500) {
        errorMessage = errorMessage || `Client error (${response.status})`;
      } else if (response.status >= 500) {
        errorMessage = errorMessage || `Server error (${response.status}) - The server is experiencing issues. Please try again later.`;
      }
      
      const error = {
        message: errorMessage,
        status: response.status,
        statusText: response.statusText,
        data: data,
        endpoint: endpoint
      };
      
      console.error('API Error:', error);
      return Promise.reject(error);
    }
    
    return data;
  } catch (error) {
    // Network error or other fetch error
    console.error('API Request Error:', error);
    
    // Provide helpful error messages
    let errorMessage = error.message || 'Network error or server unavailable';
    
    if (error.message && error.message.includes('Failed to fetch')) {
      errorMessage = 'Unable to reach the API server. Check your internet connection or the API might be down.';
    } else if (error.message && error.message.includes('CORS')) {
      errorMessage = 'CORS error - The API server is not allowing requests from this domain.';
    }
    
    const errorObj = {
      message: errorMessage,
      error: error,
      type: 'network',
      originalError: error.message
    };
    return Promise.reject(errorObj);
  }
}

// Authentication Service
const AuthService = {
  register: async (userData) => {
    try {
      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      
      if (response.accessToken && response.refreshToken) {
        TokenManager.setToken(response.accessToken);
        TokenManager.setRefreshToken(response.refreshToken);
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  login: async (credentials) => {
    try {
      console.log('Attempting login with:', { email: credentials.email });
      
      // Login endpoint only returns a message (success/failed) and sets tokens in cookies
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      console.log('Login API response received:', response);
      
      // Check if login was successful by checking for hasAuth cookie
      const hasAuth = await AuthService.checkAuth();
      
      if (hasAuth) {
        // If hasAuth is true, call /auth/me to validate tokens and get user info
        try {
          const user = await apiRequest('/auth/me');
          
          if (user) {
            // Save user data to localStorage
            localStorage.setItem('user', JSON.stringify(user));
            console.log('User data saved after login:', user);
            
            // Mark that authentication is active (tokens are in cookies)
            localStorage.setItem('hasAuth', 'true');
            
            return {
              ...response,
              user: user,
              authenticated: true,
              message: response.message || 'Login successful'
            };
          }
        } catch (meError) {
          console.error('Error fetching user after login:', meError);
          // Login was successful (tokens set), but /auth/me failed
          // This shouldn't happen, but handle gracefully
          localStorage.setItem('hasAuth', 'true');
          return {
            ...response,
            authenticated: true,
            message: response.message || 'Login successful'
          };
        }
      }
      
      // If hasAuth is false, login likely failed
      return {
        ...response,
        authenticated: false,
        message: response.message || 'Login failed'
      };
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  },
  
  checkAuth: async () => {
    try {
      // Check if hasAuth is true in cookies
      const response = await apiRequest('/auth/has');
      // Assuming the API returns { hasAuth: true/false } or just true/false
      const hasAuth = response?.hasAuth !== undefined ? response.hasAuth : response === true || response === 'true';
      return hasAuth;
    } catch (error) {
      console.error('Error checking auth:', error);
      return false;
    }
  },
  
  logout: async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      TokenManager.clear();
      localStorage.removeItem('hasAuth');
    }
  },
  
  refresh: async () => {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) return false;
      
      const response = await apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      
      if (response.accessToken) {
        TokenManager.setToken(response.accessToken);
        if (response.refreshToken) {
          TokenManager.setRefreshToken(response.refreshToken);
        }
        return true;
      }
      return false;
    } catch (error) {
      TokenManager.clear();
      return false;
    }
  },
  
  getCurrentUser: async () => {
    try {
      // Use /auth/me endpoint to get current authenticated user
      const user = await apiRequest('/auth/me');
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      return user;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  },
  
  updateCurrentUser: async (userData) => {
    try {
      return await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(userData),
      });
    } catch (error) {
      throw error;
    }
  },
  
  isAuthenticated: () => {
    // Check localStorage flag (set by checkAuth or login)
    return localStorage.getItem('hasAuth') === 'true';
  },
  
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

// Product Service
const ProductService = {
  getAll: async () => {
    try {
      return await apiRequest('/product');
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },
  
  getById: async (id) => {
    try {
      return await apiRequest(`/product/${id}`);
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  },
  
  getByCategory: async (categoryId) => {
    try {
      return await apiRequest(`/product/category/${categoryId}`);
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }
  },
  
  create: async (productData) => {
    try {
      return await apiRequest('/product', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    } catch (error) {
      throw error;
    }
  },
  
  update: async (id, productData) => {
    try {
      return await apiRequest(`/product/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(productData),
      });
    } catch (error) {
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      return await apiRequest(`/product/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw error;
    }
  }
};

// Category Service
const CategoryService = {
  getAll: async () => {
    try {
      return await apiRequest('/category');
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },
  
  getById: async (id) => {
    try {
      return await apiRequest(`/category/${id}`);
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  },
  
  create: async (categoryData) => {
    try {
      return await apiRequest('/category', {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });
    } catch (error) {
      throw error;
    }
  },
  
  update: async (id, categoryData) => {
    try {
      return await apiRequest(`/category/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(categoryData),
      });
    } catch (error) {
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      return await apiRequest(`/category/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw error;
    }
  }
};

// Cart Service
const CartService = {
  get: async () => {
    try {
      return await apiRequest('/cart');
    } catch (error) {
      console.error('Error fetching cart:', error);
      return { items: [] };
    }
  },
  
  add: async (productId, productPrice, quantity = 1) => {
    try {
      // Ensure productPrice and quantity are numbers
      const price = typeof productPrice === 'number' ? productPrice : parseFloat(productPrice) || 0;
      const qty = typeof quantity === 'number' ? quantity : parseInt(quantity) || 1;
      
      if (price <= 0) {
        throw new Error('Product price must be greater than 0');
      }
      
      if (!productId) {
        throw new Error('Product ID is required');
      }
      
      const requestBody = { 
        productId: String(productId),
        productPrice: price,
        quantity: qty
      };
      
      // Debug logging
      console.log('Adding to cart:', {
        endpoint: '/cart/add',
        body: requestBody,
        productId,
        productPrice: price,
        quantity: qty
      });
      
      const response = await apiRequest('/cart/add', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      
      console.log('Cart add success:', response);
      return response;
    } catch (error) {
      console.error('Cart add error:', { 
        productId, 
        productPrice, 
        quantity, 
        error,
        errorMessage: error?.message,
        errorStatus: error?.status,
        errorData: error?.data
      });
      throw error;
    }
  },
  
  remove: async (cartItemId) => {
    try {
      return await apiRequest('/cart/remove', {
        method: 'DELETE',
        body: JSON.stringify({ cartItemId }),
      });
    } catch (error) {
      throw error;
    }
  },
  
  update: async (cartItemId, quantity) => {
    try {
      return await apiRequest('/cart/update', {
        method: 'PATCH',
        body: JSON.stringify({ cartItemId, quantity }),
      });
    } catch (error) {
      throw error;
    }
  },
  
  clear: async () => {
    try {
      return await apiRequest('/cart/clear', {
        method: 'DELETE',
      });
    } catch (error) {
      throw error;
    }
  }
};

// Order Service
const OrderService = {
  create: async () => {
    try {
      return await apiRequest('/order/create', {
        method: 'POST',
      });
    } catch (error) {
      throw error;
    }
  },
  
  getMyOrders: async () => {
    try {
      return await apiRequest('/order/me');
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },
  
  getById: async (id) => {
    try {
      return await apiRequest(`/order/${id}`);
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  },
  
  cancel: async (id) => {
    try {
      return await apiRequest(`/order/${id}/cancel`, {
        method: 'PATCH',
      });
    } catch (error) {
      throw error;
    }
  }
};

// Wishlist Service
const WishlistService = {
  getAll: async () => {
    try {
      return await apiRequest('/wishlist');
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      return [];
    }
  },
  
  toggle: async (productId) => {
    try {
      return await apiRequest('/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId: String(productId) }),
      });
    } catch (error) {
      throw error;
    }
  },
  
  add: async (productId) => {
    try {
      return await apiRequest(`/wishlist/${productId}`, {
        method: 'POST',
      });
    } catch (error) {
      throw error;
    }
  },
  
  remove: async (productId) => {
    try {
      return await apiRequest(`/wishlist/${productId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw error;
    }
  },
  
  clear: async () => {
    try {
      return await apiRequest('/wishlist', {
        method: 'DELETE',
      });
    } catch (error) {
      throw error;
    }
  }
};

// Export for use in other scripts
window.ECommerceAPI = {
  Auth: AuthService,
  Products: ProductService,
  Categories: CategoryService,
  Cart: CartService,
  Orders: OrderService,
  Wishlist: WishlistService,
  TokenManager
};

