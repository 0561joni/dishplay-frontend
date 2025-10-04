import React from 'react';
import { Database, Search, Sparkles } from 'lucide-react';

interface ImageSourceIconProps {
  source?: string | null;
  className?: string;
}

export function ImageSourceIcon({ source, className = '' }: ImageSourceIconProps) {
  if (!source) return null;

  const getIcon = () => {
    // Semantic search from database
    if (source.startsWith('semantic')) {
      return (
        <Database
          className={`w-3 h-3 ${className}`}
          strokeWidth={2}
        />
      );
    }

    // Google search
    if (source.includes('google')) {
      return (
        <Search
          className={`w-3 h-3 ${className}`}
          strokeWidth={2}
        />
      );
    }

    // DALL-E generated
    if (source.includes('dall') || source.includes('generated')) {
      return (
        <Sparkles
          className={`w-3 h-3 ${className}`}
          strokeWidth={2}
        />
      );
    }

    return null;
  };

  const getTitle = () => {
    if (source.startsWith('semantic')) return 'From database';
    if (source.includes('google')) return 'From Google Search';
    if (source.includes('dall') || source.includes('generated')) return 'AI Generated';
    return 'Image source';
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
