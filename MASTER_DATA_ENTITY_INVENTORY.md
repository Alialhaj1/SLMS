# MASTER DATA ENTITY INVENTORY (Complete A-Z)
## Detailed Specifications & Implementation Checklist

**Document Version**: 1.0
**Created**: December 27, 2025
**Total Entities**: 118
**Status**: Ready for Implementation

---

## PHASE 1: SYSTEM & SETTINGS (11 Entities)

### ✅ 1.1 Companies
| Aspect | Specification |
|--------|---------------|
| **Purpose** | Multi-tenant company master data |
| **API Endpoint** | `/api/master/companies` |
| **Permissions** | companies:view, companies:create, companies:edit, companies:delete, companies:export |
| **Key Fields** | name, code, parent_company_id, industry, registration_no, tax_id, website, email, phone, address, city, country, logo |
| **Unique Constraints** | code, tax_id, registration_no |
| **Validations** | Code (length 3-20, alphanumeric), Tax ID format per country, Email format, Phone format |
| **Status** | In DB (companies table exists) |
| **i18n Keys** | master.companies.title, .fields.name, .fields.code, .fields.industry, .buttons.create |
| **Features** | Logo upload, multi-address support, linked to branches |
| **Frontend Page** | pages/master/companies.tsx (CREATE if missing) |
| **Notes** | Core multi-tenancy foundation |

### ✅ 1.2 Branches
| Aspect | Specification |
|--------|---------------|
| **Purpose** | Branch/location master data |
| **API Endpoint** | `/api/master/branches` |
| **Permissions** | branches:view, branches:create, branches:edit, branches:delete |
| **Key Fields** | name, code, company_id, branch_type, address, city, country, phone, manager_id, status |
| **Foreign Keys** | company_id (companies), manager_id (users), city_id (cities) |
| **Unique Constraints** | code (per company), name (per company) |
| **Validations** | Branch type restricted to predefined list |
| **Status** | In DB (branches table exists) |
| **i18n Keys** | master.branches.title, .fields.name, .fields.code, .fields.branch_type |
| **Features** | Geolocation mapping, department association |
| **Frontend Page** | pages/master/branches.tsx (CREATE if missing) |
| **Notes** | Linked to companies (1:N) |

### ✅ 1.3 Users
| Aspect | Specification |
|--------|---------------|
| **Purpose** | System user/employee master data |
| **API Endpoint** | `/api/master/users` |
| **Permissions** | users:view, users:create, users:edit, users:delete, users:toggle |
| **Key Fields** | email, first_name, last_name, username, password_hash, phone, profile_picture, department_id, branch_id, employee_id, status, last_login |
| **Unique Constraints** | email, username, employee_id |
| **Validations** | Email format, Password strength (min 8 chars, uppercase, lowercase, number), Username (alphanumeric+underscore) |
| **Status** | In DB (users table exists) |
| **i18n Keys** | master.users.title, .fields.email, .fields.first_name, .buttons.create |
| **Features** | 2FA support (future), password reset, activity logging |
| **Frontend Page** | pages/master/users.tsx (CREATE if missing) |
| **Notes** | Linked to roles via user_roles junction table |

### ✅ 1.4 Roles & Permissions
| Aspect | Specification |
|--------|---------------|
| **Purpose** | Role definitions and permission mappings |
| **API Endpoints** | `/api/master/roles`, `/api/master/permissions` |
| **Permissions** | roles:view, roles:create, roles:edit, roles:delete, roles:assign |
| **Key Fields (Roles)** | role_id, role_name, description, status |
| **Key Fields (Permissions)** | permission_id, permission_code, resource, action, description |
| **Key Fields (Role Perms)** | role_id, permission_id |
| **Unique Constraints** | role_name, permission_code |
| **Validations** | Permission format: {resource}:{action}, Role name unique |
| **Status** | In DB (roles, permissions, role_permissions tables) |
| **i18n Keys** | master.roles.title, .permissions.title, .fields.role_name, .fields.permission_code |
| **Features** | Permission assignment UI, role cloning, permission matrix view |
| **Frontend Pages** | pages/master/roles.tsx, pages/master/permissions.tsx (CREATE if missing) |
| **Notes** | Critical for RBAC system |

### 📅 1.5 System Setup
| Aspect | Specification |
|--------|---------------|
| **Purpose** | Global system configuration |
| **API Endpoint** | `/api/master/system-setup` |
| **Permissions** | system:view, system:edit (admin only) |
| **Key Fields** | company_id, fiscal_year_start, fiscal_year_end, base_currency, default_language, decimal_places, date_format, time_format, auto_journal_prefix, auto_receipt_prefix |
| **Unique Constraints** | company_id (one setup per company) |
| **Validations** | Fiscal year dates must be valid, Decimal places 0-6, Currency must exist in master |
| **Status** | Pending - Create migration |
| **i18n Keys** | master.system.setup.title, .fields.fiscal_year_start, .fields.base_currency |
| **Features** | Global settings panel, feature toggles |
| **Frontend Page** | pages/master/system-setup.tsx (CREATE) |
| **Notes** | Company-wise configuration |

### 📅 1.6 Numbering Series
| Aspect | Specification |
|--------|---------------|
| **Purpose** | Auto-numbering scheme definition |
| **API Endpoint** | `/api/master/numbering-series` |
| **Permissions** | numbering:view, numbering:create, numbering:edit, numbering:delete |
| **Key Fields** | series_id, series_name, series_code, prefix, current_number, next_number, suffix, increment_by, reset_frequency, reset_day |
| **Unique Constraints** | series_code (per company) |
| **Validations** | Prefix alphanumeric, Increment value > 0, Current number >= 0 |
| **Status** | Pending - Create migration |
| **i18n Keys** | master.numbering.series.title, .fields.series_name, .fields.prefix |
| **Features** | Number preview, manual reset, audit trail |
| **Frontend Page** | pages/master/numbering-series.tsx (CREATE) |
| **Notes** | Used for auto-generating transaction IDs |

### 📅 1.7 Languages
| Aspect | Specification |
|--------|---------------|
| **Purpose** | Supported languages master data |
| **API Endpoint** | `/api/master/languages` |
| **Permissions** | languages:view, languages:create, languages:edit (admin only) |
| **Key Fields** | language_id, language_code, language_name, native_name, direction (LTR/RTL), font_family, status |
| **Unique Constraints** | language_code (ISO 639-1) |
| **Validations** | Language code length = 2, Direction must be LTR or RTL |
| **Status** | Pending - Create migration |
| **i18n Keys** | master.languages.title, .fields.language_code, .fields.language_name |
| **Features** | Language switcher in UI, RTL/LTR support testing |
| **Frontend Page** | pages/master/languages.tsx (CREATE) |
| **Notes** | Currently: English, Arabic. Extensible design |

### ✅ 1.8 Default UI Theme
| Aspect | Specification |
|--------|---------------|
| **Purpose** | UI theme configuration |
| **API Endpoint** | `/api/master/ui-themes` |
| **Permissions** | themes:view, themes:create, themes:edit |
| **Key Fields** | theme_id, theme_name, primary_color, secondary_color, accent_color, text_color, background_color, border_radius, font_family, status |
| **Unique Constraints** | theme_name |
| **Validations** | Colors must be valid hex codes, Border radius 0-20px |
| **Status** | ✅ Already implemented (pages/master/ui-themes.tsx) |
| **i18n Keys** | master.uiThemes.title, .fields.theme_name, .fields.primary_color |
| **Features** | Color picker UI, live preview, theme preview |
| **Frontend Page** | pages/master/ui-themes.tsx (✅ EXISTS) |
| **Notes** | Currently stored as config, migrate to DB |

### 📅 1.9 Backup & Security Settings
| Aspect | Specification |
|--------|---------------|
| **Purpose** | System backup and security configuration |
| **API Endpoint** | `/api/master/backup-settings` |
| **Permissions** | backup:view, backup:create (admin only) |
| **Key Fields** | setting_id, backup_frequency, backup_retention_days, encryption_enabled, encryption_algorithm, max_failed_logins, session_timeout_minutes, ip_whitelist, data_retention_policy |
| **Unique Constraints** | N/A (singleton) |
| **Validations** | Backup retention >= 7 days, Session timeout >= 15 minutes |
| **Status** | Pending - Create migration |
| **i18n Keys** | master.backup.settings.title, .fields.backup_frequency, .fields.session_timeout_minutes |
| **Features** | Backup now button, schedule visualizer, encryption toggle |
| **Frontend Page** | pages/master/backup-settings.tsx (CREATE) |
| **Notes** | Admin-only access |

### 📅 1.10 System Policies
| Aspect | Specification |
|--------|---------------|
| **Purpose** | Global business policies and rules |
| **API Endpoint** | `/api/master/system-policies` |
| **Permissions** | policies:view, policies:create, policies:edit (admin only) |
| **Key Fields** | policy_id, policy_name, policy_type (pricing/inventory/credit/approval), description, policy_rules (JSON), effective_date, expiry_date, status |
| **Unique Constraints** | policy_name (per company) |
| **Validations** | Effective date <= expiry date, Policy type from predefined list |
| **Status** | Pending - Create migration |
| **i18n Keys** | master.policies.title, .fields.policy_name, .fields.policy_type |
| **Features** | JSON policy editor, rule visualizer, audit trail |
| **Frontend Page** | pages/master/system-policies.tsx (CREATE) |
| **Notes** | JSON-based flexible rule engine |

### ✅ 1.11 Printed Templates
| Aspect | Specification |
|--------|---------------|
| **Purpose** | Print template definitions |
| **API Endpoint** | `/api/master/printed-templates` |
| **Permissions** | templates:view, templates:create, templates:edit, templates:delete |
| **Key Fields** | template_id, template_name, template_type (invoice/receipt/label), format (A4/A5), orientation (portrait/landscape), header_content, footer_content, body_template, page_break_rule |
| **Unique Constraints** | template_name (per company) |
| **Validations** | Template type from predefined list, Format from predefined list |
| **Status** | ✅ Already implemented (pages/master/printed-templates.tsx) |
| **i18n Keys** | master.printedTemplates.title, .fields.template_name, .fields.template_type |
| **Features** | Template designer UI, preview functionality, HTML editor |
| **Frontend Page** | pages/master/printed-templates.tsx (✅ EXISTS) |
| **Notes** | HTML-based templates |

---

## PHASE 2: REFERENCE DATA (12 Entities)

### ✅ 2.1 Countries
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/countries.tsx (✅ EXISTS) |

### ✅ 2.2 Cities
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/cities.tsx (✅ EXISTS) |

### ✅ 2.3 Regions / Zones
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/regions.tsx (✅ EXISTS) |

### ✅ 2.4 Ports & Airports
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/ports.tsx (✅ EXISTS) |

### ✅ 2.5 Border Points
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/border-points.tsx (✅ EXISTS) |

### ✅ 2.6 Customs Offices
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/customs-offices.tsx (✅ EXISTS) |

### ✅ 2.7 Currencies
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/currencies.tsx (✅ EXISTS) |

### 📅 2.8 Exchange Rates
| Aspect | Specification |
|--------|---------------|
| **Purpose** | Daily/periodic exchange rate maintenance |
| **API Endpoint** | `/api/master/exchange-rates` |
| **Permissions** | exchange_rates:view, exchange_rates:create, exchange_rates:edit |
| **Key Fields** | rate_id, from_currency_id, to_currency_id, rate, effective_date, expiry_date, created_by, source |
| **Foreign Keys** | from_currency_id, to_currency_id (currencies) |
| **Unique Constraints** | (from_currency_id, to_currency_id, effective_date) |
| **Validations** | Rate > 0, from_currency != to_currency, effective_date <= expiry_date |
| **Status** | Pending - Create migration |
| **i18n Keys** | master.exchangeRates.title, .fields.from_currency, .fields.to_currency, .fields.rate |
| **Features** | Import rates from external API, historical rate viewing, rate effective dating |
| **Frontend Page** | pages/master/exchange-rates.tsx (CREATE) |
| **Notes** | Critical for multi-currency support |

### ✅ 2.9 Time Zones
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/time-zones.tsx (✅ EXISTS) |

### ✅ 2.10 Address Types
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/address-types.tsx (✅ EXISTS) |

### ✅ 2.11 Contact Methods
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/contact-methods.tsx (✅ EXISTS) |

### ✅ 2.12 Digital Signatures
| Aspect | Specification |
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/digital-signatures.tsx (✅ EXISTS) |

---

## PHASE 3: ITEMS & INVENTORY (14 Entities)

### 📅 3.1 Items / Products
### 📅 3.2 Item Types
### 📅 3.3 Item Groups
### 📅 3.4 Categories / Grades
### 📅 3.5 Units of Measure
### 📅 3.6 Warehouses
### 📅 3.7 Warehouse Types
### 📅 3.8 Bin / Shelf / Zone
### 📅 3.9 Batch Numbers
### 📅 3.10 Serial Numbers
### 📅 3.11 Min / Max Stock
### 📅 3.12 Inventory Policies
### 📅 3.13 Valuation Methods
### 📅 3.14 Reorder Rules

*[Detailed specifications for Phase 3 entities to follow in implementation]*

---

## PHASE 4: CUSTOMERS & SUPPLIERS (14 Entities)

### 📅 4.1 Customers
### 📅 4.2 Customer Categories
### 📅 4.3 Customer Types
### 📅 4.4 Customer Status
### 📅 4.5 Suppliers
### 📅 4.6 Supplier Categories
### 📅 4.7 Supplier Types
### 📅 4.8 Supplier Status
### ✅ 4.9 Customer Groups
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/customer-groups.tsx (✅ EXISTS) |

### ✅ 4.10 Payment Terms
| **Status** | ✅ Already implemented |
| **Frontend Page** | pages/master/payment-terms.tsx (✅ EXISTS) |

### 📅 4.11 Payment Methods
### 📅 4.12 Delivery Terms
### 📅 4.13 Discount Agreements
### 📅 4.14 Credit Limits

---

## PHASE 5-10: REMAINING PHASES

*[Detailed specifications for phases 5-10 to follow in detailed implementation documents]*

---

## 🎯 IMPLEMENTATION PRIORITY MATRIX

### CRITICAL (Must do first - Days 1-4)
1. Companies
2. Branches
3. Users
4. Roles & Permissions
5. System Setup
6. Numbering Series
7. Chart of Accounts
8. Fiscal Periods

### HIGH (Required for transactions - Days 5-12)
9. Items / Products
10. Customers
11. Suppliers
12. Warehouses
13. Exchange Rates
14. Payment Methods
15. Tax Types & Rates

### MEDIUM (Extended features - Days 13-18)
16. Employees
17. Departments
18. Approval Workflows
19. Document Types
20. Shipping Lines

### LOW (Future enhancements - After MVP)
21. Risk Types
22. Insurance Policies
23. KPIs
24. Report Templates

---

## 📋 COMPLETION CHECKLIST TEMPLATE

For each entity, verify:

- [ ] **Database**: Migration created and applied
- [ ] **API Endpoint**: CRUD endpoints created and tested
- [ ] **RBAC**: Permission codes created in DB
- [ ] **Frontend**: Page component created
- [ ] **Validations**: All business rules implemented
- [ ] **i18n**: English translation complete
- [ ] **i18n**: Arabic translation complete
- [ ] **UI/UX**: Table, create form, edit modal, delete confirmation
- [ ] **Features**: Search, filters, pagination, export working
- [ ] **Testing**: Manual testing passed
- [ ] **Documentation**: Purpose and fields documented
- [ ] **Security**: All endpoints authenticated and authorized
- [ ] **Error Handling**: All error messages translated and user-friendly

---

**Total Implementation Effort**: ~40-50 days (full team)
**MVP Timeline**: ~20 days (Phase 1-5, high priority)
**Production Ready**: ~60 days (all phases, complete)

