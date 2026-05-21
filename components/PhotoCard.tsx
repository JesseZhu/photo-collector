'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

interface PhotoCardProps {
  photo: {
    user: string;
    filename: string;
    originalPath: string;
    thumbnailPath: string;
    type: 'image' | 'video';
    uploadTime: string;
  };
  onClick: () => void;
  formatRelativeTime?: (dateStr: string) => string;
}

export default function PhotoCard({ photo, onClick, formatRelativeTime }: PhotoCardProps) {
  const [imageError, setImageError] = useState(false);

  const displayTime = formatRelativeTime
    ? formatRelativeTime(photo.uploadTime)
    : new Date(photo.uploadTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      onClick={onClick}
      className="masonry-item relative group rounded-xl overflow-hidden shadow-sm bg-white cursor-pointer"
    >
      {!imageError ? (
        <img
          src={photo.thumbnailPath}
          alt={photo.filename}
          className="w-full h-auto object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-48 flex items-center justify-center bg-[#f3f4f5] rounded-xl">
          <span className="text-[#59413c] text-sm">加载失败</span>
        </div>
      )}

      {photo.type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-3 group-hover:bg-black/70 transition-colors">
            <Play className="h-8 w-8 text-white fill-white" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl">
        <p className="text-white font-semibold text-sm">
          {photo.user}
        </p>
        <p className="text-white/80 text-xs mt-0.5">
          {displayTime}
        </p>
      </div>
    </div>
  );
}
