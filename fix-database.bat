@echo off
echo Исправление проблемы с UUID в PostgreSQL...

cd backend

echo Создание временной миграции для добавления расширения uuid-ossp...
mkdir prisma\migrations\20250726_fix_uuid_extension
echo -- Enable uuid-ossp extension > prisma\migrations\20250726_fix_uuid_extension\migration.sql
echo CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; >> prisma\migrations\20250726_fix_uuid_extension\migration.sql

echo Применение миграции...
call npx prisma migrate deploy

echo Проверка состояния...
call npx prisma migrate status

echo Готово!
pause