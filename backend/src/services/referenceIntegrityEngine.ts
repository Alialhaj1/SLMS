/**
 * Reference Integrity Engine
 * Prevents deletion of records that are referenced by other entities.
 * Provides dynamic FK checking middleware.
 */
import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { logger } from '../utils/logger';

/**
 * Map of entity → tables/columns that reference it.
 * Used to check if an entity can be safely deleted.
 */
const REFERENCE_MAP: Record<string, Array<{ table: string; column: string; label: string }>> = {
  cities: [
    { table: 'companies', column: 'city_id', label: 'companies' },
    { table: 'branches', column: 'city_id', label: 'branches' },
    { table: 'warehouses', column: 'city_id', label: 'warehouses' },
    { table: 'customers', column: 'city_id', label: 'customers' },
    { table: 'vendors', column: 'city_id', label: 'vendors' },
  ],
  countries: [
    { table: 'cities', column: 'country_id', label: 'cities' },
    { table: 'companies', column: 'country_id', label: 'companies' },
    { table: 'ports_airports', column: 'country_id', label: 'ports/airports' },
  ],
  currencies: [
    { table: 'companies', column: 'default_currency_id', label: 'companies' },
    { table: 'invoices', column: 'currency_id', label: 'invoices' },
    { table: 'expenses', column: 'currency_id', label: 'expenses' },
    { table: 'journal_entries', column: 'currency_id', label: 'journal entries' },
  ],
  companies: [
    { table: 'branches', column: 'company_id', label: 'branches' },
    { table: 'users', column: 'company_id', label: 'users' },
    { table: 'shipments', column: 'company_id', label: 'shipments' },
    { table: 'expenses', column: 'company_id', label: 'expenses' },
  ],
  customers: [
    { table: 'shipments', column: 'customer_id', label: 'shipments' },
    { table: 'invoices', column: 'customer_id', label: 'invoices' },
    { table: 'sales_orders', column: 'customer_id', label: 'sales orders' },
  ],
  vendors: [
    { table: 'purchase_orders', column: 'vendor_id', label: 'purchase orders' },
    { table: 'purchase_invoices', column: 'vendor_id', label: 'purchase invoices' },
  ],
  units: [
    { table: 'items', column: 'unit_id', label: 'items' },
    { table: 'purchase_order_items', column: 'unit_id', label: 'purchase order items' },
  ],
  warehouses: [
    { table: 'inventory', column: 'warehouse_id', label: 'inventory records' },
    { table: 'warehouse_locations', column: 'warehouse_id', label: 'warehouse locations' },
  ],
  items: [
    { table: 'inventory', column: 'item_id', label: 'inventory records' },
    { table: 'purchase_order_items', column: 'item_id', label: 'purchase order items' },
    { table: 'shipment_items', column: 'item_id', label: 'shipment items' },
  ],
};

/**
 * Express middleware that checks for referencing records before allowing DELETE.
 * Prevents orphaned foreign key rows by returning 409 Conflict.
 * 
 * @param entity - The entity type being deleted (e.g., 'cities', 'companies')
 */
export function dynamicDeletionProtection(entity: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only block DELETE operations
    if (req.method !== 'DELETE') {
      return next();
    }

    const entityId = req.params.id;
    if (!entityId) return next();

    const references = REFERENCE_MAP[entity];
    if (!references || references.length === 0) {
      return next(); // No known references, allow deletion
    }

    try {
      const conflicts: string[] = [];

      for (const ref of references) {
        try {
          const result = await pool.query(
            `SELECT COUNT(*) as count FROM ${ref.table} WHERE ${ref.column} = $1 AND deleted_at IS NULL`,
            [entityId]
          );

          const count = parseInt(result.rows[0]?.count || '0');
          if (count > 0) {
            conflicts.push(`${count} ${ref.label}`);
          }
        } catch (e: any) {
          // Table might not exist or column missing - skip
          if (e.code === '42P01' || e.code === '42703') continue;
          logger.warn(`Reference check failed for ${ref.table}.${ref.column}:`, e.message);
        }
      }

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          error: `Cannot delete this ${entity.replace(/_/g, ' ')} because it is referenced by: ${conflicts.join(', ')}`,
          conflicts,
        });
      }

      next();
    } catch (error) {
      logger.error(`Dynamic deletion protection error for ${entity}:`, error);
      // Don't block on error - allow deletion to proceed
      next();
    }
  };
}
