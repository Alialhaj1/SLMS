/**
 * Image Upload Component
 * Handles profile and cover image uploads with preview and cropping
 */

import { useState, useRef, useCallback } from 'react';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import {
  PhotoIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface ImageUploadProps {
  /** Current image URL */
  currentImage?: string | null;
  /** Callback when image is selected (base64) */
  onImageSelect: (base64: string) => Promise<void>;
  /** Callback when image is removed */
  onImageRemove?: () => Promise<void>;
  /** Type of image (affects aspect ratio and sizing) */
  type?: 'profile' | 'cover';
  /** Whether upload is in progress */
  loading?: boolean;
  /** Whether the user can edit */
  canEdit?: boolean;
  /** CSS class for container */
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function ImageUpload({
  currentImage,
  onImageSelect,
  onImageRemove,
  type = 'profile',
  loading = false,
  canEdit = true,
  className = '',
}: ImageUploadProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isLoading = loading || uploading;

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('imageUpload.errors.invalidType'));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(t('imageUpload.errors.tooLarge'));
      return;
    }

    // Create preview and convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);

      // Upload
      try {
        setUploading(true);
        await onImageSelect(base64);
        setPreview(null); // Clear preview after successful upload
      } catch (err: any) {
        setError(err.message || t('imageUpload.errors.uploadFailed'));
        setPreview(null);
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setError(t('imageUpload.errors.readFailed'));
    };
    reader.readAsDataURL(file);
  }, [onImageSelect, t]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = async () => {
    if (!onImageRemove) return;
    try {
      setUploading(true);
      await onImageRemove();
    } catch (err: any) {
      setError(err.message || t('imageUpload.errors.removeFailed'));
    } finally {
      setUploading(false);
    }
  };

  const openFilePicker = () => {
    if (!canEdit || isLoading) return;
    fileInputRef.current?.click();
  };

  // Profile image styles
  if (type === 'profile') {
    return (
      <div className={`relative ${className}`}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={!canEdit || isLoading}
        />

        {/* Profile Image Container */}
        <div
          className={`relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-4 border-white dark:border-gray-800 shadow-lg ${
            canEdit && !isLoading ? 'cursor-pointer group' : ''
          } ${isDragging ? 'ring-4 ring-blue-400' : ''}`}
          onClick={openFilePicker}
          onDrop={canEdit ? handleDrop : undefined}
          onDragOver={canEdit ? handleDragOver : undefined}
          onDragLeave={canEdit ? handleDragLeave : undefined}
        >
          {/* Current or Preview Image */}
          {(preview || currentImage) ? (
            <img
              src={preview || currentImage!}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PhotoIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Hover Overlay (only when can edit) */}
          {canEdit && !isLoading && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ArrowUpTrayIcon className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        {/* Remove Button */}
        {canEdit && currentImage && !isLoading && onImageRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="absolute -bottom-1 -right-1 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors"
            title={t('imageUpload.remove')}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Cover image styles
  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={!canEdit || isLoading}
      />

      {/* Cover Image Container */}
      <div
        className={`relative w-full h-48 md:h-64 rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 ${
          canEdit && !isLoading ? 'cursor-pointer group' : ''
        } ${isDragging ? 'ring-4 ring-blue-400' : ''}`}
        onClick={openFilePicker}
        onDrop={canEdit ? handleDrop : undefined}
        onDragOver={canEdit ? handleDragOver : undefined}
        onDragLeave={canEdit ? handleDragLeave : undefined}
      >
        {/* Current or Preview Image */}
        {(preview || currentImage) ? (
          <img
            src={preview || currentImage!}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white/60">
              <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
              <p className="text-sm">{t('imageUpload.addCover')}</p>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Hover Overlay */}
        {canEdit && !isLoading && (
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="text-center text-white">
              <ArrowUpTrayIcon className="w-10 h-10 mx-auto mb-2" />
              <p className="font-medium">{t('imageUpload.changeCover')}</p>
            </div>
          </div>
        )}

        {/* Remove Button */}
        {canEdit && currentImage && !isLoading && onImageRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="absolute top-4 right-4 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-colors flex items-center gap-2"
          >
            <TrashIcon className="w-5 h-5" />
            <span className="hidden sm:inline">{t('imageUpload.remove')}</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
