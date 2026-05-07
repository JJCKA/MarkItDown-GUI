@echo off
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set CSC_IDENTITY_AUTO_DISCOVERY=false
echo ==========================================
echo  MarkItDown GUI - Production Build
echo ==========================================
echo.

cd /d %~dp0\..

echo [1/3] Building frontend (Vite + Electron)...
call npm run build:frontend
if %ERRORLEVEL% neq 0 goto :error

echo.
echo [2/3] Building backend (PyInstaller)...
call MDGUI\Scripts\python.exe -m PyInstaller --onefile --name markitdown-backend --distpath release --workpath build\pyinstaller --specpath build --collect-all magika --collect-all onnxruntime --collect-all markitdown --collect-all mammoth --collect-all pdfminer --collect-all openpyxl --collect-all beautifulsoup4 --collect-all pydub --collect-all speechrecognition --collect-all python-docx --collect-all python-pptx --collect-all pdfplumber --collect-all pandas --collect-all pillow --collect-all cryptography --hidden-import comtypes --hidden-import fastapi --hidden-import uvicorn --hidden-import httpx --hidden-import pydantic --hidden-import starlette --additional-hooks-dir scripts\pyinstaller-hooks --runtime-hook scripts\pyinstaller-hooks\runtime-hooks.py backend\main.py
if %ERRORLEVEL% neq 0 goto :error

echo.
echo [3/3] Building installer (electron-builder)...
call npm run build:installer
if %ERRORLEVEL% neq 0 goto :error

echo.
echo ==========================================
echo  Build complete!
echo  Installer: release\MarkItDown Setup *.exe
echo ==========================================
goto :end

:error
echo.
echo BUILD FAILED!
exit /b 1

:end
