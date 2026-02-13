function Add-CodexUserEntry {
    param(
        [Parameter(Mandatory = $true)][string]$ConvFile,
        [Parameter(Mandatory = $true)][string]$Timestamp,
        [Parameter(Mandatory = $true)][string]$UserText
    )

    if (-not $UserText -or $UserText.Trim().Length -lt 1) { return }
    $entry = "`n## [$Timestamp] User`n`n$($UserText.Trim())`n"
    [System.IO.File]::AppendAllText($ConvFile, $entry, [System.Text.Encoding]::UTF8)
}
