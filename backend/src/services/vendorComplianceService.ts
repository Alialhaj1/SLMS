/**
 * 🛡️ VENDOR COMPLIANCE SERVICE
 * =============================
 * Vendor risk assessment and compliance management
 * 
 * Features:
 * ✅ Risk level tracking (low/medium/high/critical)
 * ✅ Blacklist management
 * ✅ Document expiry monitoring
 * ✅ Compliance scoring
 */

import pool from '../db';
import { logger } from '../utils/logger';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface VendorComplianceRecord {
  id: number;
  vendor_id: number;
  company_id: number;
  risk_level: RiskLevel;
  risk_score: number;
  is_blacklisted: boolean;
  blacklist_reason?: string;
  blacklisted_at?: Date;
  blacklisted_by?: number;
  license_number?: string;
  license_expiry_date?: Date;
  tax_registration_number?: string;
  tax_certificate_expiry?: Date;
  insurance_expiry_date?: Date;
  missing_documents: string[];
  last_audit_date?: Date;
  next_audit_due?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ComplianceStatus {
  vendor_id: number;
  vendor_name: string;
  risk_level: RiskLevel;
  risk_score: number;
  is_blacklisted: boolean;
  is_compliant: boolean;
  expiring_soon: {
    license: boolean;
    tax_certificate: boolean;
    insurance: boolean;
  };
  days_until_expiry: {
    license?: number;
    tax_certificate?: number;
    insurance?: number;
  };
  missing_documents: string[];
  can_create_po: boolean;
  warnings: string[];
}

export interface ComplianceFilter {
  risk_level?: RiskLevel;
  is_blacklisted?: boolean;
  has_expiring_documents?: boolean;
  has_missing_documents?: boolean;
}

/**
 * Vendor Compliance Service
 */
export class VendorComplianceService {
  
  // Risk score thresholds
  private static readonly RISK_THRESHOLDS = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 100
  };
  
  // Days before expiry to warn
  private static readonly EXPIRY_WARNING_DAYS = 30;
  
  /**
   * Get or create compliance record for vendor
   */
  static async getOrCreate(vendorId: number, companyId: number): Promise<VendorComplianceRecord> {
    let result = await pool.query(
      `SELECT * FROM vendor_compliance WHERE vendor_id = $1 AND company_id = $2`,
      [vendorId, companyId]
    );
    
    if (result.rows.length === 0) {
      // Create default record
      result = await pool.query(
        `INSERT INTO vendor_compliance (vendor_id, company_id, risk_level, risk_score, missing_documents)
         VALUES ($1, $2, 'low', 0, '{}')
         RETURNING *`,
        [vendorId, companyId]
      );
    }
    
    return result.rows[0];
  }
  
  /**
   * Get full compliance status with calculations
   */
  static async getComplianceStatus(vendorId: number, companyId: number): Promise<ComplianceStatus> {
    const record = await this.getOrCreate(vendorId, companyId);
    
    // Get vendor name
    const vendorResult = await pool.query(
      `SELECT name FROM vendors WHERE id = $1`,
      [vendorId]
    );
    const vendorName = vendorResult.rows[0]?.name || 'Unknown Vendor';
    
    const now = new Date();
    const warningDays = this.EXPIRY_WARNING_DAYS;
    
    // Calculate days until expiry
    const daysUntil = (date: Date | null | undefined): number | undefined => {
      if (!date) return undefined;
      const d = new Date(date);
      return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };
    
    const licenseDays = daysUntil(record.license_expiry_date);
    const taxDays = daysUntil(record.tax_certificate_expiry);
    const insuranceDays = daysUntil(record.insurance_expiry_date);
    
    const expiringSoon = {
      license: licenseDays !== undefined && licenseDays <= warningDays && licenseDays >= 0,
      tax_certificate: taxDays !== undefined && taxDays <= warningDays && taxDays >= 0,
      insurance: insuranceDays !== undefined && insuranceDays <= warningDays && insuranceDays >= 0
    };
    
    const hasExpired = {
      license: licenseDays !== undefined && licenseDays < 0,
      tax_certificate: taxDays !== undefined && taxDays < 0,
      insurance: insuranceDays !== undefined && insuranceDays < 0
    };
    
    // Build warnings list
    const warnings: string[] = [];
    
    if (record.is_blacklisted) {
      warnings.push(`Vendor is blacklisted: ${record.blacklist_reason || 'No reason specified'}`);
    }
    
    if (hasExpired.license) {
      warnings.push(`License expired ${Math.abs(licenseDays!)} days ago`);
    } else if (expiringSoon.license) {
      warnings.push(`License expires in ${licenseDays} days`);
    }
    
    if (hasExpired.tax_certificate) {
      warnings.push(`Tax certificate expired ${Math.abs(taxDays!)} days ago`);
    } else if (expiringSoon.tax_certificate) {
      warnings.push(`Tax certificate expires in ${taxDays} days`);
    }
    
    if (hasExpired.insurance) {
      warnings.push(`Insurance expired ${Math.abs(insuranceDays!)} days ago`);
    } else if (expiringSoon.insurance) {
      warnings.push(`Insurance expires in ${insuranceDays} days`);
    }
    
    if (record.missing_documents && record.missing_documents.length > 0) {
      warnings.push(`Missing documents: ${record.missing_documents.join(', ')}`);
    }
    
    if (record.risk_level === 'high') {
      warnings.push('Vendor has HIGH risk level - requires approval');
    } else if (record.risk_level === 'critical') {
      warnings.push('Vendor has CRITICAL risk level - blocked from new POs');
    }
    
    // Determine if compliant
    const isCompliant = !record.is_blacklisted && 
                        !hasExpired.license && 
                        !hasExpired.tax_certificate &&
                        record.missing_documents.length === 0;
    
    // Determine if can create PO
    const canCreatePO = !record.is_blacklisted && 
                        record.risk_level !== 'critical' &&
                        !hasExpired.license;
    
    return {
      vendor_id: vendorId,
      vendor_name: vendorName,
      risk_level: record.risk_level,
      risk_score: record.risk_score,
      is_blacklisted: record.is_blacklisted,
      is_compliant: isCompliant,
      expiring_soon: expiringSoon,
      days_until_expiry: {
        license: licenseDays,
        tax_certificate: taxDays,
        insurance: insuranceDays
      },
      missing_documents: record.missing_documents || [],
      can_create_po: canCreatePO,
      warnings
    };
  }
  
  /**
   * Update compliance record
   */
  static async updateCompliance(
    vendorId: number,
    companyId: number,
    updates: Partial<VendorComplianceRecord>,
    updatedBy?: number
  ): Promise<VendorComplianceRecord> {
    // Ensure record exists
    await this.getOrCreate(vendorId, companyId);
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'risk_level', 'risk_score', 'license_number', 'license_expiry_date',
      'tax_registration_number', 'tax_certificate_expiry', 'insurance_expiry_date',
      'missing_documents', 'last_audit_date', 'next_audit_due', 'notes'
    ];
    
    for (const field of allowedFields) {
      if (field in updates) {
        fields.push(`${field} = $${paramIndex}`);
        values.push((updates as any)[field]);
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return this.getOrCreate(vendorId, companyId);
    }
    
    fields.push('updated_at = NOW()');
    values.push(vendorId, companyId);
    
    const result = await pool.query(
      `UPDATE vendor_compliance 
       SET ${fields.join(', ')}
       WHERE vendor_id = $${paramIndex} AND company_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );
    
    logger.info(`Vendor compliance updated for vendor ${vendorId}`, { updates });
    
    return result.rows[0];
  }
  
  /**
   * Blacklist a vendor
   */
  static async blacklistVendor(
    vendorId: number,
    companyId: number,
    reason: string,
    blacklistedBy: number
  ): Promise<VendorComplianceRecord> {
    await this.getOrCreate(vendorId, companyId);
    
    const result = await pool.query(
      `UPDATE vendor_compliance 
       SET is_blacklisted = true,
           blacklist_reason = $1,
           blacklisted_at = NOW(),
           blacklisted_by = $2,
           risk_level = 'critical',
           updated_at = NOW()
       WHERE vendor_id = $3 AND company_id = $4
       RETURNING *`,
      [reason, blacklistedBy, vendorId, companyId]
    );
    
    logger.warn(`Vendor ${vendorId} blacklisted by user ${blacklistedBy}: ${reason}`);
    
    return result.rows[0];
  }
  
  /**
   * Remove from blacklist
   */
  static async removeFromBlacklist(
    vendorId: number,
    companyId: number,
    removedBy: number
  ): Promise<VendorComplianceRecord> {
    const result = await pool.query(
      `UPDATE vendor_compliance 
       SET is_blacklisted = false,
           blacklist_reason = NULL,
           blacklisted_at = NULL,
           blacklisted_by = NULL,
           updated_at = NOW()
       WHERE vendor_id = $1 AND company_id = $2
       RETURNING *`,
      [vendorId, companyId]
    );
    
    // Recalculate risk level
    await this.recalculateRiskScore(vendorId, companyId);
    
    logger.info(`Vendor ${vendorId} removed from blacklist by user ${removedBy}`);
    
    return result.rows[0];
  }
  
  /**
   * Recalculate risk score based on multiple factors
   */
  static async recalculateRiskScore(vendorId: number, companyId: number): Promise<VendorComplianceRecord> {
    const record = await this.getOrCreate(vendorId, companyId);
    
    let riskScore = 0;
    
    // Blacklist = max score
    if (record.is_blacklisted) {
      riskScore = 100;
    } else {
      // Check expired documents
      const now = new Date();
      
      if (record.license_expiry_date && new Date(record.license_expiry_date) < now) {
        riskScore += 30; // Expired license
      }
      
      if (record.tax_certificate_expiry && new Date(record.tax_certificate_expiry) < now) {
        riskScore += 20; // Expired tax certificate
      }
      
      if (record.insurance_expiry_date && new Date(record.insurance_expiry_date) < now) {
        riskScore += 15; // Expired insurance
      }
      
      // Missing documents
      if (record.missing_documents && record.missing_documents.length > 0) {
        riskScore += record.missing_documents.length * 10;
      }
      
      // Check vendor performance (if available)
      try {
        const perfResult = await pool.query(
          `SELECT on_time_delivery_rate, quality_pass_rate, return_rate
           FROM vendor_performance 
           WHERE vendor_id = $1 AND company_id = $2`,
          [vendorId, companyId]
        );
        
        if (perfResult.rows.length > 0) {
          const perf = perfResult.rows[0];
          
          // Poor delivery rate
          if (perf.on_time_delivery_rate < 70) {
            riskScore += 15;
          } else if (perf.on_time_delivery_rate < 85) {
            riskScore += 5;
          }
          
          // Poor quality
          if (perf.quality_pass_rate < 90) {
            riskScore += 20;
          } else if (perf.quality_pass_rate < 95) {
            riskScore += 10;
          }
          
          // High return rate
          if (perf.return_rate > 10) {
            riskScore += 15;
          } else if (perf.return_rate > 5) {
            riskScore += 5;
          }
        }
      } catch {
        // Performance table may not exist, ignore
      }
    }
    
    // Cap at 100
    riskScore = Math.min(riskScore, 100);
    
    // Determine risk level
    let riskLevel: RiskLevel;
    if (riskScore >= this.RISK_THRESHOLDS.critical) {
      riskLevel = 'critical';
    } else if (riskScore >= this.RISK_THRESHOLDS.high) {
      riskLevel = 'high';
    } else if (riskScore >= this.RISK_THRESHOLDS.medium) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }
    
    // Update record
    const result = await pool.query(
      `UPDATE vendor_compliance 
       SET risk_score = $1, risk_level = $2, updated_at = NOW()
       WHERE vendor_id = $3 AND company_id = $4
       RETURNING *`,
      [riskScore, riskLevel, vendorId, companyId]
    );
    
    return result.rows[0];
  }
  
  /**
   * Get vendors with expiring documents
   */
  static async getExpiringDocuments(companyId: number, daysAhead: number = 30): Promise<any[]> {
    const result = await pool.query(
      `SELECT vc.*, v.name as vendor_name, v.code as vendor_code
       FROM vendor_compliance vc
       JOIN vendors v ON v.id = vc.vendor_id
       WHERE vc.company_id = $1
         AND (
           (vc.license_expiry_date IS NOT NULL AND vc.license_expiry_date <= CURRENT_DATE + $2)
           OR (vc.tax_certificate_expiry IS NOT NULL AND vc.tax_certificate_expiry <= CURRENT_DATE + $2)
           OR (vc.insurance_expiry_date IS NOT NULL AND vc.insurance_expiry_date <= CURRENT_DATE + $2)
         )
       ORDER BY LEAST(
         COALESCE(vc.license_expiry_date, '2099-12-31'),
         COALESCE(vc.tax_certificate_expiry, '2099-12-31'),
         COALESCE(vc.insurance_expiry_date, '2099-12-31')
       )`,
      [companyId, daysAhead]
    );
    return result.rows;
  }
  
  /**
   * Get all compliance records with filters
   */
  static async getComplianceList(
    companyId: number,
    filter?: ComplianceFilter
  ): Promise<any[]> {
    let query = `
      SELECT vc.*, v.name as vendor_name, v.code as vendor_code
      FROM vendor_compliance vc
      JOIN vendors v ON v.id = vc.vendor_id
      WHERE vc.company_id = $1
    `;
    const params: any[] = [companyId];
    let paramIndex = 2;
    
    if (filter?.risk_level) {
      query += ` AND vc.risk_level = $${paramIndex}`;
      params.push(filter.risk_level);
      paramIndex++;
    }
    
    if (filter?.is_blacklisted !== undefined) {
      query += ` AND vc.is_blacklisted = $${paramIndex}`;
      params.push(filter.is_blacklisted);
      paramIndex++;
    }
    
    if (filter?.has_missing_documents) {
      query += ` AND array_length(vc.missing_documents, 1) > 0`;
    }
    
    if (filter?.has_expiring_documents) {
      query += ` AND (
        (vc.license_expiry_date IS NOT NULL AND vc.license_expiry_date <= CURRENT_DATE + 30)
        OR (vc.tax_certificate_expiry IS NOT NULL AND vc.tax_certificate_expiry <= CURRENT_DATE + 30)
        OR (vc.insurance_expiry_date IS NOT NULL AND vc.insurance_expiry_date <= CURRENT_DATE + 30)
      )`;
    }
    
    query += ` ORDER BY vc.risk_score DESC, v.name`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }
  
  /**
   * Update missing documents list
   */
  static async updateMissingDocuments(
    vendorId: number,
    companyId: number,
    documents: string[]
  ): Promise<void> {
    await pool.query(
      `UPDATE vendor_compliance 
       SET missing_documents = $1, updated_at = NOW()
       WHERE vendor_id = $2 AND company_id = $3`,
      [documents, vendorId, companyId]
    );
    
    // Recalculate risk
    await this.recalculateRiskScore(vendorId, companyId);
  }
}

export default VendorComplianceService;
