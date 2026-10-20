$ErrorActionPreference='Stop'
$taskName='Mosslight-LocalGame-8790'
$scheduler=New-Object -ComObject 'Schedule.Service'
$scheduler.Connect()
$folder=$scheduler.GetFolder('\')
try { $task=$folder.GetTask($taskName);$task.Stop(0);$folder.DeleteTask($taskName,0) } catch { if($_.Exception.HResult -ne -2147024894) { throw } }
Write-Output '已移除本机游戏自启动任务；游戏世界与仓库存档保留。'


