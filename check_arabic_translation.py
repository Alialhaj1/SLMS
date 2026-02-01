#!/usr/bin/env python3
"""
Arabic Translation Completeness Checker
========================================

هذا السكريبت يقوم بـ:
1. قراءة ملفات en.json و ar.json
2. البحث عن المفاتيح المفقودة في ar.json
3. البحث عن النصوص الثابتة في ملفات .tsx و .ts
4. إنشاء تقرير شامل بالترجمات المفقودة
5. إنشاء ملف ar.json محدّث بجميع المفاتيح

الاستخدام:
    python check_arabic_translation.py
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple
from collections import defaultdict

# ═════════════════════════════════════════════════════════════════
# التكوين
# ═════════════════════════════════════════════════════════════════

FRONTEND_DIR = Path(r"c:\projects\slms\frontend-next")
LOCALES_DIR = FRONTEND_DIR / "locales"
EN_FILE = LOCALES_DIR / "en.json"
AR_FILE = LOCALES_DIR / "ar.json"

# المجلدات التي يجب فحصها
SCAN_DIRS = [
    FRONTEND_DIR / "pages",
    FRONTEND_DIR / "components",
    FRONTEND_DIR / "hooks",
    FRONTEND_DIR / "lib",
]

# الأنماط التي يجب البحث عنها
PATTERNS = [
    # t('key') or t("key")
    r"t\(['\"]([^'\"]+)['\"]\)",
    # t(`key`)
    r"t\(`([^`]+)`\)",
    # {t('key')}
    r"\{t\(['\"]([^'\"]+)['\"]\)\}",
    # <Trans i18nKey="key">
    r'<Trans\s+i18nKey=["\']([^"\']+)["\']',
]


# ═════════════════════════════════════════════════════════════════
# دوال مساعدة
# ═════════════════════════════════════════════════════════════════

def load_json(file_path: Path) -> Dict:
    """تحميل ملف JSON"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[!] File not found: {file_path}")
        return {}
    except json.JSONDecodeError as e:
        print(f"[!] JSON decode error in {file_path}: {e}")
        return {}


def save_json(data: Dict, file_path: Path):
    """حفظ ملف JSON"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[+] Saved: {file_path}")


def flatten_dict(d: Dict, parent_key: str = '', sep: str = '.') -> Dict:
    """تحويل dictionary متداخل إلى مسطح"""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def unflatten_dict(d: Dict, sep: str = '.') -> Dict:
    """تحويل dictionary مسطح إلى متداخل"""
    result = {}
    for key, value in d.items():
        parts = key.split(sep)
        current = result
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value
    return result


def find_translation_keys_in_file(file_path: Path) -> Set[str]:
    """استخراج جميع مفاتيح الترجمة من ملف"""
    keys = set()
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # البحث باستخدام جميع الأنماط
            for pattern in PATTERNS:
                matches = re.findall(pattern, content)
                keys.update(matches)
    
    except Exception as e:
        print(f"[!] Error reading {file_path}: {e}")
    
    return keys


def scan_directory_for_keys(directory: Path) -> Set[str]:
    """فحص مجلد كامل لاستخراج مفاتيح الترجمة"""
    all_keys = set()
    
    # البحث في ملفات .tsx و .ts
    for ext in ['*.tsx', '*.ts']:
        for file_path in directory.rglob(ext):
            # تجاهل node_modules و .next
            if 'node_modules' in str(file_path) or '.next' in str(file_path):
                continue
            
            keys = find_translation_keys_in_file(file_path)
            if keys:
                all_keys.update(keys)
    
    return all_keys


def find_hardcoded_strings(file_path: Path) -> List[Tuple[int, str]]:
    """البحث عن النصوص الثابتة (hardcoded) في ملف"""
    hardcoded = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
            for line_num, line in enumerate(lines, 1):
                # تجاهل التعليقات
                if line.strip().startswith('//') or line.strip().startswith('/*'):
                    continue
                
                # البحث عن نصوص بين علامات التنصيص
                # داخل JSX: >Text<
                jsx_text = re.findall(r'>\s*([A-Z][a-zA-Z\s]{2,})\s*<', line)
                for text in jsx_text:
                    if not re.search(r'\{.*\}', text):  # ليس متغير
                        hardcoded.append((line_num, text.strip()))
                
                # Button labels, placeholders, etc.
                # مثلاً: placeholder="Enter name"
                placeholders = re.findall(r'(?:placeholder|title|label|aria-label)=["\']([^"\']+)["\']', line)
                for text in placeholders:
                    if not text.startswith('{') and len(text) > 2:
                        hardcoded.append((line_num, text))
    
    except Exception as e:
        print(f"[!] Error scanning {file_path}: {e}")
    
    return hardcoded


# ═════════════════════════════════════════════════════════════════
# الفحص الرئيسي
# ═════════════════════════════════════════════════════════════════

def main():
    print("="*70)
    print("Arabic Translation Completeness Checker")
    print("="*70)
    print()
    
    # 1. تحميل ملفات الترجمة
    print("[*] Loading translation files...")
    en_data = load_json(EN_FILE)
    ar_data = load_json(AR_FILE)
    
    if not en_data:
        print("[!] Could not load en.json")
        return
    
    # 2. تحويل إلى مفاتيح مسطحة
    en_flat = flatten_dict(en_data)
    ar_flat = flatten_dict(ar_data)
    
    print(f"[+] English keys: {len(en_flat)}")
    print(f"[+] Arabic keys: {len(ar_flat)}")
    print()
    
    # 3. البحث عن المفاتيح المفقودة
    print("[*] Checking for missing Arabic translations...")
    missing_keys = set(en_flat.keys()) - set(ar_flat.keys())
    
    if missing_keys:
        print(f"[!] Found {len(missing_keys)} missing keys in ar.json:")
        for key in sorted(missing_keys)[:20]:  # أول 20 فقط
            print(f"   - {key}: {en_flat[key]}")
        if len(missing_keys) > 20:
            print(f"   ... and {len(missing_keys) - 20} more")
    else:
        print("[+] All keys from en.json exist in ar.json")
    print()
    
    # 4. فحص الكود للبحث عن استخدام المفاتيح
    print("[*] Scanning code for translation keys...")
    used_keys = set()
    
    for directory in SCAN_DIRS:
        if directory.exists():
            keys = scan_directory_for_keys(directory)
            used_keys.update(keys)
            print(f"   {directory.name}: {len(keys)} keys found")
    
    print(f"[+] Total unique keys used in code: {len(used_keys)}")
    print()
    
    # 5. البحث عن مفاتيح مستخدمة ولكن غير موجودة
    print("[*] Checking for keys used but not defined...")
    undefined_keys = used_keys - set(en_flat.keys())
    
    if undefined_keys:
        print(f"[!] Found {len(undefined_keys)} keys used but not in en.json:")
        for key in sorted(undefined_keys)[:20]:
            print(f"   - {key}")
        if len(undefined_keys) > 20:
            print(f"   ... and {len(undefined_keys) - 20} more")
    else:
        print("[+] All used keys are defined in en.json")
    print()
    
    # 6. البحث عن نصوص ثابتة (hardcoded)
    print("[*] Scanning for hardcoded strings...")
    hardcoded_by_file = {}
    
    for directory in SCAN_DIRS:
        if directory.exists():
            for file_path in directory.rglob('*.tsx'):
                if 'node_modules' not in str(file_path):
                    hardcoded = find_hardcoded_strings(file_path)
                    if hardcoded:
                        hardcoded_by_file[str(file_path.relative_to(FRONTEND_DIR))] = hardcoded
    
    if hardcoded_by_file:
        print(f"[!] Found hardcoded strings in {len(hardcoded_by_file)} files")
        print("   (See hardcoded_strings.txt for details)")
        
        # حفظ في ملف منفصل
        with open('hardcoded_strings.txt', 'w', encoding='utf-8') as f:
            for file_path, strings in hardcoded_by_file.items():
                f.write(f"\n{file_path}:\n")
                for line_num, text in strings[:10]:  # أول 10 فقط
                    f.write(f"  Line {line_num}: {text}\n")
    else:
        print("[+] No obvious hardcoded strings found")
    print()
    
    # 7. إنشاء ملف ar.json محدّث
    print("[*] Creating updated ar.json with missing keys...")
    
    # إضافة المفاتيح المفقودة
    for key in missing_keys:
        ar_flat[key] = f"[TODO: AR] {en_flat[key]}"
    
    # تحويل إلى متداخل
    ar_updated = unflatten_dict(ar_flat)
    
    # حفظ
    output_file = LOCALES_DIR / "ar_updated.json"
    save_json(ar_updated, output_file)
    
    print()
    print("="*70)
    print("SUMMARY")
    print("="*70)
    print(f"English keys:           {len(en_flat)}")
    print(f"Arabic keys:            {len(ar_flat)}")
    print(f"Missing in Arabic:      {len(missing_keys)}")
    print(f"Keys used in code:      {len(used_keys)}")
    print(f"Undefined keys:         {len(undefined_keys)}")
    print(f"Files with hardcoded:   {len(hardcoded_by_file)}")
    print()
    
    if missing_keys:
        print("[!] ACTION REQUIRED: Update ar.json with missing translations")
        print(f"   Review: {output_file}")
    else:
        print("[+] Translation files are complete!")
    
    print()
    print("="*70)


if __name__ == '__main__':
    main()
