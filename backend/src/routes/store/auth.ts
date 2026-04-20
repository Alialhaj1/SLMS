/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE CUSTOMER AUTH ROUTES                                              ║
 * ║  /api/store/:storeSlug/auth                                             ║
 * ║  Register, Login, Profile, Password Reset                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import {
  resolveStoreContext,
  requireStoreCustomer,
  generateStoreCustomerToken,
  hashStoreCustomerPassword,
  verifyStoreCustomerPassword,
} from '../../middleware/storeAuth';
import pool from '../../db';

const router = Router({ mergeParams: true });

router.use(resolveStoreContext);

// ═══════════════════════════════════════════════════════════════════════════
// POST /auth/register — Customer registration
// ═══════════════════════════════════════════════════════════════════════════
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName) {
      return res.status(400).json({ error: 'Email, password, and first name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if customer already exists
    const existing = await pool.query(
      `SELECT id FROM store_customers WHERE store_id = $1 AND email = $2 AND deleted_at IS NULL`,
      [store.id, email.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await hashStoreCustomerPassword(password);

    const result = await pool.query(
      `INSERT INTO store_customers (store_id, company_id, email, password_hash, first_name, last_name, phone, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING id, email, first_name, last_name, phone, created_at`,
      [store.id, store.companyId, email.toLowerCase().trim(), hashedPassword, firstName.trim(), lastName?.trim() || null, phone?.trim() || null]
    );

    const customer = result.rows[0];

    const tokens = generateStoreCustomerToken({
      id: customer.id,
      email: customer.email,
      storeId: store.id,
      companyId: store.companyId,
      firstName: customer.first_name,
    });

    res.status(201).json({
      data: {
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phone: customer.phone,
        },
        ...tokens,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /auth/login — Customer login
// ═══════════════════════════════════════════════════════════════════════════
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, phone, is_active
       FROM store_customers
       WHERE store_id = $1 AND email = $2 AND deleted_at IS NULL`,
      [store.id, email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const customer = result.rows[0];

    if (!customer.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    const valid = await verifyStoreCustomerPassword(password, customer.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await pool.query(
      `UPDATE store_customers SET last_login_at = NOW() WHERE id = $1`,
      [customer.id]
    );

    const tokens = generateStoreCustomerToken({
      id: customer.id,
      email: customer.email,
      storeId: store.id,
      companyId: store.companyId,
      firstName: customer.first_name,
    });

    res.json({
      data: {
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phone: customer.phone,
        },
        ...tokens,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /auth/refresh — Refresh access token
// ═══════════════════════════════════════════════════════════════════════════
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const jwt = require('jsonwebtoken');
    const { config } = require('../../config/env');

    let payload: any;
    try {
      payload = jwt.verify(refreshToken, config.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (payload.type !== 'store_customer_refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const result = await pool.query(
      `SELECT id, email, first_name, is_active
       FROM store_customers
       WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
      [payload.sub, store.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Customer account not found or disabled' });
    }

    const customer = result.rows[0];
    const tokens = generateStoreCustomerToken({
      id: customer.id,
      email: customer.email,
      storeId: store.id,
      companyId: store.companyId,
      firstName: customer.first_name,
    });

    res.json({ data: tokens });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /auth/profile — Get customer profile
// ═══════════════════════════════════════════════════════════════════════════
router.get('/profile', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const { customer } = req.storeContext!;

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone, email_verified, created_at, last_login_at
       FROM store_customers WHERE id = $1`,
      [customer!.sub]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const row = result.rows[0];
    res.json({
      data: {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
        isVerified: row.email_verified,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /auth/profile — Update customer profile
// ═══════════════════════════════════════════════════════════════════════════
router.put('/profile', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const { customer } = req.storeContext!;
    const { firstName, lastName, phone } = req.body;

    const result = await pool.query(
      `UPDATE store_customers
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           phone = COALESCE($4, phone),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, first_name, last_name, phone`,
      [customer!.sub, firstName?.trim(), lastName?.trim(), phone?.trim()]
    );

    const row = result.rows[0];
    res.json({
      data: {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /auth/password — Change password
// ═══════════════════════════════════════════════════════════════════════════
router.put('/password', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const { customer } = req.storeContext!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const result = await pool.query(
      `SELECT password_hash FROM store_customers WHERE id = $1`,
      [customer!.sub]
    );

    const valid = await verifyStoreCustomerPassword(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await hashStoreCustomerPassword(newPassword);
    await pool.query(
      `UPDATE store_customers SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
      [customer!.sub, newHash]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /auth/addresses — Get customer addresses
// ═══════════════════════════════════════════════════════════════════════════
router.get('/addresses', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const { customer } = req.storeContext!;

    const result = await pool.query(
      `SELECT id, label, first_name, last_name, address_line1, address_line2,
              city, state, postal_code, country_code, phone, is_default_shipping, is_default_billing
       FROM store_customer_addresses
       WHERE store_customer_id = $1 AND deleted_at IS NULL
       ORDER BY is_default_shipping DESC, created_at DESC`,
      [customer!.sub]
    );

    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Failed to load addresses' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /auth/addresses — Add new address
// ═══════════════════════════════════════════════════════════════════════════
router.post('/addresses', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const { customer } = req.storeContext!;
    const { label, firstName, lastName, addressLine1, addressLine2, city, state, postalCode, countryCode, phone, isDefault } = req.body;

    if (!addressLine1 || !city || !countryCode) {
      return res.status(400).json({ error: 'Address line, city, and country are required' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await pool.query(
        `UPDATE store_customer_addresses SET is_default_shipping = false WHERE store_customer_id = $1`,
        [customer!.sub]
      );
    }

    const result = await pool.query(
      `INSERT INTO store_customer_addresses (store_customer_id, label, first_name, last_name, address_line1, address_line2, city, state, postal_code, country_code, phone, is_default_shipping)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [customer!.sub, label, firstName, lastName, addressLine1, addressLine2, city, state, postalCode, countryCode, phone, isDefault || false]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Add address error:', error);
    res.status(500).json({ error: 'Failed to add address' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /auth/addresses/:id — Delete address
// ═══════════════════════════════════════════════════════════════════════════
router.delete('/addresses/:id', requireStoreCustomer, async (req: Request, res: Response) => {
  try {
    const { customer } = req.storeContext!;

    await pool.query(
      `UPDATE store_customer_addresses SET deleted_at = NOW() WHERE id = $1 AND store_customer_id = $2`,
      [parseInt(req.params.id), customer!.sub]
    );

    res.json({ message: 'Address deleted' });
  } catch (error: any) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

export default router;
