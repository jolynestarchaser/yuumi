$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $repoRoot '.tools\node22'
if (Test-Path -LiteralPath $runtimeRoot) {
  throw 'A project runtime already exists at .tools/node22. It has not been overwritten.'
}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$releases = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -TimeoutSec 30
$release = $releases | Where-Object { $_.version -match '^v22\.\d+\.\d+$' } | Select-Object -First 1
if (!$release) { throw 'No Node 22 release was returned by nodejs.org.' }
$architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
$archiveName = "node-$($release.version)-win-$architecture.zip"
$distribution = "https://nodejs.org/dist/$($release.version)"
$checksums = (Invoke-WebRequest -UseBasicParsing -Uri "$distribution/SHASUMS256.txt" -TimeoutSec 30).Content
$checksumLine = $checksums -split "`n" | Where-Object { $_.Trim().EndsWith("  $archiveName") } | Select-Object -First 1
if (!$checksumLine) { throw 'Official SHA256 checksum is missing.' }
$expected = ($checksumLine.Trim() -split '\s+')[0]
if ($expected -notmatch '^[a-fA-F0-9]{64}$') { throw 'Invalid official SHA256 checksum.' }
$downloadRoot = Join-Path $repoRoot ('.tools\download-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $downloadRoot -Force | Out-Null
$archivePath = Join-Path $downloadRoot $archiveName
Invoke-WebRequest -UseBasicParsing -Uri "$distribution/$archiveName" -OutFile $archivePath -TimeoutSec 180
$sha256 = [Security.Cryptography.SHA256]::Create()
$archiveStream = [IO.File]::OpenRead($archivePath)
try {
  $actual = [BitConverter]::ToString($sha256.ComputeHash($archiveStream)).Replace('-', '')
} finally {
  $archiveStream.Dispose()
  $sha256.Dispose()
}
if ($actual -ne $expected) {
  throw 'SHA256 mismatch. Download has not been installed.'
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::ExtractToDirectory($archivePath, $downloadRoot)
$extractedPath = Join-Path $downloadRoot "node-$($release.version)-win-$architecture"
$resolvedSource = (Resolve-Path -LiteralPath $extractedPath).Path
$resolvedContainer = (Resolve-Path -LiteralPath $downloadRoot).Path + [IO.Path]::DirectorySeparatorChar
if (!$resolvedSource.StartsWith($resolvedContainer, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Unexpected extraction path.'
}
Move-Item -LiteralPath $resolvedSource -Destination $runtimeRoot
Write-Output "Installed $($release.version) in $runtimeRoot (official SHA256 matched)."
Write-Output 'Run project commands with scripts\node22.cmd, for example scripts\node22.cmd npm run dev.'
