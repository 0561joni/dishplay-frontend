import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translate } from '../utils/translations';
import { api, getAuthToken, handleApiError } from '../utils/api';
import { createMenu, updateMenuStatus, createMenuItems, createItemImages, supabase } from '../lib/supabase';
import { MenuUploadProgress } from './MenuUploadProgress';

export function MenuUpload() {
  const { state, dispatch } = useApp();
  const [error, setError] = useState('');
  const [uploadingMenuId, setUploadingMenuId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);

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
      // Get auth token FIRST before any Supabase operations
      console.log('[MenuUpload] Getting auth token before upload...');
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }
      console.log('[MenuUpload] Got auth token successfully');
      console.log('[MenuUpload] Token details:', {
        length: token.length,
        parts: token.split('.').length,
        firstChars: token.substring(0, 50),
        lastChars: token.substring(token.length - 50)
      });
      
      // Validate token format before proceeding
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('[MenuUpload] CRITICAL: Token is malformed!', {
          expectedParts: 3,
          actualParts: tokenParts.length,
          token: token
        });
        throw new Error(`Token is malformed: ${tokenParts.length} parts instead of 3`);
      }
      
      // Call backend API to process the menu - it will create the menu record
      const uploadResponse = await api.menu.upload(file, token);
      
      // Set the menu ID from the response and show progress
      if (uploadResponse.menu_id) {
        setUploadingMenuId(uploadResponse.menu_id);
        setShowProgress(true);
        dispatch({ type: 'SET_LOADING', payload: false }); // Turn off simple loading
        return; // Exit here - progress component will handle completion
      }
      
      // Fallback error - backend should always return menu_id
      throw new Error('Backend did not return menu ID');
    } catch (error) {
      console.error('Menu upload error:', error);
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, state.user]);

  const handleProgressComplete = useCallback(async (success: boolean) => {
    if (!success || !uploadingMenuId) {
      setError('Failed to process menu');
      setShowProgress(false);
      setUploadingMenuId(null);
      return;
    }

    try {
      // Get the processed menu data
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      
      const menuData = await api.menu.getMenu(uploadingMenuId, token);
      
      // Transform and set the menu data
      const transformedMenu = {
        id: menuData.id,
        user_id: state.user?.id || '',
        original_image_url: null,
        processed_at: menuData.processed_at,
        status: menuData.status,
        name: 'Uploaded Menu',
        items: menuData.items.map((item: any, index: number) => ({
          id: item.id,
          menu_id: menuData.id,
          item_name: item.name,
          description: item.description,
          price: item.price,
          currency: 'USD',
          order_index: index,
          images: item.images || [],
          currentImageIndex: 0
        }))
      };

      dispatch({ type: 'SET_MENU', payload: transformedMenu });
      
      // Reset state
      setShowProgress(false);
      setUploadingMenuId(null);
      
      // Auto-navigate to menu view
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('menuProcessed'));
      }, 500);
      
    } catch (error) {
      console.error('Error fetching processed menu:', error);
      setError('Failed to load processed menu');
      setShowProgress(false);
      setUploadingMenuId(null);
    }
  }, [uploadingMenuId, dispatch, state.user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Show progress component when uploading
  if (showProgress && uploadingMenuId) {
    return (
      <MenuUploadProgress
        menuId={uploadingMenuId}
        onComplete={handleProgressComplete}
      />
    );
  }

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
            Uploading menu...
          </div>
        </div>
      )}
    </div>
  );
}