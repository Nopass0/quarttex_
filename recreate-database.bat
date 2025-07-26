@echo off
echo ВНИМАНИЕ! Этот скрипт полностью удалит и пересоздаст базу данных!
echo Все данные будут безвозвратно удалены!
echo.
set /p confirm="Вы уверены? (yes/no): "
if /i not "%confirm%"=="yes" goto :end

echo.
echo Подключение к PostgreSQL и пересоздание базы данных...

rem Читаем параметры подключения из .env файла
cd backend
for /f "tokens=2 delims==" %%a in ('findstr "DATABASE_URL" .env') do set DB_URL=%%a

rem Извлекаем параметры из DATABASE_URL
rem Формат: postgresql://user:password@host:port/database
for /f "tokens=3 delims=/@" %%a in ("%DB_URL%") do set DB_USER_PASS=%%a
for /f "tokens=1 delims=:" %%a in ("%DB_USER_PASS%") do set DB_USER=%%a
for /f "tokens=2 delims=:" %%a in ("%DB_USER_PASS%") do set DB_PASS=%%a
for /f "tokens=4 delims=/@" %%a in ("%DB_URL%") do set DB_HOST_PORT=%%a
for /f "tokens=1 delims=:" %%a in ("%DB_HOST_PORT%") do set DB_HOST=%%a
for /f "tokens=2 delims=:/" %%a in ("%DB_HOST_PORT%") do set DB_PORT=%%a
for /f "tokens=5 delims=/" %%a in ("%DB_URL%") do set DB_NAME=%%a

echo Удаление базы данных %DB_NAME%...
set PGPASSWORD=%DB_PASS%
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d postgres -c "DROP DATABASE IF EXISTS %DB_NAME%;"

echo Создание новой базы данных %DB_NAME%...
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d postgres -c "CREATE DATABASE %DB_NAME%;"

echo Добавление расширения uuid-ossp...
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

echo Применение всех миграций...
call npx prisma migrate deploy

echo Генерация Prisma клиента...
call npx prisma generate

echo Проверка состояния миграций...
call npx prisma migrate status

echo База данных успешно пересоздана!

:end
cd ..
pause