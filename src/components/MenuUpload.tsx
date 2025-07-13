import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translate } from '../utils/translations';
import { api, getAuthToken, handleApiError } from '../utils/api';
import { createMenu, updateMenuStatus, createMenuItems, createItemImages } from '../lib/supabase';

export function MenuUpload() {
  const { state, dispatch } = useApp();
  const [error, setError] = useState('');

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG) or PDF');
      return;
    }

    if (!state.user) {
      setError('Please log in to upload menus');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    setError('');
    
    try {
      // Create menu record in Supabase
      const menu = await createMenu(state.user.id);
      
      // Get auth token for API call
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // Call backend API to process the menu
      const response = await api.menu.upload(file, token);
      
      if (response.success) {
        // Update menu status to completed
        await updateMenuStatus(menu.id, 'completed');
        
        // Create menu items in Supabase
      const menuItems = await createMenuItems(
        menu.id,
        response.items.map((item: { name: string; description?: string; price?: number }, index: number) => ({
          item_name: item.name,
          description: item.description,
          price: item.price,
          currency: 'USD',
          order_index: index
        }))
      );

        // Create item images for each menu item
        for (let i = 0; i < menuItems.length; i++) {
          const menuItem = menuItems[i];
          const responseItem = response.items[i];
          
          if (responseItem.images && responseItem.images.length > 0) {
            await createItemImages(menuItem.id, responseItem.images.map((imageUrl: string, imageIndex: number) => ({
              image_url: imageUrl,
              source: 'api',
              is_primary: imageIndex === 0
            })));
          }
        }

        // Transform data for frontend
        const transformedMenu = {
          id: menu.id,
          user_id: menu.user_id,
          original_image_url: menu.original_image_url,
          processed_at: menu.processed_at,
          status: 'completed' as const,
          name: response.restaurantName || 'Uploaded Menu',
          items: menuItems.map((item, index) => ({
            id: item.id,
            menu_id: item.menu_id,
            item_name: item.item_name,
            description: item.description,
            price: item.price,
            currency: item.currency,
            order_index: item.order_index,
            images: response.items[index]?.images || [],
            currentImageIndex: 0
          }))
        };

        dispatch({ type: 'SET_MENU', payload: transformedMenu });
        
        // Auto-navigate to menu view after successful processing
        setTimeout(() => {
          // This will be handled by the parent component
          window.dispatchEvent(new CustomEvent('menuProcessed'));
        }, 500);
      } else {
        await updateMenuStatus(menu.id, 'failed');
        setError(response.message || 'Failed to process menu');
      }
    } catch (error) {
      console.error('Menu upload error:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, state.user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          {translate('uploadMenu', state.language)}
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">
          Upload your menu image and let us extract the items for you
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center hover:border-blue-400 transition-colors cursor-pointer touch-manipulation"
      >
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
          id="menu-upload"
        />
        <label htmlFor="menu-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-full">
              <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-medium text-gray-900 mb-1">
                {translate('dragDropText', state.language)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Supports JPG, PNG, PDF (max 10MB)
              </p>
            </div>
          </div>
        </label>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {state.isLoading && (
        <div className="mt-6 sm:mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            {translate('processing', state.language)}
          </div>
        </div>
      )}
    </div>
  );
}