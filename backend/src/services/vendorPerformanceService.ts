/**
 * 📈 VENDOR PERFORMANCE SERVICE
 * ==============================
 * Tracks and calculates vendor performance metrics
 * 
 * Metrics:
 * ✅ On-Time Delivery Rate
 * ✅ Quality Rate (returns %)
 * ✅ Price Variance
 * ✅ Order Fulfillment Rate
 * ✅ Lead Time Analysis
 * ✅ Overall Score (weighted average)
 */

import pool from '../db';
import { logger } from '../utils/logger';

// Performance metrics interface
export interface VendorPerformanceMetrics {
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
  period_start: string;
  period_end: string;
  
  // Delivery metrics
  total_orders: number;
  on_time_deliveries: number;
  late_deliveries: number;
  on_time_rate: number;  // percentage
  avg_lead_time_days: number;
  
  // Quality metrics
  total_qty_received: number;
  total_qty_returned: number;
  return_rate: number;  // percentage
  
  // Price metrics
  total_po_amount: number;
  total_invoice_amount: number;
  price_variance: number;
  price_variance_percent: number;
  
  // Fulfillment metrics
  total_qty_ordered: number;
  total_qty_delivered: number;
  fulfillment_rate: number;  // percentage
  
  // Overall score
  overall_score: number;  // 0-100
  rating: 'excellent' | 'good' | 'satisfactory' | 'poor' | 'critical';
  
  // Trend data
  trend: 'improving' | 'stable' | 'declining';
  previous_score: number | null;
}

// Score weights (configurable per company)
export interface ScoreWeights {
  on_time_delivery: number;    // default 30%
  quality: number;             // default 25%
  price_accuracy: number;      // default 25%
  fulfillment: number;         // default 20%
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  on_time_delivery: 30,
  quality: 25,
  price_accuracy: 25,
  fulfillment: 20
};

/**
 * Vendor Performance Service
 */
export class VendorPerformanceService {
  
  /**
   * Get company-specific score weights
   */
  static async getWeights(companyId: number): Promise<ScoreWeights> {
    try {
      const result = await pool.query(
        `SELECT config_value FROM company_settings 
         WHERE company_id = $1 AND config_key = 'vendor_score_weights' AND deleted_at IS NULL`,
        [companyId]
      );
      
      if (result.rows[0]?.config_value) {
        return { ...DEFAULT_WEIGHTS, ...JSON.parse(result.rows[0].config_value) };
      }
    } catch (error) {
      logger.warn(`No score weights config found for company ${companyId}, using defaults`);
    }
    return DEFAULT_WEIGHTS;
  }
  
  /**
   * Calculate vendor performance for a period
   */
  static async calculatePerformance(
    vendorId: number,
    companyId: number,
    periodStart: string,
    periodEnd: string
  ): Promise<VendorPerformanceMetrics> {
    
    const weights = await this.getWeights(companyId);
    
    try {
      // Get vendor info
      const vendorResult = await pool.query(
        `SELECT id, vendor_name, vendor_code FROM vendors 
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [vendorId, companyId]
      );
      
      if (!vendorResult.rows[0]) {
        throw new Error('Vendor not found');
      }
      
      const vendor = vendorResult.rows[0];
      
      // Get delivery metrics from POs and GRs
      const deliveryResult = await pool.query(
        `WITH po_deliveries AS (
          SELECT 
            po.id as po_id,
            po.expected_delivery_date,
            gr.receipt_date,
            CASE 
              WHEN gr.receipt_date <= po.expected_delivery_date THEN 1 
              ELSE 0 
            END as on_time,
            EXTRACT(DAY FROM (gr.receipt_date - po.order_date)) as lead_time_days
          FROM purchase_orders po
          LEFT JOIN goods_receipts gr ON gr.purchase_order_id = po.id AND gr.deleted_at IS NULL
          WHERE po.vendor_id = $1 
            AND po.company_id = $2 
            AND po.order_date BETWEEN $3 AND $4
            AND po.deleted_at IS NULL
            AND po.status NOT IN ('draft', 'cancelled')
        )
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(on_time), 0) as on_time_deliveries,
          COALESCE(SUM(CASE WHEN on_time = 0 THEN 1 ELSE 0 END), 0) as late_deliveries,
          COALESCE(AVG(lead_time_days), 0) as avg_lead_time_days
        FROM po_deliveries`,
        [vendorId, companyId, periodStart, periodEnd]
      );
      
      const delivery = deliveryResult.rows[0];
      const totalOrders = parseInt(delivery.total_orders) || 0;
      const onTimeDeliveries = parseInt(delivery.on_time_deliveries) || 0;
      const lateDeliveries = parseInt(delivery.late_deliveries) || 0;
      const avgLeadTimeDays = parseFloat(delivery.avg_lead_time_days) || 0;
      const onTimeRate = totalOrders > 0 ? (onTimeDeliveries / totalOrders) * 100 : 100;
      
      // Get quality metrics from returns
      const qualityResult = await pool.query(
        `SELECT 
          COALESCE(SUM(grl.quantity_received), 0) as total_qty_received,
          COALESCE(SUM(prl.quantity), 0) as total_qty_returned
         FROM goods_receipts gr
         LEFT JOIN goods_receipt_lines grl ON grl.goods_receipt_id = gr.id AND grl.deleted_at IS NULL
         LEFT JOIN purchase_returns pr ON pr.vendor_id = gr.vendor_id 
           AND pr.receipt_date BETWEEN $3 AND $4
           AND pr.deleted_at IS NULL
         LEFT JOIN purchase_return_lines prl ON prl.purchase_return_id = pr.id AND prl.deleted_at IS NULL
         WHERE gr.vendor_id = $1 
           AND gr.company_id = $2 
           AND gr.receipt_date BETWEEN $3 AND $4
           AND gr.deleted_at IS NULL`,
        [vendorId, companyId, periodStart, periodEnd]
      );
      
      const quality = qualityResult.rows[0];
      const totalQtyReceived = parseFloat(quality.total_qty_received) || 0;
      const totalQtyReturned = parseFloat(quality.total_qty_returned) || 0;
      const returnRate = totalQtyReceived > 0 ? (totalQtyReturned / totalQtyReceived) * 100 : 0;
      
      // Get price metrics
      const priceResult = await pool.query(
        `SELECT 
          COALESCE(SUM(po.total_amount), 0) as total_po_amount,
          COALESCE(SUM(pi.total_amount), 0) as total_invoice_amount
         FROM purchase_orders po
         LEFT JOIN purchase_invoices pi ON pi.purchase_order_id = po.id AND pi.deleted_at IS NULL
         WHERE po.vendor_id = $1 
           AND po.company_id = $2 
           AND po.order_date BETWEEN $3 AND $4
           AND po.deleted_at IS NULL
           AND po.status NOT IN ('draft', 'cancelled')`,
        [vendorId, companyId, periodStart, periodEnd]
      );
      
      const price = priceResult.rows[0];
      const totalPoAmount = parseFloat(price.total_po_amount) || 0;
      const totalInvoiceAmount = parseFloat(price.total_invoice_amount) || 0;
      const priceVariance = totalInvoiceAmount - totalPoAmount;
      const priceVariancePercent = totalPoAmount > 0 ? (priceVariance / totalPoAmount) * 100 : 0;
      
      // Get fulfillment metrics
      const fulfillmentResult = await pool.query(
        `SELECT 
          COALESCE(SUM(pol.quantity), 0) as total_qty_ordered,
          COALESCE(SUM(grl.quantity_received), 0) as total_qty_delivered
         FROM purchase_orders po
         JOIN purchase_order_lines pol ON pol.purchase_order_id = po.id AND pol.deleted_at IS NULL
         LEFT JOIN goods_receipts gr ON gr.purchase_order_id = po.id AND gr.deleted_at IS NULL
         LEFT JOIN goods_receipt_lines grl ON grl.goods_receipt_id = gr.id 
           AND grl.item_id = pol.item_id AND grl.deleted_at IS NULL
         WHERE po.vendor_id = $1 
           AND po.company_id = $2 
           AND po.order_date BETWEEN $3 AND $4
           AND po.deleted_at IS NULL
           AND po.status NOT IN ('draft', 'cancelled')`,
        [vendorId, companyId, periodStart, periodEnd]
      );
      
      const fulfillment = fulfillmentResult.rows[0];
      const totalQtyOrdered = parseFloat(fulfillment.total_qty_ordered) || 0;
      const totalQtyDelivered = parseFloat(fulfillment.total_qty_delivered) || 0;
      const fulfillmentRate = totalQtyOrdered > 0 
        ? Math.min((totalQtyDelivered / totalQtyOrdered) * 100, 100) 
        : 100;
      
      // Calculate overall score
      const qualityScore = Math.max(0, 100 - returnRate);
      const priceScore = Math.max(0, 100 - Math.abs(priceVariancePercent));
      
      const overallScore = (
        (onTimeRate * weights.on_time_delivery / 100) +
        (qualityScore * weights.quality / 100) +
        (priceScore * weights.price_accuracy / 100) +
        (fulfillmentRate * weights.fulfillment / 100)
      );
      
      // Determine rating
      let rating: VendorPerformanceMetrics['rating'];
      if (overallScore >= 90) rating = 'excellent';
      else if (overallScore >= 75) rating = 'good';
      else if (overallScore >= 60) rating = 'satisfactory';
      else if (overallScore >= 40) rating = 'poor';
      else rating = 'critical';
      
      // Get previous period score for trend
      const previousScore = await this.getPreviousPeriodScore(vendorId, companyId, periodStart);
      
      let trend: VendorPerformanceMetrics['trend'] = 'stable';
      if (previousScore !== null) {
        if (overallScore > previousScore + 5) trend = 'improving';
        else if (overallScore < previousScore - 5) trend = 'declining';
      }
      
      return {
        vendor_id: vendorId,
        vendor_name: vendor.vendor_name,
        vendor_code: vendor.vendor_code,
        period_start: periodStart,
        period_end: periodEnd,
        total_orders: totalOrders,
        on_time_deliveries: onTimeDeliveries,
        late_deliveries: lateDeliveries,
        on_time_rate: Math.round(onTimeRate * 10) / 10,
        avg_lead_time_days: Math.round(avgLeadTimeDays * 10) / 10,
        total_qty_received: totalQtyReceived,
        total_qty_returned: totalQtyReturned,
        return_rate: Math.round(returnRate * 10) / 10,
        total_po_amount: totalPoAmount,
        total_invoice_amount: totalInvoiceAmount,
        price_variance: Math.round(priceVariance * 100) / 100,
        price_variance_percent: Math.round(priceVariancePercent * 10) / 10,
        total_qty_ordered: totalQtyOrdered,
        total_qty_delivered: totalQtyDelivered,
        fulfillment_rate: Math.round(fulfillmentRate * 10) / 10,
        overall_score: Math.round(overallScore * 10) / 10,
        rating,
        trend,
        previous_score: previousScore
      };
      
    } catch (error) {
      logger.error('Vendor performance calculation failed:', error);
      throw error;
    }
  }
  
  /**
   * Get previous period score from cache
   */
  private static async getPreviousPeriodScore(
    vendorId: number,
    companyId: number,
    periodStart: string
  ): Promise<number | null> {
    try {
      const result = await pool.query(
        `SELECT overall_score FROM vendor_performance_history
         WHERE vendor_id = $1 AND company_id = $2 AND period_end < $3
         ORDER BY period_end DESC LIMIT 1`,
        [vendorId, companyId, periodStart]
      );
      return result.rows[0]?.overall_score || null;
    } catch {
      return null;
    }
  }
  
  /**
   * Save performance snapshot to history
   */
  static async savePerformanceSnapshot(
    metrics: VendorPerformanceMetrics,
    companyId: number
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO vendor_performance_history (
          vendor_id, company_id, period_start, period_end,
          on_time_rate, return_rate, price_variance_percent, fulfillment_rate,
          overall_score, rating, snapshot_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (vendor_id, company_id, period_end) 
        DO UPDATE SET
          on_time_rate = EXCLUDED.on_time_rate,
          return_rate = EXCLUDED.return_rate,
          price_variance_percent = EXCLUDED.price_variance_percent,
          fulfillment_rate = EXCLUDED.fulfillment_rate,
          overall_score = EXCLUDED.overall_score,
          rating = EXCLUDED.rating,
          snapshot_data = EXCLUDED.snapshot_data,
          updated_at = NOW()`,
        [
          metrics.vendor_id, companyId, metrics.period_start, metrics.period_end,
          metrics.on_time_rate, metrics.return_rate, metrics.price_variance_percent,
          metrics.fulfillment_rate, metrics.overall_score, metrics.rating,
          JSON.stringify(metrics)
        ]
      );
      logger.info(`Performance snapshot saved for vendor ${metrics.vendor_id}`);
    } catch (error) {
      logger.warn('Failed to save performance snapshot:', error);
    }
  }
  
  /**
   * Get top/bottom performing vendors
   */
  static async getVendorRankings(
    companyId: number,
    periodStart: string,
    periodEnd: string,
    limit: number = 10,
    order: 'best' | 'worst' = 'best'
  ): Promise<Array<{
    vendor_id: number;
    vendor_name: string;
    vendor_code: string;
    overall_score: number;
    rating: string;
    on_time_rate: number;
    return_rate: number;
  }>> {
    
    try {
      // Get all active vendors for the company
      const vendorsResult = await pool.query(
        `SELECT DISTINCT v.id, v.vendor_name, v.vendor_code
         FROM vendors v
         JOIN purchase_orders po ON po.vendor_id = v.id
         WHERE v.company_id = $1 AND v.deleted_at IS NULL
           AND po.order_date BETWEEN $2 AND $3
           AND po.deleted_at IS NULL`,
        [companyId, periodStart, periodEnd]
      );
      
      const rankings: any[] = [];
      
      for (const vendor of vendorsResult.rows) {
        try {
          const metrics = await this.calculatePerformance(
            vendor.id, companyId, periodStart, periodEnd
          );
          rankings.push({
            vendor_id: vendor.id,
            vendor_name: vendor.vendor_name,
            vendor_code: vendor.vendor_code,
            overall_score: metrics.overall_score,
            rating: metrics.rating,
            on_time_rate: metrics.on_time_rate,
            return_rate: metrics.return_rate
          });
        } catch {
          // Skip vendors with calculation errors
        }
      }
      
      // Sort by score
      rankings.sort((a, b) => 
        order === 'best' 
          ? b.overall_score - a.overall_score 
          : a.overall_score - b.overall_score
      );
      
      return rankings.slice(0, limit);
      
    } catch (error) {
      logger.error('Vendor rankings calculation failed:', error);
      return [];
    }
  }
  
  /**
   * Get performance trend for a vendor
   */
  static async getPerformanceTrend(
    vendorId: number,
    companyId: number,
    months: number = 12
  ): Promise<Array<{
    period: string;
    overall_score: number;
    on_time_rate: number;
    return_rate: number;
    fulfillment_rate: number;
  }>> {
    
    try {
      const result = await pool.query(
        `SELECT 
          TO_CHAR(period_end, 'YYYY-MM') as period,
          overall_score,
          on_time_rate,
          return_rate,
          fulfillment_rate
         FROM vendor_performance_history
         WHERE vendor_id = $1 AND company_id = $2
         ORDER BY period_end DESC
         LIMIT $3`,
        [vendorId, companyId, months]
      );
      
      return result.rows.reverse();
    } catch (error) {
      logger.error('Performance trend query failed:', error);
      return [];
    }
  }
}

export default VendorPerformanceService;
