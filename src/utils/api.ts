import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dishplay-backend.onrender.com';

// Helper function to validate token
const validateToken = (token: string | null): string => {
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    throw new Error('Authentication required. Please log in.');
  }
  return token;
};

// Cache for the current valid token to avoid repeated getSession calls
let cachedToken: string | null = null;
let cacheExpiry: number | null = null;

const clearTokenCache = () => {
  cachedToken = null;
  cacheExpiry = null;
};

const setCachedToken = (token: string, expiresAt: number) => {
  cachedToken = token;
  cacheExpiry = expiresAt * 1000; // Convert to milliseconds
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
    translateMenu: async (items: any[], targetLanguage: string, token: string) => {
      const validToken = validateToken(token);
      const response = await fetch(`${API_BASE_URL}/api/translation/translate-menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`,
        },
        body: JSON.stringify({ 
          items, 
          target_language: targetLanguage,
          source_language: 'auto'
        }),
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
    
    // Check cached token first
    if (cachedToken && cacheExpiry && new Date().getTime() < cacheExpiry - 60000) { // 1 minute buffer
      console.log('[Auth Debug] Using cached token');
      return cachedToken;
    } else if (cachedToken) {
      console.log('[Auth Debug] Cached token expired, clearing cache');
      clearTokenCache();
    }
    
    // Try multiple possible localStorage keys that Supabase might use
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
      const possibleKeys = [
        `sb-${projectRef}-auth-token`,
        `supabase.auth.token`,
        `sb-${projectRef}-session`,
        `supabase-auth-${projectRef}`
      ];
      
      console.log('[Auth Debug] Checking localStorage keys:', possibleKeys);
      
      for (const key of possibleKeys) {
        try {
          const storedData = localStorage.getItem(key);
          if (storedData) {
            console.log('[Auth Debug] Found data in key:', key);
            const parsed = JSON.parse(storedData);
            
            // Check different possible data structures
            let token = null;
            let expiresAt = null;
            
            if (parsed?.access_token) {
              token = parsed.access_token;
              expiresAt = parsed.expires_at;
            } else if (parsed?.session?.access_token) {
              token = parsed.session.access_token;
              expiresAt = parsed.session.expires_at;
            } else if (parsed?.currentSession?.access_token) {
              token = parsed.currentSession.access_token;
              expiresAt = parsed.currentSession.expires_at;
            }
            
            if (token && expiresAt) {
              const isExpired = new Date() > new Date(expiresAt * 1000);
              if (!isExpired) {
                console.log('[Auth Debug] Using valid token from localStorage key:', key);
                setCachedToken(token, expiresAt);
                return token;
              } else {
                console.log('[Auth Debug] Token in localStorage is expired');
              }
            }
          }
        } catch (e) {
          console.error(`[Auth Debug] Failed to parse localStorage key ${key}:`, e);
        }
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
        if (session.expires_at) {
          setCachedToken(session.access_token, session.expires_at);
        }
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
          if (refreshedSession.expires_at) {
            setCachedToken(refreshedSession.access_token, refreshedSession.expires_at);
          }
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
  clearTokenCache();
  console.log('Token removal handled by Supabase');
};

// Export for external use
export { clearTokenCache };