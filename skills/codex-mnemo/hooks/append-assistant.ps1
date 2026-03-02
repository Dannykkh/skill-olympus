function Add-CodexAssistantEntry {
    param(
        [Parameter(Mandatory = $true)][string]$ConvFile,
        [Parameter(Mandatory = $true)][string]$Timestamp,
        [Parameter(Mandatory = $true)][string]$Response
    )

    if (-not $Response -or $Response.Trim().Length -lt 5) { return }
    $text = $Response.Trim()

    # 4000자 제한
    if ($text.Length -gt 4000) {
        $text = $text.Substring(0, 4000) + "..."
    }

    $entry = "`n## [$Timestamp] Assistant`n`n$text`n"
    [System.IO.File]::AppendAllText($ConvFile, $entry, [System.Text.Encoding]::UTF8)
}
