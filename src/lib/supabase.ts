import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('🔧 Supabase configuration:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlStart: supabaseUrl.substring(0, 30)
});

if (!supabaseUrl || !supabaseAnonKey) {
  // Avoid crashing the app during preview when env vars are not set
  console.error(
    '❌ Supabase environment variables are missing. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

// Generate a unique storage key to prevent conflicts between multiple instances
const instanceId = Math.random().toString(36).substring(7);
const storageKey = `dishplay-auth-${window.location.hostname}-${instanceId}`;

// Use sessionStorage in development to avoid conflicts
const isDevelopment = import.meta.env.DEV;
const storage = isDevelopment ? window.sessionStorage : window.localStorage;

export const supabase: SupabaseClient<Database> | null =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storageKey: storageKey,
          storage: {
            getItem: (key) => {
              try {
                return storage.getItem(key);
              } catch {
                return null;
              }
            },
            setItem: (key, value) => {
              try {
                storage.setItem(key, value);
              } catch {
                console.warn('Failed to save to storage');
              }
            },
            removeItem: (key) => {
              try {
                storage.removeItem(key);
              } catch {
                console.warn('Failed to remove from storage');
              }
            }
          }
        }
      })
    : null;

// Clean up old auth tokens from previous instances
if (typeof window !== 'undefined' && !isDevelopment) {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('dishplay-auth-') && !key.includes(instanceId)) {
        console.log('Cleaning up old auth token:', key);
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clean up old auth tokens:', error);
  }
}

// Helper function to get current user with timeout
export const getCurrentUser = async () => {
  if (!supabase) return null;
  
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Get user timeout')), 5000)
    );
    
    const getUserPromise = supabase.auth.getUser();
    
    const { data: { user }, error } = await Promise.race([
      getUserPromise,
      timeoutPromise
    ]) as any;
    
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Helper function to get user profile with retry logic
export const getUserProfile = async (userId: string, retries = 2) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  let lastError: any;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        lastError = error;
        
        // If it's a not found error on first try, wait a bit for the trigger to create the profile
        if (error.code === 'PGRST116' && i === 0) {
          console.log('User profile not found, waiting for creation...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        throw error;
      }
      
      return data;
    } catch (error) {
      lastError = error;
      if (i < retries) {
        console.log(`Retry ${i + 1} for getUserProfile...`);
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }
  
  console.error('Error in getUserProfile after retries:', lastError);
  throw lastError;
};

// Helper function to update user credits
export const updateUserCredits = async (userId: string, credits: number) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data, error } = await supabase
    .from('users')
    .update({ credits })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Helper function to get user menus
export const getUserMenus = async (userId: string) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data, error } = await supabase
    .from('menus')
    .select(`
      *,
      menu_items (
        *,
        item_images (*)
      )
    `)
    .eq('user_id', userId)
    .order('processed_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// Helper function to create a new menu
export const createMenu = async (userId: string, title?: string) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data, error } = await supabase
    .from('menus')
    .insert({
      user_id: userId,
      title: title ?? 'Uploaded Menu',
      status: 'processing'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Helper function to update menu status
export const updateMenuStatus = async (menuId: string, status: 'processing' | 'completed' | 'failed') => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data, error } = await supabase
    .from('menus')
    .update({ status })
    .eq('id', menuId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Helper function to create menu items
export const createMenuItems = async (menuId: string, items: Array<{
  item_name: string;
  description?: string;
  price?: number;
  currency?: string;
  order_index?: number;
}>) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data, error } = await supabase
    .from('menu_items')
    .insert(items.map(item => ({ ...item, menu_id: menuId })))
    .select();
  
  if (error) throw error;
  return data;
};

// Helper function to create item images
export const createItemImages = async (menuItemId: string, images: Array<{
  image_url: string;
  source?: string;
  is_primary?: boolean;
}>) => {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data, error } = await supabase
    .from('item_images')
    .insert(images.map(image => ({ ...image, menu_item_id: menuItemId })))
    .select();
  
  if (error) throw error;
  return data;
};
