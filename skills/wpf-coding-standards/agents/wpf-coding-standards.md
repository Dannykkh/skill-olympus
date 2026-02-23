---
name: wpf-coding-standards
description: "WPF 데스크톱 코딩 표준. MVVM, 스레딩, 메모리 관리, GPU 렌더링. C#/XAML 파일 작성 시 자동 참조."
auto_apply:
  - "*.xaml"
  - "*.xaml.cs"
---

# WPF Coding Standards (Passive)

WPF 데스크톱 애플리케이션 코드 작성 시 항상 적용되는 규칙.
상세 코드 예시 → `/wpf-coding-standards` 스킬 참조.

---

## MVVM 규칙

|규칙|설명|
|---|---|
|View ↔ ViewModel 1:1|각 View에 대응하는 ViewModel|
|코드비하인드 최소화|UI 이벤트만, 비즈니스 로직 금지|
|CommunityToolkit.Mvvm|`[ObservableProperty]`, `[RelayCommand]` 사용|
|DI Container|`new ViewModel()` 직접 생성 금지 → 생성자 주입|
|ICommand|이벤트 핸들러 대신 Command 바인딩|

---

## 스레딩 규칙

|규칙|설명|
|---|---|
|UI 스레드에서 DB/네트워크 호출 금지|`Task.Run` + `async/await` 사용|
|`DispatcherTimer`로 무거운 작업 금지|`PeriodicTimer` + `Task.Run` 사용|
|CancellationToken 항상 전달|긴 작업은 취소 가능해야 함|
|`Dispatcher.Invoke` 최소화|`async/await`가 SynchronizationContext 자동 처리|

---

## 메모리 관리 규칙

|규칙|설명|
|---|---|
|이벤트 구독 ↔ 해제 쌍|`+=` 했으면 반드시 `-=`|
|`IDisposable` 구현|이벤트/타이머/스트림 보유 클래스|
|`WeakEventManager`|장수 객체의 이벤트 구독 시|
|View Unloaded 시 정리|`BindingOperations.ClearAllBindings`, DataContext null|
|람다로 이벤트 구독 금지|해제 불가능 → 메서드 참조 사용|

---

## 렌더링 최적화 규칙

|규칙|설명|
|---|---|
|VirtualizingStackPanel|1000+ 항목 리스트 필수|
|VirtualizationMode=Recycling|컨테이너 재활용|
|`Freeze()`|변경 안 하는 Brush/Bitmap/Geometry|
|`BitmapCacheOption.OnLoad`|이미지 로딩 후 파일 잠금 해제|
|Deferred Scrolling|DataGrid 스크롤 성능|
|AutoGenerateColumns=False|DataGrid 자동 생성 비활성화|

---

## Singleton / DI 규칙

|규칙|설명|
|---|---|
|앱 설정, 내비게이션 → `AddSingleton`|앱 수명 동안 1개|
|ViewModel → `AddTransient`|매번 새 인스턴스|
|Lazy<T>|DI 없이 싱글톤 필요 시|
|Service Locator 금지|생성자 주입 사용|
|스레드 안전 싱글톤|`Lazy<T>(LazyThreadSafetyMode.ExecutionAndPublication)`|

---

## 체크리스트

**MVVM:**
- [ ] 코드비하인드에 비즈니스 로직이 없는가?
- [ ] 모든 버튼이 Command 바인딩인가?
- [ ] ViewModel이 DI로 주입되는가?

**스레딩:**
- [ ] DB/네트워크 호출이 `Task.Run` + `await`인가?
- [ ] CancellationToken을 전달하는가?
- [ ] `DispatcherTimer`로 무거운 작업을 하지 않는가?

**메모리:**
- [ ] 이벤트 구독이 해제되는가? (`-=` 또는 WeakEventManager)
- [ ] IDisposable이 필요한 클래스에 구현되어 있는가?
- [ ] View Unloaded 시 정리가 되는가?

**렌더링:**
- [ ] 1000+ 항목 리스트에 VirtualizingStackPanel 적용했는가?
- [ ] Brush/Bitmap에 Freeze() 호출했는가?
- [ ] DataGrid에 AutoGenerateColumns=False인가?

**DI:**
- [ ] 앱 수준 서비스가 Singleton으로 등록되어 있는가?
- [ ] ViewModel이 new 대신 DI로 생성되는가?
