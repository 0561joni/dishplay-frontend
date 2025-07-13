import React from 'react';
import { Heart, Utensils, Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MobileMenu } from './MobileMenu';

export function Header() {
  const { state, dispatch } = useApp();
  const favoritesCount = state.favorites.length;

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Menu Button */}
            {state.user && (
              <button
                onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
            )}
            
            {/* Spacer for non-logged in users */}
            {!state.user && <div className="w-10"></div>}

            {/* Centered Logo */}
            <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
                <Utensils className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">DishPlay</span>
            </div>
            {/* Favorites - only show when user is logged in */}
            {state.user && (
              <button 
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {/* Will be handled in App.tsx */}}
              >
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}
            
            {/* Spacer for non-logged in users */}
            {!state.user && <div className="w-10"></div>}
          </div>
        </div>
      </header>
      
      {/* Mobile Menu */}
      {state.user && (
        <MobileMenu 
          isOpen={state.isMobileMenuOpen} 
          onClose={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })} 
        />
      )}
    </>
  );
}