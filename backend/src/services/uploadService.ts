/**
 * File Upload Service
 * Handles file uploads for profile images, cover images, and other attachments
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Upload configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '5242880'); // 5MB default
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    path.join(UPLOAD_DIR, 'profiles'),
    path.join(UPLOAD_DIR, 'covers'),
    path.join(UPLOAD_DIR, 'documents'),
    path.join(UPLOAD_DIR, 'temp')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize directories
try {
  ensureUploadDirs();
} catch (error) {
  console.error('Failed to create upload directories:', error);
}

export interface UploadResult {
  success: boolean;
  filename?: string;
  path?: string;
  url?: string;
  size?: number;
  mimeType?: string;
  error?: string;
}

export interface UploadOptions {
  allowedTypes?: string[];
  maxSize?: number;
  subdir?: string;
}

export class UploadService {
  /**
   * Validate file type
   */
  static isAllowedType(mimeType: string, allowedTypes: string[] = ALLOWED_IMAGE_TYPES): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate file size
   */
  static isAllowedSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
    return size <= maxSize;
  }

  /**
   * Generate unique filename
   */
  static generateFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const uuid = uuidv4();
    return `${uuid}${ext}`;
  }

  /**
   * Save uploaded file from base64
   */
  static async saveBase64Image(
    base64Data: string,
    subdir: string = 'profiles',
    originalFilename?: string
  ): Promise<UploadResult> {
    try {
      // Parse base64 data
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      
      if (!matches || matches.length !== 3) {
        return { success: false, error: 'Invalid base64 data format' };
      }

      const mimeType = matches[1];
      const data = matches[2];
      const buffer = Buffer.from(data, 'base64');

      // Validate type
      if (!this.isAllowedType(mimeType)) {
        return { 
          success: false, 
          error: `File type not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
        };
      }

      // Validate size
      if (!this.isAllowedSize(buffer.length)) {
        return { 
          success: false, 
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
        };
      }

      // Generate filename
      const ext = this.getExtensionFromMime(mimeType);
      const filename = `${uuidv4()}${ext}`;
      const uploadDir = path.join(UPLOAD_DIR, subdir);
      const filePath = path.join(uploadDir, filename);

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(filePath, buffer);

      return {
        success: true,
        filename,
        path: filePath,
        url: `/uploads/${subdir}/${filename}`,
        size: buffer.length,
        mimeType
      };
    } catch (error: any) {
      console.error('Error saving base64 image:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete file
   */
  static async deleteFile(relativePath: string): Promise<boolean> {
    try {
      // Remove leading slash if present
      const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
      const fullPath = path.join(UPLOAD_DIR, '..', cleanPath);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get file extension from MIME type
   */
  static getExtensionFromMime(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'application/pdf': '.pdf'
    };
    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Get MIME type from extension
   */
  static getMimeFromExtension(ext: string): string {
    const extToMime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf'
    };
    return extToMime[ext.toLowerCase()] || 'application/octet-stream';
  }
}

export default UploadService;
