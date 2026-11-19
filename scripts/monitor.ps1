# monitor.ps1 - a tiny "watch" for the running app: health, latency, requests, errors, memory.
# Usage:  .\scripts\monitor.ps1                      (5 checks, 3 seconds apart, http://localhost:3000)
#         .\scripts\monitor.ps1 -Count 20 -IntervalSeconds 2
param(
  [string]$Url = 'http://localhost:3000',
  [int]$Count = 5,
  [int]$IntervalSeconds = 3
)

$Url = $Url.TrimEnd('/')
$failures = 0

for ($i = 1; $i -le $Count; $i++) {
  $time = Get-Date -Format 'HH:mm:ss'
  try {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $health = Invoke-RestMethod "$Url/health" -TimeoutSec 5
    $sw.Stop()

    $metrics = (Invoke-WebRequest "$Url/metrics" -UseBasicParsing -TimeoutSec 5).Content
    $total = 0; $errors = 0; $memMb = 0
    foreach ($line in ($metrics -split "`n")) {
      if ($line -match '^http_requests_total\{.*status="(\d+)"\}\s+(\d+)') {
        $n = [int]$Matches[2]
        $total += $n
        if ($Matches[1] -like '5*') { $errors += $n }
      } elseif ($line -match '^process_resident_memory_bytes\s+(\d+)') {
        $memMb = [math]::Round([double]$Matches[1] / 1MB, 1)
      }
    }
    Write-Host ("{0}  OK    status={1}  latency={2}ms  requests={3}  5xx={4}  memory={5}MB" -f `
      $time, $health.status, $sw.ElapsedMilliseconds, $total, $errors, $memMb)
  } catch {
    Write-Host "$time  FAIL  $($_.Exception.Message)"
    $failures++
  }
  if ($i -lt $Count) { Start-Sleep -Seconds $IntervalSeconds }
}

if ($failures -gt 0) { exit 1 }
