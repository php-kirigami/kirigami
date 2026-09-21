param(
    [string]$CodePath = "$env:LOCALAPPDATA/Programs/Microsoft VS Code/Code.exe"
)
$ErrorActionPreference = 'Stop'
$fixture = Join-Path ([System.IO.Path]::GetTempPath()) ('kiri-host-' + [guid]::NewGuid())
$site = Join-Path $fixture 'site'
$profile = Join-Path $fixture 'profile'
New-Item -ItemType Directory -Path "$site/src", "$profile/User" -Force | Out-Null
Set-Content -LiteralPath "$site/kirigami.yaml" -Encoding utf8 -Value '{"kirigami":{"project":"Host test","root":"src","baseurl":"https://example.com"},"prepros":{},"export":{"path":"dist"}}'
[System.IO.File]::WriteAllText("$site/src/_index.php", '<p><?= $project ?></p>', [System.Text.UTF8Encoding]::new($false))
$nodePath = (Get-Command node).Source
@{ 'kirigami.nodePath' = $nodePath; 'security.workspace.trust.enabled' = $false } | ConvertTo-Json | Set-Content -LiteralPath "$profile/User/settings.json" -Encoding utf8
$extension = (Resolve-Path "$PSScriptRoot/..").Path
$arguments = @(
    '--new-window', '--skip-welcome', '--skip-release-notes', '--disable-updates',
    '--disable-extensions', '--disable-workspace-trust',
    "--user-data-dir=`"$profile`"", "--extensions-dir=`"$fixture/extensions`"",
    "--extensionDevelopmentPath=`"$extension`"",
    "--extensionTestsPath=`"$PSScriptRoot/host.cjs`"", "`"$site`""
)
$electronMode = $env:ELECTRON_RUN_AS_NODE
try {
    $env:ELECTRON_RUN_AS_NODE = $null
    $process = Start-Process -FilePath $CodePath -ArgumentList $arguments -WindowStyle Hidden -PassThru
} finally { $env:ELECTRON_RUN_AS_NODE = $electronMode }
Write-Output "Host test fixture and logs: $fixture"
if (-not $process.WaitForExit(60000)) {
    Stop-Process -Id $process.Id
    throw 'Extension Host test timed out; fixture and logs retained.'
}
$result = Join-Path $site 'host-test-passed.json'
if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $result)) {
    throw "Extension Host test failed (exit $($process.ExitCode)); inspect $profile/logs."
}
Get-Content -LiteralPath $result
