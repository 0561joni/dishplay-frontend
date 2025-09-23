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

  // Format time remaining
  useEffect(() => {
    userIdRef.current = state.user?.id ?? '';
  }, [state.user?.id]);

  useEffect(() => {
    hasInitializedMenuRef.current = false;
    processedSequencesRef.current.clear();
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

  // Get stage description
  const getStageDescription = (stage: string): string => {
    const stageDescriptions: Record<string, string> = {
      initializing: 'Preparing your menu...',
      image_processing: 'Optimizing image quality...',
      image_processed: 'Image ready!',
      extracting_menu: 'Reading menu items...',
      menu_extracted: 'Menu items identified!',
      saving_items: 'Saving menu items...',
      items_saved: 'Menu items saved!',
      searching_images: 'Finding delicious food photos...',
      images_found: 'Images collected!',
      saving_images: 'Saving images...',
      finalizing: 'Finishing up...',
      completed: 'All done! 🎉'
    };
    return stageDescriptions[stage] || 'Processing...';
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
    if (Array.isArray(data.items_snapshot) && data.items_snapshot.length > 0 && !hasInitializedMenuRef.current) {
      const placeholderMenu = buildMenuSkeleton(data.items_snapshot, data);
      dispatch({ type: 'SET_MENU', payload: placeholderMenu });
      hasInitializedMenuRef.current = true;
    }

    if (data.item_image_update && data.item_image_update.menu_item_id) {
      const sequence = data.item_image_update.sequence || `${data.item_image_update.menu_item_id}-${Date.now()}`;
      if (!processedSequencesRef.current.has(sequence)) {
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
          console.log('WebSocket connected');
          setIsConnected(true);
          setError(null);
        };

        ws.onmessage = (event) => {
          try {
            const data: ProgressData = JSON.parse(event.data);
            const status = applyProgressData(data);

            if (status === 'completed' || status === 'failed') {
              onComplete?.(status === 'completed');
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
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

          if (status === 'completed' || status === 'failed') {
            onComplete?.(status === 'completed');
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
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-4"></div>
        <p className="text-gray-600">Connecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Menu</h2>
          {progress.item_count > 0 && (
            <p className="text-gray-600">{progress.item_count} items detected</p>
          )}
        </div>

        <div className="space-y-4">
          {/* Main loading message */}
          <div className="flex items-center justify-center gap-3 min-h-[3rem]">
            <span className="text-lg font-medium text-gray-700">{progress.message.text}</span>
            <span className="text-2xl">{progress.message.emoji}</span>
          </div>

          {/* Stage description */}
          <p className="text-center text-gray-600">{getStageDescription(progress.stage)}</p>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 relative overflow-hidden"
                style={{ width: `${progress.progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <span className="text-sm font-semibold text-blue-600 min-w-[45px] text-right">
              {Math.round(progress.progress)}%
            </span>
          </div>

          {/* Time remaining */}
          {progress.estimated_time_remaining > 0 && progress.status === 'processing' && (
            <p className="text-center text-gray-500 text-sm">
              Estimated time remaining: {formatTimeRemaining(progress.estimated_time_remaining)}
            </p>
          )}

          {/* Connection status */}
          {error && (
            <p className="text-center text-orange-600 text-sm">{error}</p>
          )}
          
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-orange-500'}`} />
            <span>{isConnected ? 'Live updates' : 'Checking progress...'}</span>
          </div>
        </div>

        {/* Error state */}
        {progress.status === 'failed' && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
            <p className="font-medium">❌ Menu processing failed</p>
            <p className="text-sm mt-1">Please try again with a different image</p>
          </div>
        )}

        {/* Success state */}
        {progress.status === 'completed' && (
          <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-center">
            <p className="font-medium">✅ Menu processed successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
}
