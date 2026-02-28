@echo off
setlocal enabledelayedexpansion

:: RGFX MAME Launcher
:: Usage: launch-mame.bat <system_or_rom> [additional_args...]
:: Examples:
::   launch-mame.bat pacman
::   launch-mame.bat galaga
::   launch-mame.bat nes -cart roms\smb.nes

:: Get the directory where this script is located (strip trailing backslash)
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: Determine the rgfx.lua path based on environment
:: In development: rgfx-hub\assets\mame\rgfx.lua
:: In production: <install folder>\resources\mame\rgfx.lua

:: Check if we're in the packaged app (production)
if exist "%SCRIPT_DIR%\..\resources\mame\rgfx.lua" (
    set "RGFX_LUA=%SCRIPT_DIR%\..\resources\mame\rgfx.lua"
) else if exist "%SCRIPT_DIR%\..\rgfx-hub\assets\mame\rgfx.lua" (
    :: Development: script is in project root scripts\
    set "RGFX_LUA=%SCRIPT_DIR%\..\rgfx-hub\assets\mame\rgfx.lua"
) else (
    echo Error: Could not find rgfx.lua
    echo Expected locations:
    echo   Development: %SCRIPT_DIR%\..\rgfx-hub\assets\mame\rgfx.lua
    echo   Production:  %SCRIPT_DIR%\..\resources\mame\rgfx.lua
    exit /b 1
)

:: Verify rgfx.lua exists
if not exist "%RGFX_LUA%" (
    echo Error: rgfx.lua not found at: %RGFX_LUA%
    exit /b 1
)

:: Find MAME executable - check common locations first, then PATH
set "MAME_EXEC="
if exist "%USERPROFILE%\mame\mame.exe" (
    set "MAME_EXEC=%USERPROFILE%\mame\mame.exe"
) else if exist "C:\mame\mame.exe" (
    set "MAME_EXEC=C:\mame\mame.exe"
) else (
    where mame >nul 2>&1
    if not errorlevel 1 (
        for /f "delims=" %%i in ('where mame') do set "MAME_EXEC=%%i"
    )
)
if not defined MAME_EXEC (
    echo Error: MAME not found
    echo.
    echo Checked locations:
    echo   - %USERPROFILE%\mame\mame.exe
    echo   - C:\mame\mame.exe
    echo   - PATH
    echo.
    echo Please install MAME to one of these locations or add it to your PATH.
    exit /b 1
)

:: Create MAME home directory if needed
if not exist "%USERPROFILE%\.mame" mkdir "%USERPROFILE%\.mame"

:: Parse ROM name from args (first non-flag argument)
set "ROM_NAME="
set "CART_NAME="
set "NEXT_IS_CART=0"
set "ARGS="

for %%a in (%*) do (
    if !NEXT_IS_CART!==1 (
        set "CART_NAME=%%~na"
        set "NEXT_IS_CART=0"
    )
    if "%%a"=="-cart" set "NEXT_IS_CART=1"
    if "%%a"=="-cartridge" set "NEXT_IS_CART=1"
    if not defined ROM_NAME (
        set "TEST_ARG=%%a"
        if not "!TEST_ARG:~0,1!"=="-" set "ROM_NAME=%%a"
    )
)

:: Use cart name if available (console), otherwise ROM name (arcade)
if defined CART_NAME (
    set "GAME_NAME=%CART_NAME%"
) else (
    set "GAME_NAME=%ROM_NAME%"
)
set "EVENT_LOG=%USERPROFILE%\.rgfx\interceptor-events.log"

echo RGFX MAME Launcher
echo   MAME: %MAME_EXEC%
echo   RGFX: %RGFX_LUA%
echo   Game: %GAME_NAME%
echo.

:: Change to MAME home directory so relative paths in mame.ini resolve here
pushd "%USERPROFILE%\.mame"

:: Run MAME with autoboot script
"%MAME_EXEC%" %* -rompath "%USERPROFILE%\mame-roms" -window -nomaximize -skip_gameinfo -autoboot_script "%RGFX_LUA%"
set "MAME_EXIT_CODE=%ERRORLEVEL%"

popd

:: Emit shutdown event after MAME exits
if not exist "%USERPROFILE%\.rgfx" mkdir "%USERPROFILE%\.rgfx"
if defined GAME_NAME (
    echo rgfx/mame-exit %GAME_NAME%>> "%EVENT_LOG%"
) else (
    echo rgfx/mame-exit unknown>> "%EVENT_LOG%"
)

endlocal & exit /b %MAME_EXIT_CODE%
