@echo off
chcp 65001 > nul
title 온 세상의 뮤직 :: WMP - 플레이어 실행기

echo ========================================================
echo   🎵 온 세상의 뮤직 :: WMP (World Music Player) 시작 중...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] 백엔드 및 프론트엔드 서비스 확인 및 백그라운드 실행 (pm2)...
pm2 describe wmp-server > nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo  - 서비스가 이미 백그라운드(pm2)에서 실행 중입니다.
) else (
    echo  - pm2로 백엔드와 프론트엔드를 백그라운드 시작합니다...
    pm2 start ecosystem.config.cjs
    pm2 save --force > nul 2>&1
    timeout /t 3 /nobreak > nul
)

echo [2/2] 브라우저에서 음악 플레이어 열기...
timeout /t 2 /nobreak > nul
start http://localhost:8080

echo.
echo ========================================================
echo   ✨ 플레이어가 웹 브라우저(http://localhost:8080)에서 열렸습니다!
echo   ✨ 서버는 이제 Antigravity를 닫아도 계속 실행됩니다! (pm2)
echo   ✨ 온 세상의 뮤직 :: WMP와 함께 즐거운 음악 감상 되세요!
echo ========================================================
echo.
echo   [서버 관리 명령어]
echo   pm2 status         - 서버 상태 확인
echo   pm2 logs wmp-server - 서버 로그 확인
echo   pm2 stop wmp-server - 서버 중지
echo   pm2 restart wmp-server - 서버 재시작
echo.
timeout /t 7
exit
