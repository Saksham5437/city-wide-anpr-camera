$sqlPath = "$env:TEMP\reset_root.sql"
Set-Content -Path $sqlPath -Value "ALTER USER 'root'@'localhost' IDENTIFIED BY 'Sakre5437'; CREATE DATABASE IF NOT EXISTS city_anpr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; FLUSH PRIVILEGES;"

Write-Host "Checking MySQL80 Service..."
$svc = Get-Service -Name MySQL80 -ErrorAction SilentlyContinue
Write-Host "Current MySQL80 Status: $($svc.Status)"

try {
    Stop-Service -Name MySQL80 -Force -ErrorAction Stop
    Write-Host "[+] Stopped MySQL80 service successfully."
} catch {
    Write-Host "[!] Notice stopping service: $_"
}

$mysqld = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
$myini = "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"

if (Test-Path $mysqld) {
    Write-Host "Running mysqld --init-file to reset root password to Sakre5437..."
    $proc = Start-Process -FilePath $mysqld -ArgumentList "--defaults-file=`"$myini`"", "--init-file=`"$sqlPath`"" -PassThru
    Start-Sleep -Seconds 4
    if ($proc -and !$proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[+] Password reset query executed."
}

try {
    Start-Service -Name MySQL80 -ErrorAction Stop
    Write-Host "[+] Started MySQL80 service successfully."
} catch {
    Write-Host "[!] Notice starting service: $_"
}

Remove-Item -Path $sqlPath -Force -ErrorAction SilentlyContinue
