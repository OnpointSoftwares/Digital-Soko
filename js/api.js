// API Configuration
const API_BASE_URL = 'http://localhost:5000/api/v1';

// API Client Class
class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Get authentication token
  getToken() {
    return this.token || localStorage.getItem('token');
  }

  // Make HTTP request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    console.log(`[API] ${options.method || 'GET'} ${url}`);
    console.log('[API] Request body:', options.body);
    console.log('[API] Auth token present:', !!token);

    try {
      const response = await fetch(url, config);
      console.log(`[API] Response status: ${response.status} ${response.statusText}`);
      const data = await response.json();
      console.log('[API] Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // PUT request
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Upload file
  async upload(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  }
}

// Create API client instance
const api = new APIClient();

// Authentication API
const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => {
    api.setToken(null);
    return Promise.resolve({ success: true });
  },
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Reports API
const reportsAPI = {
  create: (reportData) => api.post('/reports', reportData),
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/reports${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => api.get(`/reports/${id}`),
  updateStatus: (id, statusData) => api.put(`/reports/${id}/status`, statusData),
  delete: (id) => api.delete(`/reports/${id}`),
  getStats: () => api.get('/reports/stats/overview'),
};

// Products API
const productsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/products${queryString ? '?' + queryString : ''}`);
  },
  getById: (id) => api.get(`/products/${id}`),
  create: (productData) => api.post('/products', productData),
  createWithImages: (formData) => api.upload('/products', formData),
  update: (id, productData) => api.put(`/products/${id}`, productData),
  updateWithImages: (id, formData) => api.upload(`/products/${id}`, formData),
  delete: (id) => api.delete(`/products/${id}`),
  deleteImage: (id, imageId) => api.delete(`/products/${id}/images/${imageId}`),
  getBySeller: (sellerId) => api.get(`/products/seller/${sellerId}`),
  uploadImages: (id, formData) => api.upload(`/products/${id}/images`, formData),
};

// Trades API
const tradesAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/trades${queryString ? '?' + queryString : ''}`);
  },
  getMyTrades: () => api.get('/trades'),
  getById: (id) => api.get(`/trades/${id}`),
  create: (tradeData) => api.post('/trades', tradeData),
  approve: (id) => api.put(`/trades/${id}/approve`, {}),
  reject: (id, reason) => api.put(`/trades/${id}/reject`, { reason }),
  complete: (id) => api.put(`/trades/${id}/complete`, {}),
  cancel: (id) => api.put(`/trades/${id}/cancel`, {}),
  delete: (id) => api.delete(`/trades/${id}`),
  getStats: () => api.get('/trades/stats'),
};

// Cart API
const cartAPI = {
  get: () => api.get('/cart'),
  addItem: (productId, quantity) => api.post('/cart/items', { productId, quantity }),
  updateItem: (productId, quantity) => api.put(`/cart/items/${productId}`, { quantity }),
  removeItem: (productId) => api.delete(`/cart/items/${productId}`),
  clear: () => api.delete('/cart'),
};

// Orders API
const ordersAPI = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  create: (orderData) => api.post('/orders', orderData),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  cancel: (id) => api.put(`/orders/${id}/cancel`, {}),
  getStats: () => api.get('/orders/stats'),
};

// Wishlist API
const wishlistAPI = {
  get: () => api.get('/wishlist'),
  add: (productId) => api.post(`/wishlist/${productId}`, {}),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
  clear: () => api.delete('/wishlist'),
};

// Export APIs
window.api = api;
window.authAPI = authAPI;
window.productsAPI = productsAPI;
window.tradesAPI = tradesAPI;
window.reportsAPI = reportsAPI;
window.cartAPI = cartAPI;
window.ordersAPI = ordersAPI;
window.wishlistAPI = wishlistAPI;
