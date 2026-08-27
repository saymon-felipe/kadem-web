$ErrorActionPreference = 'Stop'
$socket = [System.Net.WebSockets.ClientWebSocket]::new()
$token = [Threading.CancellationToken]::None
$socket.ConnectAsync([Uri]'ws://127.0.0.1:9223/devtools/page/7892', $token).GetAwaiter().GetResult()

function Send-Cdp([object]$payload) {
  $json = $payload | ConvertTo-Json -Compress -Depth 12
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $socket.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $token).GetAwaiter().GetResult()
}

Send-Cdp @{ id = 1; method = 'Runtime.evaluate'; params = @{
  expression = '(async()=>{const email=localStorage.getItem("kadem_remembered_email");const config=JSON.parse(Object.entries(localStorage).find(([key])=>key.startsWith("kadem_vault_biometric:" ))[1]);const response=await fetch("https://coretest-kadem-d8b86a10b9e8.herokuapp.com/api/auth/biometrics/login/options",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});const data=await response.json();const credential=(data.allowCredentials||[]).find(x=>x.id===config.credential_id);return JSON.stringify({status:response.status,rpId:data.rpId,timeout:data.timeout,userVerification:data.userVerification,credentialFound:!!credential,transports:credential?.transports})})()'
  awaitPromise = $true
  returnByValue = $true
} }

do {
  $buffer = New-Object byte[] 65536
  $result = $socket.ReceiveAsync([ArraySegment[byte]]::new($buffer), $token).GetAwaiter().GetResult()
  $text = [Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
  Write-Output $text
} while ($text -notmatch '"id":1')

$socket.Dispose()
