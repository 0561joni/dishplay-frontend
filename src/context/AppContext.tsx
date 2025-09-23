import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { User, MenuItem, CartItem, Menu, Language } from '../types';
import { supabase, getUserProfile } from '../lib/supabase';
import { api, getAuthToken } from '../utils/api';
import { transformMenuResponse } from '../utils/menuTransform';

interface RecentMenuEntry {
  id: string;
  name: string;
}

interface AppState {
  user: User | null;
  currentMenu: Menu | null;
  favorites: FavoriteItem[];
  language: Language;
  isLoading: boolean;
  isInitialized: boolean;
  initError: string | null;
  isMobileMenuOpen: boolean;
  previousMenuId: string | null;
  previousMenuName: string | null;
  isRecallingMenu: boolean;
  recallError: string | null;
  recentMenus: RecentMenuEntry[];
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_MENU'; payload: Menu | null }
  | { type: 'SET_PREVIOUS_MENU'; payload: { id: string; name?: string | null } }
  | { type: 'ADD_TO_FAVORITES'; payload: MenuItem }
  | { type: 'REMOVE_FROM_FAVORITES'; payload: string }
  | { type: 'CLEAR_FAVORITES' }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_INIT_ERROR'; payload: string | null }
  | { type: 'CYCLE_IMAGE'; payload: { itemId: string; direction: 'next' | 'prev' } }
  | { type: 'TOGGLE_MOBILE_MENU' }
  | { type: 'SET_RECALLING_MENU'; payload: boolean }
  | { type: 'SET_RECALL_ERROR'; payload: string | null }
  | { type: 'SET_RECENT_MENUS'; payload: RecentMenuEntry[] }
  | { type: 'UPDATE_MENU_ITEM_IMAGES'; payload: { menuId: string; itemId: string; images: string[]; status?: 'ready' | 'fallback'; sources?: { url: string; source?: string | null }[] } }
  | { type: 'LOGOUT' };

const initialState: AppState = {
  user: null,
  currentMenu: null,
  favorites: [],
  language: 'en',
  isLoading: false,
  isInitialized: false,
  initError: null,
  isMobileMenuOpen: false,
  previousMenuId: null,
  previousMenuName: null,
  isRecallingMenu: false,
  recallError: null,
  recentMenus: [],
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  recallLastMenu: () => Promise<{ success: boolean; message?: string }>;
  recallMenuById: (menuId: string) => Promise<{ success: boolean; message?: string }>;
} | null>(null);

const normalizeMenuName = (name?: string | null): string => {
  if (!name) {
    return 'Uploaded Menu';
  }
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : 'Uploaded Menu';
};

const addRecentMenu = (existing: RecentMenuEntry[], entry?: { id?: string; name?: string | null }): RecentMenuEntry[] => {
  if (!entry?.id) {
    return existing;
  }
  const normalized = { id: entry.id, name: normalizeMenuName(entry.name) };
  const filtered = existing.filter((menu) => menu.id !== normalized.id);
  return [normalized, ...filtered].slice(0, 3);
};

const setRecentMenuList = (entries: { id?: string; name?: string | null }[]): RecentMenuEntry[] => {
  const result: RecentMenuEntry[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry?.id || seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    result.push({ id: entry.id, name: normalizeMenuName(entry.name) });
    if (result.length >= 3) {
      break;
    }
  }
  return result;
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        currentMenu: null,
        favorites: [],
        previousMenuId: null,
        previousMenuName: null,
        isRecallingMenu: false,
        recallError: null,
        recentMenus: [],
      };
    
    case 'SET_MENU': {
      const nextMenu = action.payload;
      const previousMenuId = state.currentMenu?.id ?? state.previousMenuId;
      const previousMenuName = state.currentMenu?.name ?? state.previousMenuName;

      if (!nextMenu) {
        return {
          ...state,
          previousMenuId,
          previousMenuName,
          currentMenu: null,
          recallError: null,
          recentMenus: state.recentMenus,
        };
      }

      let mergedItems = nextMenu.items;
      if (state.currentMenu && state.currentMenu.id === nextMenu.id) {
        const existingMap = new Map(state.currentMenu.items.map(item => [item.id, item]));
        mergedItems = nextMenu.items.map(item => {
          const existing = existingMap.get(item.id);
          if (!existing) {
            return item;
          }

          const nextImages = item.images && item.images.length ? item.images : existing.images;
          return {
            ...item,
            images: nextImages,
            currentImageIndex: existing.currentImageIndex ?? 0,
            imageStatus: item.imageStatus ?? existing.imageStatus,
            imageSources: item.imageSources && item.imageSources.length ? item.imageSources : existing.imageSources,
          };
        });
      }

      const updatedRecentMenus = nextMenu.status === 'completed'
        ? addRecentMenu(state.recentMenus, { id: nextMenu.id, name: nextMenu.name })
        : state.recentMenus;

      return {
        ...state,
        previousMenuId,
        previousMenuName,
        currentMenu: {
          ...nextMenu,
          items: mergedItems,
        },
        recallError: null,
        recentMenus: updatedRecentMenus,
      };
    }

    case 'SET_PREVIOUS_MENU':
      return {
        ...state,
        previousMenuId: action.payload.id,
        previousMenuName: normalizeMenuName(action.payload.name ?? state.previousMenuName),
        recentMenus: addRecentMenu(state.recentMenus, action.payload),
      };

    case 'SET_RECENT_MENUS': {
      const normalized = setRecentMenuList(action.payload);
      return {
        ...state,
        recentMenus: normalized,
        previousMenuId: normalized[0]?.id ?? state.previousMenuId,
        previousMenuName: normalized[0]?.name ?? state.previousMenuName,
      };
    }

    case 'UPDATE_MENU_ITEM_IMAGES': {
      if (!state.currentMenu || state.currentMenu.id !== action.payload.menuId) {
        return state;
      }

      const updatedItems = state.currentMenu.items.map((item) => {
        if (item.id !== action.payload.itemId) {
          return item;
        }

        const nextImages = Array.isArray(action.payload.images) ? action.payload.images : [];
        const nextStatus = action.payload.status ?? 'ready';

        const nextIndex = nextImages.length ? Math.min(item.currentImageIndex ?? 0, nextImages.length - 1) : (item.currentImageIndex ?? 0);
        return {
          ...item,
          images: nextImages,
          imageStatus: nextStatus,
          imageSources: action.payload.sources ?? item.imageSources ?? [],
          currentImageIndex: nextIndex,
        };
      });

      return {
        ...state,
        currentMenu: {
          ...state.currentMenu,
          status: state.currentMenu.status === 'completed' ? state.currentMenu.status : 'processing',
          items: updatedItems,
        },
      };
    }

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

    case 'SET_RECALLING_MENU':
      return { ...state, isRecallingMenu: action.payload };

    case 'SET_RECALL_ERROR':
      return { ...state, recallError: action.payload };
    
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

  const recallMenuById = useCallback(async (menuId: string): Promise<{ success: boolean; message?: string }> => {
    const trimmedId = menuId?.trim();
    if (!trimmedId) {
      const message = 'No menu selected yet.';
      dispatch({ type: 'SET_RECALL_ERROR', payload: message });
      return { success: false, message };
    }

    if (!state.user) {
      const message = 'Please log in to recall a menu.';
      dispatch({ type: 'SET_RECALL_ERROR', payload: message });
      return { success: false, message };
    }

    dispatch({ type: 'SET_RECALL_ERROR', payload: null });
    dispatch({ type: 'SET_RECALLING_MENU', payload: true });

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const menuData = await api.menu.getMenu(trimmedId, token);
      const transformedMenu = transformMenuResponse(menuData, state.user.id);
      dispatch({ type: 'SET_MENU', payload: transformedMenu });
      window.dispatchEvent(new CustomEvent('menuProcessed', { detail: { source: 'history' } }));
      return { success: true };
    } catch (error) {
      console.error('Failed to recall menu:', error);
      const message = error instanceof Error ? error.message : 'Failed to recall menu';
      dispatch({ type: 'SET_RECALL_ERROR', payload: message });
      return { success: false, message };
    } finally {
      dispatch({ type: 'SET_RECALLING_MENU', payload: false });
    }
  }, [state.user, dispatch]);

  const recallLastMenu = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    const targetMenuId = state.recentMenus[0]?.id || state.previousMenuId;
    if (!targetMenuId) {
      const message = 'No recent menus available yet.';
      dispatch({ type: 'SET_RECALL_ERROR', payload: message });
      return { success: false, message };
    }

    return recallMenuById(targetMenuId);
  }, [state.recentMenus, state.previousMenuId, recallMenuById, dispatch]);

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

  useEffect(() => {
    let isCancelled = false;

    const preloadPreviousMenu = async () => {
      if (
        !state.isInitialized ||
        !state.user?.id ||
        state.previousMenuId ||
        state.isRecallingMenu ||
        state.recentMenus.length > 0
      ) {
        return;
      }

      try {
        const token = await getAuthToken();
        if (!token) {
          return;
        }

        const latestMenuResponse = await api.menu.getLatestMenu(token, 3);
        const recent = Array.isArray(latestMenuResponse?.menus) ? latestMenuResponse.menus : [];

        if (!recent.length || isCancelled) {
          return;
        }

        const formatted = recent
          .filter((menu): menu is { id: string; restaurant_name?: string | null; name?: string | null } =>
            typeof menu?.id === 'string' && menu.id.trim().length > 0,
          )
          .map((menu) => ({
            id: menu.id,
            name: typeof menu.restaurant_name === 'string' ? menu.restaurant_name : menu.name,
          }));

        if (formatted.length === 0) {
          return;
        }

        dispatch({ type: 'SET_RECENT_MENUS', payload: formatted });
      } catch (error) {
        console.error('Failed to preload latest menus:', error);
      }
    };

    preloadPreviousMenu();

    return () => {
      isCancelled = true;
    };
  }, [state.isInitialized, state.user?.id, state.previousMenuId, state.currentMenu?.id, state.isRecallingMenu, state.recentMenus.length, dispatch]);


  return (
    <AppContext.Provider value={{ state, dispatch, recallLastMenu, recallMenuById }}>
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
