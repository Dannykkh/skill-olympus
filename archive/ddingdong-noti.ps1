# notify-complete.ps1 - 작업 완료 시 Windows 토스트 알림

$title = if ($env:AGENT_NOTIFY_TITLE) { $env:AGENT_NOTIFY_TITLE } else { "Claude Code" }
$msg = if ($env:AGENT_NOTIFY_MESSAGE) { $env:AGENT_NOTIFY_MESSAGE } else { "작업이 완료되었습니다" }

try {
    # BurntToast 모듈이 있으면 사용 (더 예쁜 알림)
    if (Get-Module -ListAvailable -Name BurntToast -ErrorAction SilentlyContinue) {
        New-BurntToastNotification -Text $title, $msg -Sound Default
    } else {
        # 기본 Windows 알림
        Add-Type -AssemblyName System.Windows.Forms
        $notify = New-Object System.Windows.Forms.NotifyIcon
        $notify.Icon = [System.Drawing.SystemIcons]::Information
        $notify.BalloonTipTitle = $title
        $notify.BalloonTipText = $msg
        $notify.Visible = $true
        $notify.ShowBalloonTip(3000)
        Start-Sleep -Milliseconds 3500
        $notify.Dispose()
    }
} catch {
    # 알림 실패해도 작업에 영향 없음
}
