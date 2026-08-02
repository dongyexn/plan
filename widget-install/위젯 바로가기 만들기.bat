@echo off
chcp 65001 >nul
title H · 주요업무현황 위젯 바로가기 만들기
echo.
echo   H · 주요업무현황 - 바탕화면에 위젯 바로가기를 만듭니다.
echo.

set "URL=https://dongyexn.github.io/plan/?w=1"
set "NAME=주요업무현황 위젯"

rem 엣지 또는 크롬 찾기 (설치 위치가 PC마다 달라 순서대로 확인한다)
set "BROWSER="
for %%P in (
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do if not defined BROWSER if exist %%P set "BROWSER=%%~P"

if not defined BROWSER (
  echo   [!] 엣지나 크롬을 찾지 못했습니다.
  echo       회사 PC에 엣지가 있는 것이 보통이니, 담당자에게 문의해 주세요.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\%NAME%.lnk');" ^
  "$s.TargetPath='%BROWSER%';" ^
  "$s.Arguments='--app=%URL% --window-size=380,620';" ^
  "$s.IconLocation='%BROWSER%,0';" ^
  "$s.Description='H 주요업무현황 위젯';" ^
  "$s.Save()"

if errorlevel 1 (
  echo   [!] 바로가기를 만들지 못했습니다. 담당자에게 문의해 주세요.
  echo.
  pause
  exit /b 1
)

echo   [완료] 바탕화면에 "%NAME%" 바로가기를 만들었습니다.
echo          두 번 눌러 실행하세요. 주소창 없는 작은 창으로 열립니다.
echo.
pause
