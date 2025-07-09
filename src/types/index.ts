export interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  birthday?: string | null;
  gender?: string | null;
  credits: number;
  plan?: 'light' | 'normal' | 'pro';
  created_at: string;
  updated_at: string;
  isAuthenticated: boolean;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  item_name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  order_index: number | null;
  images: string[];
  currentImageIndex: number;
}

export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
}

export interface Menu {
  id: string;
  user_id: string;
  original_image_url: string | null;
  processed_at: string;
  status: 'processing' | 'completed' | 'failed';
  name: string; // Derived from processing
  items: MenuItem[];
}

export interface ItemImage {
  id: string;
  menu_item_id: string;
  image_url: string;
  source: string | null;
  is_primary: boolean | null;
}

export type Language = 'en' | 'fr' | 'de' | 'es';

export interface Plan {
  id: 'light' | 'normal' | 'pro';
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

export interface Translation {
  [key: string]: {
    [key in Language]: string;
  };
}