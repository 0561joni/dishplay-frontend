import React from 'react';
import { X, User, Crown, Settings, LogOut, Star, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LanguageSelector } from './LanguageSelector';
import { PlanSelector } from './PlanSelector';
import { supabase } from '../lib/supabase';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { state } = useApp();

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    onClose();
  };

  if (!isOpen) return null;

  const planIcons = {
    light: Zap,
    normal: Star,
    pro: Crown
  };

  const currentPlan = state.user?.plan || 'light';
  const PlanIcon = planIcons[currentPlan];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Profile Section */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Profile</h3>
                  <p className="text-sm text-gray-500">Account information</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900 truncate ml-2">{state.user?.email}</span>
                </div>
                {state.user?.first_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="text-gray-900">{state.user.first_name} {state.user.last_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Credits:</span>
                  <span className="text-gray-900 font-medium">{state.user?.credits || 0}</span>
                </div>
              </div>
            </div>

            {/* Plan Section */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <PlanIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Plan</h3>
                  <p className="text-sm text-gray-500">Current subscription</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 capitalize">{currentPlan} Plan</span>
                  <PlanIcon className={`w-4 h-4 ${
                    currentPlan === 'light' ? 'text-yellow-500' :
                    currentPlan === 'normal' ? 'text-blue-500' :
                    'text-purple-500'
                  }`} />
                </div>
                <PlanSelector />
              </div>
            </div>

            {/* Settings Section */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-gray-100 p-2 rounded-full">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-500">App preferences</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <LanguageSelector />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}