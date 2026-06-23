@echo off
echo ========================================================
echo       Starting StartupPilot AI Backend Automatically
echo ========================================================
echo.

cd /d "%~dp0backend"

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not added to your PATH.
    echo Please install Python 3.10 or higher from python.org and ensure "Add to PATH" is checked.
    pause
    exit /b
)

:: Check if virtual environment exists, create if not
if not exist "venv\" (
    echo [INFO] First time setup: Creating Python virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b
    )
)

:: Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

:: Install or update dependencies
echo [INFO] Checking dependencies...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b
)

:: Check for .env file
if not exist ".env" (
    echo [WARNING] No .env file found in the backend directory!
    echo Creating one from .env.example...
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [INFO] Created .env file. Please edit it with your API keys.
    ) else (
        echo [ERROR] .env.example not found either. The server might fail without environment variables.
    )
)

:: Start the FastAPI server
echo.
echo [SUCCESS] Backend is ready! Starting FastAPI development server...
echo.
fastapi dev main.py

pause
