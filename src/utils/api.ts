import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dishplay-backend.onrender.com';

// Helper function to validate token
const validateToken = (token: string | null): string => {
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    throw new Error('Authentication required. Please log in.');
  }
  return token;
};

export const api = {
  // Menu processing endpoints
  menu: {
    upload: async (file: File, token: string) => {
      console.log('[API Debug] Upload called with:');
      console.log('- Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      console.log('- API URL:', API_BASE_URL);
      console.log('- Full URL:', `${API_BASE_URL}/api/menu/upload`);
      
      // Validate token
      const validToken = validateToken(token);
      
      const formData = new FormData();
      formData.append('menu', file);
      
      const response = await fetch(`${API_BASE_URL}/api/menu/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
        body: formData,
      });
      
      console.log('[API Debug] Response status:', response.status);
      console.log('[API Debug] Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[API Debug] Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    
    getMenu: async (menuId: string, token: string) => {
      const validToken = validateToken(token);
      const response = await fetch(`${API_BASE_URL}/api/menu/${menuId}`, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    
    getUserMenus: async (token: string) => {
      const validToken = validateToken(token);
      const response = await fetch(`${API_BASE_URL}/api/menu/user`, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
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
      const validToken = validateToken(token);
      const response = await fetch(`${API_BASE_URL}/api/translate/menu-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`,
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
      const validToken = validateToken(token);
      const response = await fetch(`${API_BASE_URL}/api/images/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`,
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
      const validToken = validateToken(token);
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    
    updateCredits: async (credits: number, token: string) => {
      const validToken = validateToken(token);
      const response = await fetch(`${API_BASE_URL}/api/user/credits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`,
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
  try {
    console.log('[Auth Debug] Getting auth token...');
    
    if (!supabase) {
      console.error('[Auth Debug] Supabase client not initialized');
      return null;
    }
    
    // First, try the correct localStorage key for Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
      const localStorageKey = `sb-${projectRef}-auth-token`;
      
      try {
        const storedSession = localStorage.getItem(localStorageKey);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          const token = parsed?.access_token;
          const expiresAt = parsed?.expires_at;
          
          if (token && expiresAt) {
            const isExpired = new Date() > new Date(expiresAt * 1000);
            if (!isExpired) {
              console.log('[Auth Debug] Using valid token from localStorage');
              return token;
            } else {
              console.log('[Auth Debug] Token in localStorage is expired');
            }
          }
        }
      } catch (e) {
        console.error('[Auth Debug] Failed to parse localStorage session:', e);
      }
    }
    
    // Try getSession with timeout
    console.log('[Auth Debug] Attempting getSession...');
    try {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('getSession timeout')), 2000)
      );
      
      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (error) {
        console.error('[Auth Debug] Session error:', error);
        return null;
      }
      
      if (session?.access_token) {
        console.log('[Auth Debug] Got token from getSession');
        return session.access_token;
      }
      
    } catch (sessionError) {
      console.error('[Auth Debug] getSession failed or timed out:', sessionError);
      
      // Try refreshing the session as fallback
      console.log('[Auth Debug] Attempting to refresh session...');
      try {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshedSession?.access_token && !refreshError) {
          console.log('[Auth Debug] Session refreshed successfully');
          return refreshedSession.access_token;
        }
      } catch (refreshError) {
        console.error('[Auth Debug] Session refresh failed:', refreshError);
      }
    }
    
    console.log('[Auth Debug] All token retrieval methods failed');
    return null;
    
  } catch (error) {
    console.error('[Auth Debug] Unexpected error in getAuthToken:', error);
    return null;
  }
};

// These functions are kept for compatibility but will use Supabase auth
export const setAuthToken = (): void => {
  // Supabase handles token storage automatically
  console.log('Token management handled by Supabase');
};

export const removeAuthToken = (): void => {
  // Supabase handles token removal automatically
  console.log('Token removal handled by Supabase');};