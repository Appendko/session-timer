# Drives the real page through clicks and key presses in headless Edge.
# Builds a throwaway copy of timer.html (in %TEMP%) whose bootstrap runs
# uitest-driver.js with a controllable clock, then prints the results.
# Exit code 0 only when the page reports PASS.
param([string]$Page = (Join-Path $PSScriptRoot '..\timer.html'))

$src = Get-Content (Resolve-Path $Page).Path -Raw -Encoding UTF8
$driver = Get-Content (Join-Path $PSScriptRoot 'uitest-driver.js') -Raw -Encoding UTF8
$boot = "else if (typeof startApp === 'function') startApp();"
if (-not $src.Contains($boot)) { Write-Output 'Bootstrap line not found in timer.html.'; exit 2 }

$work = Join-Path $env:TEMP 'timer-uitest'
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Path $work | Out-Null
$copy = Join-Path $work 'timer-under-test.html'
[IO.File]::WriteAllText($copy, $src.Replace($boot, "else {`n" + $driver + "`n}"), (New-Object Text.UTF8Encoding $false))

$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$out = Join-Path $work 'dom.txt'
Start-Process -FilePath $edge -Wait -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError (Join-Path $work 'err.txt') `
  -ArgumentList @('--headless', '--disable-gpu', "--user-data-dir=`"$work\profile`"", '--virtual-time-budget=30000',
                  '--window-size=1280,720', '--dump-dom', ('file:///' + $copy.Replace('\', '/')))

$dom = Get-Content $out -Raw -Encoding UTF8
$pre = [regex]::Match($dom, '(?s)<pre id="uitest">(.*?)</pre>').Groups[1].Value
if (-not $pre) { Write-Output 'No UITEST output (script error? see err.txt in %TEMP%\timer-uitest).'; exit 2 }
$text = $pre -replace '&lt;', '<' -replace '&gt;', '>' -replace '&quot;', '"' -replace '&amp;', '&'
Write-Output $text
if ($text -match 'UITEST RESULT: PASS') { exit 0 } else { exit 1 }
