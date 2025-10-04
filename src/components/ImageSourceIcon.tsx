import React from 'react';
import { Database, Search, Sparkles } from 'lucide-react';

interface ImageSourceIconProps {
  source?: string | null;
  className?: string;
}

export function ImageSourceIcon({ source, className = '' }: ImageSourceIconProps) {
  if (!source) return null;

  // Normalize source to lowercase for matching
  const normalizedSource = source.toLowerCase();

  const getIcon = () => {
    // Semantic search from database (e.g., "semantic:0.85")
    if (normalizedSource.startsWith('semantic')) {
      return (
        <Database
          className={`w-3 h-3 ${className}`}
          strokeWidth={2}
        />
      );
    }

    // Google search (e.g., "google_cse")
    if (normalizedSource.includes('google')) {
      return (
        <Search
          className={`w-3 h-3 ${className}`}
          strokeWidth={2}
        />
      );
    }

    // DALL-E generated (e.g., "dalle-2", "dalle-3")
    if (normalizedSource.includes('dall')) {
      return (
        <Sparkles
          className={`w-3 h-3 ${className}`}
          strokeWidth={2}
        />
      );
    }

    // Fallback images
    if (normalizedSource.includes('fallback')) {
      return (
        <Sparkles
          className={`w-3 h-3 ${className} opacity-50`}
          strokeWidth={2}
        />
      );
    }

    // Unknown source - log for debugging and return null
    console.log('[ImageSourceIcon] Unknown source:', source);
    return null;
  };

  const getTitle = () => {
    if (normalizedSource.startsWith('semantic')) {
      // Extract similarity score if present
      const match = source.match(/semantic:(\d+\.\d+)/);
      if (match) {
        return `From database (${(parseFloat(match[1]) * 100).toFixed(0)}% match)`;
      }
      return 'From database';
    }
    if (normalizedSource.includes('google')) return 'From Google Search';
    if (normalizedSource.includes('dall')) {
      if (normalizedSource.includes('dalle-3')) return 'AI Generated (DALL-E 3)';
      if (normalizedSource.includes('dalle-2')) return 'AI Generated (DALL-E 2)';
      return 'AI Generated';
    }
    if (normalizedSource.includes('fallback')) return 'Fallback image';
    return `Image source: ${source}`;
  };

  const icon = getIcon();
  if (!icon) return null;

  return (
    <div
      className="flex items-center justify-center"
      title={getTitle()}
    >
      {icon}
    </div>
  );
}
