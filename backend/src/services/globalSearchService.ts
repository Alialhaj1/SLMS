/**
 * §13.2.1 — Global Search Service
 *
 * Unified search across multiple entity tables.
 * Returns ranked results from shipments, vendors, customers, items, etc.
 * Permission-aware: only returns results the user has access to.
 */

import pool from '../db';
import { logger } from '../utils/logger';

interface SearchResult {
  resource_type: string;
  resource_id: number;
  title: string;
  subtitle: string | null;
  url: string;            // Frontend route
  relevance: number;
}

interface SearchConfig {
  table: string;
  type: string;
  titleColumn: string;
  subtitleColumn?: string;
  searchColumns: string[];
  urlPrefix: string;
  permission: string;
  tenantFilter: boolean;
}

// Searchable entity configurations
const SEARCH_CONFIGS: SearchConfig[] = [
  {
    table: 'shipments',
    type: 'shipment',
    titleColumn: "COALESCE(reference_number, 'SHP-' || id)",
    subtitleColumn: 'status',
    searchColumns: ['reference_number', 'consignee_name', 'shipper_name', 'notes'],
    urlPrefix: '/shipments',
    permission: 'shipments:view',
    tenantFilter: true,
  },
  {
    table: 'vendors',
    type: 'vendor',
    titleColumn: "COALESCE(name_en, name_ar, 'Vendor ' || id)",
    subtitleColumn: 'vendor_code',
    searchColumns: ['name_en', 'name_ar', 'vendor_code', 'email', 'phone'],
    urlPrefix: '/vendors',
    permission: 'vendors:view',
    tenantFilter: true,
  },
  {
    table: 'customers',
    type: 'customer',
    titleColumn: "COALESCE(name_en, name_ar, 'Customer ' || id)",
    subtitleColumn: 'customer_code',
    searchColumns: ['name_en', 'name_ar', 'customer_code', 'email', 'phone'],
    urlPrefix: '/customers',
    permission: 'customers:view',
    tenantFilter: true,
  },
  {
    table: 'items',
    type: 'item',
    titleColumn: "COALESCE(name_en, name_ar, code)",
    subtitleColumn: 'code',
    searchColumns: ['name_en', 'name_ar', 'code', 'barcode', 'description_en'],
    urlPrefix: '/items',
    permission: 'items:view',
    tenantFilter: true,
  },
  {
    table: 'purchase_orders',
    type: 'purchase_order',
    titleColumn: "COALESCE(order_number, 'PO-' || id)",
    subtitleColumn: 'status',
    searchColumns: ['order_number', 'notes'],
    urlPrefix: '/purchase-orders',
    permission: 'purchase_orders:view',
    tenantFilter: true,
  },
  {
    table: 'users',
    type: 'user',
    titleColumn: "COALESCE(full_name, email)",
    subtitleColumn: 'email',
    searchColumns: ['full_name', 'email', 'phone'],
    urlPrefix: '/users',
    permission: 'users:view',
    tenantFilter: true,
  },
];

export class GlobalSearchService {
  /**
   * Search across all configured entities.
   * @param query - The search term
   * @param userPermissions - Array of permission codes the user has
   * @param tenantId - Tenant ID for isolation (null = platform admin, searches all)
   * @param limit - Max results per entity (default 5, max 10)
   */
  static async search(
    query: string,
    userPermissions: string[],
    tenantId: number | null,
    limit: number = 5
  ): Promise<{ results: SearchResult[]; total: number; query: string }> {
    if (!query || query.trim().length < 2) {
      return { results: [], total: 0, query };
    }

    const safeLimit = Math.min(Math.max(1, limit), 10);
    const searchTerm = `%${query.trim().toLowerCase()}%`;
    const allResults: SearchResult[] = [];

    // Check super_admin bypass
    const isSuperAdmin = userPermissions.includes('*') || userPermissions.includes('super_admin');

    // Run searches in parallel for all allowed entities
    const searches = SEARCH_CONFIGS
      .filter(cfg => isSuperAdmin || userPermissions.includes(cfg.permission))
      .map(async (cfg) => {
        try {
          const searchConditions = cfg.searchColumns
            .map(col => `LOWER(CAST(${col} AS TEXT)) LIKE $1`)
            .join(' OR ');

          let whereClause = `(${searchConditions})`;
          const params: unknown[] = [searchTerm];
          let paramIdx = 2;

          // Soft delete filter
          whereClause += ` AND deleted_at IS NULL`;

          // Tenant isolation
          if (cfg.tenantFilter && tenantId) {
            whereClause += ` AND (tenant_id = $${paramIdx} OR company_id = $${paramIdx})`;
            params.push(tenantId);
            paramIdx++;
          }

          const sql = `
            SELECT id,
                   ${cfg.titleColumn} as title,
                   ${cfg.subtitleColumn ? cfg.subtitleColumn : 'NULL'} as subtitle
            FROM ${cfg.table}
            WHERE ${whereClause}
            ORDER BY
              CASE WHEN LOWER(CAST(${cfg.searchColumns[0]} AS TEXT)) = LOWER($1) THEN 0
                   WHEN LOWER(CAST(${cfg.searchColumns[0]} AS TEXT)) LIKE $1 THEN 1
                   ELSE 2 END,
              id DESC
            LIMIT $${paramIdx}`;
          params.push(safeLimit);

          const result = await pool.query(sql, params);

          return result.rows.map((row, idx) => ({
            resource_type: cfg.type,
            resource_id: row.id,
            title: row.title || `${cfg.type} #${row.id}`,
            subtitle: row.subtitle,
            url: `${cfg.urlPrefix}/${row.id}`,
            relevance: 100 - idx * 10 - (cfg.type === 'shipment' ? 0 : 20), // Shipments ranked higher
          }));
        } catch (err) {
          logger.error(`Global search error on ${cfg.table}`, { error: err });
          return [];
        }
      });

    const searchResults = await Promise.all(searches);
    for (const results of searchResults) {
      allResults.push(...results);
    }

    // Sort by relevance descending
    allResults.sort((a, b) => b.relevance - a.relevance);

    return {
      results: allResults,
      total: allResults.length,
      query: query.trim(),
    };
  }
}
