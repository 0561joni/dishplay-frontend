import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { MenuItemCard } from './MenuItemCard';
import { api, getAuthToken } from '../utils/api';
import { MenuItem } from '../types';

export function MenuDisplay() {
  const { state } = useApp();
  const [translatedItems, setTranslatedItems] = useState<MenuItem[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);

  // Create stable references for menu content (excluding image indices)
  const menuId = state.currentMenu?.id;
  const itemNames = state.currentMenu?.items.map(item => item.item_name || item.name).join(',');
  
  useEffect(() => {
    console.log('👀 Language/Menu change detected:', {
      language: state.language,
      hasMenu: !!state.currentMenu,
      itemCount: state.currentMenu?.items.length || 0,
      menuId: menuId
    });
    
    if (state.currentMenu && state.language !== 'en') {
      translateMenuItems();
    } else if (state.currentMenu) {
      console.log('📄 Using original items (English or no translation needed)');
      setTranslatedItems(state.currentMenu.items);
    }
  }, [menuId, itemNames, state.language]); // Only depend on actual content, not image indices

  const translateMenuItems = async () => {
    if (!state.currentMenu) return;
    
    console.log('🌍 Starting translation to:', state.language);
    console.log('📋 Original items:', state.currentMenu.items);
    
    setIsTranslating(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('No auth token available');
        setTranslatedItems(state.currentMenu.items);
        return;
      }

      // Prepare items for translation - ensure they have the correct structure
      const itemsToTranslate = state.currentMenu.items.map(item => ({
        id: item.id,
        name: item.item_name || item.name || '',
        description: item.description,
        price: item.price,
        currency: item.currency,
        images: item.images || [],
        currentImageIndex: item.currentImageIndex || 0
      }));

      console.log('📤 Sending for translation:', itemsToTranslate);

      const response = await api.translate.translateMenu(
        itemsToTranslate,
        state.language,
        token
      );

      console.log('📥 Translation response:', response);

      if (response.success && response.items) {
        // Map translated items back to the correct structure
        const mappedItems = response.items.map((translatedItem, index) => {
          const originalItem = state.currentMenu!.items[index];
          return {
            ...originalItem,
            name: translatedItem.name,
            item_name: translatedItem.name, // Ensure both fields are set
            description: translatedItem.description
          };
        });
        
        console.log('✨ Final translated items:', mappedItems);
        setTranslatedItems(mappedItems);
      } else {
        console.warn('Translation failed or no items returned, using originals');
        setTranslatedItems(state.currentMenu.items);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedItems(state.currentMenu.items);
    } finally {
      setIsTranslating(false);
    }
  };

  if (!state.currentMenu) {
    return null;
  }

  // Merge translated content with current image indices from live state
  const displayItems = translatedItems.length > 0 
    ? translatedItems.map((translatedItem, index) => {
        const liveItem = state.currentMenu?.items[index];
        return {
          ...translatedItem,
          currentImageIndex: liveItem?.currentImageIndex || 0, // Use current image index from live state
          images: liveItem?.images || translatedItem.images || [] // Ensure images are preserved
        };
      })
    : state.currentMenu?.items || [];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {state.currentMenu.name}
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">
          {state.currentMenu.items.length} items extracted from your menu
        </p>
      </div>

      {isTranslating && (
        <div className="text-center mb-4">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Translating menu...
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {displayItems.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}