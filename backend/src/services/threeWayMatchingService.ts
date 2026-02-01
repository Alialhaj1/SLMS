/**
 * 📦 THREE-WAY MATCHING SERVICE
 * ==============================
 * Validates Purchase Invoice against Purchase Order and Goods Receipt
 * 
 * Matching Rules:
 * ✅ Qty Check: Invoice Qty ≤ GR Qty (can't invoice more than received)
 * ✅ Price Check: Invoice Price = PO Price (flag variance)
 * ✅ Tolerance: Configurable price/qty tolerance %
 * ✅ Auto-Match: Link invoice lines to PO/GR lines
 */

import pool from '../db';
import { logger } from '../utils/logger';

// Matching result types
export interface MatchingVariance {
  type: 'quantity' | 'price' | 'total';
  item_id: number;
  item_name: string;
  expected: number;
  actual: number;
  variance: number;
  variance_percent: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
  message_ar: string;
}

export interface MatchingResult {
  is_matched: boolean;
  match_status: 'full_match' | 'partial_match' | 'variance_detected' | 'unmatched' | 'error';
  total_variances: number;
  variances: MatchingVariance[];
  summary: {
    po_total: number;
    gr_total: number;
    invoice_total: number;
    total_variance: number;
    variance_percent: number;
  };
  warnings: string[];
  warnings_ar: string[];
  requires_approval: boolean;
  matched_lines: Array<{
    invoice_line_id: number;
    po_line_id?: number;
    gr_line_id?: number;
    match_percent: number;
  }>;
}

// Configuration for matching tolerances
export interface MatchingConfig {
  price_tolerance_percent: number;  // e.g., 2% price variance allowed
  qty_tolerance_percent: number;    // e.g., 5% qty variance allowed
  allow_over_receipt: boolean;      // Can GR qty exceed PO qty?
  allow_over_invoice: boolean;      // Can invoice qty exceed GR qty?
  require_po_match: boolean;        // Must invoice link to PO?
  require_gr_match: boolean;        // Must invoice link to GR?
}

const DEFAULT_CONFIG: MatchingConfig = {
  price_tolerance_percent: 2,
  qty_tolerance_percent: 5,
  allow_over_receipt: false,
  allow_over_invoice: false,
  require_po_match: true,
  require_gr_match: true
};

/**
 * Three-Way Matching Service
 */
export class ThreeWayMatchingService {
  
  /**
   * Get company-specific matching config
   */
  static async getConfig(companyId: number): Promise<MatchingConfig> {
    try {
      const result = await pool.query(
        `SELECT config_value FROM company_settings 
         WHERE company_id = $1 AND config_key = 'three_way_matching' AND deleted_at IS NULL`,
        [companyId]
      );
      
      if (result.rows[0]?.config_value) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(result.rows[0].config_value) };
      }
    } catch (error) {
      logger.warn(`No matching config found for company ${companyId}, using defaults`);
    }
    return DEFAULT_CONFIG;
  }
  
  /**
   * Validate invoice against PO and GR
   */
  static async validateInvoice(
    invoiceId: number,
    companyId: number
  ): Promise<MatchingResult> {
    
    const config = await this.getConfig(companyId);
    const variances: MatchingVariance[] = [];
    const warnings: string[] = [];
    const warnings_ar: string[] = [];
    const matchedLines: MatchingResult['matched_lines'] = [];
    
    try {
      // Get invoice with lines
      const invoiceResult = await pool.query(
        `SELECT pi.*, 
          (SELECT json_agg(pil ORDER BY pil.id)
           FROM purchase_invoice_lines pil
           WHERE pil.purchase_invoice_id = pi.id AND pil.deleted_at IS NULL) as lines
         FROM purchase_invoices pi
         WHERE pi.id = $1 AND pi.company_id = $2 AND pi.deleted_at IS NULL`,
        [invoiceId, companyId]
      );
      
      if (!invoiceResult.rows[0]) {
        return {
          is_matched: false,
          match_status: 'error',
          total_variances: 0,
          variances: [],
          summary: { po_total: 0, gr_total: 0, invoice_total: 0, total_variance: 0, variance_percent: 0 },
          warnings: ['Invoice not found'],
          warnings_ar: ['الفاتورة غير موجودة'],
          requires_approval: false,
          matched_lines: []
        };
      }
      
      const invoice = invoiceResult.rows[0];
      const invoiceLines = invoice.lines || [];
      const poId = invoice.purchase_order_id;
      const grId = invoice.goods_receipt_id;
      
      let poTotal = 0;
      let grTotal = 0;
      const invoiceTotal = parseFloat(invoice.total_amount) || 0;
      
      // Get PO if linked
      let poLines: any[] = [];
      if (poId) {
        const poResult = await pool.query(
          `SELECT po.*, 
            (SELECT json_agg(pol ORDER BY pol.id)
             FROM purchase_order_lines pol
             WHERE pol.purchase_order_id = po.id AND pol.deleted_at IS NULL) as lines
           FROM purchase_orders po
           WHERE po.id = $1 AND po.deleted_at IS NULL`,
          [poId]
        );
        
        if (poResult.rows[0]) {
          poLines = poResult.rows[0].lines || [];
          poTotal = parseFloat(poResult.rows[0].total_amount) || 0;
        }
      } else if (config.require_po_match) {
        warnings.push('Invoice is not linked to a Purchase Order');
        warnings_ar.push('الفاتورة غير مرتبطة بأمر شراء');
      }
      
      // Get GR if linked
      let grLines: any[] = [];
      if (grId) {
        const grResult = await pool.query(
          `SELECT gr.*, 
            (SELECT json_agg(grl ORDER BY grl.id)
             FROM goods_receipt_lines grl
             WHERE grl.goods_receipt_id = gr.id AND grl.deleted_at IS NULL) as lines
           FROM goods_receipts gr
           WHERE gr.id = $1 AND gr.deleted_at IS NULL`,
          [grId]
        );
        
        if (grResult.rows[0]) {
          grLines = grResult.rows[0].lines || [];
          // Calculate GR total from lines
          grTotal = grLines.reduce((sum: number, line: any) => 
            sum + (parseFloat(line.quantity_received) * parseFloat(line.unit_price || 0)), 0);
        }
      } else if (config.require_gr_match) {
        warnings.push('Invoice is not linked to a Goods Receipt');
        warnings_ar.push('الفاتورة غير مرتبطة بسند استلام');
      }
      
      // Match each invoice line
      for (const invLine of invoiceLines) {
        const itemId = invLine.item_id;
        const itemName = invLine.item_name || `Item #${itemId}`;
        const invQty = parseFloat(invLine.quantity) || 0;
        const invPrice = parseFloat(invLine.unit_price) || 0;
        
        // Find matching PO line
        const poLine = poLines.find(pl => pl.item_id === itemId);
        const poQty = poLine ? parseFloat(poLine.quantity) : 0;
        const poPrice = poLine ? parseFloat(poLine.unit_price) : 0;
        
        // Find matching GR line
        const grLine = grLines.find(gl => gl.item_id === itemId);
        const grQty = grLine ? parseFloat(grLine.quantity_received) : 0;
        
        // Track matched lines
        matchedLines.push({
          invoice_line_id: invLine.id,
          po_line_id: poLine?.id,
          gr_line_id: grLine?.id,
          match_percent: (poLine && grLine) ? 100 : (poLine || grLine) ? 50 : 0
        });
        
        // Check 1: Invoice Qty vs GR Qty (can't invoice more than received)
        if (grLine && invQty > grQty) {
          const qtyVariance = invQty - grQty;
          const qtyVariancePercent = (qtyVariance / grQty) * 100;
          
          if (!config.allow_over_invoice || qtyVariancePercent > config.qty_tolerance_percent) {
            variances.push({
              type: 'quantity',
              item_id: itemId,
              item_name: itemName,
              expected: grQty,
              actual: invQty,
              variance: qtyVariance,
              variance_percent: qtyVariancePercent,
              severity: qtyVariancePercent > config.qty_tolerance_percent ? 'error' : 'warning',
              message: `Invoice qty (${invQty}) exceeds GR qty (${grQty}) by ${qtyVariance}`,
              message_ar: `كمية الفاتورة (${invQty}) تتجاوز كمية الاستلام (${grQty}) بمقدار ${qtyVariance}`
            });
          }
        }
        
        // Check 2: Invoice Price vs PO Price
        if (poLine && Math.abs(invPrice - poPrice) > 0.01) {
          const priceVariance = invPrice - poPrice;
          const priceVariancePercent = (Math.abs(priceVariance) / poPrice) * 100;
          
          if (priceVariancePercent > config.price_tolerance_percent) {
            variances.push({
              type: 'price',
              item_id: itemId,
              item_name: itemName,
              expected: poPrice,
              actual: invPrice,
              variance: priceVariance,
              variance_percent: priceVariancePercent,
              severity: priceVariancePercent > (config.price_tolerance_percent * 2) ? 'error' : 'warning',
              message: `Invoice price (${invPrice}) differs from PO price (${poPrice}) by ${priceVariance.toFixed(2)} (${priceVariancePercent.toFixed(1)}%)`,
              message_ar: `سعر الفاتورة (${invPrice}) يختلف عن سعر أمر الشراء (${poPrice}) بمقدار ${priceVariance.toFixed(2)} (${priceVariancePercent.toFixed(1)}%)`
            });
          }
        }
        
        // Check 3: GR Qty vs PO Qty (over-receipt warning)
        if (poLine && grLine && grQty > poQty) {
          const overReceiptQty = grQty - poQty;
          const overReceiptPercent = (overReceiptQty / poQty) * 100;
          
          if (!config.allow_over_receipt) {
            variances.push({
              type: 'quantity',
              item_id: itemId,
              item_name: itemName,
              expected: poQty,
              actual: grQty,
              variance: overReceiptQty,
              variance_percent: overReceiptPercent,
              severity: 'warning',
              message: `GR qty (${grQty}) exceeds PO qty (${poQty}) by ${overReceiptQty}`,
              message_ar: `كمية الاستلام (${grQty}) تتجاوز كمية أمر الشراء (${poQty}) بمقدار ${overReceiptQty}`
            });
          }
        }
        
        // Check 4: Missing in GR
        if (!grLine && config.require_gr_match) {
          variances.push({
            type: 'quantity',
            item_id: itemId,
            item_name: itemName,
            expected: invQty,
            actual: 0,
            variance: invQty,
            variance_percent: 100,
            severity: 'error',
            message: `Item not found in Goods Receipt`,
            message_ar: `الصنف غير موجود في سند الاستلام`
          });
        }
      }
      
      // Calculate total variance
      const totalVariance = Math.abs(invoiceTotal - (grTotal || poTotal));
      const variancePercent = (poTotal || grTotal) > 0 
        ? (totalVariance / (poTotal || grTotal)) * 100 
        : 0;
      
      // Determine match status
      let matchStatus: MatchingResult['match_status'] = 'full_match';
      if (variances.some(v => v.severity === 'error')) {
        matchStatus = 'variance_detected';
      } else if (variances.some(v => v.severity === 'warning')) {
        matchStatus = 'partial_match';
      } else if (!poId && !grId) {
        matchStatus = 'unmatched';
      }
      
      // Determine if approval is required
      const requiresApproval = variances.some(v => v.severity === 'error') || 
        variances.some(v => v.variance_percent > config.price_tolerance_percent * 2);
      
      return {
        is_matched: matchStatus === 'full_match',
        match_status: matchStatus,
        total_variances: variances.length,
        variances,
        summary: {
          po_total: poTotal,
          gr_total: grTotal,
          invoice_total: invoiceTotal,
          total_variance: totalVariance,
          variance_percent: variancePercent
        },
        warnings,
        warnings_ar,
        requires_approval: requiresApproval,
        matched_lines: matchedLines
      };
      
    } catch (error) {
      logger.error('Three-way matching failed:', error);
      return {
        is_matched: false,
        match_status: 'error',
        total_variances: 0,
        variances: [],
        summary: { po_total: 0, gr_total: 0, invoice_total: 0, total_variance: 0, variance_percent: 0 },
        warnings: ['Matching validation failed'],
        warnings_ar: ['فشل التحقق من المطابقة'],
        requires_approval: true,
        matched_lines: []
      };
    }
  }
  
  /**
   * Get matching summary for a PO
   */
  static async getPOMatchingSummary(
    poId: number,
    companyId: number
  ): Promise<{
    ordered_qty: number;
    received_qty: number;
    invoiced_qty: number;
    ordered_amount: number;
    received_amount: number;
    invoiced_amount: number;
    receipt_percent: number;
    invoice_percent: number;
    fully_matched: boolean;
  }> {
    
    try {
      // Get PO lines summary
      const poResult = await pool.query(
        `SELECT 
          COALESCE(SUM(quantity), 0) as ordered_qty,
          COALESCE(SUM(quantity * unit_price), 0) as ordered_amount
         FROM purchase_order_lines
         WHERE purchase_order_id = $1 AND deleted_at IS NULL`,
        [poId]
      );
      
      const orderedQty = parseFloat(poResult.rows[0].ordered_qty) || 0;
      const orderedAmount = parseFloat(poResult.rows[0].ordered_amount) || 0;
      
      // Get GR lines summary
      const grResult = await pool.query(
        `SELECT 
          COALESCE(SUM(grl.quantity_received), 0) as received_qty,
          COALESCE(SUM(grl.quantity_received * COALESCE(grl.unit_price, pol.unit_price)), 0) as received_amount
         FROM goods_receipt_lines grl
         JOIN goods_receipts gr ON gr.id = grl.goods_receipt_id
         LEFT JOIN purchase_order_lines pol ON pol.id = grl.purchase_order_line_id
         WHERE gr.purchase_order_id = $1 AND gr.deleted_at IS NULL AND grl.deleted_at IS NULL`,
        [poId]
      );
      
      const receivedQty = parseFloat(grResult.rows[0].received_qty) || 0;
      const receivedAmount = parseFloat(grResult.rows[0].received_amount) || 0;
      
      // Get Invoice lines summary
      const invResult = await pool.query(
        `SELECT 
          COALESCE(SUM(pil.quantity), 0) as invoiced_qty,
          COALESCE(SUM(pil.quantity * pil.unit_price), 0) as invoiced_amount
         FROM purchase_invoice_lines pil
         JOIN purchase_invoices pi ON pi.id = pil.purchase_invoice_id
         WHERE pi.purchase_order_id = $1 AND pi.deleted_at IS NULL AND pil.deleted_at IS NULL`,
        [poId]
      );
      
      const invoicedQty = parseFloat(invResult.rows[0].invoiced_qty) || 0;
      const invoicedAmount = parseFloat(invResult.rows[0].invoiced_amount) || 0;
      
      const receiptPercent = orderedQty > 0 ? (receivedQty / orderedQty) * 100 : 0;
      const invoicePercent = orderedQty > 0 ? (invoicedQty / orderedQty) * 100 : 0;
      const fullyMatched = receiptPercent >= 100 && invoicePercent >= 100;
      
      return {
        ordered_qty: orderedQty,
        received_qty: receivedQty,
        invoiced_qty: invoicedQty,
        ordered_amount: orderedAmount,
        received_amount: receivedAmount,
        invoiced_amount: invoicedAmount,
        receipt_percent: receiptPercent,
        invoice_percent: invoicePercent,
        fully_matched: fullyMatched
      };
      
    } catch (error) {
      logger.error('PO matching summary failed:', error);
      return {
        ordered_qty: 0,
        received_qty: 0,
        invoiced_qty: 0,
        ordered_amount: 0,
        received_amount: 0,
        invoiced_amount: 0,
        receipt_percent: 0,
        invoice_percent: 0,
        fully_matched: false
      };
    }
  }
}

export default ThreeWayMatchingService;
