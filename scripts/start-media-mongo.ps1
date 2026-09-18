param(
  [Parameter(Mandatory = $true)]
  [string]$MongodPath
)

$ErrorActionPreference = 'Stop'
$executable = Get-Item -LiteralPath $MongodPath
if ($executable.PSIsContainer -or $executable.Name -ne 'mongod.exe') {
  throw 'Supply the explicit path to an existing mongod.exe. Nothing will be installed.'
}

# Refuse to share an occupied port. mongod also fails closed if another process
# acquires the port between this check and startup.
$portProbe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 27028)
try {
  $portProbe.Start()
} finally {
  $portProbe.Stop()
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$instanceRoot = Join-Path $repoRoot ('.tools\media-mongo-' + [guid]::NewGuid().ToString('N'))
$dataPath = Join-Path $instanceRoot 'data'
$logPath = Join-Path $instanceRoot 'mongod.log'
New-Item -ItemType Directory -Path $dataPath | Out-Null
$arguments = @(
  '--bind_ip', '127.0.0.1',
  '--port', '27028',
  '--replSet', 'rsMedia',
  '--dbpath', ('"' + $dataPath + '"'),
  '--logpath', ('"' + $logPath + '"')
)
$process = Start-Process -FilePath $executable.FullName -ArgumentList $arguments -WindowStyle Hidden -PassThru
Write-Output "Started mongod process $($process.Id); readiness and replica-set initialization are NOT verified."
Write-Output "Disposable directory: $instanceRoot"
Write-Output "Log: $logPath"
Write-Output 'Bind: 127.0.0.1:27028; replica-set name: rsMedia'
Write-Output 'Initialize manually using docs/handoff/14-local-verification-setup.md.'
Write-Output 'This database has no authentication. Store synthetic data only; never expose this port.'
