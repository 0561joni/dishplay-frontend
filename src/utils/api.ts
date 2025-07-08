const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  // Authentication endpoints
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      return response.json();
    },
    
    signup: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      return response.json();
    },
    
    verify: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.json();
    },
  },

  // Menu processing endpoints
  menu: {
    upload: async (file: File, token: string) => {
      const formData = new FormData();
      formData.append('menu', file);
      
      const response = await fetch(`${API_BASE_URL}/api/menu/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      return response.json();
    },
    
    getMenu: async (menuId: string, token: string) => {
      const response = await fetch(`${API_BASE_URL}/api/menu/${menuId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.json();
    },
    
    getUserMenus: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/api/menu/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.json();
    },
  },

  // Translation endpoints
  translate: {
    menuItem: async (itemId: string, language: string, token: string) => {
      const response = await fetch(`${API_BASE_URL}/api/translate/menu-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId, language }),
      });
      return response.json();
    },
  },

  // Image search endpoints
  images: {
    searchForMenuItem: async (itemName: string, description: string, token: string) => {
      const response = await fetch(`${API_BASE_URL}/api/images/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ itemName, description }),
      });
      return response.json();
    },
  },

  // User endpoints
  user: {
    getProfile: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.json();
    },
    
    updateCredits: async (credits: number, token: string) => {
      const response = await fetch(`${API_BASE_URL}/api/user/credits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ credits }),
      });
      return response.json();
    },
  },
};

// Helper function to handle API errors
export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  
  if (error.status === 401) {
    // Handle unauthorized - redirect to login
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
  
  return {
    success: false,
    message: error.message || 'An unexpected error occurred',
  };
};

// Helper function to get auth token
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Helper function to set auth token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

// Helper function to remove auth token
export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
};