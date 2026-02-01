# Fix Admin Account Script
Write-Host "🔧 Fixing admin account..." -ForegroundColor Yellow

# Update account status
Write-Host "`n📝 Resetting account status..." -ForegroundColor Cyan
docker exec slms-postgres-1 psql -U slms -d slms_db -c "UPDATE users SET status='active', locked_until=NULL, failed_login_count=0, last_failed_login_at=NULL WHERE email='ali@alhajco.com';"

# Show current status  
Write-Host "`n✅ Account status after fix:" -ForegroundColor Green
docker exec slms-postgres-1 psql -U slms -d slms_db -c "SELECT id, email, status, failed_login_count, locked_until FROM users WHERE email='ali@alhajco.com';"

Write-Host "`n✨ Admin account fixed!" -ForegroundColor Green
Write-Host "📧 Email: ali@alhajco.com" -ForegroundColor White
Write-Host "🔑 Password: A11A22A33" -ForegroundColor White
Write-Host "`n🚀 Try logging in now!" -ForegroundColor Cyan
