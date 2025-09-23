import React from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { MenuItem } from '../types';
import { useApp } from '../context/AppContext';

interface MenuItemCardProps {
  item: MenuItem;
}

function getItemName(item: MenuItem): string {
  return item.name || item.item_name || '';
}

const LOADING_MESSAGES = [
  "Convincing the fries to strike a pose...",
  "Politely asking the soup to stop sloshing for the camera...",
  "Fixing the salad's hair-those croutons never behave.",
  "Telling the pizza to suck in its cheese for the glamour shot...",
  "Negotiating with a very shy dumpling...",
];

function getLoadingMessage(item: MenuItem): string {
  const key = item.id || getItemName(item);
  const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return LOADING_MESSAGES[Math.abs(hash) % LOADING_MESSAGES.length];
}

function getItemDescription(item: MenuItem): string | null {
  return item.description;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { state, dispatch } = useApp();

  const isFavorite = state.favorites.some(fav => fav.id === item.id);

  const handleToggleFavorite = () => {
    if (isFavorite) {
      dispatch({ type: 'REMOVE_FROM_FAVORITES', payload: item.id });
    } else {
      dispatch({ type: 'ADD_TO_FAVORITES', payload: item });
    }
  };

  const handleImageCycle = (direction: 'next' | 'prev') => {
    dispatch({ type: 'CYCLE_IMAGE', payload: { itemId: item.id, direction } });
  };

  const isImageReady = item.imageStatus === 'ready' || item.imageStatus === 'fallback';
  const hasImages = Array.isArray(item.images) && item.images.length > 0;
  const currentImageIndex = item.currentImageIndex ?? 0;
  const showImage = isImageReady && hasImages;
  const showNavigation = showImage && item.images.length > 1;
  const loadingMessage = getLoadingMessage(item);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow touch-manipulation">
      {/* Image Section */}
      <div className="relative h-40 sm:h-48 bg-gray-100 overflow-hidden">
        {showImage ? (
          <img
            src={item.images[currentImageIndex]}
            alt={getItemName(item)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 text-orange-600">
            <div className="text-4xl animate-bounce mb-1">🍳</div>
            <p className="px-4 text-xs sm:text-sm text-center font-medium text-orange-700 animate-pulse">
              {loadingMessage}
            </p>
          </div>
        )}

        {item.imageStatus === 'fallback' && showImage && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full">
            Chef's substitute
          </div>
        )}

        {/* Image Navigation */}
        {showNavigation && (
          <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 hover:opacity-100 sm:opacity-100 transition-opacity">
            <button
              onClick={() => handleImageCycle('prev')}
              className="bg-black bg-opacity-50 text-white p-1.5 sm:p-2 rounded-full hover:bg-opacity-70 transition-colors touch-manipulation"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => handleImageCycle('next')}
              className="bg-black bg-opacity-50 text-white p-1.5 sm:p-2 rounded-full hover:bg-opacity-70 transition-colors touch-manipulation"
            >
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}

        {/* Image Indicators */}
        {showNavigation && (
          <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {item.images.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'}`}
              />
            ))}
          </div>
        )}
      </div>
      {/* Content Section */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base line-clamp-1">
          {getItemName(item)}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
          {getItemDescription(item)}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {item.price && (
              <span className="text-base sm:text-lg font-bold text-gray-900">${item.price}</span>
            )}
          </div>
          
          <button
            onClick={handleToggleFavorite}
            className={`p-2 sm:p-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 touch-manipulation ${
              isFavorite 
                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}