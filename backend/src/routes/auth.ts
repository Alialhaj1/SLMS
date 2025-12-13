import { Router } from 'express';
import pool from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'replace-me';
const ACCESS_EXP = '15m';
const REFRESH_EXP_SECONDS = 60 * 60 * 24 * 30; // 30 days

function signAccessToken(user: any, jti: string) {
  const payload = { sub: user.id, email: user.email, roles: user.roles || [], jti };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXP });
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

router.post('/register', async (req, res) => {
  const { email, password, full_name, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  const hashed = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('INSERT INTO users(email,password,full_name) VALUES($1,$2,$3) RETURNING id,email', [email, hashed, full_name]);
    const userId = r.rows[0].id;
    if (role) {
      const rm = await client.query('SELECT id FROM roles WHERE name=$1', [role]);
      if (rm.rowCount > 0) {
        await client.query('INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)', [userId, rm.rows[0].id]);
      }
    }
    await client.query('COMMIT');
    res.json({ id: userId, email });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'failed to create user' });
  } finally { client.release(); }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT id,email,password,full_name FROM users WHERE email=$1', [email]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'invalid credentials' });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const rr = await client.query('SELECT roles.name FROM roles JOIN user_roles ur ON ur.role_id=roles.id WHERE ur.user_id=$1', [user.id]);
    const roles = rr.rows.map((x: any) => x.name);
    const jti = uuidv4();
    const accessToken = signAccessToken({ id: user.id, email: user.email, roles }, jti);
    const refreshToken = uuidv4();
    const tokenHash = hashToken(refreshToken);
    const expires_at = new Date(Date.now() + REFRESH_EXP_SECONDS * 1000);
    await client.query('INSERT INTO refresh_tokens(token_hash,user_id,jti,expires_at) VALUES($1,$2,$3,$4)', [tokenHash, user.id, jti, expires_at.toISOString()]);
    res.json({ accessToken, refreshToken, expiresAt: expires_at.toISOString(), user: { id: user.id, email: user.email, roles } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'login failed' });
  } finally { client.release(); }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  const client = await pool.connect();
  try {
    const tokenHash = hashToken(refreshToken);
    const r = await client.query('SELECT token_hash,user_id,jti,expires_at,revoked_at FROM refresh_tokens WHERE token_hash=$1', [tokenHash]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'invalid refresh token' });
    const row = r.rows[0];
    if (row.revoked_at) return res.status(401).json({ error: 'refresh token revoked' });
    if (new Date(row.expires_at) < new Date()) {
      await client.query('DELETE FROM refresh_tokens WHERE token_hash=$1', [tokenHash]);
      return res.status(401).json({ error: 'refresh token expired' });
    }
    const ur = await client.query('SELECT id,email FROM users WHERE id=$1', [row.user_id]);
    const user = ur.rows[0];
    const rr = await client.query('SELECT roles.name FROM roles JOIN user_roles ur ON ur.role_id=roles.id WHERE ur.user_id=$1', [user.id]);
    const roles = rr.rows.map((x: any) => x.name);

    // rotate: revoke old and insert new
    const newRefresh = uuidv4();
    const newHash = hashToken(newRefresh);
    const newJti = uuidv4();
    const expires_at = new Date(Date.now() + REFRESH_EXP_SECONDS * 1000);
    await client.query('BEGIN');
    await client.query('UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1', [tokenHash]);
    await client.query('INSERT INTO refresh_tokens(token_hash,user_id,jti,expires_at) VALUES($1,$2,$3,$4)', [newHash, user.id, newJti, expires_at.toISOString()]);
    await client.query('COMMIT');

    const accessToken = signAccessToken({ id: user.id, email: user.email, roles }, newJti);
    res.json({ accessToken, refreshToken: newRefresh, expiresAt: expires_at.toISOString() });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (er) {}
    console.error(e);
    res.status(500).json({ error: 'refresh failed' });
  } finally { client.release(); }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  const client = await pool.connect();
  try {
    const tokenHash = hashToken(refreshToken);
    await client.query('UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1', [tokenHash]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'logout failed' });
  } finally { client.release(); }
});

export default router;
