/**
 * Freeze Guard Middleware
 * Prevents mutations on entities belonging to frozen fiscal periods.
 * Used on expenses, inventory, journals, etc.
 */
import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { logger } from '../utils/logger';

/**
 * Returns middleware that checks if the target entity's fiscal period is frozen.
 * If frozen, rejects the mutation with 403.
 * 
 * @param entityType - The type of entity being modified (e.g., 'expenses', 'journals')
 */
export function freezeGuard(entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only check on mutations
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    try {
      const companyId = (req as any).companyId || (req as any).user?.company_id;
      if (!companyId) return next(); // No company context, skip check

      // Determine the date to check
      let checkDate: string | null = null;

      // For updates/deletes, check the entity's date
      if (req.params.id) {
        const tableMap: Record<string, { table: string; dateCol: string }> = {
          expenses: { table: 'expenses', dateCol: 'expense_date' },
          journals: { table: 'journal_entries', dateCol: 'entry_date' },
          invoices: { table: 'invoices', dateCol: 'invoice_date' },
          payments: { table: 'payments', dateCol: 'payment_date' },
          inventory: { table: 'inventory_transactions', dateCol: 'transaction_date' },
        };

        const mapping = tableMap[entityType];
        if (mapping) {
          try {
            const entityResult = await pool.query(
              `SELECT ${mapping.dateCol} FROM ${mapping.table} WHERE id = $1 AND company_id = $2`,
              [req.params.id, companyId]
            );
            if (entityResult.rows.length > 0) {
              checkDate = entityResult.rows[0][mapping.dateCol];
            }
          } catch (e) {
            // Table might not exist, skip freeze check
            return next();
          }
        }
      }

      // For creates, check the provided date from body
      if (!checkDate && req.body) {
        checkDate = req.body.expense_date || req.body.entry_date || req.body.invoice_date || req.body.transaction_date || req.body.date;
      }

      if (!checkDate) return next(); // No date to check

      // Check if there's a frozen fiscal period covering this date
      try {
        const freezeResult = await pool.query(
          `SELECT id, period_name FROM fiscal_periods
           WHERE company_id = $1
             AND is_frozen = true
             AND start_date <= $2::date
             AND end_date >= $2::date
             AND deleted_at IS NULL
           LIMIT 1`,
          [companyId, checkDate]
        );

        if (freezeResult.rows.length > 0) {
          const period = freezeResult.rows[0];
          logger.warn(`Freeze guard blocked ${req.method} on ${entityType} - period ${period.period_name} is frozen`);
          return res.status(403).json({
            success: false,
            error: 'This fiscal period is frozen. No modifications are allowed.',
            frozen_period: period.period_name,
          });
        }
      } catch (e: any) {
        // fiscal_periods table might not exist
        if (e.code === '42P01') return next();
        throw e;
      }

      next();
    } catch (error) {
      logger.error('Freeze guard error:', error);
      // Don't block on freeze check errors - log and proceed
      next();
    }
  };
}
