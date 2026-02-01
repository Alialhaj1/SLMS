# Fix all showToast calls in admin pages
$files = @(
    "c:\projects\slms\frontend-next\pages\admin\audit-logs.tsx",
    "c:\projects\slms\frontend-next\pages\admin\branches.tsx",
    "c:\projects\slms\frontend-next\pages\admin\companies.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Fix: showToast('error', 'message') -> showToast('message', 'error')
        $content = $content -replace "showToast\('error',\s*'([^']+)'\)", "showToast('`$1', 'error')"
        $content = $content -replace "showToast\('error',\s*([^)]+)\)", "showToast(`$1, 'error')"
        
        # Fix: showToast('success', 'message') -> showToast('message', 'success')
        $content = $content -replace "showToast\('success',\s*'([^']+)'\)", "showToast('`$1', 'success')"
        $content = $content -replace "showToast\('success',\s*([^)]+)\)", "showToast(`$1, 'success')"
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "Fixed: $file"
    }
}

Write-Host "`nDone! All showToast calls fixed."
