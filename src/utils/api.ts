const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dishplay-backend.onrender.com';

export const api = {
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    
    getMenu: async (menuId: string, token: string) => {
      const response = await fetch(`${API_BASE_URL}/api/menu/${menuId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    
    getUserMenus: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/api/menu/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
  },
};

// Helper function to handle API errors
export const handleApiError = (error: unknown) => {
  console.error('API Error:', error);
  
  if (error instanceof Response && error.status === 401) {
    // Handle unauthorized - will be handled by Supabase auth
    return {
      success: false,
      message: 'Authentication required. Please log in.',
    };
  }
  
  if (error instanceof Error) {
    return {
      success: false,
      message: error.message,
    };
  }
  
  return {
    success: false,
    message: 'An unexpected error occurred',
  };
};

// Helper function to get auth token from Supabase
export const getAuthToken = async (): Promise<string | null> => {
  const { supabase } = await import('../lib/supabase');
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

// These functions are kept for compatibility but will use Supabase auth
export const setAuthToken = (): void => {
  // Supabase handles token storage automatically
  console.log('Token management handled by Supabase');
};

export const removeAuthToken = (): void => {
  // Supabase handles token removal automatically
  console.log('Token removal handled by Supabase');};