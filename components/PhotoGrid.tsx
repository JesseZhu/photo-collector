'use client';

import { useState } from 'react';
import PhotoCard from './PhotoCard';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface PhotoGridProps {
  photos: Array<{
    user: string;
    filename: string;
    originalPath: string;
    thumbnailPath: string;
    type: 'image' | 'video';
    uploadTime: string;
  }>;
  formatRelativeTime?: (dateStr: string) => string;
}

export default function PhotoGrid({ photos, formatRelativeTime }: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setSelectedPhoto(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const goToPrevious = () => {
    if (selectedPhoto !== null) {
      setSelectedPhoto(selectedPhoto > 0 ? selectedPhoto - 1 : photos.length - 1);
    }
  };

  const goToNext = () => {
    if (selectedPhoto !== null) {
      setSelectedPhoto(selectedPhoto < photos.length - 1 ? selectedPhoto + 1 : 0);
    }
  };

  const handleDownload = async (photo: { originalPath: string; filename: string }) => {
    let blob: Blob | null = null;
    try {
      const response = await fetch(photo.originalPath);
      blob = await response.blob();
      const file = new File([blob], photo.filename, { type: blob.type });

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: photo.filename });
        return;
      }
    } catch {
      // Web Share or fetch failed, fall through
    }

    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const a = document.createElement('a');
      a.href = photo.originalPath;
      a.download = photo.filename;
      a.click();
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[#59413c] text-lg">还没有照片，快来上传第一张吧！</p>
      </div>
    );
  }

  return (
    <>
      <div className="masonry-grid">
        {photos.map((photo, index) => (
          <PhotoCard
            key={`${photo.user}-${photo.filename}`}
            photo={photo}
            onClick={() => openLightbox(index)}
            formatRelativeTime={formatRelativeTime}
          />
        ))}
      </div>

      {selectedPhoto !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => handleDownload(photos[selectedPhoto])}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
              title="下载"
            >
              <Download className="h-6 w-6" />
            </button>
            <button
              onClick={closeLightbox}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          <div
            className="max-w-5xl max-h-[90vh] px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {photos[selectedPhoto].type === 'video' ? (
              <video
                src={photos[selectedPhoto].originalPath}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : (
              <img
                src={photos[selectedPhoto].originalPath}
                alt={photos[selectedPhoto].filename}
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
            <div className="mt-4 text-center text-white">
              <p className="text-sm">
                上传者：<span className="font-semibold">{photos[selectedPhoto].user}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
