import { Menu, MenuItem } from '../types';

type RawMenuItem = {
  id: string;
  menu_id?: string;
  item_name?: string;
  name?: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  order_index?: number | null;
  images?: string[];
  currentImageIndex?: number;
};

type RawMenuResponse = {
  id: string;
  user_id?: string;
  original_image_url?: string | null;
  processed_at?: string;
  status?: string;
  name?: string;
  title?: string;
  items?: RawMenuItem[];
};

export function transformMenuResponse(menuData: RawMenuResponse, userId: string): Menu {
  const fallbackName = menuData?.name || menuData?.title || 'Uploaded Menu';
  const items: RawMenuItem[] = Array.isArray(menuData?.items) ? menuData.items : [];

  const transformedItems: MenuItem[] = items.map((item, index) => {
    const itemName = item.item_name || item.name || `Menu Item ${index + 1}`;

    return {
      id: item.id,
      menu_id: menuData.id,
      item_name: itemName,
      name: itemName,
      description: item.description ?? null,
      price: item.price ?? null,
      currency: item.currency ?? null,
      order_index: item.order_index ?? index,
      images: Array.isArray(item.images) ? [...item.images] : [],
      imageStatus: Array.isArray(item.images) && item.images.length > 0 ? 'ready' : 'loading',
      imageSources: [],
      currentImageIndex: typeof item.currentImageIndex === 'number' ? item.currentImageIndex : 0,
    };
  });

  return {
    id: menuData.id,
    user_id: userId,
    original_image_url: menuData.original_image_url ?? null,
    processed_at: menuData.processed_at || new Date().toISOString(),
    status: (menuData.status as Menu['status']) || 'completed',
    name: fallbackName,
    items: transformedItems,
  };
}
