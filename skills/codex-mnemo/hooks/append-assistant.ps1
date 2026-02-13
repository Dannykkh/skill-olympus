function Add-CodexAssistantEntry {
    param(
        [Parameter(Mandatory = $true)][string]$ConvFile,
        [Parameter(Mandatory = $true)][string]$Timestamp,
        [Parameter(Mandatory = $true)][string]$Response
    )

    if (-not $Response -or $Response.Trim().Length -lt 5) { return }
    $text = $Response.Trim()

    # Replace fenced code blocks with placeholder.
    $text = [regex]::Replace($text, '(?s)```.*?```', '[code block]')

    # Trim long responses.
    if ($text.Length -gt 2000) {
        $text = $text.Substring(0, 2000) + "..."
    }

    $entry = "`n## [$Timestamp] Assistant`n`n$text`n"
    [System.IO.File]::AppendAllText($ConvFile, $entry, [System.Text.Encoding]::UTF8)
}
