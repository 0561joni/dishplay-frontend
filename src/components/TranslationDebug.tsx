import React from 'react';
import { useApp } from '../context/AppContext';

export function TranslationDebug() {
  const { state } = useApp();

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="font-bold mb-2">Translation Debug</div>
      <div>Language: {state.language}</div>
      <div>Has Menu: {state.currentMenu ? 'Yes' : 'No'}</div>
      {state.currentMenu && (
        <>
          <div>Items Count: {state.currentMenu.items.length}</div>
          <div>First Item Name: {state.currentMenu.items[0]?.name || state.currentMenu.items[0]?.item_name || 'N/A'}</div>
          <div>First Item Desc: {state.currentMenu.items[0]?.description || 'N/A'}</div>
        </>
      )}
    </div>
  );
}