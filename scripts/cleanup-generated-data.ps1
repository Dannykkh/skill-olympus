[CmdletBinding()]
param(
    [switch]$Execute,
    [switch]$IncludeSharedCaches,
    [ValidateRange(0, 3650)]
    [int]$NpxMinimumAgeDays = 7
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)
$claudeProjectKey = $repositoryRoot -replace '[:\\/]', '-'

function Assert-SafeChildPath {
    param(
        [Parameter(Mandatory)] [string]$Path,
        [Parameter(Mandatory)] [string]$Root
    )

    $fullPath = [IO.Path]::GetFullPath($Path)
    $fullRoot = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $requiredPrefix = $fullRoot + [IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($requiredPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing path outside approved root: $fullPath"
    }
    return $fullPath
}

function Remove-ApprovedPath {
    param(
        [Parameter(Mandatory)] [string]$Path,
        [Parameter(Mandatory)] [string]$Root,
        [Parameter(Mandatory)] [string]$Category
    )

    $fullPath = Assert-SafeChildPath -Path $Path -Root $Root
    if (-not (Test-Path -LiteralPath $fullPath)) {
        return $false
    }

    if (-not $Execute) {
        Write-Verbose "[dry-run][$Category] $fullPath"
        return $true
    }

    Remove-Item -LiteralPath $fullPath -Recurse -Force -ErrorAction Stop
    Write-Verbose "[removed][$Category] $fullPath"
    return $true
}

$projectTempPaths = @(
    (Join-Path $tempRoot ("claude\" + $claudeProjectKey)),
    (Join-Path $tempRoot "skill-olympus-design-audit")
)

$repositoryArtifactPaths = @(
    (Join-Path $repositoryRoot "node_modules"),
    (Join-Path $repositoryRoot "examples\pdf-bookshelf\node_modules"),
    (Join-Path $repositoryRoot "skills\orchestrator\mcp-server\node_modules"),
    (Join-Path $repositoryRoot "skills\pdf\test\out"),
    (Join-Path $repositoryRoot "skills\pdf\test\sample.pdf"),
    (Join-Path $repositoryRoot "skills\pdf\test\sample.preview.html"),
    (Join-Path $repositoryRoot ".playwright-mcp"),
    (Join-Path $repositoryRoot ".termsnap\diag"),
    (Join-Path $repositoryRoot "design-guardrail-test"),
    (Join-Path $repositoryRoot ".tmp"),
    (Join-Path $repositoryRoot "%USERPROFILE%"),
    (Join-Path $repositoryRoot ".codex-prompt-input.json"),
    (Join-Path $repositoryRoot "tmp-claude-debug.log"),
    (Join-Path $repositoryRoot "screenshot.png"),
    (Join-Path $repositoryRoot "screenshot-after-login.png"),
    (Join-Path $repositoryRoot "screenshot-users-7.png"),
    (Join-Path $repositoryRoot "codemap\graph.json"),
    (Join-Path $repositoryRoot "codemap\graph.html"),
    (Join-Path $repositoryRoot "codemap\graph-manifest.json"),
    (Join-Path $repositoryRoot "codemap\cytoscape.min.js"),
    (Join-Path $repositoryRoot "codemap\exports"),
    (Join-Path $repositoryRoot "scripts\__pycache__"),
    (Join-Path $repositoryRoot "skills\codex-mnemo\scripts\__pycache__"),
    (Join-Path $repositoryRoot "skills\codex-mnemo\scripts\tests\__pycache__"),
    (Join-Path $repositoryRoot "skills\design-plan\scripts\__pycache__"),
    (Join-Path $repositoryRoot "skills\excel2md\__pycache__"),
    (Join-Path $repositoryRoot "skills\mnemo\scripts\__pycache__"),
    (Join-Path $repositoryRoot "skills\seo-audit\scripts\__pycache__")
)

$cccDirectories = @(
    Get-ChildItem -LiteralPath $tempRoot -Directory -Force |
        Where-Object { $_.Name -match '^ccc-[A-Za-z0-9-]+$' }
)

$removedCounts = [ordered]@{
    TestHomes = 0
    ProjectTemp = 0
    RepositoryArtifacts = 0
    PlaywrightTemp = 0
    NpxEntries = 0
    OldMcpChrome = 0
}
$failures = [Collections.Generic.List[string]]::new()

$mode = if ($Execute) { "execute" } else { "dry-run" }
Write-Output "mode=$mode"
Write-Output "test-home-candidates=$($cccDirectories.Count)"

$index = 0
foreach ($directory in $cccDirectories) {
    $index++
    try {
        if (Remove-ApprovedPath -Path $directory.FullName -Root $tempRoot -Category "test-home") {
            $removedCounts.TestHomes++
        }
    }
    catch {
        $failures.Add($directory.FullName)
    }
    if ($Execute -and $index % 50 -eq 0) {
        Write-Output "progress=test-homes:$index/$($cccDirectories.Count);failures=$($failures.Count)"
    }
}

foreach ($candidatePath in $projectTempPaths) {
    try {
        if (Remove-ApprovedPath -Path $candidatePath -Root $tempRoot -Category "project-temp") {
            $removedCounts.ProjectTemp++
        }
    }
    catch {
        $failures.Add($candidatePath)
    }
}

foreach ($candidatePath in $repositoryArtifactPaths) {
    try {
        if (Remove-ApprovedPath -Path $candidatePath -Root $repositoryRoot -Category "repository-artifact") {
            $removedCounts.RepositoryArtifacts++
        }
    }
    catch {
        $failures.Add($candidatePath)
    }
}

if ($IncludeSharedCaches) {
    $processes = @(
        Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine }
    )
    $processText = ($processes.CommandLine -join "`n")

    $playwrightTempDirectories = @(
        Get-ChildItem -LiteralPath $tempRoot -Directory -Force |
            Where-Object {
                $_.Name -match '^playwright[-_][A-Za-z0-9._-]+$' -and
                $_.LastWriteTime -lt (Get-Date).AddHours(-1) -and
                $processText -notmatch [regex]::Escape($_.FullName)
            }
    )
    foreach ($directory in $playwrightTempDirectories) {
        try {
            if (Remove-ApprovedPath -Path $directory.FullName -Root $tempRoot -Category "playwright-temp") {
                $removedCounts.PlaywrightTemp++
            }
        }
        catch {
            $failures.Add($directory.FullName)
        }
    }

    $npmCacheRoot = [IO.Path]::GetFullPath((& npm config get cache).Trim())
    $npxRoot = Assert-SafeChildPath -Path (Join-Path $npmCacheRoot "_npx") -Root $npmCacheRoot
    if (Test-Path -LiteralPath $npxRoot) {
        $activeNpxEntries = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        $npxCutoff = (Get-Date).AddDays(-$NpxMinimumAgeDays)
        $npxPattern = [regex]::Escape($npxRoot) + '\\([^\\" ]+)'
        foreach ($process in $processes) {
            $match = [regex]::Match($process.CommandLine, $npxPattern, [Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if ($match.Success) {
                [void]$activeNpxEntries.Add($match.Groups[1].Value)
            }
        }
        Write-Output "active-npx-entries=$($activeNpxEntries.Count)"
        foreach ($directory in Get-ChildItem -LiteralPath $npxRoot -Directory -Force) {
            if ($activeNpxEntries.Contains($directory.Name)) {
                Write-Output "[kept][active-npx] $($directory.FullName)"
                continue
            }
            if ($directory.LastWriteTime -ge $npxCutoff) {
                Write-Output "[kept][recent-npx] $($directory.FullName)"
                continue
            }
            try {
                if (Remove-ApprovedPath -Path $directory.FullName -Root $npxRoot -Category "npx-cache") {
                    $removedCounts.NpxEntries++
                }
            }
            catch {
                $failures.Add($directory.FullName)
            }
        }
    }

    $playwrightCacheRoot = [IO.Path]::GetFullPath(
        (Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) "ms-playwright")
    )
    if (Test-Path -LiteralPath $playwrightCacheRoot) {
        foreach ($directory in Get-ChildItem -LiteralPath $playwrightCacheRoot -Directory -Force) {
            if ($directory.Name -notmatch '^mcp-chrome-[0-9a-f]+$') {
                continue
            }
            if ($processText -match [regex]::Escape($directory.FullName)) {
                Write-Output "[kept][active-mcp-chrome] $($directory.FullName)"
                continue
            }
            try {
                if (Remove-ApprovedPath -Path $directory.FullName -Root $playwrightCacheRoot -Category "old-mcp-chrome") {
                    $removedCounts.OldMcpChrome++
                }
            }
            catch {
                $failures.Add($directory.FullName)
            }
        }
    }
}

Write-Output ("summary=" + ($removedCounts | ConvertTo-Json -Compress))
if ($failures.Count -gt 0) {
    foreach ($failure in $failures) {
        Write-Error "Failed to remove: $failure"
    }
    exit 2
}
