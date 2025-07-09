import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { AuthForm } from './components/AuthForm';
import { MenuUpload } from './components/MenuUpload';
import { MenuDisplay } from './components/MenuDisplay';
import { Cart } from './components/Cart';

function AppContent() {
  const { state } = useApp();
  const [currentView, setCurrentView] = useState<'upload' | 'menu' | 'cart'>('upload');

  // Show loading screen while initializing
  if (!state.isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
          <p className="text-xs text-gray-400 mt-2">Check console for details</p>
        </div>
      </div>
    );
  }

  if (state.initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.initError}
        </div>
      </div>
    );
  }

  if (!state.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="py-12">
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="py-8 relative">
        {/* Floating Navigation */}
        {state.user && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
            <div className="bg-white rounded-full shadow-lg border border-gray-200 px-2 py-2 flex items-center gap-2">
              <button
                onClick={() => setCurrentView('upload')}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ${
                  currentView === 'upload'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Upload
              </button>
              {state.currentMenu && (
                <button
                  onClick={() => setCurrentView('menu')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ${
                    currentView === 'menu'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Menu
                </button>
              )}
              {state.cart.length > 0 && (
                <button
                  onClick={() => setCurrentView('cart')}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 relative ${
                    currentView === 'cart'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Cart
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {state.cart.length}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
        
        {currentView === 'upload' && <MenuUpload />}
        {currentView === 'menu' && <MenuDisplay />}
        {currentView === 'cart' && <Cart />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;