$wshShell = New-Object -ComObject WScript.Shell
$desktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktopPath "모든 세계의 노래.lnk"
$targetPath = "C:\Users\wlsgu\Desktop\모든 세계의 노래\모든_세계의_노래_실행.bat"

$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = "C:\Users\wlsgu\Desktop\모든 세계의 노래"
$shortcut.Description = "모든 세계의 노래 뮤직 플레이어"
$shortcut.Save()

Write-Host "Shortcut created successfully at $shortcutPath"
