SELECT r.name as role_name, COUNT(rp.permission_id) as permissions_count 
FROM roles r 
LEFT JOIN role_permissions rp ON r.id = rp.role_id 
GROUP BY r.id, r.name 
ORDER BY r.name;
