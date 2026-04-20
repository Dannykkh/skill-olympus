function Add-CodexUserEntry {
    param(
        [Parameter(Mandatory = $true)][string]$ConvFile,
        [Parameter(Mandatory = $true)][string]$Timestamp,
        [string]$UserText
    )

    if (-not $UserText -or $UserText.Trim().Length -lt 1) { return }
    $entry = "`n## [$Timestamp] User`n`n$($UserText.Trim())`n"
    # BOM 없는 UTF-8: PS의 [System.Text.Encoding]::UTF8은 BOM을 포함하므로 사용 안 함
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($ConvFile, $entry, $utf8NoBom)
}
