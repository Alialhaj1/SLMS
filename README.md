# Smart Logistics Management System (SLMS)

Scaffold for the SLMS prototype (MVP) — Node.js (TypeScript) backend + React (TypeScript) frontend.

Tech stack (initial):
- Backend: Node.js + Express (TypeScript)
- Frontend: React + Vite (TypeScript)
- DB: PostgreSQL
- Cache: Redis
- Queue: RabbitMQ
- Dev: Docker + docker-compose

Quick start (PowerShell):

```powershell
# from repository root
cd C:\projects\slms
# start dependencies + apps
docker-compose up --build
```

Next steps:
- Implement Auth, Roles and core domain APIs
- Add CI (GitHub Actions) and more infra manifests
