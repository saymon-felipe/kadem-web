$ErrorActionPreference = 'Stop'
$endpoint = [Uri]'ws://127.0.0.1:9223/devtools/page/7894'
$assetRoot = Join-Path $PSScriptRoot 'dist'
$localHtml = Get-Content -Raw (Join-Path $assetRoot 'index.html')
$localMain = ([regex]::Match($localHtml, 'src="(?<path>/assets/index-[^"]+\.js)"')).Groups['path'].Value
$socket = [System.Net.WebSockets.ClientWebSocket]::new()
$token = [Threading.CancellationToken]::None
$socket.ConnectAsync($endpoint, $token).GetAwaiter().GetResult()

function Send-Cdp([object]$payload) {
  $json = $payload | ConvertTo-Json -Compress -Depth 12
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $socket.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $token).GetAwaiter().GetResult()
}

$assets = @{}
Get-ChildItem -LiteralPath $assetRoot -Recurse -File | ForEach-Object {
  $relative = $_.FullName.Substring($assetRoot.Length).Replace('\', '/')
  $assets[$relative] = [Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))
}
# A substituição é transitória: não atualizar o service worker instalado.
$assets['/registerSW.js'] = ''

Send-Cdp @{ id = 1; method = 'Network.setBypassServiceWorker'; params = @{ bypass = $true } }
Send-Cdp @{ id = 2; method = 'Fetch.enable'; params = @{ patterns = @(@{ urlPattern = '*://dev-kadem.netlify.app/*'; requestStage = 'Request' }) } }
Send-Cdp @{ id = 3; method = 'Page.reload'; params = @{ ignoreCache = $true } }
Write-Output "LOCAL_PWA_OVERRIDE_READY $localMain"

while ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
  $stream = [IO.MemoryStream]::new()
  do {
    $chunk = New-Object byte[] 65536
    $result = $socket.ReceiveAsync([ArraySegment[byte]]::new($chunk), $token).GetAwaiter().GetResult()
    if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { break }
    $stream.Write($chunk, 0, $result.Count)
  } while (-not $result.EndOfMessage)
  if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { break }

  $message = ([Text.Encoding]::UTF8.GetString($stream.ToArray())) | ConvertFrom-Json
  if ($message.method -ne 'Fetch.requestPaused') { continue }
  $requestId = $message.params.requestId
  $path = ([Uri]$message.params.request.url).AbsolutePath
  if ($path -eq '/') { $path = '/index.html' }

  if ($assets.ContainsKey($path)) {
    $extension = [IO.Path]::GetExtension($path).ToLowerInvariant()
    $contentType = switch ($extension) {
      '.html' { 'text/html' }
      '.js' { 'text/javascript' }
      '.css' { 'text/css' }
      '.webp' { 'image/webp' }
      '.png' { 'image/png' }
      '.jpg' { 'image/jpeg' }
      '.jpeg' { 'image/jpeg' }
      '.ico' { 'image/x-icon' }
      '.webmanifest' { 'application/manifest+json' }
      default { 'application/octet-stream' }
    }
    Send-Cdp @{ id = 10; method = 'Fetch.fulfillRequest'; params = @{
      requestId = $requestId
      responseCode = 200
      responseHeaders = @(
        @{ name = 'Content-Type'; value = $contentType },
        @{ name = 'Cache-Control'; value = 'no-store' }
      )
      body = $assets[$path]
    } }
    Write-Output "LOCAL_ASSET $path"
  } else {
    Send-Cdp @{ id = 11; method = 'Fetch.continueRequest'; params = @{ requestId = $requestId } }
  }
}
