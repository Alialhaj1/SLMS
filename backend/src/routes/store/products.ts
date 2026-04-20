/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  STORE PRODUCTS ROUTES — Public API                                      ║
 * ║  /api/store/:storeSlug/products                                         ║
 * ║  No authentication required for browsing                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import { resolveStoreContext, storeCustomerAuth } from '../../middleware/storeAuth';
import storeProductService from '../../services/storeProductService';
import pool from '../../db';

const router = Router({ mergeParams: true });

// All routes need store context
router.use(resolveStoreContext);
router.use(storeCustomerAuth); // optional — enriches with customer if logged in

// ═══════════════════════════════════════════════════════════════════════════
// GET /products — List products (public)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;

    const filters = {
      search: req.query.search as string,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
      groupId: req.query.groupId ? parseInt(req.query.groupId as string) : undefined,
      brandId: req.query.brandId ? parseInt(req.query.brandId as string) : undefined,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      inStock: req.query.inStock === 'true',
      sortBy: req.query.sortBy as any,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };

    const result = await storeProductService.listStoreProducts(store.companyId, store.id, filters);
    res.json(result);
  } catch (error: any) {
    console.error('Error listing store products:', error);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /products/categories — List categories (public)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;
    const categories = await storeProductService.getStoreCategories(store.companyId, store.id);
    res.json({ data: categories });
  } catch (error: any) {
    console.error('Error listing categories:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /products/sitemap.xml — Product sitemap for SEO
// ⚠️  Must be defined BEFORE /:slug catch-all to avoid route shadowing
// ═══════════════════════════════════════════════════════════════════════════
router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;
    const storeSlug = req.params.storeSlug;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const products = await pool.query(`
      SELECT ps.slug, i.code, i.updated_at
      FROM items i
      LEFT JOIN product_seo ps ON ps.item_id = i.id AND ps.company_id = i.company_id
      WHERE i.company_id = $1 AND i.is_sellable = true AND i.is_active = true AND i.deleted_at IS NULL
      ORDER BY i.updated_at DESC
      LIMIT 50000
    `, [store.companyId]);

    const categories = await pool.query(`
      SELECT c.id, c.name, c.updated_at
      FROM item_categories c
      WHERE c.company_id = $1 AND c.is_active = true AND c.deleted_at IS NULL
    `, [store.companyId]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Store home
    xml += `  <url><loc>${baseUrl}/store/${storeSlug}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;

    // Categories
    for (const cat of categories.rows) {
      xml += `  <url><loc>${baseUrl}/store/${storeSlug}/products?categoryId=${cat.id}</loc>`;
      xml += `<lastmod>${new Date(cat.updated_at).toISOString().split('T')[0]}</lastmod>`;
      xml += `<changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    }

    // Products
    for (const p of products.rows) {
      const slug = p.slug || p.code;
      xml += `  <url><loc>${baseUrl}/store/${storeSlug}/products/${slug}</loc>`;
      xml += `<lastmod>${new Date(p.updated_at).toISOString().split('T')[0]}</lastmod>`;
      xml += `<changefreq>daily</changefreq><priority>0.7</priority></url>\n`;
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error: any) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /products/:slug — Get single product (public)
// ⚠️  Must be AFTER all specific routes (/categories, /sitemap.xml) to avoid shadowing
// ═══════════════════════════════════════════════════════════════════════════
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { store } = req.storeContext!;
    const product = await storeProductService.getStoreProductBySlug(store.companyId, req.params.slug, store.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ data: product });
  } catch (error: any) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

export default router;
