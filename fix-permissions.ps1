$containerName = "slms-postgres-1"

# Check what role the user has and what permissions exist
$query = @"
-- Get user's role info
SELECT u.id, u.email, u.role, ur.role_id, r.name as role_name
FROM users u 
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
WHERE u.email = 'ali@darkhawlan.com';
"@

Write-Host "=== USER ROLE INFO ==="
docker exec $containerName psql -U slms -d slms_db -c $query 2>$null

# Check what permissions the role has
$query2 = @"
SELECT r.name as role_name, COUNT(rp.permission_id) as perm_count
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
WHERE r.name = 'aaaa'
GROUP BY r.name;
"@

Write-Host "`n=== ROLE PERMISSION COUNT ==="
docker exec $containerName psql -U slms -d slms_db -c $query2 2>$null

# Check which master permissions exist
$query3 = @"
SELECT DISTINCT p.code FROM permissions p 
WHERE p.code LIKE 'master:countries%' OR p.code LIKE 'master:currencies%' 
   OR p.code LIKE 'master:cities%' OR p.code LIKE 'master:taxes%'
   OR p.code LIKE 'master:payment_methods%' OR p.code LIKE 'master:request_statuses%'
   OR p.code LIKE 'master:contact_methods%'
ORDER BY p.code;
"@

Write-Host "`n=== RELEVANT PERMISSIONS IN DB ==="
docker exec $containerName psql -U slms -d slms_db -c $query3 2>$null

# Check which of these the role already has
$query4 = @"
SELECT p.code FROM permissions p
JOIN role_permissions rp ON rp.permission_id = p.id
JOIN roles r ON r.id = rp.role_id
WHERE r.name = 'aaaa'
AND (p.code LIKE 'master:countries%' OR p.code LIKE 'master:currencies%' 
   OR p.code LIKE 'master:cities%' OR p.code LIKE 'master:taxes%'
   OR p.code LIKE 'master:payment_methods%' OR p.code LIKE 'master:request_statuses%'
   OR p.code LIKE 'master:contact_methods%')
ORDER BY p.code;
"@

Write-Host "`n=== ROLE ALREADY HAS THESE ==="
docker exec $containerName psql -U slms -d slms_db -c $query4 2>$null
