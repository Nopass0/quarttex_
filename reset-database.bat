@echo off
echo ВНИМАНИЕ! Этот скрипт полностью пересоздаст базу данных!
echo Все данные будут удалены!
echo.
set /p confirm="Вы уверены? (yes/no): "
if /i not "%confirm%"=="yes" goto :end

cd backend

echo Сброс базы данных...
call npx prisma migrate reset --force

echo Генерация Prisma клиента...
call npx prisma generate

echo Проверка состояния миграций...
call npx prisma migrate status

echo База данных успешно пересоздана!

:end
pause