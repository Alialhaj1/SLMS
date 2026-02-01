@echo off
docker logs slms-backend-1 --tail 50 > backend-latest.log
type backend-latest.log
