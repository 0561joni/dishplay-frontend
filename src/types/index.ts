export interface User {
  id: string;
  email: string;
  credits: number;
  isAuthenticated: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number | null;
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
  name: string;
  items: MenuItem[];
  uploadedAt: Date;
}

export type Language = 'en' | 'fr' | 'de' | 'es';

export interface Translation {
  [key: string]: {
    [key in Language]: string;
  };
}