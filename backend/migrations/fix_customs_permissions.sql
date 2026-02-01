INSERT INTO permissions (permission_code, resource, action, description, module, name_en, name_ar) VALUES
  ('customs_declarations:create', 'customs_declarations', 'create', 'Create customs declarations', 'Customs', 'Create Customs Declarations', 'إنشاء البيانات الجمركية'),
  ('customs_declarations:update', 'customs_declarations', 'update', 'Update customs declarations', 'Customs', 'Update Customs Declarations', 'تحديث البيانات الجمركية'),
  ('customs_declarations:delete', 'customs_declarations', 'delete', 'Delete customs declarations', 'Customs', 'Delete Customs Declarations', 'حذف البيانات الجمركية'),
  ('customs_declarations:change_status', 'customs_declarations', 'change_status', 'Change status of customs declarations', 'Customs', 'Change Status', 'تغيير الحالة'),
  ('customs_declarations:print', 'customs_declarations', 'print', 'Print customs declarations', 'Customs', 'Print Customs Declarations', 'طباعة البيانات الجمركية'),
  ('customs_declarations:export', 'customs_declarations', 'export', 'Export customs declarations', 'Customs', 'Export Customs Declarations', 'تصدير البيانات الجمركية'),
  ('customs_declarations:upload', 'customs_declarations', 'upload', 'Upload customs declaration attachments', 'Customs', 'Upload Attachments', 'رفع المرفقات'),
  ('customs_declarations:view_history', 'customs_declarations', 'view_history', 'View customs declaration history', 'Customs', 'View History', 'عرض السجل')
ON CONFLICT (permission_code) DO NOTHING;
