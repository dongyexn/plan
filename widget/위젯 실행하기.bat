@echo off
title H · 주요업무현황 바탕화면 위젯
cd /d "%~dp0"
echo.
echo   H · 주요업무현황 - 바탕화면 위젯
echo   ------------------------------------------------
echo.

if not exist "main.js" (
  echo   [!] 이 파일이 widget 폴더 안에 있지 않습니다.
  echo       압축을 먼저 풀고, 풀린 폴더의 widget 안에서 실행해 주세요.
  echo       ^(압축 파일 안에서 바로 실행하면 동작하지 않습니다^)
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo   [!] 이 PC에 Node.js 가 없습니다. 한 번만 설치하면 됩니다.
  echo.
  echo       1^) 아무 키나 누르면 다운로드 페이지가 열립니다.
  echo       2^) "LTS" 를 받아 설치하세요. 옵션은 그대로 두고 다음만 누르면 됩니다.
  echo       3^) 설치가 끝나면 이 파일을 다시 두 번 누르세요.
  echo.
  pause
  start "" "https://nodejs.org/ko/download"
  exit /b 1
)

if not exist "node_modules" (
  echo   처음 실행이라 필요한 파일을 내려받습니다. 몇 분 걸릴 수 있습니다.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   [!] 내려받기에 실패했습니다. 사내망이 막혀 있을 수 있습니다.
    echo       위에 나온 빨간 글씨를 담당자에게 보여 주세요.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo   위젯을 띄웁니다. 이 검은 창은 닫지 마세요 ^(닫으면 위젯도 꺼집니다^).
echo   표시 방식은 작업표시줄 오른쪽 아래 트레이 아이콘에서 바꿉니다.
echo.
call npm start

echo.
echo   위젯이 종료되었습니다.
pause
