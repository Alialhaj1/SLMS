-- 065_seed_record_and_request_status_reference_data.sql
-- Seed real, globally-available reference data for Record Status and Request Status
-- These drive the Next.js pages:
--   /master/record-status   (type=record_status)
--   /master/request-status  (type=request_status)

BEGIN;

-- Record Status (idempotent)
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  (NULL, 'record_status', 'ACTIVE',   'Active',   'نشط',      'Record is active and available for use', 'السجل نشط ومتاح للاستخدام', TRUE),
  (NULL, 'record_status', 'INACTIVE', 'Inactive', 'غير نشط',  'Record is inactive and should not be used in new transactions', 'السجل غير نشط ولا يجب استخدامه في معاملات جديدة', TRUE),
  (NULL, 'record_status', 'DRAFT',    'Draft',    'مسودة',    'Record is in draft state and not finalized', 'السجل في حالة مسودة وغير معتمد', TRUE),
  (NULL, 'record_status', 'ARCHIVED', 'Archived', 'مؤرشف',    'Record is archived for historical reference', 'السجل مؤرشف للرجوع إليه تاريخيًا', TRUE)
ON CONFLICT DO NOTHING;

-- Request Status (idempotent)
-- Generic lifecycle statuses applicable to requests (support, approvals, internal requests, etc.)
INSERT INTO reference_data (company_id, type, code, name_en, name_ar, description_en, description_ar, is_active)
VALUES
  (NULL, 'request_status', 'NEW',        'New',         'جديد',         'New request created', 'تم إنشاء طلب جديد', TRUE),
  (NULL, 'request_status', 'SUBMITTED',  'Submitted',   'تم الإرسال',   'Request submitted for processing', 'تم إرسال الطلب للمعالجة', TRUE),
  (NULL, 'request_status', 'IN_REVIEW',  'In Review',   'قيد المراجعة', 'Request is under review', 'الطلب قيد المراجعة', TRUE),
  (NULL, 'request_status', 'APPROVED',   'Approved',    'تمت الموافقة', 'Request approved', 'تمت الموافقة على الطلب', TRUE),
  (NULL, 'request_status', 'REJECTED',   'Rejected',    'مرفوض',        'Request rejected', 'تم رفض الطلب', TRUE),
  (NULL, 'request_status', 'ON_HOLD',    'On Hold',     'معلّق',        'Request is on hold pending additional information', 'تم تعليق الطلب لحين استكمال معلومات إضافية', TRUE),
  (NULL, 'request_status', 'CANCELLED',  'Cancelled',   'ملغي',         'Request cancelled by requester or administrator', 'تم إلغاء الطلب من مقدم الطلب أو المشرف', TRUE),
  (NULL, 'request_status', 'CLOSED',     'Closed',      'مغلق',         'Request closed (completed/resolved)', 'تم إغلاق الطلب (مكتمل/تمت معالجته)', TRUE)
ON CONFLICT DO NOTHING;

COMMIT;
