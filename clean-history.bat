@echo off
set FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch --force --index-filter "git rm -r --cached --ignore-unmatch frontend-next/.next/" --prune-empty --tag-name-filter cat -- --all
