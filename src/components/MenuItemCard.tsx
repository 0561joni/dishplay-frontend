import React from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { MenuItem } from '../types';
import { useApp } from '../context/AppContext';

interface MenuItemCardProps {
  item: MenuItem;
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

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow touch-manipulation">
      {/* Image Section */}
      <div className="relative h-40 sm:h-48 bg-gray-100">
        <img
          src={item.images[item.currentImageIndex || 0]}
          alt={item.item_name || item.name}
          className="w-full h-full object-cover"
        />
        
        {/* Image Navigation */}
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

        {/* Image Indicators */}
        <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
          {item.images.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${
                index === (item.currentImageIndex || 0) ? 'bg-white' : 'bg-white bg-opacity-50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base line-clamp-1">
          {item.item_name || item.name}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
          {item.description}
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