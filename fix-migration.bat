@echo off
echo Исправление проблемной миграции...

cd backend

echo Откат проблемной миграции...
call npx prisma migrate resolve --rolled-back "20250723000005_add_missing_tables"

echo Создание исправленной версии миграции...
powershell -Command "(Get-Content 'prisma\migrations\20250723000005_add_missing_tables\migration.sql') -replace 'gen_random_uuid\(\)', 'uuid_generate_v4()' | Set-Content 'prisma\migrations\20250723000005_add_missing_tables\migration.sql'"

echo Добавление расширения uuid-ossp в начало миграции...
powershell -Command "$content = Get-Content 'prisma\migrations\20250723000005_add_missing_tables\migration.sql'; @('-- Enable uuid-ossp extension', 'CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";', '') + $content | Set-Content 'prisma\migrations\20250723000005_add_missing_tables\migration.sql'"

echo Применение исправленной миграции...
call npx prisma migrate deploy

echo Проверка состояния...
call npx prisma migrate status

echo Готово!
pause