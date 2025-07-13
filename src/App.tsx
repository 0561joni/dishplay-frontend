import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { AuthForm } from './components/AuthForm';
import { MenuUpload } from './components/MenuUpload';
import { MenuDisplay } from './components/MenuDisplay';
import { Favorites } from './components/Cart';

function AppContent() {
  const { state } = useApp();
  const [currentView, setCurrentView] = useState<'upload' | 'menu' | 'favorites'>('upload');

  // Auto-navigate to menu when processing is complete
  useEffect(() => {
    const handleMenuProcessed = () => {
      setCurrentView('menu');
    };

    window.addEventListener('menuProcessed', handleMenuProcessed);
    return () => window.removeEventListener('menuProcessed', handleMenuProcessed);
  }, []);

  // Handle favorites button click from header
  useEffect(() => {
    const handleFavoritesClick = () => {
      setCurrentView('favorites');
    };

    // Add click handler to favorites button in header
    const favoritesButton = document.querySelector('[data-favorites-button]');
    if (favoritesButton) {
      favoritesButton.addEventListener('click', handleFavoritesClick);
      return () => favoritesButton.removeEventListener('click', handleFavoritesClick);
    }
  }, [state.user]);

  if (state.initError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm max-w-md">
          {state.initError}
        </div>
      </div>
    );
  }

  if (!state.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="py-8 sm:py-12">
          <AuthForm />
          {!state.isInitialized && (
            <div className="mt-4 flex items-center justify-center gap-2 text-gray-600 px-4">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm text-center">Initializing...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show loading screen while user data is loading
  if (!state.isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Initializing application...</p>
          <p className="text-xs text-gray-400 mt-2">Check console for details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Update header favorites button to handle clicks */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const favButton = document.querySelector('header button[class*="relative"]');
              if (favButton) favButton.setAttribute('data-favorites-button', 'true');
            });
          `
        }}
      />

      {/* Main Content */}
      <main className="py-4 sm:py-8 relative pb-20 sm:pb-8">
        {/* Floating Navigation */}
        {state.user && (
          <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-40">
            <div className="bg-white rounded-full shadow-lg border border-gray-200 px-2 py-2 flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => {
                  setCurrentView('upload');
                  if (state.isMobileMenuOpen) {
                    dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                  }
                }}
                className={`px-3 sm:px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all duration-200 touch-manipulation ${
                  currentView === 'upload'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Upload
              </button>
              {state.currentMenu && (
                <button
                  onClick={() => {
                    setCurrentView('menu');
                    if (state.isMobileMenuOpen) {
                      dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                    }
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all duration-200 touch-manipulation ${
                    currentView === 'menu'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Menu
                </button>
              )}
              {state.favorites.length > 0 && (
                <button
                  onClick={() => {
                    setCurrentView('favorites');
                    if (state.isMobileMenuOpen) {
                      dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                    }
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all duration-200 relative touch-manipulation ${
                    currentView === 'favorites'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Favorites
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs">
                    {state.favorites.length}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
        
        {currentView === 'upload' && <MenuUpload />}
        {currentView === 'menu' && <MenuDisplay />}
        {currentView === 'favorites' && <Favorites />}
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