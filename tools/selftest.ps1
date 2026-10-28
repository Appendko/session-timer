# Runs timer.html#selftest in headless Edge and reports the result.
# Exit code 0 only when the page reports PASS.
param([string]$Page = (Join-Path $PSScriptRoot '..\timer.html'))

$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$path = (Resolve-Path $Page).Path
$url = 'file:///' + ($path -replace '\\', '/') + '#selftest'
$profileDir = Join-Path $env:TEMP 'timer-selftest-profile'
$out = Join-Path $env:TEMP 'timer-selftest-dom.txt'
if (Test-Path $out) { Remove-Item $out -Force }

Start-Process -FilePath $edge -Wait -NoNewWindow -RedirectStandardOutput $out `
  -ArgumentList @('--headless', '--disable-gpu', "--user-data-dir=`"$profileDir`"", '--dump-dom', $url)

$dom = Get-Content $out -Raw
if (-not $dom) { Write-Output 'No output from Edge.'; exit 2 }
$pre = [regex]::Match($dom, '(?s)<pre id="selftest">(.*?)</pre>').Groups[1].Value
$dom = $pre -replace '&lt;', '<' -replace '&gt;', '>' -replace '&amp;', '&'
[regex]::Matches($dom, '(?m)^(PASS|FAIL) .*$') | ForEach-Object { $_.Value.TrimEnd() }
$summary = [regex]::Match($dom, 'SELFTEST RESULT: \w+ \(\d+/\d+\)').Value
if (-not $summary) { Write-Output 'No SELFTEST RESULT line found (script error before the tests ran?).'; exit 2 }
Write-Output $summary
if ($summary -like 'SELFTEST RESULT: PASS*') { exit 0 } else { exit 1 }
