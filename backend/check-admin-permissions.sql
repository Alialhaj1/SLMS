-- Check user and role
SELECT u.id, u.email, u.full_name, r.name as role_name, r.id as role_id
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'ali@alhajco.com';

-- Check permissions for this role
SELECT COUNT(*) as total_permissions
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN users u ON u.role_id = r.id
WHERE u.email = 'ali@alhajco.com';

-- Check if dashboard:view permission exists
SELECT p.id, p.name, p.resource, p.action
FROM permissions p
WHERE p.name = 'dashboard:view';

-- Check if Super Admin role has dashboard:view
SELECT rp.role_id, r.name as role_name, p.name as permission_name
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'Super Admin' AND p.name = 'dashboard:view';
