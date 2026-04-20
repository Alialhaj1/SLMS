Set-Location c:\projects\slms
$output = docker compose logs backend --tail 80 2>&1
$lines = $output -split "`n"
$errorLines = $lines | Where-Object { $_ -match "error|Error|500|group-categor" }
foreach ($line in $errorLines) { Write-Host $line }
