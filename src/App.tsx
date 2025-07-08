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
          <p className="text-gray-600">Loading...</p>
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
      
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('upload')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                currentView === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Upload Menu
            </button>
            {state.currentMenu && (
              <button
                onClick={() => setCurrentView('menu')}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  currentView === 'menu'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                View Menu
              </button>
            )}
            {state.cart.length > 0 && (
              <button
                onClick={() => setCurrentView('cart')}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  currentView === 'cart'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Cart ({state.cart.length})
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-8">
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