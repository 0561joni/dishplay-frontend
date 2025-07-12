import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, MenuItem, CartItem, Menu, Language } from '../types';
import { supabase, getUserProfile } from '../lib/supabase';

interface AppState {
  user: User | null;
  currentMenu: Menu | null;
  cart: CartItem[];
  language: Language;
  isLoading: boolean;
  isInitialized: boolean;
  initError: string | null;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_MENU'; payload: Menu | null }
  | { type: 'ADD_TO_CART'; payload: MenuItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_INIT_ERROR'; payload: string | null }
  | { type: 'CYCLE_IMAGE'; payload: { itemId: string; direction: 'next' | 'prev' } }
  | { type: 'LOGOUT' };

const initialState: AppState = {
  user: null,
  currentMenu: null,
  cart: [],
  language: 'en',
  isLoading: false,
  isInitialized: false,
  initError: null
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
      return { ...state, user: null, currentMenu: null, cart: [] };
    
    case 'SET_MENU':
      return { ...state, currentMenu: action.payload };
    
    case 'ADD_TO_CART': {
      const existingItem = state.cart.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        };
      }
      return {
        ...state,
        cart: [...state.cart, { id: action.payload.id, menuItem: action.payload, quantity: 1 }]
      };
    }
    
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item.id !== action.payload)
      };
    
    case 'UPDATE_CART_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };

    case 'SET_INIT_ERROR':
      return { ...state, initError: action.payload };
    
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
    
    const initializeAuth = async () => {
      // Check if Supabase is configured
      if (!supabase) {
        if (isMounted) {
          dispatch({
            type: 'SET_INIT_ERROR',
            payload: 'Supabase environment variables are missing. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
          });
          dispatch({ type: 'SET_INITIALIZED', payload: true });
        }
        return;
      }

      // Set a maximum timeout for initialization
      initTimeout = setTimeout(() => {
        if (isMounted && !state.isInitialized) {
          console.warn('Initialization timeout reached');
          dispatch({ type: 'SET_INITIALIZED', payload: true });
          dispatch({ type: 'SET_INIT_ERROR', payload: 'Initialization timeout - please refresh the page' });
        }
      }, 30000); // 30 seconds max

      try {
        if (debugMode) console.log('🔍 Starting auth initialization...');
        
        // First, set up the auth state change listener
        // This will catch any auth changes that happen during initialization
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (debugMode) console.log('🔄 Auth state changed:', event, session?.user?.email);
            
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
        
        // Now check for existing session
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
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
            console.log('No existing session');
          }
        } catch (sessionError) {
          // If getSession fails completely, just continue without a session
          console.error('Failed to get session:', sessionError);
        }
        
      } catch (error) {
        console.error('Critical error during auth initialization:', error);
        if (isMounted) {
          dispatch({
            type: 'SET_INIT_ERROR',
            payload: `Authentication initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      } finally {
        if (isMounted) {
          dispatch({ type: 'SET_INITIALIZED', payload: true });
          console.log('Auth initialization complete');
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
