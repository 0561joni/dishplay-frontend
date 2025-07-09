import React from 'react';
import { ShoppingCart, Utensils, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translate } from '../utils/translations';
import { LanguageSelector } from './LanguageSelector';
import { PlanSelector } from './PlanSelector';
import { supabase } from '../lib/supabase';

export function Header() {
  const { state } = useApp();
  const cartItemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">DishPlay</span>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-6">
            <LanguageSelector />
            
            {/* Cart */}
            <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingCart className="w-6 h-6 text-gray-600" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* User */}
            <div className="flex items-center gap-3">
              {state.user ? (
                <div className="flex items-center gap-4">
                  <PlanSelector />
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              ) : (
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  {translate('login', state.language)}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}