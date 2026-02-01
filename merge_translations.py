#!/usr/bin/env python3
"""
Merge Missing Translation Keys
Merges the missing translation keys into existing en.json and ar.json files
"""

import json
from pathlib import Path

def load_json(file_path):
    """Load JSON file"""
    # Some repo JSON files may include a UTF-8 BOM; utf-8-sig handles both.
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        return json.load(f)

def save_json(file_path, data):
    """Save JSON file with proper formatting"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[+] Saved: {file_path}")

def deep_merge(base, updates):
    """
    Deep merge two dictionaries
    Updates take precedence over base
    """
    result = base.copy()
    
    for key, value in updates.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            # Recursively merge nested dictionaries
            result[key] = deep_merge(result[key], value)
        else:
            # Add or overwrite with new value
            result[key] = value
    
    return result

def main():
    print("=" * 60)
    print("Merging Missing Translation Keys")
    print("=" * 60)
    
    # Paths
    project_root = Path(r"c:\projects\slms")
    frontend_dir = project_root / "frontend-next"
    locales_dir = frontend_dir / "locales"
    
    # Existing translation files
    en_json_path = locales_dir / "en.json"
    ar_json_path = locales_dir / "ar.json"
    
    # New translation files
    missing_en_path = project_root / "missing_translation_keys.json"
    missing_ar_path = project_root / "missing_translation_keys_ar.json"
    
    # Backup original files
    en_backup_path = locales_dir / "en.json.backup"
    ar_backup_path = locales_dir / "ar.json.backup"
    
    print("\n[*] Loading existing translation files...")
    en_data = load_json(en_json_path)
    ar_data = load_json(ar_json_path)
    print(f"    - English keys: {len(en_data)}")
    print(f"    - Arabic keys: {len(ar_data)}")
    
    print("\n[*] Loading missing translation keys...")
    missing_en = load_json(missing_en_path)
    missing_ar = load_json(missing_ar_path)
    print(f"    - Missing English keys: {len(missing_en)}")
    print(f"    - Missing Arabic keys: {len(missing_ar)}")
    
    print("\n[*] Creating backups...")
    save_json(en_backup_path, en_data)
    save_json(ar_backup_path, ar_data)
    
    print("\n[*] Merging translation keys...")
    
    # Merge English
    merged_en = deep_merge(en_data, missing_en)
    print(f"    - Merged English keys: {len(merged_en)}")
    
    # Merge Arabic
    merged_ar = deep_merge(ar_data, missing_ar)
    print(f"    - Merged Arabic keys: {len(merged_ar)}")
    
    print("\n[*] Saving merged translation files...")
    save_json(en_json_path, merged_en)
    save_json(ar_json_path, merged_ar)
    
    print("\n" + "=" * 60)
    print("[+] Translation merge completed successfully!")
    print("=" * 60)
    print("\nBackups created:")
    print(f"  - {en_backup_path}")
    print(f"  - {ar_backup_path}")
    print("\nUpdated files:")
    print(f"  - {en_json_path}")
    print(f"  - {ar_json_path}")
    print("\nNext steps:")
    print("  1. Review the merged translation files")
    print("  2. Update components to use new translation keys")
    print("  3. Test Arabic interface in the application")
    print("=" * 60)

if __name__ == "__main__":
    main()
