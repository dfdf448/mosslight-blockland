$ErrorActionPreference='Stop'
$gameRoot=$PSScriptRoot
$gameNode=Join-Path $gameRoot 'runtime\node.exe'
$gameSupervisor=Join-Path $gameRoot 'supervise.cjs'
if(-not (Test-Path -LiteralPath $gameNode)) { throw '游戏运行环境缺失，请重新解压完整便携包。' }
# 由 Windows 计划任务启动，独立于浏览器和开发工具会话。
$hostProcess=Start-Process -FilePath $gameNode -ArgumentList @('"'+$gameSupervisor+'"') -WorkingDirectory $gameRoot -WindowStyle Hidden -PassThru
$hostProcess.WaitForExit()
exit $hostProcess.ExitCode



