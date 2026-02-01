/**
 * Requests Module Translations
 * ترجمات وحدة الطلبات
 */

export const requestsTranslations = {
  en: {
    requests: {
      title: 'My Requests',
      subtitle: 'Manage all your requests in one place',
      expenseRequests: 'Expense Requests',
      transferRequests: 'Transfer Requests',
      paymentRequests: 'Payment Requests',
      printedRequests: 'Printed Requests',
      unprintedRequests: 'Unprinted Requests',
      allRequests: 'All Requests',
      
      // Actions
      createExpenseRequest: 'New Expense Request',
      createTransferRequest: 'New Transfer Request',
      createPaymentRequest: 'New Payment Request',
      viewDetails: 'View Details',
      print: 'Print',
      submit: 'Submit for Approval',
      approve: 'Approve',
      reject: 'Reject',
      execute: 'Execute',
      
      // Fields
      requestNumber: 'Request Number',
      requestDate: 'Request Date',
      project: 'Project',
      shipment: 'Shipment',
      expenseType: 'Expense Type',
      vendor: 'Vendor',
      amount: 'Amount',
      currency: 'Currency',
      status: 'Status',
      printedStatus: 'Printed',
      printCount: 'Print Count',
      paymentMethod: 'Payment Method',
      
      // Expense Types
      expenseTypes: {
        lcFees: 'LC Fees',
        cargoInsurance: 'Cargo Insurance',
        seaFreight: 'Sea Freight',
        deliveryOrder: 'Delivery Order',
        customsDeclaration: 'Customs Declaration',
        storage: 'Storage',
        portCharges: 'Port Charges',
        unloading: 'Unloading',
        customsInspection: 'Customs Inspection',
        containerDelayPickup: 'Container Delay Pickup',
        customsClearance: 'Customs Clearance',
        transport: 'Transport',
        loadingUnloading: 'Loading & Unloading',
        sampleTesting: 'Sample Testing',
        saberCertificate: 'SABER Certificate',
        containerReturnDelay: 'Container Return Delay',
        palletFines: 'Pallet Fines',
      },
      
      // Statuses
      statuses: {
        draft: 'Draft',
        submitted: 'Pending Approval',
        approved: 'Approved',
        rejected: 'Rejected',
        executed: 'Executed',
        cancelled: 'Cancelled',
      },
      
      // Messages
      messages: {
        fetchError: 'Failed to fetch requests',
        createSuccess: 'Request created successfully',
        updateSuccess: 'Request updated successfully',
        deleteSuccess: 'Request deleted successfully',
        submitSuccess: 'Request submitted for approval',
        approveSuccess: 'Request approved successfully',
        rejectSuccess: 'Request rejected',
        executeSuccess: 'Request executed successfully',
        printSuccess: 'Print event tracked',
        accessDenied: 'You do not have permission to view requests',
        noRequests: 'No requests found',
      },
      
      // Filters
      filters: {
        search: 'Search by request number or notes',
        fromDate: 'From Date',
        toDate: 'To Date',
        statusFilter: 'Filter by Status',
        projectFilter: 'Filter by Project',
        vendorFilter: 'Filter by Vendor',
        printedFilter: 'Show Printed Only',
        unprintedFilter: 'Show Unprinted Only',
      },
    },
  },
  
  ar: {
    requests: {
      title: 'طلباتي',
      subtitle: 'إدارة جميع طلباتك في مكان واحد',
      expenseRequests: 'طلبات المصاريف',
      transferRequests: 'طلبات التحويل',
      paymentRequests: 'طلبات السداد',
      printedRequests: 'طلبات مطبوعة',
      unprintedRequests: 'طلبات غير مطبوعة',
      allRequests: 'جميع الطلبات',
      
      // Actions
      createExpenseRequest: 'طلب مصروف جديد',
      createTransferRequest: 'طلب تحويل جديد',
      createPaymentRequest: 'طلب سداد جديد',
      viewDetails: 'عرض التفاصيل',
      print: 'طباعة',
      submit: 'إرسال للاعتماد',
      approve: 'اعتماد',
      reject: 'رفض',
      execute: 'تنفيذ',
      
      // Fields
      requestNumber: 'رقم الطلب',
      requestDate: 'تاريخ الطلب',
      project: 'المشروع',
      shipment: 'الشحنة',
      expenseType: 'نوع المصروف',
      vendor: 'المورد',
      amount: 'المبلغ',
      currency: 'العملة',
      status: 'الحالة',
      printedStatus: 'حالة الطباعة',
      printCount: 'عدد مرات الطباعة',
      paymentMethod: 'طريقة الدفع',
      
      // Expense Types
      expenseTypes: {
        lcFees: 'رسوم اعتماد',
        cargoInsurance: 'تأمين حمولة',
        seaFreight: 'شحن بحري',
        deliveryOrder: 'إذن تسليم',
        customsDeclaration: 'بيان جمركي',
        storage: 'أرضيات',
        portCharges: 'رسوم موانئ',
        unloading: 'تفريغ',
        customsInspection: 'معاينة جمركية',
        containerDelayPickup: 'تأخير استلام حاويات',
        customsClearance: 'تخليص جمركي',
        transport: 'نقل',
        loadingUnloading: 'تحميل وتنزيل',
        sampleTesting: 'فحص عينات',
        saberCertificate: 'شهادة سابر',
        containerReturnDelay: 'تأخير إعادة حاويات',
        palletFines: 'غرامات طبليات',
      },
      
      // Statuses
      statuses: {
        draft: 'مسودة',
        submitted: 'بانتظار الموافقة',
        approved: 'معتمد',
        rejected: 'مرفوض',
        executed: 'منفذ',
        cancelled: 'ملغي',
      },
      
      // Messages
      messages: {
        fetchError: 'فشل في تحميل الطلبات',
        createSuccess: 'تم إنشاء الطلب بنجاح',
        updateSuccess: 'تم تحديث الطلب بنجاح',
        deleteSuccess: 'تم حذف الطلب بنجاح',
        submitSuccess: 'تم إرسال الطلب للاعتماد',
        approveSuccess: 'تم اعتماد الطلب بنجاح',
        rejectSuccess: 'تم رفض الطلب',
        executeSuccess: 'تم تنفيذ الطلب بنجاح',
        printSuccess: 'تم تسجيل الطباعة',
        accessDenied: 'ليس لديك صلاحيات لعرض الطلبات',
        noRequests: 'لا توجد طلبات',
      },
      
      // Filters
      filters: {
        search: 'بحث برقم الطلب أو الملاحظات',
        fromDate: 'من تاريخ',
        toDate: 'إلى تاريخ',
        statusFilter: 'تصفية حسب الحالة',
        projectFilter: 'تصفية حسب المشروع',
        vendorFilter: 'تصفية حسب المورد',
        printedFilter: 'عرض المطبوعة فقط',
        unprintedFilter: 'عرض غير المطبوعة فقط',
      },
    },
  },
};
