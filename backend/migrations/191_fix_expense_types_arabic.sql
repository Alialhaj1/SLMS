-- Fix Arabic names in expense_types table
UPDATE expense_types SET name_ar = 'رسوم الشحن' WHERE code = 'FREIGHT';
UPDATE expense_types SET name_ar = 'الرسوم الجمركية' WHERE code = 'CUSTOMS';
UPDATE expense_types SET name_ar = 'التأمين' WHERE code = 'INSURANCE';
UPDATE expense_types SET name_ar = 'رسوم المناولة' WHERE code = 'HANDLING';
UPDATE expense_types SET name_ar = 'رسوم التخليص' WHERE code = 'CLEARING';
UPDATE expense_types SET name_ar = 'رسوم التخزين' WHERE code = 'STORAGE';

-- Verify
SELECT id, code, name, name_ar FROM expense_types ORDER BY id;
