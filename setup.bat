@echo off
echo Setting up Entry Manager...

REM Check if Docker is installed
docker --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not installed or not running.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    echo and make sure it is running before continuing.
    pause
    exit /b 1
)

REM Check for .env.example
if not exist .env.example (
    echo Error: .env.example file not found!
    echo Please make sure you're running this script in the correct directory.
    pause
    exit /b 1
)

REM Create directories
echo Creating required directories...
mkdir public\uploads public\exports public\backups 2>nul
if %errorlevel% neq 0 (
    echo Warning: Some directories could not be created. They might already exist.
)

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
    echo Debug: Current directory is:
    cd
    echo Debug: Saving API key to .env.local...
    
    REM Direct file write approach
    echo OPENAI_API_KEY=%API_KEY%> .env.local
    echo NEXT_PUBLIC_OPENAI_API_KEY=%API_KEY%>> .env.local
    
    if %errorlevel% neq 0 (
        echo Error: Failed to save API key to .env.local
        pause
        exit /b 1
    )
    echo API key has been saved successfully!
    echo Debug: Verifying .env.local exists:
    dir .env.local
    set API_KEY_SET=1
) else (
    echo.
    echo .env.local created with placeholder API key.
    echo You can add your API key later by editing .env.local
)

echo Debug: Creating docker-compose.yml...
REM Create docker-compose.yml if it doesn't exist
if not exist docker-compose.yml (
    echo Creating docker-compose.yml...
    echo version: '3.8' > docker-compose.yml
    echo services: >> docker-compose.yml
    echo   app: >> docker-compose.yml
    echo     image: schuttpj1986/entry-manager:latest >> docker-compose.yml
    echo     ports: >> docker-compose.yml
    echo       - "3000:3000" >> docker-compose.yml
    echo     volumes: >> docker-compose.yml
    echo       - ./.env.local:/app/.env.local >> docker-compose.yml
    echo       - ./public/uploads:/app/public/uploads >> docker-compose.yml
    echo       - ./public/exports:/app/public/exports >> docker-compose.yml
    echo       - ./public/backups:/app/public/backups >> docker-compose.yml
    echo       - app-data:/app/data >> docker-compose.yml
    echo     restart: unless-stopped >> docker-compose.yml
    echo volumes: >> docker-compose.yml
    echo   app-data: >> docker-compose.yml
    echo     driver: local >> docker-compose.yml
)

echo.
echo Downloading Docker image...
echo This might take a few minutes depending on your internet connection...
docker pull schuttpj1986/entry-manager:latest
if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to download Docker image.
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)
echo Docker image downloaded successfully!

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
echo Next steps:
echo 1. Run: docker-compose up -d
echo 2. Open http://localhost:3000 in your browser
echo.
echo Press any key to exit...
pause > nul 