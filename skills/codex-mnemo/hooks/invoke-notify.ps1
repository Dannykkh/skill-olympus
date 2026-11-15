# Native notify forwarding must preserve JSON independently of PowerShell's
# Legacy/Standard argument passing mode. Use Windows argv quoting explicitly.
function Invoke-MnemoNotifyCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [AllowEmptyCollection()][AllowEmptyString()][string[]]$CommandArguments = @()
    )

    # Script/command notify entries previously ran through PowerShell itself.
    # Retain that dispatch for non-executables; executable forwarding below is
    # the path used by the Mnemo and TermSnap PowerShell process chains.
    $resolved = Get-Command $Command -ErrorAction Stop
    if ($resolved.CommandType -ne 'Application' -or $resolved.Source -match '\.(cmd|bat)$') {
        & $Command @CommandArguments
        return $LASTEXITCODE
    }

    $quoted = foreach ($argument in $CommandArguments) {
        # Backslashes before a quote, and trailing backslashes inside our outer
        # quotes, must be doubled for the receiving process's argv parser.
        $escaped = [regex]::Replace([string]$argument, '(\\*)"', '$1$1\"')
        $escaped = [regex]::Replace($escaped, '(\\+)$', '$1$1')
        '"' + $escaped + '"'
    }
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = $Command
    $start.Arguments = $quoted -join ' '
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $process = [System.Diagnostics.Process]::Start($start)
    try {
        $process.WaitForExit()
        return $process.ExitCode
    } finally {
        $process.Dispose()
    }
}
