# Fix import paths correctly
# pages/file.tsx -> ../utils/withPermission
# pages/folder/file.tsx -> ../../utils/withPermission
# pages/folder/subfolder/file.tsx -> ../../../utils/withPermission

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
            $relativePath = $file.FullName.Replace("$pagesPath\", "").Replace("\", "/")
            $parts = $relativePath -split '/'
            $depth = $parts.Count  # Number of levels including the file itself
            
            # depth = 1: pages/file.tsx -> ../utils/withPermission
            # depth = 2: pages/folder/file.tsx -> ../../utils/withPermission
            # depth = 3: pages/folder/subfolder/file.tsx -> ../../../utils/withPermission
            
            $correctPath = ("../" * $depth) + "utils/withPermission"
            
            if ($currentPath -ne $correctPath) {
                Write-Host "Fixing: $relativePath" -ForegroundColor Yellow
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
