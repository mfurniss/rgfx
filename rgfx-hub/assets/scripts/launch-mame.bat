@echo off
setlocal enabledelayedexpansion

:: RGFX MAME Launcher
:: Usage: launch-mame.bat <system_or_rom> [additional_args...]
:: Examples:
::   launch-mame.bat pacman
::   launch-mame.bat galaga
::   launch-mame.bat nes -cart roms\smb.nes

:: --- Configurable paths (edit these to customize) ---
set "RGFX_LUA_PATH={{RGFX_LUA_PATH}}"
set "ROM_PATH={{ROM_PATH}}"
:: Leave empty to auto-detect MAME from common locations and PATH
set "MAME_PATH="

:: Verify rgfx.lua exists
if not exist "%RGFX_LUA_PATH%" (
    echo Error: rgfx.lua not found at: %RGFX_LUA_PATH%
    echo Edit this script to set the correct RGFX_LUA_PATH.
    exit /b 1
)

:: Find MAME executable
if defined MAME_PATH (
    set "MAME_EXEC=%MAME_PATH%"
) else (
    :: Auto-detect MAME from common locations, then PATH
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
)
if not defined MAME_EXEC (
    echo Error: MAME not found
    echo.
    echo Checked locations:
    echo   - %USERPROFILE%\mame\mame.exe
    echo   - C:\mame\mame.exe
    echo   - PATH
    echo.
    echo Set MAME_PATH in this script or install MAME to one of these locations.
    exit /b 1
)

:: Create MAME home directory if needed
if not exist "%USERPROFILE%\.mame" mkdir "%USERPROFILE%\.mame"

:: Parse ROM name from args (first non-flag argument)
set "ROM_NAME="
set "CART_NAME="
set "NEXT_IS_CART=0"

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
echo   RGFX: %RGFX_LUA_PATH%
echo   Game: %GAME_NAME%
echo.

:: Change to MAME home directory so relative paths in mame.ini resolve here
pushd "%USERPROFILE%\.mame"

:: Run MAME with autoboot script
"%MAME_EXEC%" %* -rompath "%ROM_PATH%" -skip_gameinfo -autoboot_script "%RGFX_LUA_PATH%"
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
