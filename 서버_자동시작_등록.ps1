# 🎵 WMP 서버 - Windows 부팅 시 자동 시작 등록 스크립트
# 관리자 권한 없이도 현재 사용자 로그인 시 자동 시작됩니다.

$taskName = "WMP-Server-AutoStart"
$pm2Path = (Get-Command pm2 -ErrorAction SilentlyContinue).Source
if (-not $pm2Path) {
    $pm2Path = "$env:APPDATA\npm\pm2.cmd"
}

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ecosystemFile = Join-Path $projectDir "ecosystem.config.cjs"

# 작업 스케줄러에 등록
$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"cd /d `"$projectDir`" && pm2 start ecosystem.config.cjs && pm2 save`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

# 기존 작업이 있으면 삭제 후 재등록
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "온 세상의 뮤직 WMP 백엔드 서버 자동 시작 (pm2)" | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ WMP 서버 자동 시작 등록 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📌 작업 이름: $taskName" -ForegroundColor Yellow
Write-Host "  🕐 트리거: 로그인 시 자동 실행" -ForegroundColor Yellow
Write-Host "  📁 프로젝트: $projectDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "  이제 PC를 재부팅해도 서버가 자동으로 시작됩니다!" -ForegroundColor Green
Write-Host ""
