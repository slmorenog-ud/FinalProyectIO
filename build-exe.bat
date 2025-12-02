@echo off
echo ========================================
echo   Construyendo Ejecutable - IO Optimizer
echo ========================================
echo.

echo [1/4] Compilando Frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo ERROR: Fallo al compilar frontend
    pause
    exit /b 1
)

echo.
echo [2/4] Copiando Frontend al Backend...
if exist "..\backend\public" rmdir /s /q "..\backend\public"
mkdir "..\backend\public"
xcopy /s /e /y "dist\*" "..\backend\public\"

echo.
echo [3/4] Compilando Backend...
cd ..\backend
call npm run build
if errorlevel 1 (
    echo ERROR: Fallo al compilar backend
    pause
    exit /b 1
)

echo.
echo [4/4] Creando ejecutable con pkg...
call npx pkg . --targets node18-win-x64 --output ../OptimizadorIO.exe
if errorlevel 1 (
    echo ERROR: Fallo al crear ejecutable
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD COMPLETADO!
echo ========================================
echo.
echo   Ejecutable creado: OptimizadorIO.exe
echo.
pause
