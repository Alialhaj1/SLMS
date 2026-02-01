/**
 * Profile Image Upload Routes
 * Handles profile image and cover image uploads
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { UploadService } from '../services/uploadService';
import pool from '../db';

const router = Router();

// =============================================
// POST /api/profile/image - Upload own profile image
// =============================================
router.post(
  '/image',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ success: false, error: 'No image provided' });
      }

      // Delete old image if exists
      const oldImageResult = await pool.query(
        'SELECT profile_image FROM users WHERE id = $1',
        [userId]
      );
      
      if (oldImageResult.rows[0]?.profile_image) {
        await UploadService.deleteFile(oldImageResult.rows[0].profile_image);
      }

      // Save new image
      const result = await UploadService.saveBase64Image(image, 'profiles');
      
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      // Update user record
      await pool.query(
        'UPDATE users SET profile_image = $1 WHERE id = $2',
        [result.url, userId]
      );

      // Audit log
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'UPDATE_PROFILE_IMAGE', 'user', userId, JSON.stringify({ profile_image: result.url })]
      );

      return res.json({
        success: true,
        data: {
          url: result.url,
          filename: result.filename
        },
        message: 'Profile image updated successfully'
      });
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload profile image',
        message: error.message
      });
    }
  }
);

// =============================================
// DELETE /api/profile/image - Remove own profile image
// =============================================
router.delete(
  '/image',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      // Get current image
      const result = await pool.query(
        'SELECT profile_image FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows[0]?.profile_image) {
        await UploadService.deleteFile(result.rows[0].profile_image);
      }

      // Clear profile image
      await pool.query(
        'UPDATE users SET profile_image = NULL WHERE id = $1',
        [userId]
      );

      // Audit log
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'DELETE_PROFILE_IMAGE', 'user', userId, JSON.stringify({ profile_image: null })]
      );

      return res.json({
        success: true,
        message: 'Profile image removed successfully'
      });
    } catch (error: any) {
      console.error('Error deleting profile image:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete profile image',
        message: error.message
      });
    }
  }
);

// =============================================
// POST /api/profile/cover - Upload own cover image
// =============================================
router.post(
  '/cover',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ success: false, error: 'No image provided' });
      }

      // Delete old image if exists
      const oldImageResult = await pool.query(
        'SELECT cover_image FROM users WHERE id = $1',
        [userId]
      );
      
      if (oldImageResult.rows[0]?.cover_image) {
        await UploadService.deleteFile(oldImageResult.rows[0].cover_image);
      }

      // Save new image
      const result = await UploadService.saveBase64Image(image, 'covers');
      
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      // Update user record
      await pool.query(
        'UPDATE users SET cover_image = $1 WHERE id = $2',
        [result.url, userId]
      );

      // Audit log
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'UPDATE_COVER_IMAGE', 'user', userId, JSON.stringify({ cover_image: result.url })]
      );

      return res.json({
        success: true,
        data: {
          url: result.url,
          filename: result.filename
        },
        message: 'Cover image updated successfully'
      });
    } catch (error: any) {
      console.error('Error uploading cover image:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload cover image',
        message: error.message
      });
    }
  }
);

// =============================================
// DELETE /api/profile/cover - Remove own cover image
// =============================================
router.delete(
  '/cover',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      // Get current image
      const result = await pool.query(
        'SELECT cover_image FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows[0]?.cover_image) {
        await UploadService.deleteFile(result.rows[0].cover_image);
      }

      // Clear cover image
      await pool.query(
        'UPDATE users SET cover_image = NULL WHERE id = $1',
        [userId]
      );

      // Audit log
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'DELETE_COVER_IMAGE', 'user', userId, JSON.stringify({ cover_image: null })]
      );

      return res.json({
        success: true,
        message: 'Cover image removed successfully'
      });
    } catch (error: any) {
      console.error('Error deleting cover image:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete cover image',
        message: error.message
      });
    }
  }
);

// =============================================
// Admin routes - Update other users' images
// =============================================

// POST /api/profile/users/:id/image - Admin update user profile image
router.post(
  '/users/:id/image',
  authenticate,
  requirePermission('users:edit'),
  async (req: Request, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      const adminUserId = (req as any).user?.id;
      
      if (!Number.isFinite(targetUserId)) {
        return res.status(400).json({ success: false, error: 'Invalid user id' });
      }

      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ success: false, error: 'No image provided' });
      }

      // Check target user exists
      const userCheck = await pool.query(
        'SELECT id, profile_image FROM users WHERE id = $1 AND deleted_at IS NULL',
        [targetUserId]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Delete old image if exists
      if (userCheck.rows[0].profile_image) {
        await UploadService.deleteFile(userCheck.rows[0].profile_image);
      }

      // Save new image
      const result = await UploadService.saveBase64Image(image, 'profiles');
      
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      // Update user record
      await pool.query(
        'UPDATE users SET profile_image = $1 WHERE id = $2',
        [result.url, targetUserId]
      );

      // Audit log
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [adminUserId, 'ADMIN_UPDATE_PROFILE_IMAGE', 'user', targetUserId, JSON.stringify({ profile_image: result.url })]
      );

      return res.json({
        success: true,
        data: {
          url: result.url,
          filename: result.filename
        },
        message: 'User profile image updated successfully'
      });
    } catch (error: any) {
      console.error('Error uploading user profile image:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload profile image',
        message: error.message
      });
    }
  }
);

// DELETE /api/profile/users/:id/image - Admin remove user profile image
router.delete(
  '/users/:id/image',
  authenticate,
  requirePermission('users:edit'),
  async (req: Request, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      const adminUserId = (req as any).user?.id;
      
      if (!Number.isFinite(targetUserId)) {
        return res.status(400).json({ success: false, error: 'Invalid user id' });
      }

      // Get current image
      const result = await pool.query(
        'SELECT profile_image FROM users WHERE id = $1 AND deleted_at IS NULL',
        [targetUserId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (result.rows[0]?.profile_image) {
        await UploadService.deleteFile(result.rows[0].profile_image);
      }

      // Clear profile image
      await pool.query(
        'UPDATE users SET profile_image = NULL WHERE id = $1',
        [targetUserId]
      );

      // Audit log
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [adminUserId, 'ADMIN_DELETE_PROFILE_IMAGE', 'user', targetUserId, JSON.stringify({ profile_image: null })]
      );

      return res.json({
        success: true,
        message: 'User profile image removed successfully'
      });
    } catch (error: any) {
      console.error('Error deleting user profile image:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete profile image',
        message: error.message
      });
    }
  }
);

// POST /api/profile/users/:id/cover - Admin update user cover image
router.post(
  '/users/:id/cover',
  authenticate,
  requirePermission('users:edit'),
  async (req: Request, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      const adminUserId = (req as any).user?.id;
      
      if (!Number.isFinite(targetUserId)) {
        return res.status(400).json({ success: false, error: 'Invalid user id' });
      }

      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ success: false, error: 'No image provided' });
      }

      // Check target user exists
      const userCheck = await pool.query(
        'SELECT id, cover_image FROM users WHERE id = $1 AND deleted_at IS NULL',
        [targetUserId]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Delete old image if exists
      if (userCheck.rows[0].cover_image) {
        await UploadService.deleteFile(userCheck.rows[0].cover_image);
      }

      // Save new image
      const result = await UploadService.saveBase64Image(image, 'covers');
      
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      // Update user record
      await pool.query(
        'UPDATE users SET cover_image = $1 WHERE id = $2',
        [result.url, targetUserId]
      );

      // Audit log
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [adminUserId, 'ADMIN_UPDATE_COVER_IMAGE', 'user', targetUserId, JSON.stringify({ cover_image: result.url })]
      );

      return res.json({
        success: true,
        data: {
          url: result.url,
          filename: result.filename
        },
        message: 'User cover image updated successfully'
      });
    } catch (error: any) {
      console.error('Error uploading user cover image:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload cover image',
        message: error.message
      });
    }
  }
);

// DELETE /api/profile/users/:id/cover - Admin remove user cover image
router.delete(
  '/users/:id/cover',
  authenticate,
  requirePermission('users:edit'),
  async (req: Request, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.id, 10);
      const adminUserId = (req as any).user?.id;
      
      if (!Number.isFinite(targetUserId)) {
        return res.status(400).json({ success: false, error: 'Invalid user id' });
      }

      // Get current image
      const result = await pool.query(
        'SELECT cover_image FROM users WHERE id = $1 AND deleted_at IS NULL',
        [targetUserId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (result.rows[0]?.cover_image) {
        await UploadService.deleteFile(result.rows[0].cover_image);
      }

      // Clear cover image
      await pool.query(
        'UPDATE users SET cover_image = NULL WHERE id = $1',
        [targetUserId]
      );

      // Audit log
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource, resource_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [adminUserId, 'ADMIN_DELETE_COVER_IMAGE', 'user', targetUserId, JSON.stringify({ cover_image: null })]
      );

      return res.json({
        success: true,
        message: 'User cover image removed successfully'
      });
    } catch (error: any) {
      console.error('Error deleting user cover image:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete cover image',
        message: error.message
      });
    }
  }
);

export default router;
