# Fix missing withPermission imports
# This script adds the missing import statement to files that use withPermission but don't import it

$pagesPath = "c:\projects\slms\frontend-next\pages"

# Get all tsx files recursively
$files = Get-ChildItem $pagesPath -Recurse -Filter "*.tsx"

$fixed = 0
$errors = 0

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        
        # Check if file uses withPermission but doesn't import it
        if ($content -match "export default withPermission" -and $content -notmatch "import.*withPermission.*from") {
            Write-Host "Fixing: $($file.FullName.Replace($pagesPath, ''))" -ForegroundColor Yellow
            
            # Calculate the relative path depth
            $relativePath = $file.FullName.Replace("$pagesPath\", "")
            $depth = ($relativePath -split '\\').Count - 1
            
            if ($depth -eq 0) {
                $importPath = "./"
            } else {
                $importPath = "../" * $depth
            }
            
            # Create the import line
            $importLine = "import { withPermission } from '${importPath}utils/withPermission';"
            
            # Find the first import statement and add after it
            if ($content -match "(import .+? from .+?;)") {
                $firstImport = $Matches[1]
                $newContent = $content.Replace($firstImport, "$firstImport`n$importLine")
                
                [System.IO.File]::WriteAllText($file.FullName, $newContent)
                Write-Host "  Added import: $importLine" -ForegroundColor Green
                $fixed++
            } else {
                Write-Host "  ERROR: Could not find import statement" -ForegroundColor Red
                $errors++
            }
        }
    } catch {
        Write-Host "ERROR processing $($file.Name): $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Fixed: $fixed files" -ForegroundColor Green
Write-Host "  Errors: $errors" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
