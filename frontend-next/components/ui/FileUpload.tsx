/**
 * FileUpload Component - رفع الملفات
 * Professional drag-and-drop file upload with progress indicator
 */

import React, { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PhotoIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// ========================================
// INTERFACES
// ========================================

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploadProps {
  onUpload: (file: File) => Promise<{ url: string; fileName?: string }>;
  onComplete?: (files: UploadedFile[]) => void;
  onFileUploaded?: (file: UploadedFile) => void;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  disabled?: boolean;
  isArabic?: boolean;
  className?: string;
  compact?: boolean;
  initialFiles?: UploadedFile[];
}

// ========================================
// HELPER FUNCTIONS
// ========================================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return PhotoIcon;
  if (type.includes('pdf') || type.includes('document')) return DocumentTextIcon;
  return DocumentIcon;
};

const generateId = () => Math.random().toString(36).substring(2, 11);

// ========================================
// COMPONENT
// ========================================

export default function FileUpload({
  onUpload,
  onComplete,
  onFileUploaded,
  accept = '*',
  maxSize = 10, // 10 MB default
  multiple = false,
  disabled = false,
  isArabic = false,
  className = '',
  compact = false,
  initialFiles = [],
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check size
    if (file.size > maxSize * 1024 * 1024) {
      return isArabic 
        ? `حجم الملف يتجاوز الحد الأقصى (${maxSize} MB)`
        : `File size exceeds maximum (${maxSize} MB)`;
    }

    // Check type if accept is specified
    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileType = file.type;
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExt === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', '/'));
        }
        return fileType === type;
      });

      if (!isAccepted) {
        return isArabic 
          ? 'نوع الملف غير مدعوم'
          : 'File type not supported';
      }
    }

    return null;
  };

  // Process files
  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(fileList)) {
      const error = validateFile(file);
      const uploadedFile: UploadedFile = {
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        progress: error ? 0 : 0,
        status: error ? 'error' : 'pending',
        error,
      };

      if (!error) {
        newFiles.push(uploadedFile);
      } else {
        // Add error file to show error
        setFiles(prev => [...prev, uploadedFile]);
      }
    }

    // Update state with pending files
    setFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    for (const uploadFile of newFiles) {
      const fileIndex = (await new Promise<UploadedFile[]>(resolve => 
        setFiles(prev => { resolve(prev); return prev; })
      )).findIndex(f => f.id === uploadFile.id);

      // Find the actual File object
      const actualFile = Array.from(fileList).find(f => f.name === uploadFile.name);
      if (!actualFile) continue;

      // Mark as uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
      ));

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          ));
        }, 200);

        const result = await onUpload(actualFile);

        clearInterval(progressInterval);

        // Mark as success
        const successFile: UploadedFile = {
          ...uploadFile,
          status: 'success',
          progress: 100,
          url: result.url,
          name: result.fileName || uploadFile.name,
        };

        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? successFile : f
        ));

        // Notify parent
        if (onFileUploaded) {
          onFileUploaded(successFile);
        }
      } catch (error: any) {
        // Mark as error
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'error', 
                progress: 0,
                error: error?.message || (isArabic ? 'فشل الرفع' : 'Upload failed')
              } 
            : f
        ));
      }
    }

    // Notify completion
    if (onComplete) {
      setFiles(prev => {
        onComplete(prev);
        return prev;
      });
    }
  }, [onUpload, onComplete, onFileUploaded, isArabic, maxSize, accept]);

  // Handle drop
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(multiple ? droppedFiles : [droppedFiles[0]]);
    }
  }, [disabled, multiple, processFiles]);

  // Handle input change
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Retry upload
  const retryUpload = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;

    // Reset status
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status: 'pending', progress: 0, error: undefined } : f
    ));

    // Re-process (need original file - for now just show error)
    setFiles(prev => prev.map(f => 
      f.id === id 
        ? { ...f, status: 'error', error: isArabic ? 'يرجى اختيار الملف مرة أخرى' : 'Please select file again' } 
        : f
    ));
  };

  // Click to browse
  const openFileBrowser = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileBrowser}
        className={`
          relative border-2 border-dashed rounded-xl transition-all cursor-pointer
          ${compact ? 'p-4' : 'p-8'}
          ${disabled 
            ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60'
            : isDragging
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className={`text-center ${compact ? '' : 'space-y-3'}`}>
          <CloudArrowUpIcon 
            className={`mx-auto ${compact ? 'w-8 h-8' : 'w-12 h-12'} ${
              isDragging 
                ? 'text-blue-500' 
                : 'text-gray-400 dark:text-gray-500'
            }`} 
          />

          <div>
            <p className={`font-medium ${compact ? 'text-sm' : 'text-base'} ${
              isDragging 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {isDragging 
                ? (isArabic ? 'أفلت الملف هنا' : 'Drop file here')
                : (isArabic ? 'اسحب وأفلت الملفات هنا' : 'Drag and drop files here')
              }
            </p>
            <p className={`text-gray-500 dark:text-gray-400 ${compact ? 'text-xs mt-1' : 'text-sm mt-2'}`}>
              {isArabic ? 'أو' : 'or'}{' '}
              <span className="text-blue-600 dark:text-blue-400 hover:underline">
                {isArabic ? 'تصفح الملفات' : 'browse files'}
              </span>
            </p>
          </div>

          {!compact && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isArabic 
                ? `الحد الأقصى لحجم الملف: ${maxSize} ميجابايت`
                : `Maximum file size: ${maxSize} MB`
              }
              {accept !== '*' && (
                <span className="block mt-1">
                  {isArabic ? 'الأنواع المسموحة:' : 'Accepted:'} {accept}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            
            return (
              <div
                key={file.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-colors
                  ${file.status === 'error'
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : file.status === 'success'
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  flex-shrink-0 p-2 rounded-lg
                  ${file.status === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : file.status === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-gray-200 dark:bg-gray-600'
                  }
                `}>
                  <FileIcon className={`w-5 h-5 ${
                    file.status === 'error'
                      ? 'text-red-600'
                      : file.status === 'success'
                      ? 'text-green-600'
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {file.status === 'uploading' && (
                    <div className="mt-1.5">
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'جاري الرفع...' : 'Uploading...'} {file.progress}%
                      </p>
                    </div>
                  )}

                  {/* Error message */}
                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3.5 h-3.5" />
                      {file.error}
                    </p>
                  )}

                  {/* Success */}
                  {file.status === 'success' && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      {isArabic ? 'تم الرفع بنجاح' : 'Uploaded successfully'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {file.status === 'error' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); retryUpload(file.id); }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title={isArabic ? 'إعادة المحاولة' : 'Retry'}
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                    title={isArabic ? 'إزالة' : 'Remove'}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
