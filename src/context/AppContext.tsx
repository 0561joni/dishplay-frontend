import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, MenuItem, CartItem, Menu, Language } from '../types';
import { supabase, getUserProfile } from '../lib/supabase';

// Global flag to prevent multiple initialization attempts across tabs
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

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

  useEffect(() => {
    if (!supabase) {
      dispatch({
        type: 'SET_INIT_ERROR',
        payload:
          'Supabase environment variables are missing. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      });
      dispatch({ type: 'SET_INITIALIZED', payload: true });
      return;
    }

    const initializeAuth = async (): Promise<void> => {
      // If already initializing, wait for the existing initialization
      if (isInitializing && initializationPromise) {
        await initializationPromise;
        return;
      }

      // If already initialized in another tab, check session immediately
      if (localStorage.getItem('dishplay-initialized') === 'true') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await getUserProfile(session.user.id);
            const user: User = {
              ...profile,
              plan: profile.plan || 'light',
              isAuthenticated: true
            };
            dispatch({ type: 'SET_USER', payload: user });
          }
        } catch (error) {
          console.error('Error loading existing session:', error);
        } finally {
          dispatch({ type: 'SET_INITIALIZED', payload: true });
        }
        return;
      }

      // Mark as initializing
      isInitializing = true;
      
      // Create initialization promise
      initializationPromise = (async () => {
        try {
          console.log('Initializing auth...');
          const { data: { session } } = await supabase.auth.getSession();
          console.log('Session:', session);

          if (session?.user) {
            const profile = await getUserProfile(session.user.id);
            const user: User = {
              ...profile,
              plan: profile.plan || 'light',
              isAuthenticated: true
            };
            dispatch({ type: 'SET_USER', payload: user });
            console.log('User profile loaded:', user);
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
        } finally {
          // Mark as initialized in localStorage for other tabs
          localStorage.setItem('dishplay-initialized', 'true');
          dispatch({ type: 'SET_INITIALIZED', payload: true });
          isInitializing = false;
          initializationPromise = null;
          console.log('Auth initialization complete');
        }
      })();

      await initializationPromise;
    };

    // Add timeout to prevent infinite loading
    const initWithTimeout = async () => {
      try {
        await Promise.race([
          initializeAuth(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Initialization timeout')),
              30000
            )
          )
        ]);
      } catch (error) {
        console.error('Initialization failed or timed out:', error);
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      } finally {
        isInitializing = false;
        initializationPromise = null;
      }
    };

    initWithTimeout();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        // Process auth changes even if initialization is still running
        if (isInitializing) {
          console.log('Auth state change occurred during initialization');
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
            console.log('User signed in:', user);
          } catch (error) {
            console.error('Error fetching user profile:', error);
            // If profile doesn't exist, sign out the user
            await supabase.auth.signOut();
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          localStorage.removeItem('dishplay-initialized');
          dispatch({ type: 'LOGOUT' });
        }
      }
    );

    // Listen for storage changes to sync initialization across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dishplay-initialized' && e.newValue === 'true' && !state.isInitialized) {
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Clear initialization flag when component unmounts
  useEffect(() => {
    return () => {
      if (isInitializing) {
        isInitializing = false;
        initializationPromise = null;
      }
    };
  }, []);

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