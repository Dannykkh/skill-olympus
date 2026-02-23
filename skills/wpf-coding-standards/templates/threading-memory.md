# Threading & Memory - Dispatcher 상세, 메모리 프로파일링, GPU 렌더링

> `skills/wpf-coding-standards/SKILL.md`의 상세 참조 템플릿

---

## Dispatcher 상세

### Dispatcher 우선순위

```csharp
// DispatcherPriority 순서 (높음 → 낮음)
// Send > Normal > DataBind > Render > Loaded > Background > ApplicationIdle > SystemIdle

// ✅ UI 업데이트는 Normal (기본값)
await Application.Current.Dispatcher.InvokeAsync(() =>
{
    StatusText = "완료";
});

// ✅ 비필수 UI 업데이트는 Background
await Application.Current.Dispatcher.InvokeAsync(() =>
{
    UpdateStatistics();
}, DispatcherPriority.Background);

// ✅ 대량 UI 업데이트 시 Render 프레임마다 처리
await Application.Current.Dispatcher.InvokeAsync(() =>
{
    ProgressBar.Value = currentProgress;
}, DispatcherPriority.Render);
```

### Dispatcher.Invoke vs InvokeAsync

```csharp
// ❌ Invoke: 동기 대기 → 데드락 위험
Application.Current.Dispatcher.Invoke(() =>
{
    // UI 스레드가 바쁘면 여기서 무한 대기 가능
    StatusText = "업데이트";
});

// ✅ InvokeAsync: 비동기 → 데드락 없음
await Application.Current.Dispatcher.InvokeAsync(() =>
{
    StatusText = "업데이트";
});

// ✅ 더 좋은 방법: async/await가 SynchronizationContext 자동 처리
private async Task LoadDataAsync()
{
    var data = await Task.Run(() => _service.GetAll());
    // await 후 자동으로 UI 스레드 복귀 → Dispatcher 불필요
    Items = new ObservableCollection<Item>(data);
}
```

### SynchronizationContext 이해

```csharp
// WPF에서 async/await의 동작 원리:
// 1. await 전: UI 스레드에서 실행
// 2. await 중: 백그라운드에서 Task 실행
// 3. await 후: SynchronizationContext가 자동으로 UI 스레드로 복귀

// ❌ ConfigureAwait(false): UI 스레드 복귀 안 함 (라이브러리용)
var data = await Task.Run(() => _service.GetAll()).ConfigureAwait(false);
Items = new ObservableCollection<Item>(data); // 크래시! (비-UI 스레드)

// ✅ ViewModel/View에서는 ConfigureAwait(false) 사용 금지
var data = await Task.Run(() => _service.GetAll());
Items = new ObservableCollection<Item>(data); // 안전 (UI 스레드)

// ✅ Service/Repository에서는 ConfigureAwait(false) 사용 권장
public async Task<List<Item>> GetAllAsync(CancellationToken ct)
{
    var response = await _httpClient.GetAsync("/api/items", ct)
        .ConfigureAwait(false); // 서비스 계층에서는 OK
    return await response.Content.ReadFromJsonAsync<List<Item>>(ct)
        .ConfigureAwait(false);
}
```

---

## 스레딩 패턴 상세

### Progress<T>를 이용한 진행률 보고

```csharp
public partial class ImportViewModel : ViewModelBase
{
    [ObservableProperty]
    private double _progress;

    [ObservableProperty]
    private string _statusMessage = string.Empty;

    [RelayCommand]
    private async Task ImportAsync(CancellationToken ct)
    {
        // Progress<T>는 생성된 스레드(UI)에서 콜백 실행
        var progress = new Progress<(double percent, string message)>(p =>
        {
            Progress = p.percent;
            StatusMessage = p.message;
        });

        await Task.Run(() => ImportFiles(progress, ct), ct);
    }

    private void ImportFiles(IProgress<(double, string)> progress, CancellationToken ct)
    {
        var files = Directory.GetFiles(_importPath);
        for (int i = 0; i < files.Length; i++)
        {
            ct.ThrowIfCancellationRequested();
            ProcessFile(files[i]);
            progress.Report((
                (double)(i + 1) / files.Length * 100,
                $"처리 중: {Path.GetFileName(files[i])}"
            ));
        }
    }
}
```

### BackgroundWorker → Task.Run 마이그레이션

```csharp
// ❌ 레거시: BackgroundWorker
private BackgroundWorker _worker;
private void StartWork()
{
    _worker = new BackgroundWorker { WorkerReportsProgress = true };
    _worker.DoWork += (s, e) => { /* 작업 */ };
    _worker.ProgressChanged += (s, e) => { ProgressBar.Value = e.ProgressPercentage; };
    _worker.RunWorkerCompleted += (s, e) => { StatusText = "완료"; };
    _worker.RunWorkerAsync();
}

// ✅ 현대: Task.Run + Progress<T>
private async Task StartWorkAsync(CancellationToken ct)
{
    var progress = new Progress<int>(p => ProgressBar.Value = p);
    await Task.Run(() => DoWork(progress, ct), ct);
    StatusText = "완료";
}
```

### Channel<T>을 이용한 Producer-Consumer

```csharp
// 실시간 데이터 수신 → UI 업데이트 시나리오
public partial class LiveDataViewModel : ViewModelBase
{
    private readonly Channel<SensorData> _channel =
        Channel.CreateBounded<SensorData>(100);

    public async Task StartReceivingAsync(CancellationToken ct)
    {
        // Producer: 백그라운드에서 데이터 수신
        _ = Task.Run(async () =>
        {
            await foreach (var data in _sensorService.StreamAsync(ct))
            {
                await _channel.Writer.WriteAsync(data, ct);
            }
        }, ct);

        // Consumer: UI 스레드에서 처리
        await foreach (var data in _channel.Reader.ReadAllAsync(ct))
        {
            SensorValue = data.Value;
            LastUpdated = data.Timestamp;
        }
    }
}
```

### SemaphoreSlim으로 동시 실행 제한

```csharp
// 동시 다운로드 3개로 제한
private readonly SemaphoreSlim _semaphore = new(3);

[RelayCommand]
private async Task DownloadAllAsync(CancellationToken ct)
{
    var tasks = Items.Select(async item =>
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            await Task.Run(() => _service.Download(item, ct), ct);
            item.Status = "완료";
        }
        finally
        {
            _semaphore.Release();
        }
    });

    await Task.WhenAll(tasks);
}
```

---

## 메모리 프로파일링

### 진단 도구

|도구|용도|비용|
|---|---|---|
|Visual Studio 진단 도구|메모리 스냅샷, CPU 프로파일링|내장|
|dotMemory (JetBrains)|심층 메모리 분석, 누수 탐지|유료|
|PerfView (Microsoft)|ETW 기반 성능 분석|무료|
|`GC.GetTotalMemory()`|코드 내 간이 측정|무료|

### 코드 내 메모리 측정

```csharp
// 간이 메모리 측정 (개발/디버그용)
#if DEBUG
public static class MemoryDiagnostics
{
    public static void LogMemoryUsage(string context)
    {
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();

        var memory = GC.GetTotalMemory(true);
        Debug.WriteLine($"[Memory] {context}: {memory / 1024 / 1024:N1} MB");
    }

    public static void LogGCInfo()
    {
        Debug.WriteLine($"[GC] Gen0: {GC.CollectionCount(0)}, " +
                        $"Gen1: {GC.CollectionCount(1)}, " +
                        $"Gen2: {GC.CollectionCount(2)}");
    }
}
#endif
```

### 일반적인 메모리 누수 원인과 해결

```csharp
// 누수 원인 1: 정적 이벤트 구독
public class LeakyViewModel
{
    public LeakyViewModel()
    {
        // ❌ 정적 이벤트 → ViewModel이 GC 수거 불가
        AppSettings.ThemeChanged += OnThemeChanged;
    }
}

// ✅ 해결: WeakEventManager
public class SafeViewModel : IDisposable
{
    public SafeViewModel()
    {
        WeakEventManager<AppSettings, EventArgs>.AddHandler(
            null, nameof(AppSettings.ThemeChanged), OnThemeChanged);
    }
}

// 누수 원인 2: 타이머 미정리
public class LeakyTimerViewModel
{
    private readonly DispatcherTimer _timer;

    public LeakyTimerViewModel()
    {
        // ❌ Stop() 안 하면 계속 참조됨
        _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        _timer.Tick += OnTick;
        _timer.Start();
    }
}

// ✅ 해결: IDisposable + CancellationToken
public class SafeTimerViewModel : ViewModelBase, IDisposable
{
    private readonly CancellationTokenSource _cts = new();

    public async Task StartTimerAsync()
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));
        while (await timer.WaitForNextTickAsync(_cts.Token))
        {
            UpdateClock();
        }
    }

    public void Dispose() => _cts.Cancel();
}

// 누수 원인 3: 클로저에서 this 캡처
public class LeakyClosureViewModel
{
    public LeakyClosureViewModel()
    {
        // ❌ 람다가 this를 캡처 → 이벤트 해제 불가
        _model.DataChanged += (s, e) => Items.Add(e.Data);
    }
}

// ✅ 해결: 명시적 메서드 참조
public class SafeClosureViewModel : IDisposable
{
    public SafeClosureViewModel()
    {
        _model.DataChanged += OnDataChanged;
    }

    private void OnDataChanged(object? sender, DataChangedEventArgs e)
    {
        Items.Add(e.Data);
    }

    public void Dispose() => _model.DataChanged -= OnDataChanged;
}
```

### CollectionView 메모리 관리

```csharp
// ❌ CollectionViewSource가 원본 컬렉션 참조 유지 → 누수
public class LeakyFilterViewModel
{
    public ICollectionView ItemsView { get; }

    public LeakyFilterViewModel()
    {
        ItemsView = CollectionViewSource.GetDefaultView(Items);
        ItemsView.Filter = item => ((Item)item).IsActive;
    }
}

// ✅ View Unloaded 시 필터 제거
public class SafeFilterViewModel : IDisposable
{
    public ICollectionView ItemsView { get; }

    public void Dispose()
    {
        ItemsView.Filter = null;  // 필터 제거
    }
}
```

---

## GPU 렌더링 최적화 상세

### RenderOptions 설정

```csharp
// 이미지 품질 vs 성능
RenderOptions.SetBitmapScalingMode(image, BitmapScalingMode.LowQuality);   // 빠름
RenderOptions.SetBitmapScalingMode(image, BitmapScalingMode.HighQuality);  // 선명

// 엣지 모드
RenderOptions.SetEdgeMode(shape, EdgeMode.Aliased);      // 빠름 (안티앨리어싱 끔)

// 캐싱 힌트
RenderOptions.SetCachingHint(brush, CachingHint.Cache);   // GPU 캐시 활용
RenderOptions.SetCacheInvalidationThresholdMinimum(brush, 0.5);
RenderOptions.SetCacheInvalidationThresholdMaximum(brush, 2.0);
```

### BitmapCache (GPU 오프스크린 렌더링)

```xml
<!-- 자주 이동/변형하는 요소에 적용 (애니메이션 대상) -->
<Border>
    <Border.CacheMode>
        <BitmapCache EnableClearType="False"
                     RenderAtScale="1.0"
                     SnapsToDevicePixels="True" />
    </Border.CacheMode>
    <!-- 복잡한 내용 -->
</Border>
```

```csharp
// 코드에서 BitmapCache 적용
var cache = new BitmapCache
{
    EnableClearType = false,
    RenderAtScale = 1.0,
    SnapsToDevicePixels = true
};
myElement.CacheMode = cache;
```

### WriteableBitmap (고성능 이미지 조작)

```csharp
// 대량 픽셀 처리: WriteableBitmap 직접 조작
public class HeatmapRenderer
{
    private readonly WriteableBitmap _bitmap;

    public HeatmapRenderer(int width, int height)
    {
        _bitmap = new WriteableBitmap(width, height, 96, 96,
            PixelFormats.Bgra32, null);
    }

    public void UpdateHeatmap(double[,] data)
    {
        _bitmap.Lock();
        try
        {
            unsafe
            {
                var buffer = (byte*)_bitmap.BackBuffer;
                int stride = _bitmap.BackBufferStride;

                for (int y = 0; y < data.GetLength(0); y++)
                {
                    for (int x = 0; x < data.GetLength(1); x++)
                    {
                        int offset = y * stride + x * 4;
                        var color = ValueToColor(data[y, x]);
                        buffer[offset + 0] = color.B;     // Blue
                        buffer[offset + 1] = color.G;     // Green
                        buffer[offset + 2] = color.R;     // Red
                        buffer[offset + 3] = color.A;     // Alpha
                    }
                }
            }

            _bitmap.AddDirtyRect(new Int32Rect(
                0, 0, _bitmap.PixelWidth, _bitmap.PixelHeight));
        }
        finally
        {
            _bitmap.Unlock();
        }
    }
}
```

### DrawingContext (최대 성능 커스텀 렌더링)

```csharp
// Visual Layer: WPF에서 가장 빠른 렌더링 방법
public class ChartVisual : FrameworkElement
{
    private readonly VisualCollection _visuals;

    public ChartVisual()
    {
        _visuals = new VisualCollection(this);
    }

    public void Render(List<DataPoint> points)
    {
        var visual = new DrawingVisual();
        using (var dc = visual.RenderOpen())
        {
            // Frozen Pen/Brush 사용 (성능)
            var pen = new Pen(Brushes.Blue, 1.0);
            pen.Freeze();

            // 직접 그리기 (가장 빠름)
            for (int i = 1; i < points.Count; i++)
            {
                dc.DrawLine(pen,
                    new Point(points[i - 1].X, points[i - 1].Y),
                    new Point(points[i].X, points[i].Y));
            }
        }

        _visuals.Clear();
        _visuals.Add(visual);
    }

    // VisualCollection 필수 오버라이드
    protected override int VisualChildrenCount => _visuals.Count;
    protected override Visual GetVisualChild(int index) => _visuals[index];
}
```

### 대용량 데이터 렌더링 전략

|데이터 크기|권장 방식|설명|
|---|---|---|
|~100|ItemsControl|단순 바인딩|
|100~10,000|VirtualizingStackPanel|컨테이너 재활용|
|10,000~100,000|Data Virtualization|페이지 단위 로드|
|100,000+|DrawingContext / WriteableBitmap|Visual Layer 직접 렌더링|

### Data Virtualization (페이지 단위 로드)

```csharp
// IList<T> 구현으로 가상 데이터 로드
public class VirtualizingList<T> : IList, INotifyCollectionChanged
{
    private readonly int _pageSize;
    private readonly Func<int, int, Task<IList<T>>> _fetchPage;
    private readonly Dictionary<int, IList<T>> _pages = new();

    public VirtualizingList(int count, int pageSize,
        Func<int, int, Task<IList<T>>> fetchPage)
    {
        Count = count;
        _pageSize = pageSize;
        _fetchPage = fetchPage;
    }

    public int Count { get; }

    public object? this[int index]
    {
        get
        {
            int pageIndex = index / _pageSize;
            if (!_pages.ContainsKey(pageIndex))
            {
                // 비동기 페이지 로드 → 플레이스홀더 반환
                LoadPageAsync(pageIndex);
                return default;
            }
            return _pages[pageIndex][index % _pageSize];
        }
        set => throw new NotSupportedException();
    }

    private async void LoadPageAsync(int pageIndex)
    {
        var data = await _fetchPage(pageIndex * _pageSize, _pageSize);
        _pages[pageIndex] = data;
        CollectionChanged?.Invoke(this,
            new NotifyCollectionChangedEventArgs(
                NotifyCollectionChangedAction.Reset));
    }

    // ... IList 나머지 구현 생략
}
```

---

## 성능 체크리스트

### 시작 시간 최적화

```csharp
// 1. App.xaml의 StartupUri 대신 코드에서 Window 생성
protected override async void OnStartup(StartupEventArgs e)
{
    // 스플래시 스크린 (네이티브)
    var splash = new SplashScreen("splash.png");
    splash.Show(false);

    // DI 초기화
    await InitializeServicesAsync();

    // 메인 윈도우
    var main = _services.GetRequiredService<MainWindow>();
    main.Show();
    splash.Close(TimeSpan.FromMilliseconds(300));
}

// 2. 지연 초기화 (필요할 때만 로드)
private Lazy<SettingsViewModel> _settings;
public SettingsViewModel Settings => _settings.Value;
```

### 바인딩 성능

```xml
<!-- ❌ 느림: OneWay가 기본이지만, TwoWay 불필요한 곳에서 사용 -->
<TextBlock Text="{Binding Name, Mode=TwoWay}" />

<!-- ✅ 빠름: 읽기 전용은 OneWay 명시 -->
<TextBlock Text="{Binding Name, Mode=OneWay}" />

<!-- ✅ 더 빠름: 한 번만 읽는 값은 OneTime -->
<TextBlock Text="{Binding AppVersion, Mode=OneTime}" />

<!-- ❌ 느림: PropertyChanged 트리거 (매 키 입력마다) -->
<TextBox Text="{Binding SearchText, UpdateSourceTrigger=PropertyChanged}" />

<!-- ✅ 권장: LostFocus 트리거 (포커스 이동 시 한 번) -->
<TextBox Text="{Binding SearchText, UpdateSourceTrigger=LostFocus}" />

<!-- ✅ 지연 바인딩: Delay로 디바운스 (ms) -->
<TextBox Text="{Binding SearchText, UpdateSourceTrigger=PropertyChanged, Delay=300}" />
```

### ObservableCollection 대량 업데이트

```csharp
// ❌ 느림: 하나씩 추가 (매번 CollectionChanged 발생)
foreach (var item in newItems)
{
    Items.Add(item);  // N번의 UI 업데이트
}

// ✅ 빠름: 전체 교체 (1번의 UI 업데이트)
Items = new ObservableCollection<ItemViewModel>(newItems);

// ✅ 대안: RangeObservableCollection 사용
public class RangeObservableCollection<T> : ObservableCollection<T>
{
    public void AddRange(IEnumerable<T> items)
    {
        foreach (var item in items)
        {
            Items.Add(item);  // 내부 List에 직접 추가 (이벤트 안 남)
        }
        OnCollectionChanged(
            new NotifyCollectionChangedEventArgs(
                NotifyCollectionChangedAction.Reset));
    }
}
```
