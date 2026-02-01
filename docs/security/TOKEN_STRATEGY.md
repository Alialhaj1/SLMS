# 🔐 Authentication Token Strategy
**Architectural Decision Record (ADR)**

**Date**: December 17, 2025  
**Status**: ✅ **ACTIVE** (Current Implementation)  
**Decision**: localStorage + JWT Refresh Tokens  
**Review Date**: Phase 5 (Production Deployment)

---

## 📊 Decision Summary

| Strategy | Status | Security | Complexity | Justification |
|----------|--------|----------|------------|---------------|
| **localStorage + Refresh** | ✅ Current | 🟡 Medium | 🟢 Low | Acceptable for MVP, good DX |
| **httpOnly Cookies** | 🎯 Phase 5 | 🟢 High | 🟡 Medium | **Recommended for Production** |
| **Hybrid** | ⏳ Future | 🟢 High | 🔴 High | Enterprise-scale only |

---

## 🎯 Current Implementation (Phase 4A)

### Strategy: localStorage + JWT with Refresh Tokens

#### How It Works
```typescript
// Login Flow
1. User submits credentials
2. Backend validates → generates:
   - accessToken (JWT, 15 min, stored in localStorage)
   - refreshToken (UUID, 30 days, hashed in DB)
3. Frontend stores both in localStorage
4. API requests include: Authorization: Bearer <accessToken>

// Auto-Refresh Flow
5. When accessToken expires (401):
   - Frontend sends refreshToken to /api/auth/refresh
   - Backend validates, issues new pair
   - Frontend retries original request
```

#### Security Features ✅
- **Short-lived access tokens** (15 min)
- **Long-lived refresh tokens** (30 days, revoked on logout)
- **Token rotation** (new refresh token on refresh)
- **SHA-256 hashing** (refresh tokens stored as hashes)
- **JTI tracking** (prevents token reuse)
- **Audit logging** (all token operations logged)

#### Vulnerabilities ⚠️
- **XSS (Cross-Site Scripting)**
  - Risk: Malicious script can access `localStorage.getItem('accessToken')`
  - Impact: Attacker steals tokens, impersonates user
  - Mitigation (Current):
    - Content Security Policy (CSP) via Helmet.js
    - Input sanitization (planned)
    - React's built-in XSS protection
  - **Status**: Acceptable for MVP, **needs upgrade for production**

- **No httpOnly Protection**
  - Risk: JavaScript can access tokens
  - Impact: Any XSS vulnerability = token theft
  - **Solution**: Migrate to httpOnly cookies (Phase 5)

---

## 🟢 Recommended Strategy (Phase 5 - Production)

### Strategy: httpOnly Cookies

#### Why This is Better
```typescript
// Backend sets httpOnly cookie (JavaScript CANNOT access)
res.cookie('accessToken', token, {
  httpOnly: true,       // ✅ XSS protection
  secure: true,         // ✅ HTTPS only
  sameSite: 'strict',   // ✅ CSRF protection
  maxAge: 15 * 60 * 1000 // 15 minutes
});

// Frontend: No token handling needed
// Browser automatically includes cookie in requests
fetch('/api/companies', {
  credentials: 'include' // Include cookies
});
```

#### Advantages
1. **XSS Protection**: JavaScript cannot access httpOnly cookies
2. **Automatic**: Browser handles token inclusion
3. **CSRF Protection**: SameSite attribute prevents cross-site requests
4. **No localStorage**: Immune to localStorage-based attacks
5. **Industry Standard**: Used by Google, Facebook, GitHub

#### Trade-offs
- **CORS Complexity**: Requires `credentials: true` in all requests
- **Mobile Apps**: Harder to implement (needs WebView cookie management)
- **Development**: Slightly more setup (cookie parsing)

---

## 🔄 Migration Path (When to Upgrade)

### Triggers for Migration
- [ ] Preparing for production deployment
- [ ] Security audit requirement
- [ ] SOC 2 / ISO 27001 compliance
- [ ] Enterprise client onboarding
- [ ] After 3rd-party security review

### Migration Checklist
```markdown
Phase 5A: Backend Changes
- [ ] Install cookie-parser middleware
- [ ] Update /auth/login to set httpOnly cookies
- [ ] Update /auth/refresh to set httpOnly cookies
- [ ] Add CSRF token generation (optional but recommended)
- [ ] Update CORS to include credentials: true

Phase 5B: Frontend Changes
- [ ] Remove all localStorage.getItem/setItem('accessToken')
- [ ] Update apiClient to use credentials: 'include'
- [ ] Remove manual token injection (cookies auto-sent)
- [ ] Update logout to call /auth/logout (clears cookies)
- [ ] Add CSRF token to forms (if implemented)

Phase 5C: Testing
- [ ] Test login/logout flow
- [ ] Test auto-refresh (401 handling)
- [ ] Test CORS with credentials
- [ ] Verify XSS protection (cookies not accessible)
- [ ] Test CSRF protection (SameSite attribute)

Phase 5D: Documentation
- [ ] Update API documentation
- [ ] Update frontend integration guide
- [ ] Document cookie configuration
- [ ] Add security posture documentation
```

**Estimated Effort**: 2-3 days (backend + frontend + testing)

---

## 🔀 Alternative: Hybrid Strategy (Enterprise)

### When to Use
- Multi-platform (web + mobile native apps)
- Third-party API integrations
- Complex SSO requirements

### How It Works
```typescript
// Web: httpOnly cookies (XSS-safe)
if (req.headers['user-agent'].includes('Mozilla')) {
  res.cookie('accessToken', token, { httpOnly: true });
}

// Mobile: Authorization header (React Native can't use httpOnly)
else {
  res.json({ accessToken, refreshToken });
}
```

**Complexity**: High (dual authentication paths)  
**Recommendation**: Only for enterprise scale (10K+ users)

---

## 📋 Comparison Table

| Feature | localStorage | httpOnly Cookies | Hybrid |
|---------|--------------|------------------|--------|
| **XSS Protection** | ❌ Vulnerable | ✅ Protected | ✅ Protected (web) |
| **CSRF Protection** | ✅ No cookies | ⚠️ Needs SameSite | ⚠️ Complex |
| **Mobile Apps** | ✅ Easy | ⚠️ WebView only | ✅ Native support |
| **Developer Experience** | 🟢 Simple | 🟡 Medium | 🔴 Complex |
| **Security Rating** | 🟡 Medium (6/10) | 🟢 High (9/10) | 🟢 High (9/10) |
| **Production Ready** | ⚠️ With CSP | ✅ Yes | ✅ Enterprise |
| **Compliance (SOC 2)** | ⚠️ Requires docs | ✅ Standard | ✅ Standard |

---

## 🎓 Security Best Practices (Current)

### Already Implemented ✅
1. **Short-lived access tokens** (15 min)
2. **Refresh token rotation** (new token on refresh)
3. **Token hashing** (SHA-256 in database)
4. **JTI tracking** (prevents reuse)
5. **Audit logging** (token operations tracked)
6. **Rate limiting** (5 login attempts / 15 min)
7. **CORS whitelist** (only allowed origins)
8. **CSP headers** (Helmet.js)

### Phase 5 Improvements 🎯
1. **httpOnly cookies** (XSS protection)
2. **CSRF tokens** (additional layer)
3. **Token blacklist** (Redis-based for immediate revocation)
4. **Fingerprinting** (bind tokens to device/IP)
5. **MFA** (two-factor authentication)

---

## 🔍 Risk Assessment

### Current Risk Level (localStorage)
**Overall**: 🟡 **MEDIUM** (Acceptable for MVP)

| Threat | Risk | Mitigation (Current) | Residual Risk |
|--------|------|----------------------|---------------|
| XSS Attack | 🔴 High | CSP headers, React protection | 🟡 Medium |
| Token Theft | 🟠 High | Short expiry (15 min) | 🟡 Medium |
| CSRF | 🟢 Low | CORS whitelist, no cookies | 🟢 Low |
| Replay Attack | 🟡 Medium | JTI tracking, token rotation | 🟢 Low |
| Session Fixation | 🟢 Low | New tokens on login | 🟢 Low |

### Post-Migration Risk Level (httpOnly Cookies)
**Overall**: 🟢 **LOW** (Production-ready)

| Threat | Risk | Mitigation | Residual Risk |
|--------|------|------------|---------------|
| XSS Attack | 🟢 Low | httpOnly (JS can't access) | 🟢 Low |
| Token Theft | 🟢 Low | httpOnly + short expiry | 🟢 Low |
| CSRF | 🟡 Medium | SameSite: strict | 🟢 Low |
| Replay Attack | 🟢 Low | JTI + rotation | 🟢 Low |
| Session Fixation | 🟢 Low | New tokens on login | 🟢 Low |

---

## 📚 References

### Industry Standards
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP JWT Security](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [RFC 6749 - OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)

### Implementation Examples
- **httpOnly Cookies**: Auth0, Firebase Auth, Supabase
- **localStorage**: Many SPA frameworks (dev/MVP)
- **Hybrid**: Enterprise SaaS (Salesforce, Stripe)

### Security Audits
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/) - A07:2021 Authentication Failures
- SOC 2 Type II - Access Control requirements
- PCI DSS - Token storage requirements

---

## ✅ Decision Rationale

### Why localStorage Now?
1. **MVP Focus**: Rapid development, proven pattern
2. **Developer Experience**: Simple to implement and debug
3. **Acceptable Risk**: With CSP, rate limiting, and audit logging
4. **Client Apps**: Easy integration (mobile WebView)
5. **Flexibility**: Can migrate to cookies without breaking changes

### Why Cookies Later?
1. **Production Security**: Industry best practice
2. **Compliance**: SOC 2, ISO 27001 expectations
3. **Enterprise Clients**: CTO/CISO approval requirement
4. **Peace of Mind**: Eliminates XSS token theft vector
5. **Long-term**: Sustainable for growth

---

## 🎯 Recommendation

### For Development/MVP (Current - Phase 4)
✅ **Continue with localStorage**
- Document this decision ✅ (this file)
- Implement CSP headers ✅ (done in Phase 4A)
- Add rate limiting ✅ (done in Phase 4A)
- Monitor for XSS vulnerabilities ✅ (ongoing)

### For Production Deployment (Phase 5)
🎯 **Migrate to httpOnly Cookies**
- Follow migration checklist (above)
- Test thoroughly in staging
- Update security documentation
- Communicate to API consumers

### For Enterprise Scale (Phase 6+)
🚀 **Consider Hybrid Strategy**
- Support native mobile apps
- Third-party API integrations
- Custom authentication flows

---

## 📝 Sign-off

**Decision Made By**: Development Team  
**Approved By**: Technical Lead  
**Date**: December 17, 2025  
**Next Review**: Phase 5 (Production Deployment)

**Current Status**: ✅ Documented and Communicated  
**Action Required**: None (continue with current implementation)  
**Future Action**: Migrate to httpOnly cookies before production launch

---

**Document Version**: 1.0  
**Last Updated**: December 17, 2025  
**Related Documents**:
- [Security Review](../security/ENTERPRISE_SECURITY_REVIEW.md)
- [Phase 4A Report](../testing/PHASE_4A_IMPLEMENTATION_REPORT.md)
- [API Documentation](../../backend/API_DOCUMENTATION.md)
