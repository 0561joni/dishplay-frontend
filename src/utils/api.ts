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
    
    console.log('[Auth Debug] Getting session...');
    
    // Add timeout to getSession call
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('getSession timeout')), 5000)
    );
    
    const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
    console.log('[Auth Debug] Got session response');
    
    console.log('[Auth Debug] Session exists:', !!session);
    console.log('[Auth Debug] Session error:', error);
    if (session) {
      console.log('[Auth Debug] Token expiry:', new Date(session.expires_at! * 1000));
      console.log('[Auth Debug] Is expired:', new Date() > new Date(session.expires_at! * 1000));
    }
    
    const token = session?.access_token || null;
    
    // Debug token format
    if (token) {
      console.log('[Auth Debug] Token length:', token.length);
      console.log('[Auth Debug] Token parts:', token.split('.').length);
      console.log('[Auth Debug] Token starts with:', token.substring(0, 30));
      console.log('[Auth Debug] Token ends with:', token.substring(token.length - 30));
      
      // Validate JWT format (should have 3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('[Auth Debug] MALFORMED TOKEN - Expected 3 parts, got:', parts.length);
        console.error('[Auth Debug] Token parts:', parts);
      }
    }
    
    return token;
  } catch (error) {
    console.error('[Auth Debug] Error in getAuthToken:', error);
    
    // If getSession hangs, try to get user directly as fallback
    if (error.message === 'getSession timeout') {
      console.log('[Auth Debug] getSession timed out, trying getUser...');
      try {
        const { data: { user }, error: userError } = await Promise.race([
          supabase.auth.getUser(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('getUser timeout')), 3000)
          )
        ]);
        
        if (user && !userError) {
          console.log('[Auth Debug] getUser succeeded, but no access token available');
          // We have a user but can't get the session token reliably
          return null;
        }
      } catch (userError) {
        console.error('[Auth Debug] getUser also failed:', userError);
      }
    }
    
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