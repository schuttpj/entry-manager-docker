@echo off
setlocal EnableDelayedExpansion

REM Grid View Project Companion Setup
REM Version 1.0.0
REM This script will set up the Grid View Project Companion application

echo Setting up Grid View Project Companion...
echo Version 1.0.0

REM Cleanup function
:CLEANUP
if "%1"=="ERROR" (
    echo.
    echo Cleaning up...
    if exist .env.local del .env.local
    if exist docker-compose.yml del docker-compose.yml
)

:CHECK_DOCKER
REM Check if Docker is installed
docker --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not installed on your system.
    echo.
    echo Opening Docker Desktop download page in your browser...
    start https://www.docker.com/products/docker-desktop
    echo.
    echo Please complete these steps:
    echo 1. Download and install Docker Desktop
    echo 2. Start Docker Desktop
    echo 3. Wait for Docker Desktop to fully start
    echo.
    choice /M "Have you installed Docker Desktop and is it running now"
    if errorlevel 2 (
        echo Setup cancelled. Please run the script again after installing Docker Desktop.
        goto CLEANUP ERROR
        exit /b 1
    )
    goto CHECK_DOCKER
)

REM Check if Docker is running
echo Checking if Docker is running...
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Docker is installed but not running.
    echo Please start Docker Desktop and wait for it to be ready.
    echo.
    choice /M "Is Docker Desktop running now"
    if errorlevel 2 (
        echo Setup cancelled. Please run the script again after starting Docker Desktop.
        goto CLEANUP ERROR
        exit /b 1
    )
    goto CHECK_DOCKER
)

echo Docker is installed and running!
echo.

REM Check if port 3000 is available
echo Checking if port 3000 is available...
netstat -ano | find "0.0.0.0:3000" > nul
if not errorlevel 1 (
    echo.
    echo Warning: Port 3000 is already in use.
    echo The application might not start correctly.
    echo Please free up port 3000 or modify the port in docker-compose.yml after setup.
    echo.
    choice /M "Do you want to continue anyway"
    if errorlevel 2 (
        goto CLEANUP ERROR
        exit /b 1
    )
)

REM Create directories
echo Creating required directories...
mkdir public\uploads public\exports public\backups 2>nul

REM Create .env.example
echo Creating environment file...
(
echo # OpenAI API Key for voice features (optional)
echo OPENAI_API_KEY=your_api_key_here
echo NEXT_PUBLIC_OPENAI_API_KEY=your_api_key_here
) > .env.example

REM Copy .env.example to .env.local
echo.
echo Creating .env.local from template...
copy .env.example .env.local > nul

REM Initialize API key status
set API_KEY_SET=0

REM Prompt for API key
echo.
echo Would you like to add your OpenAI API key for voice features? (Y/N)
set /p ADD_KEY=
if /i "%ADD_KEY%"=="Y" (
    echo.
    echo Please enter your OpenAI API key:
    echo (You can paste it by right-clicking in this window)
    set /p API_KEY=
    
    echo.
    echo Saving API key to .env.local...
    
    REM Direct file write approach
    echo OPENAI_API_KEY=%API_KEY%> .env.local
    echo NEXT_PUBLIC_OPENAI_API_KEY=%API_KEY%>> .env.local
    
    if %errorlevel% neq 0 (
        echo Error: Failed to save API key to .env.local
        goto CLEANUP ERROR
        exit /b 1
    )
    echo API key has been saved successfully!
    set API_KEY_SET=1
) else (
    echo.
    echo .env.local created with placeholder API key.
    echo You can add your API key later by editing .env.local
)

echo Creating docker-compose.yml...
(
echo version: '3.8'
echo services:
echo   app:
echo     image: schuttpj1986/grid-view-project-companion:latest
echo     ports:
echo       - "3000:3000"
echo     volumes:
echo       - ./.env.local:/app/.env.local
echo       - ./public/uploads:/app/public/uploads
echo       - ./public/exports:/app/public/exports
echo       - ./public/backups:/app/public/backups
echo       - indexeddb-data:/app/.next/cache/indexeddb
echo       - app-data:/app/data
echo     restart: unless-stopped
echo volumes:
echo   app-data:
echo     driver: local
echo   indexeddb-data:
echo     driver: local
) > docker-compose.yml

echo.
echo Downloading Docker image...
echo This might take a few minutes depending on your internet connection...
docker pull schuttpj1986/grid-view-project-companion:latest
if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to download Docker image.
    echo Please check your internet connection and try again.
    goto CLEANUP ERROR
    exit /b 1
)
echo Docker image downloaded successfully!

echo.
echo Starting the application...
docker-compose down >nul 2>&1
docker-compose up -d
if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to start the application.
    echo Please try running 'docker-compose up -d' manually.
    goto CLEANUP ERROR
    exit /b 1
)

echo.
echo Setup complete!
echo.
if "%API_KEY_SET%"=="0" (
    echo Note: Voice features will be disabled. You can enable them later by:
    echo 1. Getting an API key from https://platform.openai.com/api-keys
    echo 2. Adding it to .env.local in this folder
) else (
    echo Voice features are enabled with your API key.
)
echo.
echo The application is now running!
echo.
echo IMPORTANT: Do not use Docker Desktop's play button to start the container.
echo Always use these commands instead:
echo - To start: docker-compose up -d
echo - To stop:  docker-compose down
echo.
echo Opening http://localhost:3000 in your default browser...
start http://localhost:3000
echo.
echo Press any key to exit...
pause > nul 