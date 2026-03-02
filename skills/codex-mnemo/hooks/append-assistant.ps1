function Add-CodexAssistantEntry {
    param(
        [Parameter(Mandatory = $true)][string]$ConvFile,
        [Parameter(Mandatory = $true)][string]$Timestamp,
        [Parameter(Mandatory = $true)][string]$Response
    )

    if (-not $Response -or $Response.Trim().Length -lt 5) { return }
    $text = $Response.Trim()

    $entry = "`n## [$Timestamp] Assistant`n`n$text`n"
    [System.IO.File]::AppendAllText($ConvFile, $entry, [System.Text.Encoding]::UTF8)
}
