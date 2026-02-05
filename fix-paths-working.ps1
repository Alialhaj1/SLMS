# Fix import paths correctly - WORKING VERSION
# The correct path is based on folder depth from pages directory
# pages/file.tsx -> ../utils
# pages/folder/file.tsx -> ../../utils
# pages/folder/subfolder/file.tsx -> ../../../utils

$pagesPath = "c:\projects\slms\frontend-next\pages"

# Get all tsx files recursively
$files = Get-ChildItem $pagesPath -Recurse -Filter "*.tsx"

$fixed = 0

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        
        # Check if file has withPermission import (with too many ../)
        if ($content -match "import \{ withPermission \} from '(\.\.\/)+utils\/withPermission';") {
            $currentPath = [regex]::Match($content, "import \{ withPermission \} from '([^']+)';").Groups[1].Value
            
            # Calculate correct path based on file location relative to pages/
            # Get the directory of the file relative to pages
            $relDir = $file.DirectoryName.Replace("$pagesPath", "").TrimStart("\")
            
            if ([string]::IsNullOrEmpty($relDir)) {
                # File is directly in pages/ folder (depth 0)
                $depth = 1
            } else {
                # Count the number of folder levels + 1
                $depth = ($relDir -split '\\').Count + 1
            }
            
            $correctPath = ("../" * $depth) + "utils/withPermission"
            
            if ($currentPath -ne $correctPath) {
                Write-Host "Fixing: $($file.FullName.Replace($pagesPath + '\', ''))" -ForegroundColor Yellow
                Write-Host "  From: $currentPath -> To: $correctPath" -ForegroundColor Green
                
                $escapedCurrent = [regex]::Escape($currentPath)
                $newContent = $content -replace "import \{ withPermission \} from '$escapedCurrent';", "import { withPermission } from '$correctPath';"
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
