import React from 'react';
import { useApp } from '../context/AppContext';
import { MenuItemCard } from './MenuItemCard';

export function MenuDisplay() {
  const { state } = useApp();

  if (!state.currentMenu) {
    return null;
  }

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {state.currentMenu.items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}