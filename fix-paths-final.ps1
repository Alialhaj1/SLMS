# Fix import paths correctly - FINAL VERSION
# The correct path is based on folder depth from pages directory
# pages/file.tsx -> depth 0 -> ../utils
# pages/folder/file.tsx -> depth 1 -> ../../utils
# pages/folder/subfolder/file.tsx -> depth 2 -> ../../../utils

$pagesPath = "c:\projects\slms\frontend-next\pages"

# Get all tsx files recursively
$files = Get-ChildItem $pagesPath -Recurse -Filter "*.tsx"

$fixed = 0

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        
        # Check if file has withPermission import
        if ($content -match "import \{ withPermission \} from '([^']+)';") {
            $currentPath = $Matches[1]
            
            # Calculate correct path based on file location relative to pages/
            $relativePath = $file.DirectoryName.Replace("$pagesPath", "").Replace("\", "/").TrimStart("/")
            
            if ($relativePath -eq "") {
                # File is directly in pages/ folder
                $depth = 0
            } else {
                # Count the number of folder levels
                $depth = ($relativePath -split '/').Count
            }
            
            # depth 0: pages/file.tsx -> ../utils/withPermission
            # depth 1: pages/folder/file.tsx -> ../../utils/withPermission
            # depth 2: pages/folder/subfolder/file.tsx -> ../../../utils/withPermission
            
            $correctPath = ("../" * ($depth + 1)) + "utils/withPermission"
            
            if ($currentPath -ne $correctPath) {
                Write-Host "Fixing: $($file.FullName.Replace($pagesPath, '').Replace('\', '/'))" -ForegroundColor Yellow
                Write-Host "  Depth: $depth" -ForegroundColor Cyan
                Write-Host "  From: $currentPath" -ForegroundColor Red
                Write-Host "  To:   $correctPath" -ForegroundColor Green
                
                $newContent = $content -replace "import \{ withPermission \} from '[^']+';", "import { withPermission } from '$correctPath';"
                [System.IO.File]::WriteAllText($file.FullName, $newContent)
                $fixed++
            }
        }
    } catch {
        Write-Host "ERROR processing $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Fixed: $fixed files" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
