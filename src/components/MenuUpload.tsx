import React, { useCallback } from 'react';
import { Upload, Image } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translate } from '../utils/translations';
import { api, getAuthToken, handleApiError } from '../utils/api';

export function MenuUpload() {
  const { state, dispatch } = useApp();
  const [error, setError] = useState('');

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG) or PDF');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError('Please log in to upload menus');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    setError('');
    
    try {
      const response = await api.menu.upload(file, token);
      
      if (response.success) {
        dispatch({ type: 'SET_MENU', payload: response.menu });
      } else {
        setError(response.message || 'Failed to process menu');
      }
    } catch (error) {
      const errorResult = handleApiError(error);
      setError(errorResult.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {translate('uploadMenu', state.language)}
        </h2>
        <p className="text-gray-600">
          Upload your menu image and let us extract the items for you
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
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
            <div className="bg-blue-50 p-4 rounded-full">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {translate('dragDropText', state.language)}
              </p>
              <p className="text-sm text-gray-500">
                Supports JPG, PNG, PDF (max 10MB)
              </p>
            </div>
          </div>
        </label>
      </div>

      {state.isLoading && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            {translate('processing', state.language)}
          </div>
        </div>
      )}
    </div>
  );
}