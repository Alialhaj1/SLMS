# 🚚 Smart Logistics Management System (SLMS)
**Enterprise-Grade Logistics ERP with Multi-Tenant RBAC**

[![Security](https://img.shields.io/badge/Security-85%2F100-brightgreen)]()
[![Production Ready](https://img.shields.io/badge/Production-Testing%20Phase-yellow)]()
[![Phase](https://img.shields.io/badge/Phase-4A%20Complete-blue)]()

---

## 🎯 Overview

SLMS is a modern logistics management platform featuring:
- ✅ **Role-Based Access Control (RBAC)** with fine-grained permissions
- ✅ **Multi-Tenant Architecture** (company isolation)
- ✅ **Comprehensive Audit Logging** (compliance-ready)
- ✅ **Enterprise Security** (rate limiting, CORS, CSP headers)
- ✅ **Modern Tech Stack** (TypeScript, Next.js, PostgreSQL)

**Current Status**: Phase 4A Complete - Ready for Production Testing  
**Next Phase**: Phase 4B - Advanced User & Role Management

---

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Authentication**: JWT + Refresh Tokens (15 min / 30 days)
- **Validation**: Zod schemas
- **Security**: Helmet.js, express-rate-limit, bcrypt

### Frontend
- **Framework**: Next.js 13 (Pages Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Icons**: Heroicons
- **State**: React Context API
- **Forms**: Manual validation (Zod-compatible)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Cache**: Redis 7
- **Queue**: RabbitMQ 3
- **Development**: Hot-reload (ts-node-dev, Next.js Fast Refresh)

---

## 🚀 Quick Start

### Prerequisites
```bash
# Required
- Docker Desktop
- Node.js 18+ (for local development)
- PowerShell 5.1+ (Windows) or Bash (Linux/Mac)

# Optional
- PostgreSQL client (psql, pgAdmin, DBeaver)
- API testing tool (Postman, Thunder Client)
```

### Installation

```powershell
# 1. Clone repository
git clone https://github.com/yourusername/slms.git
cd slms

# 2. Setup environment variables
# Backend
cd backend
Copy-Item .env.example .env
# Edit .env: Set JWT_SECRET, ALLOWED_ORIGINS
# Generate JWT_SECRET: openssl rand -hex 64

# Frontend
cd ../frontend-next
Copy-Item .env.example .env
# Edit .env: Set NEXT_PUBLIC_API_URL

# 3. Install dependencies
cd ../backend
npm install

cd ../frontend-next
npm install

# 4. Start services
cd ..
docker-compose up --build

# Services will be available at:
# - Frontend: http://localhost:3001
# - Backend API: http://localhost:4000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - RabbitMQ Management: http://localhost:15672
```

### First-Time Setup

```powershell
# Run database migrations
cd backend
npm run migrate

# Create super admin user
npm run create-super-admin
# Default credentials: admin@slms.com / Admin123!
```

---

## 🔐 Security Posture

### Current Implementation (Phase 4A)

| Feature | Status | Details |
|---------|--------|---------|
| **Authentication** | ✅ | JWT + Refresh Token rotation |
| **Authorization** | ✅ | RBAC with resource:action permissions |
| **Rate Limiting** | ✅ | 5 login attempts / 15 min, 100 API req/min |
| **Security Headers** | ✅ | Helmet.js (CSP, HSTS, X-Frame-Options) |
| **CORS Protection** | ✅ | Origin whitelist only |
| **Audit Logging** | ✅ | All CRUD operations + login attempts |
| **Input Validation** | ✅ | Zod schemas on all endpoints |
| **Password Hashing** | ✅ | bcrypt (10 salt rounds) |
| **SQL Injection** | ✅ | Parameterized queries only |
| **XSS Protection** | 🟡 | CSP headers (localStorage tokens - see ADR) |

**Overall Security Score**: **85/100** (Production-ready for testing)

### Token Strategy (Architectural Decision)

**Current**: localStorage + JWT Refresh Tokens  
**Future**: httpOnly Cookies (Phase 5 - Production)

📄 **See**: [`docs/security/TOKEN_STRATEGY.md`](docs/security/TOKEN_STRATEGY.md) for detailed analysis

**Key Points**:
- ✅ Acceptable for MVP/Development
- ✅ Short-lived access tokens (15 min)
- ✅ Refresh token rotation
- ⚠️ XSS vulnerability (mitigated by CSP)
- 🎯 Migrate to httpOnly cookies before production launch

---

## 📁 Project Structure

```
slms/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── routes/             # API endpoints
│   │   ├── middleware/         # Auth, RBAC, audit logging
│   │   ├── db/                 # Database connection
│   │   └── app.ts              # Express setup
│   ├── migrations/             # SQL database migrations
│   └── scripts/                # Utility scripts
│
├── frontend-next/              # Next.js frontend
│   ├── pages/                  # Next.js pages
│   │   ├── admin/              # Admin pages (Phase 4A)
│   │   │   ├── companies.tsx
│   │   │   ├── branches.tsx
│   │   │   ├── settings.tsx
│   │   │   └── audit-logs.tsx
│   │   └── dashboard.tsx
│   ├── components/             # React components
│   │   ├── layout/             # Header, Sidebar, Footer
│   │   ├── ui/                 # Reusable UI components
│   │   └── auth/               # Auth-related components
│   ├── contexts/               # React contexts
│   ├── hooks/                  # Custom hooks
│   └── lib/                    # Utilities (API client)
│
├── docs/                       # 📚 Documentation
│   ├── security/               # Security docs & ADRs
│   ├── architecture/           # System architecture
│   ├── testing/                # Test plans & reports
│   └── deployment/             # Deployment guides
│
└── docker-compose.yml          # Docker services
```

---

## 📚 Documentation

### Security
- [🔐 Token Strategy (ADR)](docs/security/TOKEN_STRATEGY.md) - Authentication approach
- [🛡️ Enterprise Security Review](docs/security/ENTERPRISE_SECURITY_REVIEW.md) - 60-page audit report

### Architecture
- [🏗️ Admin Pages Implementation](docs/architecture/ADMIN_PAGES_IMPLEMENTATION.md) - Phase 4A features
- [📊 Dashboard Implementation](docs/architecture/DASHBOARD_IMPLEMENTATION.md) - Dashboard design
- [📡 API Documentation](docs/architecture/API_DOCUMENTATION.md) - API reference

### Testing
- [✅ Phase 4A Testing Checklist](docs/testing/PHASE_4A_TESTING_CHECKLIST.md) - Manual test procedures
- [📋 Phase 4A Implementation Report](docs/testing/PHASE_4A_IMPLEMENTATION_REPORT.md) - Results summary

### Developer Guides
- [🤖 Copilot Instructions](.github/copilot-instructions.md) - AI coding guidelines

---

## 🎯 Current Phase: 4A Complete

### ✅ Completed Features

#### Backend Security Hardening
- [x] Rate limiting (auth, API, settings)
- [x] Security headers (Helmet.js)
- [x] CORS whitelist configuration
- [x] Request body size limits (1MB)
- [x] Failed login attempt logging
- [x] Global error handler (production-safe)

#### Frontend Improvements
- [x] Centralized API client (`lib/apiClient.ts`)
- [x] Auto token refresh on 401
- [x] Global 403 handling
- [x] Error Boundary (full-page + compact)
- [x] Environment variable configuration

#### Admin Pages (Phase 4A)
- [x] Companies Management (CRUD)
- [x] Branches Management (CRUD)
- [x] System Settings (Edit)
- [x] Audit Logs (Read-only)

### 📊 Metrics
- **Security**: 35/100 → 85/100 (+143%)
- **Code Quality**: TypeScript strict mode, Zod validation
- **Documentation**: 4,000+ lines of professional docs
- **Test Coverage**: Manual test suite (25+ scenarios)

---

## 🚀 Next Phase: 4B - Advanced User Management

### Planned Features
1. **Role Presets** (Admin, Manager, Viewer templates)
2. **Clone Role** (duplicate + modify)
3. **Read-Only Roles** (view-only permissions)
4. **Audit Role Changes** (track permission modifications)
5. **User Disable/Lock** (soft disable without deletion)
6. **Login Tracking UI** (last login, failed attempts)

**Status**: Planning phase  
**Estimated Duration**: 2 weeks  
**Documentation**: Coming soon

---

## 🧪 Testing

### Manual Testing
```powershell
# Run backend tests (when implemented)
cd backend
npm test

# Run frontend tests (when implemented)
cd ../frontend-next
npm test
```

### Manual Test Procedures
See [`docs/testing/PHASE_4A_TESTING_CHECKLIST.md`](docs/testing/PHASE_4A_TESTING_CHECKLIST.md) for:
- RBAC permission tests (4 scenarios)
- Audit log verification (6 tests)
- Settings validation (5 edge cases)
- Multi-tenant isolation (3 tests)

---

## 🔧 Development

### Running Locally (Without Docker)

```powershell
# Terminal 1: Backend
cd backend
npm run dev
# Runs on http://localhost:4000

# Terminal 2: Frontend
cd frontend-next
npm run dev
# Runs on http://localhost:3001

# Terminal 3: Database (requires Docker for PostgreSQL)
docker-compose up postgres redis rabbitmq
```

### Database Migrations

```powershell
cd backend

# Run migrations
npm run migrate

# Create new migration
# Create file: migrations/XXX_description.sql
# Increment number, add SQL
```

### Code Quality

```powershell
# TypeScript type checking
npm run build

# Linting (if configured)
npm run lint
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Port already in use**
```powershell
# Check what's using the port
netstat -ano | findstr :4000
# Kill the process or change PORT in .env
```

**2. Database connection failed**
```powershell
# Check PostgreSQL is running
docker ps | findstr postgres
# Check DATABASE_URL in backend/.env
```

**3. Frontend can't reach API**
```powershell
# Check NEXT_PUBLIC_API_URL in frontend-next/.env
# Verify CORS ALLOWED_ORIGINS in backend/.env
```

**4. Rate limit blocking requests**
```powershell
# Wait 15 minutes or restart backend
docker-compose restart backend
```

---

## 📈 Roadmap

### Phase 4B (Current)
- [ ] Advanced user & role management
- [ ] Login tracking dashboard
- [ ] Account lockout mechanism

### Phase 5 (Next)
- [ ] httpOnly cookie migration
- [ ] CSRF token implementation
- [ ] Password strength enforcement
- [ ] Dashboard KPIs & analytics
- [ ] Export functionality

### Phase 6 (Future)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated test suite (Jest, React Testing Library)
- [ ] MFA (Two-Factor Authentication)
- [ ] Horizontal scaling (multi-instance)
- [ ] Monitoring & alerting (Prometheus, Grafana)

---

## 🤝 Contributing

### Development Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes with proper TypeScript types
3. Test manually (follow testing checklist)
4. Update documentation if needed
5. Create pull request

### Code Standards
- **TypeScript**: Strict mode enabled
- **Naming**: camelCase (variables), PascalCase (components)
- **Validation**: Zod schemas for all inputs
- **Security**: Follow [Security Review](docs/security/ENTERPRISE_SECURITY_REVIEW.md) guidelines

---

## 📄 License

[MIT License](LICENSE) - See LICENSE file for details

---

## 🙏 Acknowledgments

- Built with modern best practices
- Inspired by enterprise ERP systems
- Security guidance from OWASP

---

## 📞 Support

**Questions?** Open an issue on GitHub  
**Security Concerns?** Email: security@slms.com  
**Documentation**: See [`docs/`](docs/) folder

---

**Version**: 1.0.0  
**Last Updated**: December 17, 2025  
**Status**: Phase 4A Complete - Production Testing Ready  
**Next Milestone**: Phase 4B - Advanced User Management
