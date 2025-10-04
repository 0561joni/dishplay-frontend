import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getAuthToken } from '../utils/api';
import { useApp } from '../context/AppContext';
import { Menu, MenuItem } from '../types';

interface ProgressMessage {
  text: string;
  emoji: string;
}

interface ItemSnapshot {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  order_index?: number | null;
}

interface ItemImageUpdate {
  menu_item_id: string;
  images: string[];
  status?: 'ready' | 'fallback';
  primary_image?: string | null;
  sequence?: string;
  sources?: { url: string; source?: string | null }[];
}

interface ProgressData {
  menu_id: string;
  status: string;
  stage: string;
  progress: number;
  message: ProgressMessage;
  estimated_time_remaining: number;
  item_count: number;
  menu_title?: string;
  items_snapshot?: ItemSnapshot[];
  item_image_update?: ItemImageUpdate;
}

interface MenuUploadProgressProps {
  menuId: string;
  onComplete?: (success: boolean) => void;
}

export function MenuUploadProgress({ menuId, onComplete }: MenuUploadProgressProps) {
  const { state, dispatch } = useApp();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitializedMenuRef = useRef(false);
  const processedSequencesRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef(state.user?.id ?? '');
  const mountTimeRef = useRef<number>(Date.now());
  const minDisplayTime = 3000; // Minimum 3 seconds display time
  const completionScheduledRef = useRef(false); // Track if completion is already scheduled

  // Add debugging
  useEffect(() => {
    console.log('[MenuUploadProgress] Mounted for menu:', menuId);
    return () => {
      console.log('[MenuUploadProgress] Unmounted');
    };
  }, [menuId]);

  // Format time remaining
  useEffect(() => {
    userIdRef.current = state.user?.id ?? '';
  }, [state.user?.id]);

  useEffect(() => {
    hasInitializedMenuRef.current = false;
    processedSequencesRef.current.clear();
    completionScheduledRef.current = false;
    mountTimeRef.current = Date.now(); // Reset mount time for new menu
  }, [menuId]);

  useEffect(() => () => {
    processedSequencesRef.current.clear();
    hasInitializedMenuRef.current = false;
  }, []);

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)} seconds`;
    } else if (seconds < 120) {
      return 'About a minute';
    } else {
      return `About ${Math.ceil(seconds / 60)} minutes`;
    }
  };

  // Get stage description with fun, detailed messages
  const getStageDescription = (stage: string): string => {
    const stageDescriptions: Record<string, string> = {
      initializing: 'Rolling out the red carpet for your menu...',
      image_processing: 'Polishing pixels and enhancing flavors...',
      image_processed: 'Your menu photo is looking delicious!',
      extracting_menu: 'Teaching our AI to read between the lines...',
      menu_extracted: 'Found all your tasty treasures!',
      semantic_search: 'Consulting our database of 13,000+ dishes...',
      semantic_skipped: 'Preparing to search the web for food photos...',
      semantic_complete: 'Database search complete!',
      saving_items: 'Carefully arranging items on digital shelves...',
      items_saved: 'Menu items safely stored!',
      searching_images: 'Scouring the internet for the perfect food shots...',
      images_found: 'Collected a gallery of delicious photos!',
      saving_images: 'Filing away these beautiful food pics...',
      finalizing: 'Adding the finishing touches...',
      completed: 'Your menu is ready to wow customers! 🎉'
    };
    return stageDescriptions[stage] || 'Working our culinary magic...';
  };

  // Get detailed stage info with icons
  const getStageInfo = (stage: string): { emoji: string; color: string } => {
    const stageInfo: Record<string, { emoji: string; color: string }> = {
      initializing: { emoji: '🎬', color: 'text-purple-600' },
      image_processing: { emoji: '✨', color: 'text-blue-600' },
      image_processed: { emoji: '📸', color: 'text-green-600' },
      extracting_menu: { emoji: '🔍', color: 'text-orange-600' },
      menu_extracted: { emoji: '📋', color: 'text-green-600' },
      semantic_search: { emoji: '🗄️', color: 'text-indigo-600' },
      semantic_skipped: { emoji: '🌐', color: 'text-blue-600' },
      semantic_complete: { emoji: '✅', color: 'text-green-600' },
      saving_items: { emoji: '💾', color: 'text-blue-600' },
      items_saved: { emoji: '✅', color: 'text-green-600' },
      searching_images: { emoji: '🔎', color: 'text-yellow-600' },
      images_found: { emoji: '🖼️', color: 'text-green-600' },
      saving_images: { emoji: '📦', color: 'text-blue-600' },
      finalizing: { emoji: '🎨', color: 'text-purple-600' },
      completed: { emoji: '🎉', color: 'text-green-600' }
    };
    return stageInfo[stage] || { emoji: '⚡', color: 'text-gray-600' };
  };

  const buildMenuSkeleton = useCallback((snapshot: ItemSnapshot[], data: ProgressData): Menu => {
    const sortedSnapshot = [...snapshot].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const placeholderItems: MenuItem[] = sortedSnapshot.map((snapshotItem, index) => ({
      id: snapshotItem.id,
      menu_id: menuId,
      item_name: snapshotItem.name,
      name: snapshotItem.name,
      description: snapshotItem.description ?? null,
      price: snapshotItem.price ?? null,
      currency: snapshotItem.currency ?? null,
      order_index: snapshotItem.order_index ?? index,
      images: [],
      imageStatus: 'loading',
      imageSources: [],
      currentImageIndex: 0,
    }));

    const resolvedTitle = data.menu_title ?? 'Uploaded Menu';

    return {
      id: menuId,
      user_id: userIdRef.current || '',
      title: resolvedTitle,
      processed_at: new Date().toISOString(),
      status: 'processing',
      name: resolvedTitle,
      items: placeholderItems,
    };
  }, [menuId]);

  const applyProgressData = useCallback((data: ProgressData) => {
    console.log('[MenuUploadProgress] Applying progress data:', {
      stage: data.stage,
      progress: data.progress,
      status: data.status,
      hasSnapshot: !!data.items_snapshot,
      hasImageUpdate: !!data.item_image_update
    });

    if (Array.isArray(data.items_snapshot) && data.items_snapshot.length > 0 && !hasInitializedMenuRef.current) {
      console.log('[MenuUploadProgress] Initializing menu skeleton with', data.items_snapshot.length, 'items');
      const placeholderMenu = buildMenuSkeleton(data.items_snapshot, data);
      dispatch({ type: 'SET_MENU', payload: placeholderMenu });
      hasInitializedMenuRef.current = true;
    }

    if (data.item_image_update && data.item_image_update.menu_item_id) {
      console.log('[MenuUploadProgress] Received item_image_update:', {
        itemId: data.item_image_update.menu_item_id,
        imageCount: data.item_image_update.images?.length || 0,
        status: data.item_image_update.status,
        images: data.item_image_update.images
      });

      const sequence = data.item_image_update.sequence || `${data.item_image_update.menu_item_id}-${Date.now()}`;
      if (!processedSequencesRef.current.has(sequence)) {
        console.log('[MenuUploadProgress] Dispatching UPDATE_MENU_ITEM_IMAGES for item:', data.item_image_update.menu_item_id);
        processedSequencesRef.current.add(sequence);
        dispatch({
          type: 'UPDATE_MENU_ITEM_IMAGES',
          payload: {
            menuId: data.menu_id,
            itemId: data.item_image_update.menu_item_id,
            images: data.item_image_update.images || [],
            status: data.item_image_update.status,
            sources: data.item_image_update.sources,
          },
        });
      } else {
        console.log('[MenuUploadProgress] Skipping duplicate sequence:', sequence);
      }
    }

    setProgress(data);

    if (data.menu_title) {
      const normalizedTitle = data.menu_title.trim() || 'Uploaded Menu';
      if (state.currentMenu && state.currentMenu.id === menuId) {
        if (state.currentMenu.title !== normalizedTitle || state.currentMenu.name !== normalizedTitle) {
          dispatch({
            type: 'SET_MENU',
            payload: {
              ...state.currentMenu,
              title: normalizedTitle,
              name: normalizedTitle,
            },
          });
        }
      }
    }

    if (data.status === 'completed' || data.status === 'failed') {
      processedSequencesRef.current.clear();
      hasInitializedMenuRef.current = false;
    }

    return data.status;
  }, [buildMenuSkeleton, dispatch, menuId, setProgress, state.currentMenu]);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://dishplay-backend.onrender.com';
        const wsUrl = apiUrl.replace(/^http/, 'ws');
        ws = new WebSocket(`${wsUrl}/api/menu/ws/progress/${menuId}`);

        ws.onopen = () => {
          console.log('[MenuUploadProgress] WebSocket connected to:', wsUrl);
          setIsConnected(true);
          setError(null);
        };

        ws.onmessage = (event) => {
          try {
            // Ignore pong messages from ping/pong heartbeat
            if (event.data === 'pong') {
              return;
            }

            const data: ProgressData = JSON.parse(event.data);
            console.log('[MenuUploadProgress] WebSocket message received:', {
              stage: data.stage,
              progress: data.progress,
              status: data.status,
              message: data.message
            });
            const status = applyProgressData(data);

            if ((status === 'completed' || status === 'failed') && !completionScheduledRef.current) {
              console.log('[MenuUploadProgress] Processing complete, status:', status);
              completionScheduledRef.current = true; // Mark as scheduled to prevent duplicates

              // Ensure minimum display time before calling onComplete
              const elapsed = Date.now() - mountTimeRef.current;
              const remainingTime = Math.max(0, minDisplayTime - elapsed);

              if (remainingTime > 0) {
                console.log(`[MenuUploadProgress] Waiting ${remainingTime}ms before completing to show progress screen`);
                setTimeout(() => {
                  onComplete?.(status === 'completed');
                }, remainingTime);
              } else {
                onComplete?.(status === 'completed');
              }
            }
          } catch (err) {
            console.error('[MenuUploadProgress] Failed to parse WebSocket message:', err, event.data);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Connection error. Retrying...');
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);

          // Reconnect after 3 seconds if not completed
          if (progress?.status !== 'completed' && progress?.status !== 'failed') {
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);

        return () => {
          clearInterval(pingInterval);
        };
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
        setError('Failed to connect. Using polling instead...');
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [menuId, onComplete, progress?.status, applyProgressData]);

  // Fallback polling if WebSocket fails
  useEffect(() => {
    if (isConnected) return; // Skip if WebSocket is connected

    const pollProgress = async () => {
      try {
        const token = localStorage.getItem('auth_token') || await getAuthToken();
        const apiUrl = import.meta.env.VITE_API_URL || 'https://dishplay-backend.onrender.com';
        const response = await fetch(`${apiUrl}/api/menu/progress/${menuId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data: ProgressData = await response.json();
          const status = applyProgressData(data);

          if ((status === 'completed' || status === 'failed') && !completionScheduledRef.current) {
            completionScheduledRef.current = true; // Mark as scheduled to prevent duplicates

            // Ensure minimum display time before calling onComplete
            const elapsed = Date.now() - mountTimeRef.current;
            const remainingTime = Math.max(0, minDisplayTime - elapsed);

            if (remainingTime > 0) {
              console.log(`[MenuUploadProgress] (Polling) Waiting ${remainingTime}ms before completing to show progress screen`);
              setTimeout(() => {
                onComplete?.(status === 'completed');
              }, remainingTime);
            } else {
              onComplete?.(status === 'completed');
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch progress:', err);
      }
    };

    const interval = setInterval(pollProgress, 2000);
    pollProgress(); // Initial fetch

    return () => clearInterval(interval);
  }, [menuId, isConnected, onComplete, applyProgressData]);

  if (!progress) {
    console.log('[MenuUploadProgress] No progress data yet, showing connecting screen');
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-4"></div>
        <p className="text-gray-600">Connecting to server...</p>
        <p className="text-xs text-gray-500 mt-2">Menu ID: {menuId}</p>
      </div>
    );
  }

  console.log('[MenuUploadProgress] Rendering progress screen:', {
    stage: progress.stage,
    progress: progress.progress,
    status: progress.status
  });

  const stageInfo = getStageInfo(progress.stage);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="relative">
              <div className={`text-6xl sm:text-7xl ${stageInfo.color} animate-bounce`}>
                {stageInfo.emoji}
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 blur-xl animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Crafting Your Menu
          </h2>
          {progress.item_count > 0 && (
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="text-xl">📋</span>
              <span>{progress.item_count} delicious items discovered</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Main loading message */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-xl sm:text-2xl font-semibold text-gray-800">
                {progress.message.text}
              </span>
              <span className="text-3xl sm:text-4xl animate-pulse">
                {progress.message.emoji}
              </span>
            </div>

            {/* Stage description */}
            <p className="text-center text-gray-600 text-sm sm:text-base font-medium">
              {getStageDescription(progress.stage)}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-8 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${progress.progress}%` }}
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 min-w-[55px] text-right">
                {Math.round(progress.progress)}%
              </span>
            </div>

            {/* Progress percentage text */}
            <div className="flex justify-between text-xs text-gray-500 px-1">
              <span>Started</span>
              <span>{Math.round(progress.progress)}% complete</span>
              <span>Done!</span>
            </div>
          </div>

          {/* Time remaining with visual timer */}
          {progress.estimated_time_remaining > 0 && progress.status === 'processing' && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">⏱️</span>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Estimated time remaining</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatTimeRemaining(progress.estimated_time_remaining)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fun facts while waiting */}
          {progress.status === 'processing' && progress.estimated_time_remaining > 10 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Did you know?</p>
                  <p className="text-sm text-blue-700">
                    We're analyzing your menu against our database of 13,000+ dishes to find the perfect images!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Connection status */}
          <div className="flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-orange-500'} shadow-lg`} />
            <span className="text-xs font-medium text-gray-600">
              {isConnected ? '🔴 Live updates' : '🔄 Checking progress...'}
            </span>
          </div>

          {error && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl text-center text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Error state */}
        {progress.status === 'failed' && (
          <div className="mt-6 bg-red-50 border-2 border-red-300 text-red-700 px-6 py-4 rounded-xl text-center shadow-lg">
            <p className="text-xl font-bold mb-2">❌ Oops! Something went wrong</p>
            <p className="text-sm">Please try again with a clearer menu image</p>
          </div>
        )}

        {/* Success state */}
        {progress.status === 'completed' && (
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 text-green-700 px-6 py-4 rounded-xl text-center shadow-lg">
            <p className="text-xl font-bold mb-2">🎉 Success!</p>
            <p className="text-sm">Your menu is ready and looking delicious!</p>
          </div>
        )}
      </div>

      {/* Add shimmer animation CSS */}
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
