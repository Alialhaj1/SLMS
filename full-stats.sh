#!/bin/bash
echo "=========================================="
echo "       SLMS Production Database Stats    "
echo "=========================================="
echo ""

tables=(
  "companies:الشركات"
  "users:المستخدمين"
  "shipments:الشحنات"
  "suppliers:الموردين"
  "currencies:العملات"
  "countries:الدول"
  "ports:الموانئ"
  "items:الأصناف"
  "purchase_orders:أوامر الشراء"
  "projects:المشاريع"
  "warehouses:المستودعات"
  "expense_types:أنواع المصروفات"
  "freight_agents:وكلاء الشحن"
)

for table_info in "${tables[@]}"; do
  table="${table_info%%:*}"
  name="${table_info##*:}"
  count=$(docker exec slms-postgres-prod psql -U slms_prod -d slms_production -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "N/A")
  printf "%-25s: %s\n" "$name ($table)" "$count"
done

echo ""
echo "=========================================="
