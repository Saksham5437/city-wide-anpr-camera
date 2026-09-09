@echo off
echo =======================================================
echo   MySQL 8.0 Root Password Reset Tool (to Sakre5437)
echo =======================================================
echo.
echo Stopping MySQL80 service...
net stop MySQL80

echo Creating reset init file...
echo ALTER USER 'root'@'localhost' IDENTIFIED BY 'Sakre5437'; > "%TEMP%\reset_mysql.sql"
echo CREATE DATABASE IF NOT EXISTS city_anpr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; >> "%TEMP%\reset_mysql.sql"
echo FLUSH PRIVILEGES; >> "%TEMP%\reset_mysql.sql"

echo Running password reset...
start "" /b "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" --init-file="%TEMP%\reset_mysql.sql"

timeout /t 4 /nobreak > nul
taskkill /f /im mysqld.exe > nul 2>&1
del "%TEMP%\reset_mysql.sql" > nul 2>&1

echo Restarting MySQL80 service...
net start MySQL80

echo.
echo =======================================================
echo   SUCCESS! MySQL root password is now set to: Sakre5437
echo   Database 'city_anpr' is created and ready!
echo =======================================================
pause
