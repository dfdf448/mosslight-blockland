$ErrorActionPreference='Stop'
$taskName='Mosslight-LocalGame-8790'
$gameRoot=$PSScriptRoot
$hostScript=Join-Path $gameRoot 'service-host.ps1'
$userIdentity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$powershellPath=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$arguments='-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$hostScript+'"'
# 使用 Windows 原生接口，不依赖部分系统缺失的 WMI 管理类。
$scheduler=New-Object -ComObject 'Schedule.Service'
$scheduler.Connect()
$definition=$scheduler.NewTask(0)
$definition.RegistrationInfo.Description='苔光本机游戏：登录自动运行，服务异常退出自动恢复，仅监听127.0.0.1:8790。'
$definition.Principal.UserId=$userIdentity
$definition.Principal.LogonType=3
$definition.Principal.RunLevel=0
$definition.Settings.Enabled=$true
$definition.Settings.Hidden=$true
$definition.Settings.AllowDemandStart=$true
$definition.Settings.StartWhenAvailable=$true
$definition.Settings.DisallowStartIfOnBatteries=$false
$definition.Settings.StopIfGoingOnBatteries=$false
$definition.Settings.ExecutionTimeLimit='PT0S'
$definition.Settings.MultipleInstances=2
$definition.Settings.RestartCount=999
$definition.Settings.RestartInterval='PT1M'
$trigger=$definition.Triggers.Create(9)
$trigger.UserId=$userIdentity
# 每分钟的唤醒检查只在任务未运行时生效，避免守护本身退出后长期无人拉起。
$daily=$definition.Triggers.Create(2)
$daily.StartBoundary=(Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
$daily.DaysInterval=1
$daily.Repetition.Interval='PT1M'
$daily.Repetition.Duration='P1D'
$action=$definition.Actions.Create(0)
$action.Path=$powershellPath
$action.Arguments=$arguments
$action.WorkingDirectory=$gameRoot
$registered=$scheduler.GetFolder('\').RegisterTaskDefinition($taskName,$definition,6,$userIdentity,$null,3)
$registered.Run($null) | Out-Null
Write-Output '已安装当前用户的游戏自启动任务；无需管理员权限，不保存密码。'


