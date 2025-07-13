import React from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translate } from '../utils/translations';

export function Favorites() {
  const { state, dispatch } = useApp();

  const handleRemoveItem = (id: string) => {
    dispatch({ type: 'REMOVE_FROM_FAVORITES', payload: id });
  };

  if (state.favorites.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 text-center">
        <div className="bg-gray-50 rounded-lg p-6 sm:p-8">
          <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Your favorites list is empty
          </h3>
          <p className="text-gray-500 text-sm sm:text-base">
            Add some delicious items from the menu to your favorites
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
        My Favorites
      </h2>

      <div className="space-y-3 sm:space-y-4">
        {state.favorites.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <img
                src={item.menuItem.images[0]}
                alt={item.menuItem.item_name}
                className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
              />
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                  {item.menuItem.item_name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                  {item.menuItem.description}
                </p>
                {item.menuItem.price && (
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    ${item.menuItem.price}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleRemoveItem(item.id)}
                className="p-2 hover:bg-red-50 rounded-full transition-colors group flex-shrink-0"
              >
                <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}