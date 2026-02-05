# Fix incorrect withPermission import paths
# The paths were calculated incorrectly - need to fix them

$pagesPath = "c:\projects\slms\frontend-next\pages"

# Get all tsx files recursively
$files = Get-ChildItem $pagesPath -Recurse -Filter "*.tsx"

$fixed = 0

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        
        # Check if file has incorrect import path (too many ../)
        if ($content -match "import \{ withPermission \} from '(\.\.\/)+utils\/withPermission';") {
            $relativePath = $file.FullName.Replace("$pagesPath\", "")
            $parts = $relativePath -split '\\'
            $depth = $parts.Count - 1  # Subtract 1 for the filename itself
            
            if ($depth -eq 0) {
                $correctPath = "./utils/withPermission"
            } else {
                $correctPath = ("../" * $depth) + "utils/withPermission"
            }
            
            # Check if path is already correct
            $currentImport = [regex]::Match($content, "import \{ withPermission \} from '([^']+)';").Groups[1].Value
            
            if ($currentImport -ne $correctPath) {
                Write-Host "Fixing: $relativePath" -ForegroundColor Yellow
                Write-Host "  From: $currentImport" -ForegroundColor Red
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
