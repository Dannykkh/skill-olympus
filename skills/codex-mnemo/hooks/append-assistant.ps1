function Add-CodexAssistantEntry {
    param(
        [Parameter(Mandatory = $true)][string]$ConvFile,
        [Parameter(Mandatory = $true)][string]$Timestamp,
        [string]$Response
    )

    if (-not $Response -or $Response.Trim().Length -lt 5) { return }
    $text = $Response.Trim()

    $entry = "`n## [$Timestamp] Assistant`n`n$text`n"
    # BOM 없는 UTF-8: PS의 [System.Text.Encoding]::UTF8은 BOM을 포함하므로 사용 안 함
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($ConvFile, $entry, $utf8NoBom)
}
