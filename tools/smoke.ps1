# Loads timer.html normally in headless Edge: saves a screenshot and the DOM.
param(
  [string]$Page = (Join-Path $PSScriptRoot '..\timer.html'),
  [string]$Size = '1280,720',
  [string]$Hash = ''
)

$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$path = (Resolve-Path $Page).Path
$url = 'file:///' + ($path -replace '\\', '/') + $Hash
$profileDir = Join-Path $env:TEMP 'timer-smoke-profile'
$png = Join-Path $env:TEMP 'timer-smoke.png'
$dom = Join-Path $env:TEMP 'timer-smoke-dom.txt'
foreach ($f in @($png, $dom)) { if (Test-Path $f) { Remove-Item $f -Force } }

Start-Process -FilePath $edge -Wait -NoNewWindow `
  -ArgumentList @('--headless', '--disable-gpu', "--user-data-dir=`"$profileDir`"", '--hide-scrollbars',
                  "--window-size=$Size", "--screenshot=`"$png`"", $url)
Start-Process -FilePath $edge -Wait -NoNewWindow -RedirectStandardOutput $dom `
  -ArgumentList @('--headless', '--disable-gpu', "--user-data-dir=`"$profileDir`"", '--dump-dom', $url)

Write-Output "screenshot: $png"
Write-Output "dom: $dom"
