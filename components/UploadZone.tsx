'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Camera } from 'lucide-react';

interface UploadZoneProps {
  event: string;
  user: string;
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function UploadZone({ event, user, onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/upload`;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadSingleFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('event', event);
    formData.append('user', user);

    const xhr = new XMLHttpRequest();
    
    return new Promise<void>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadingFiles(prev =>
            prev.map(f => f.file === file ? { ...f, progress } : f)
          );
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error('Upload failed'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: UploadFile[] = Array.from(files).map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);

    for (const uploadFile of newFiles) {
      setUploadingFiles(prev =>
        prev.map(f => f.file === uploadFile.file ? { ...f, status: 'uploading' } : f)
      );

      try {
        await uploadSingleFile(uploadFile.file);
        setUploadingFiles(prev =>
          prev.map(f => f.file === uploadFile.file ? { ...f, status: 'success', progress: 100 } : f)
        );
      } catch (error: any) {
        setUploadingFiles(prev =>
          prev.map(f => f.file === uploadFile.file ? { ...f, status: 'error', error: error.message } : f)
        );
      }
    }

    onUploadComplete();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [event, user]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [event, user]);

  const removeFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="bg-[#f3f4f5] rounded-xl p-8 shadow-sm border border-[#e1bfb8]/20 relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ff6b4a]/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#4cb9ff]/20 rounded-full blur-2xl"></div>
        
        <div className="text-center relative z-10">
          <Camera className="mx-auto h-12 w-12 text-[#ae3115]/40 mb-4" />
          <h3 className="font-bold text-xl text-[#191c1d] mb-2">
            {isDragging ? '拖放照片到这里' : '分享你的精彩瞬间'}
          </h3>
          <p className="text-[#59413c] mb-6">
            拖放照片或点击上传
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 bg-[#ae3115] text-white h-[56px] px-8 rounded-full font-semibold shadow-[0_8px_24px_rgba(174,49,21,0.2)] hover:bg-[#ff6b4a] hover:text-[#661000] transition-colors active:scale-95 duration-200"
          >
            <Upload className="h-5 w-5" />
            上传照片
          </button>
          <p className="text-xs text-[#59413c]/60 mt-4">单文件最大 400MB • 支持图片和视频</p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((uploadFile, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#e1bfb8]/20"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#191c1d] truncate">
                  {uploadFile.file.name}
                </p>
                <div className="mt-1 w-full bg-[#e1e3e4] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      uploadFile.status === 'success'
                        ? 'bg-[#ae3115]'
                        : uploadFile.status === 'error'
                        ? 'bg-[#ba1a1a]'
                        : 'bg-[#4cb9ff]'
                    }`}
                    style={{ width: `${uploadFile.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {uploadFile.status === 'success' && (
                  <Check className="h-5 w-5 text-[#ae3115]" />
                )}
                {uploadFile.status === 'error' && (
                  <AlertCircle className="h-5 w-5 text-[#ba1a1a]" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(uploadFile.file);
                  }}
                  className="p-1 hover:bg-[#f3f4f5] rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-[#59413c]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
