$ErrorActionPreference='Stop'
$gameUrl='http://127.0.0.1:8790'
function Read-GameHealth { try { $result=Invoke-RestMethod -Uri ($gameUrl+'/__mosslight_health') -TimeoutSec 2;if($result.game -eq 'mosslight-islands') { return $result } } catch {};return $null }
if(-not (Read-GameHealth)) { & (Join-Path $PSScriptRoot 'install-service.ps1') }
for($attempt=0;$attempt -lt 50;$attempt++) {
  if(Read-GameHealth) { Start-Process -FilePath 'explorer.exe' -ArgumentList ($gameUrl+'/?v=4.0');exit 0 }
  Start-Sleep -Milliseconds 500
}
throw '游戏服务尚未就绪。请确认游戏文件完整，查看 .runtime 文件夹中的启动日志，或运行“修复启动.cmd”。'

