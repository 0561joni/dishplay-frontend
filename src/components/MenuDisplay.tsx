import React from 'react';
import { useApp } from '../context/AppContext';
import { MenuItemCard } from './MenuItemCard';

export function MenuDisplay() {
  const { state } = useApp();

  if (!state.currentMenu) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {state.currentMenu.name}
        </h2>
        <p className="text-gray-600">
          {state.currentMenu.items.length} items extracted from your menu
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.currentMenu.items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}