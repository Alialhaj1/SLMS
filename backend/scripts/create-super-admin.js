"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt = __importStar(require("bcryptjs"));
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/slms',
});
async function createSuperAdmin() {
    console.log('🔐 Creating super admin user...');
    const email = 'ali@alhajco.com';
    const password = 'A11A22A33';
    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('✅ Password hashed successfully');
        // Get super_admin role_id
        const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'super_admin'");
        if (roleResult.rows.length === 0) {
            console.error('❌ super_admin role not found. Run migrations first.');
            process.exit(1);
        }
        const roleId = roleResult.rows[0].id;
        // Delete existing user if exists
        await pool.query('DELETE FROM users WHERE email = $1', [email]);
        // Insert super admin
        await pool.query(`INSERT INTO users (email, password_hash, role_id, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`, [email, hashedPassword, roleId]);
        console.log('✅ Super admin created successfully!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('👑 Role: super_admin (full permissions)');
        await pool.end();
    }
    catch (error) {
        console.error('❌ Error creating super admin:', error);
        process.exit(1);
    }
}
createSuperAdmin();
