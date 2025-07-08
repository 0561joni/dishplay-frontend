import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

// Helper function to update user credits
export const updateUserCredits = async (userId: string, credits: number) => {
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
export const createMenu = async (userId: string, originalImageUrl?: string) => {
  const { data, error } = await supabase
    .from('menus')
    .insert({
      user_id: userId,
      original_image_url: originalImageUrl,
      status: 'processing'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Helper function to update menu status
export const updateMenuStatus = async (menuId: string, status: 'processing' | 'completed' | 'failed') => {
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
  const { data, error } = await supabase
    .from('item_images')
    .insert(images.map(image => ({ ...image, menu_item_id: menuItemId })))
    .select();
  
  if (error) throw error;
  return data;
};