#!/usr/bin/env pwsh

Write-Host "🔧 إصلاح مشاكل الترحيل (Migrations) وبدء النظام" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Step 1: Stop backend to fix migration issues
Write-Host "🛑 إيقاف Backend مؤقتاً..." -ForegroundColor Yellow
docker stop slms-backend-1

# Step 2: Wait for database to be ready
Write-Host "⏳ انتظار قاعدة البيانات..." -ForegroundColor Yellow
Start-Sleep 5

# Step 3: Check if database is accessible
Write-Host "🔍 فحص الاتصال بقاعدة البيانات..." -ForegroundColor Yellow
$dbReady = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $result = docker exec slms-postgres-1 pg_isready -U slms -d slms_db 2>&1
        if ($result -like "*accepting connections*") {
            Write-Host "✅ قاعدة البيانات جاهزة!" -ForegroundColor Green
            $dbReady = $true
            break
        }
    } catch {
        Write-Host "محاولة $i/10 - انتظار قاعدة البيانات..." -ForegroundColor Gray
    }
    Start-Sleep 2
}

if (-not $dbReady) {
    Write-Host "❌ فشل في الاتصال بقاعدة البيانات" -ForegroundColor Red
    exit 1
}

# Step 4: Create a simple migration script inside container
Write-Host "🗃️ تحضير ترحيل قاعدة البيانات..." -ForegroundColor Yellow

$migrationScript = @"
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY, 
    name TEXT UNIQUE NOT NULL, 
    run_at TIMESTAMPTZ DEFAULT NOW(),
    checksum TEXT,
    execution_time_ms INTEGER
);

-- Create basic tenants table for multi-tenancy
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Insert default tenant
INSERT INTO tenants (name, domain) VALUES ('Default Company', 'localhost') ON CONFLICT DO NOTHING;

-- Mark this as a migration
INSERT INTO migrations (name) VALUES ('000_init_basic_tables.sql') ON CONFLICT DO NOTHING;
"@

# Step 5: Execute basic migration
Write-Host "📊 تطبيق الترحيل الأساسي..." -ForegroundColor Yellow
$migrationScript | docker exec -i slms-postgres-1 psql -U slms -d slms_db

# Step 6: Start backend
Write-Host "🚀 بدء Backend..." -ForegroundColor Yellow
docker start slms-backend-1

# Step 7: Wait and check backend status
Write-Host "⏳ انتظار تشغيل Backend..." -ForegroundColor Yellow
Start-Sleep 15

# Step 8: Test backend health
Write-Host "🩺 فحص صحة Backend..." -ForegroundColor Yellow
for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Backend يعمل بنجاح! Status Code: $($response.StatusCode)" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 تم إصلاح المشكلة بنجاح!" -ForegroundColor Green
        Write-Host "📍 Frontend: http://localhost:3001" -ForegroundColor Cyan
        Write-Host "📍 Backend:  http://localhost:4000" -ForegroundColor Cyan
        exit 0
    } catch {
        Write-Host "محاولة $i/5 - Backend لا يستجيب بعد..." -ForegroundColor Gray
        Start-Sleep 5
    }
}

Write-Host "❌ Backend مازال لا يعمل. فحص السجلات:" -ForegroundColor Red
Write-Host "docker logs slms-backend-1 --tail 10" -ForegroundColor Yellow