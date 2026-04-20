/**
 * ============================================================================
 * Company Verification API - Stage 1 of Multi-Stage Login
 * ============================================================================
 * Verifies company code format (HAJ-001) and returns company information
 * This is a mock implementation for demonstration purposes
 * 
 * In production, this should:
 * 1. Query the tenants/companies table
 * 2. Validate company status (active/suspended/inactive)
 * 3. Return company branding information
 * 4. Log verification attempts for security
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// Mock company data for demonstration
const MOCK_COMPANIES = {
  'HAJ-001': {
    tenant_id: 1,
    company_code: 'HAJ-001',
    company_name: 'Al-Hajjar Logistics',
    company_name_ar: 'شركة الحجار للوجستيات',
    logo_url: '/logos/alhajjar.png',
    primary_color: '#0F4C81',
    secondary_color: '#1A6BB5',
    status: 'active' as const,
  },
  'TRD-002': {
    tenant_id: 2,
    company_code: 'TRD-002', 
    company_name: 'Trade Link Solutions',
    company_name_ar: 'شركة حلول الربط التجاري',
    logo_url: '/logos/tradelink.png',
    primary_color: '#0A3358',
    secondary_color: '#0F4C81',
    status: 'active' as const,
  },
  'LOG-003': {
    tenant_id: 3,
    company_code: 'LOG-003',
    company_name: 'Express Logistics Co.',
    company_name_ar: 'شركة الخدمات اللوجستية السريعة',
    logo_url: '/logos/express.png',
    primary_color: '#1A6BB5',
    secondary_color: '#0F4C81',
    status: 'suspended' as const,
  },
} as const;

interface CompanyVerificationRequest {
  company_code: string;
}

interface CompanyVerificationResponse {
  success: boolean;
  data?: typeof MOCK_COMPANIES[keyof typeof MOCK_COMPANIES];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompanyVerificationResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    const { company_code }: CompanyVerificationRequest = req.body;

    // Validate input
    if (!company_code) {
      return res.status(400).json({
        success: false,
        error: 'Company code is required',
      });
    }

    // Validate format (XXX-NNN)
    const formatRegex = /^[A-Z]{3}-\d{3}$/;
    if (!formatRegex.test(company_code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company code format. Expected format: HAJ-001',
      });
    }

    // Simulate database lookup delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if company exists
    const company = MOCK_COMPANIES[company_code as keyof typeof MOCK_COMPANIES];
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found. Please verify your company code.',
      });
    }

    // Check company status
    if (company.status !== 'active') {
      const statusMessages = {
        suspended: 'This company account has been suspended. Please contact support.',
        inactive: 'This company account is inactive. Please contact your administrator.',
      };
      
      return res.status(403).json({
        success: false,
        error: statusMessages[company.status] || 'Company account is not accessible.',
      });
    }

    // Return company information for successful verification
    return res.status(200).json({
      success: true,
      data: company,
    });

  } catch (error) {
    console.error('Company verification error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error during company verification',
    });
  }
}

/**
 * ============================================================================
 * Production Implementation Notes
 * ============================================================================
 * 
 * 1. Database Query:
 *    ```sql
 *    SELECT tenant_id, company_code, company_name, company_name_ar, 
 *           logo_url, primary_color, secondary_color, status
 *    FROM tenants 
 *    WHERE company_code = $1 AND deleted_at IS NULL
 *    ```
 * 
 * 2. Security Measures:
 *    - Rate limiting (max 5 attempts per IP per minute)
 *    - Audit logging of verification attempts
 *    - Brute force protection
 *    - Input sanitization
 * 
 * 3. Caching:
 *    - Cache company info in Redis for 5 minutes
 *    - Invalidate cache on company updates
 * 
 * 4. Error Handling:
 *    - Generic error messages to prevent enumeration
 *    - Detailed logging for debugging
 *    - Proper HTTP status codes
 * 
 * 5. Validation:
 *    - Company code format validation
 *    - Status checking (active/suspended/inactive)
 *    - Tenant isolation verification
 */