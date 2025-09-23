import React, { useState, useEffect, useRef } from 'react';
import { Heart, Utensils, Menu, History } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MobileMenu } from './MobileMenu';

export function Header() {
  const { state, dispatch, recallMenuById } = useApp();
  const favoritesCount = state.favorites.length;
  const recentMenus = state.recentMenus.slice(0, 3);

  const [isHistoryMenuOpen, setHistoryMenuOpen] = useState(false);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  const historyMenuRef = useRef<HTMLDivElement | null>(null);

  const isHistoryDisabled = recentMenus.length === 0 || state.isRecallingMenu;
  const historyTooltip = isHistoryDisabled
    ? 'Upload a menu first to enable history'
    : 'Recall a recent menu';

  useEffect(() => {
    if (!isHistoryMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        historyMenuRef.current &&
        !historyMenuRef.current.contains(target) &&
        historyButtonRef.current &&
        !historyButtonRef.current.contains(target)
      ) {
        setHistoryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHistoryMenuOpen]);

  useEffect(() => {
    if (state.isRecallingMenu) {
      setHistoryMenuOpen(false);
    }
  }, [state.isRecallingMenu]);

  useEffect(() => {
    if (recentMenus.length === 0) {
      setHistoryMenuOpen(false);
    }
  }, [recentMenus.length]);

  const historyButtonClasses = [
    'relative flex items-center justify-center p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50',
    isHistoryDisabled ? 'text-gray-400 cursor-not-allowed bg-gray-100' : 'text-gray-600 hover:bg-gray-100',
  ].join(' ');

  const handleHistoryToggle = () => {
    if (isHistoryDisabled) {
      return;
    }
    setHistoryMenuOpen((open) => !open);
  };

  const handleRecall = async (menuId: string) => {
    setHistoryMenuOpen(false);
    await recallMenuById(menuId);
  };

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

            {/* Quick Actions - only show when user is logged in */}
            {state.user && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    ref={historyButtonRef}
                    onClick={handleHistoryToggle}
                    disabled={isHistoryDisabled}
                    className={historyButtonClasses}
                    title={historyTooltip}
                    aria-label="Open recent menus"
                    aria-haspopup="true"
                    aria-expanded={isHistoryMenuOpen}
                  >
                    {state.isRecallingMenu ? (
                      <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <History className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>

                  {isHistoryMenuOpen && (
                    <div
                      ref={historyMenuRef}
                      className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-lg z-50"
                    >
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent menus</div>
                      <ul className="divide-y divide-gray-100">
                        {recentMenus.map((menu) => (
                          <li key={menu.id}>
                            <button
                              type="button"
                              onClick={() => handleRecall(menu.id)}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                            >
                              <span className="truncate pr-2">{menu.name}</span>
                              <span className="text-xs text-blue-500">Recall</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <button
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => window.dispatchEvent(new CustomEvent('favoritesClick'))}
                  aria-label="View favorites"
                >
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                  {favoritesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs">
                      {favoritesCount}
                    </span>
                  )}
                </button>
              </div>
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
