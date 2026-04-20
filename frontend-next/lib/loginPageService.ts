/**
 * ============================================================================
 * Login Page Content Service — Frontend API Client
 * ============================================================================
 * Fetches dynamic login page content from backend.
 * Public endpoints don't require authentication.
 * Admin endpoints require platform admin JWT.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ============================================================================
// Types
// ============================================================================

export interface LoginPageContentItem {
  id: number;
  section: 'hero_slide' | 'announcement' | 'news' | 'feature' | 'promo_banner' | 'partner_logo' | 'testimonial' | 'faq';
  title: string | null;
  title_ar: string | null;
  subtitle: string | null;
  subtitle_ar: string | null;
  body: string | null;
  body_ar: string | null;
  image_url: string | null;
  icon: string | null;
  link_url: string | null;
  link_label: string | null;
  link_label_ar: string | null;
  badge_text: string | null;
  badge_text_ar: string | null;
  bg_color: string | null;
  text_color: string | null;
  sort_order: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoginPageSettings {
  show_announcements: boolean;
  show_news: boolean;
  show_features: boolean;
  show_promo_banner: boolean;
  show_partners: boolean;
  show_testimonials: boolean;
  show_faq: boolean;
  show_account_request: boolean;
  auto_slide_interval: number;
  primary_gradient: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  footer_text: string;
  footer_text_ar: string;
  [key: string]: any;
}

export interface LoginPageContent {
  hero_slide?: LoginPageContentItem[];
  announcement?: LoginPageContentItem[];
  news?: LoginPageContentItem[];
  feature?: LoginPageContentItem[];
  promo_banner?: LoginPageContentItem[];
  partner_logo?: LoginPageContentItem[];
  testimonial?: LoginPageContentItem[];
  faq?: LoginPageContentItem[];
}

// ============================================================================
// Default fallback content
// ============================================================================

const defaultSettings: LoginPageSettings = {
  show_announcements: true,
  show_news: true,
  show_features: true,
  show_promo_banner: true,
  show_partners: true,
  show_testimonials: true,
  show_faq: true,
  show_account_request: true,
  auto_slide_interval: 5000,
  primary_gradient: 'from-slate-900 via-blue-900 to-indigo-900',
  contact_email: 'ali@alhajco.com',
  contact_phone: '+966 533845104',
  contact_whatsapp: '+966533845104',
  footer_text: 'Smart Logistics Management System',
  footer_text_ar: 'نظام إدارة اللوجستيات الذكي',
};

// ============================================================================
// Public API
// ============================================================================

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export const loginPageService = {
  /** Fetch active content for the login page (public, no auth) */
  async getContent(): Promise<LoginPageContent> {
    try {
      const res = await fetch(`${API_BASE}/login-page/content`);
      const json = await res.json();
      return json.success ? json.data : {};
    } catch {
      return {};
    }
  },

  /** Fetch login page settings (public, no auth) */
  async getSettings(): Promise<LoginPageSettings> {
    try {
      const res = await fetch(`${API_BASE}/login-page/settings`);
      const json = await res.json();
      return json.success ? { ...defaultSettings, ...json.data } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  // ============================================================================
  // Admin API
  // ============================================================================

  /** Fetch all content blocks (admin) */
  async adminGetContent(): Promise<LoginPageContentItem[]> {
    const res = await fetch(`${API_BASE}/login-page/admin/content`, { headers: getAuthHeaders() });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to fetch content');
    return json.data;
  },

  /** Create content block (admin) */
  async adminCreateContent(data: Partial<LoginPageContentItem>): Promise<LoginPageContentItem> {
    const res = await fetch(`${API_BASE}/login-page/admin/content`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to create content');
    return json.data;
  },

  /** Update content block (admin) */
  async adminUpdateContent(id: number, data: Partial<LoginPageContentItem>): Promise<LoginPageContentItem> {
    const res = await fetch(`${API_BASE}/login-page/admin/content/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to update content');
    return json.data;
  },

  /** Delete content block (admin) */
  async adminDeleteContent(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/login-page/admin/content/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to delete content');
  },

  /** Toggle content block active status (admin) */
  async adminToggleContent(id: number): Promise<{ id: number; is_active: boolean }> {
    const res = await fetch(`${API_BASE}/login-page/admin/content/${id}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to toggle content');
    return json.data;
  },

  /** Bulk reorder content (admin) */
  async adminReorderContent(items: { id: number; sort_order: number }[]): Promise<void> {
    const res = await fetch(`${API_BASE}/login-page/admin/content/reorder`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to reorder content');
  },

  /** Fetch all settings (admin) */
  async adminGetSettings(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/login-page/admin/settings`, { headers: getAuthHeaders() });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to fetch settings');
    return json.data;
  },

  /** Update a setting (admin) */
  async adminUpdateSetting(key: string, value: string): Promise<any> {
    const res = await fetch(`${API_BASE}/login-page/admin/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ value }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to update setting');
    return json.data;
  },
};

export default loginPageService;
