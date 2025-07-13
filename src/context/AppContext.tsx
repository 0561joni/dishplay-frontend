import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, MenuItem, CartItem, Menu, Language } from '../types';
import { supabase, getUserProfile } from '../lib/supabase';

interface AppState {
  user: User | null;
  currentMenu: Menu | null;
  favorites: FavoriteItem[];
  language: Language;
  isLoading: boolean;
  isInitialized: boolean;
  initError: string | null;
  isMobileMenuOpen: boolean;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_MENU'; payload: Menu | null }
  | { type: 'ADD_TO_FAVORITES'; payload: MenuItem }
  | { type: 'REMOVE_FROM_FAVORITES'; payload: string }
  | { type: 'CLEAR_FAVORITES' }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_INIT_ERROR'; payload: string | null }
  | { type: 'CYCLE_IMAGE'; payload: { itemId: string; direction: 'next' | 'prev' } }
  | { type: 'TOGGLE_MOBILE_MENU' }
  | { type: 'LOGOUT' };

const initialState: AppState = {
  user: null,
  currentMenu: null,
  favorites: [],
  language: 'en',
  isLoading: false,
  isInitialized: false,
  initError: null,
  isMobileMenuOpen: false
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'LOGOUT':
      return { ...state, user: null, currentMenu: null, favorites: [] };
    
    case 'SET_MENU':
      return { ...state, currentMenu: action.payload };
    
    case 'ADD_TO_FAVORITES': {
      const existingItem = state.favorites.find(item => item.id === action.payload.id);
      if (existingItem) {
        return state; // Already in favorites
      }
      return {
        ...state,
        favorites: [...state.favorites, { id: action.payload.id, menuItem: action.payload }]
      };
    }
    
    case 'REMOVE_FROM_FAVORITES':
      return {
        ...state,
        favorites: state.favorites.filter(item => item.id !== action.payload)
      };
    
    case 'CLEAR_FAVORITES':
      return { ...state, favorites: [] };
    
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };

    case 'SET_INIT_ERROR':
      return { ...state, initError: action.payload };
    
    case 'TOGGLE_MOBILE_MENU':
      return { ...state, isMobileMenuOpen: !state.isMobileMenuOpen };
    
    case 'CYCLE_IMAGE':
      if (!state.currentMenu) return state;
      
      return {
        ...state,
        currentMenu: {
          ...state.currentMenu,
          items: state.currentMenu.items.map(item => {
            if (item.id === action.payload.itemId) {
              const newIndex = action.payload.direction === 'next'
                ? (item.currentImageIndex + 1) % item.images.length
                : (item.currentImageIndex - 1 + item.images.length) % item.images.length;
              return { ...item, currentImageIndex: newIndex };
            }
            return item;
          })
        }
      };
    
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Debug mode - set via URL parameter ?debug=true
  const debugMode = new URLSearchParams(window.location.search).get('debug') === 'true';

  useEffect(() => {
    let isMounted = true;
    let authListenerUnsubscribe: (() => void) | null = null;
    let initTimeout: NodeJS.Timeout | null = null;
    let isInitComplete = false; // Track completion outside of state
    
    const initializeAuth = async () => {
      // Check if we should bypass auth (for testing)
      const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true';
      if (bypassAuth) {
        console.log('⚠️ Auth bypassed for testing');
        isInitComplete = true;
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        return;
      }
      
      // Check if Supabase is configured
      if (!supabase) {
        if (isMounted) {
          dispatch({
            type: 'SET_INIT_ERROR',
            payload: 'Supabase environment variables are missing. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
          });
          isInitComplete = true;
          dispatch({ type: 'SET_INITIALIZED', payload: true });
        }
        return;
      }

      // Set a maximum timeout for initialization
      initTimeout = setTimeout(() => {
        if (isMounted && !isInitComplete) {
          console.warn('Initialization timeout reached');
          isInitComplete = true;
          dispatch({ type: 'SET_INITIALIZED', payload: true });
          dispatch({ type: 'SET_INIT_ERROR', payload: 'Initialization timeout - please refresh the page' });
        }
      }, 15000); // Reduced to 15 seconds for faster feedback

      try {
        console.log('🚀 Starting auth initialization...');
        console.log('📍 Supabase URL:', import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...');
        console.log('🔑 Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
        
        // First, set up the auth state change listener
        // This will catch any auth changes that happen during initialization
        console.log('📡 Setting up auth state listener...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
            
            if (!isMounted) {
              return;
            }
            
            if (event === 'SIGNED_IN' && session?.user) {
              try {
                const profile = await getUserProfile(session.user.id);
                const user: User = {
                  ...profile,
                  plan: profile.plan || 'light',
                  isAuthenticated: true
                };
                dispatch({ type: 'SET_USER', payload: user });
                console.log('User signed in:', user.email);
              } catch (error) {
                console.error('Error fetching user profile on sign in:', error);
                // Don't sign out here - let the user retry or handle it manually
                dispatch({ type: 'SET_USER', payload: null });
              }
            } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
              console.log('User signed out');
              dispatch({ type: 'LOGOUT' });
            }
          }
        );
        
        authListenerUnsubscribe = () => subscription.unsubscribe();
        console.log('✅ Auth listener setup complete');
        
        // Now check for existing session with a shorter timeout
        console.log('🔍 Checking for existing session...');
        try {
          // Create a timeout promise for the session check
          const sessionTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session check timeout')), 5000)
          );
          
          const sessionPromise = supabase.auth.getSession();
          
          try {
            const { data: { session }, error } = await Promise.race([
              sessionPromise,
              sessionTimeoutPromise
            ]) as any;
            
            console.log('📊 Session check result:', { 
              hasSession: !!session, 
              hasError: !!error,
              error: error?.message 
            });
          
          if (error) {
            // Log the error but don't throw - user might just not be logged in
            console.warn('Session check error:', error);
          } else if (session?.user) {
            console.log('Existing session found');
            try {
              const profile = await getUserProfile(session.user.id);
              const user: User = {
                ...profile,
                plan: profile.plan || 'light',
                isAuthenticated: true
              };
              if (isMounted) {
                dispatch({ type: 'SET_USER', payload: user });
                console.log('User profile loaded:', user.email);
              }
            } catch (profileError) {
              console.error('Error fetching user profile:', profileError);
              // Profile might not exist yet - this is okay for new users
              if (isMounted) {
                dispatch({ type: 'SET_USER', payload: null });
              }
            }
          } else {
            console.log('👤 No existing session');
          }
          } catch (timeoutError) {
            console.warn('⏱️ Session check timed out:', timeoutError);
            // Continue without session
          }
        } catch (sessionError) {
          // If getSession fails completely, just continue without a session
          console.error('❌ Failed to get session:', sessionError);
        }
        
        console.log('✨ Auth initialization completed successfully');
        
        // Clear any errors since we completed successfully
        if (isMounted) {
          dispatch({ type: 'SET_INIT_ERROR', payload: null });
          
          // Mark as initialized and clear the timeout immediately
          isInitComplete = true;
          if (initTimeout) {
            clearTimeout(initTimeout);
            initTimeout = null;
          }
          dispatch({ type: 'SET_INITIALIZED', payload: true });
          console.log('Auth initialization complete');
        }
        
      } catch (error) {
        console.error('💥 Critical error during auth initialization:', error);
        if (isMounted) {
          dispatch({
            type: 'SET_INIT_ERROR',
            payload: `Authentication initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
          
          // Mark as initialized even on error
          isInitComplete = true;
          if (initTimeout) {
            clearTimeout(initTimeout);
            initTimeout = null;
          }
          dispatch({ type: 'SET_INITIALIZED', payload: true });
        }
      }
    };

    // Start initialization
    initializeAuth();

    // Cleanup function
    return () => {
      isMounted = false;
      if (authListenerUnsubscribe) {
        authListenerUnsubscribe();
      }
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
