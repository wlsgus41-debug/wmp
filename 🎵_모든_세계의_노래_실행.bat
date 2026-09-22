@echo off
chcp 65001 > nul
title 모든 세계의 노래 - 플레이어 실행기

echo ========================================================
echo   🎵 모든 세계의 노래 (World Music Player) 시작 중...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] 백엔드 API 서버 확인 및 실행...
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo  - 백엔드 서버가 이미 실행 중입니다.
) else (
    echo  - 백엔드 서버를 실행합니다...
    start /min "WorldMusicPlayer_Backend" cmd /c "cd /d "%~dp0server" && npm start"
    timeout /t 2 /nobreak > nul
)

echo [2/3] 프론트엔드 웹 플레이어 확인 및 실행...
start /min "WorldMusicPlayer_Frontend" cmd /c "cd /d "%~dp0client" && npm run dev"

echo [3/3] 브라우저에서 음악 플레이어 열기...
timeout /t 2 /nobreak > nul
start http://localhost:8080

echo.
echo ========================================================
echo   ✨ 플레이어가 웹 브라우저(http://localhost:8080)에서 열렸습니다!
echo   ✨ 즐거운 음악 감상 되세요!
echo ========================================================
echo.
timeout /t 5
exit
