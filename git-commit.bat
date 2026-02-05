@echo off
cd /d c:\projects\slms
echo Committing .next cache removal...
git commit -m "Remove .next cache from git tracking"
echo.
echo Pushing to remote...
git push origin main
echo Done!
echo Done!
