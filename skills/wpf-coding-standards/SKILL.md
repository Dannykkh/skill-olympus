---
name: wpf-coding-standards
description: "WPF 데스크톱 개발 코딩 표준. MVVM, 스레딩, 메모리 관리, GPU 렌더링 최적화. C#/XAML 파일 작성 시 참조."
---

# WPF Coding Standards - 통합 패키지

## 포함 파일

```
wpf-coding-standards/
├── SKILL.md                              # 이 파일 (핵심 예시)
├── agents/                               # 패시브 에이전트 (항상 로드)
│   └── wpf-coding-standards.md           # WPF 코딩 표준 규칙
└── templates/                            # 코드 템플릿 (on-demand)
    ├── wpf-patterns.md                   # MVVM, DI, Navigation, Converter, Behavior
    └── threading-memory.md              # 스레딩 상세, 메모리 프로파일링, GPU 최적화
```

---

패시브 에이전트(`agents/wpf-coding-standards.md`)의 규칙에 대한 **핵심 코드 예시**를 제공합니다.

---

## MVVM Toolkit 설정 (.NET 8+)

### NuGet 패키지

```xml
<ItemGroup>
    <PackageReference Include="CommunityToolkit.Mvvm" Version="8.*" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="8.*" />
</ItemGroup>
```

### App.xaml.cs (DI 설정)

```csharp
public partial class App : Application
{
    private readonly IServiceProvider _services;

    public App()
    {
        var services = new ServiceCollection();

        // 서비스 (Singleton = 앱 수명 동안 1개)
        services.AddSingleton<IAppSettings, AppSettings>();
        services.AddSingleton<INavigationService, NavigationService>();
        services.AddSingleton<IDataService, DataService>();

        // ViewModel (Transient = 매번 새로 생성)
        services.AddTransient<MainViewModel>();
        services.AddTransient<SettingsViewModel>();

        // View
        services.AddSingleton<MainWindow>();

        _services = services.BuildServiceProvider();
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        _services.GetRequiredService<MainWindow>().Show();
    }
}
```

---

## ViewModel 코드 예시

### MVVM Toolkit (Source Generator)

```csharp
public partial class ItemListViewModel : ObservableObject
{
    private readonly IDataService _dataService;
    private CancellationTokenSource? _cts;

    public ItemListViewModel(IDataService dataService)
    {
        _dataService = dataService;
    }

    [ObservableProperty]
    private ObservableCollection<ItemViewModel> _items = [];

    [ObservableProperty]
    private ItemViewModel? _selectedItem;

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private string _searchText = string.Empty;

    // 소스 제너레이터가 LoadItemsCommand 자동 생성
    [RelayCommand]
    private async Task LoadItemsAsync()
    {
        _cts?.Cancel();
        _cts = new CancellationTokenSource();
        IsLoading = true;

        try
        {
            var data = await Task.Run(
                () => _dataService.GetAllAsync(_cts.Token), _cts.Token);

            Items = new ObservableCollection<ItemViewModel>(
                data.Select(d => new ItemViewModel(d)));
        }
        catch (OperationCanceledException) { /* 취소됨 */ }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand(CanExecute = nameof(CanDeleteItem))]
    private void DeleteItem(ItemViewModel item)
    {
        Items.Remove(item);
    }

    private bool CanDeleteItem(ItemViewModel? item) => item is not null;

    // SearchText 변경 시 자동 필터링
    partial void OnSearchTextChanged(string value)
    {
        // 필터링 로직
    }
}
```

### XAML Binding

```xml
<Window x:Class="MyApp.Views.MainWindow"
        xmlns:vm="clr-namespace:MyApp.ViewModels"
        d:DataContext="{d:DesignInstance Type=vm:ItemListViewModel}">
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto" />
            <RowDefinition Height="*" />
            <RowDefinition Height="Auto" />
        </Grid.RowDefinitions>

        <!-- 검색 바 -->
        <TextBox Grid.Row="0"
                 Text="{Binding SearchText, UpdateSourceTrigger=LostFocus}"
                 Margin="8" />

        <!-- 아이템 리스트 (가상화 필수) -->
        <ListBox Grid.Row="1"
                 ItemsSource="{Binding Items}"
                 SelectedItem="{Binding SelectedItem}"
                 VirtualizingStackPanel.IsVirtualizing="True"
                 VirtualizingStackPanel.VirtualizationMode="Recycling" />

        <!-- 버튼 바 -->
        <StackPanel Grid.Row="2" Orientation="Horizontal" Margin="8">
            <Button Content="Load" Command="{Binding LoadItemsCommand}" />
            <Button Content="Delete"
                    Command="{Binding DeleteItemCommand}"
                    CommandParameter="{Binding SelectedItem}" />
        </StackPanel>

        <!-- 로딩 인디케이터 -->
        <ProgressBar Grid.RowSpan="3"
                     IsIndeterminate="True"
                     Visibility="{Binding IsLoading,
                         Converter={StaticResource BoolToVisibility}}" />
    </Grid>
</Window>
```

---

## UI 프리징 방지 핵심

### 올바른 패턴 비교

```csharp
// ❌ 프리징: UI 스레드에서 동기 호출
private void LoadData()
{
    var data = _service.GetAll(); // 프리징!
    Items = new ObservableCollection<Item>(data);
}

// ❌ 프리징: DispatcherTimer로 무거운 작업
private void Timer_Tick(object? sender, EventArgs e)
{
    var data = _service.CheckUpdates(); // UI 스레드에서 실행 → 프리징!
    StatusText = data.Message;
}

// ✅ 정답: Task.Run + async/await
private async Task LoadDataAsync(CancellationToken ct)
{
    var data = await Task.Run(() => _service.GetAll(), ct);
    Items = new ObservableCollection<Item>(data); // 자동 UI 스레드 복귀
}

// ✅ 정답: PeriodicTimer (주기적 작업)
private async Task StartPollingAsync(CancellationToken ct)
{
    using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
    while (await timer.WaitForNextTickAsync(ct))
    {
        var data = await Task.Run(() => _service.CheckUpdates(), ct);
        StatusText = data.Message;
    }
}
```

---

## 메모리 누수 방지 핵심

### IDisposable 기본 패턴

```csharp
public class MyViewModel : ObservableObject, IDisposable
{
    private readonly DataModel _model;
    private readonly CancellationTokenSource _cts = new();
    private bool _disposed;

    public MyViewModel(DataModel model)
    {
        _model = model;
        _model.DataChanged += OnDataChanged;
    }

    private void OnDataChanged(object? sender, EventArgs e) { /* 처리 */ }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        // 1. 이벤트 구독 해제
        _model.DataChanged -= OnDataChanged;

        // 2. CancellationToken 취소
        _cts.Cancel();
        _cts.Dispose();

        // 3. 기타 비관리 리소스 해제
    }
}
```

### WeakEventManager (강한 참조 방지)

```csharp
// 구독
WeakEventManager<DataModel, EventArgs>.AddHandler(
    _model, nameof(DataModel.DataChanged), OnDataChanged);

// 해제 (선택적 — GC가 알아서 처리)
WeakEventManager<DataModel, EventArgs>.RemoveHandler(
    _model, nameof(DataModel.DataChanged), OnDataChanged);
```

### View Unloaded 시 정리

```csharp
public partial class MyView : UserControl
{
    public MyView()
    {
        InitializeComponent();
        Unloaded += OnUnloaded;
    }

    private void OnUnloaded(object sender, RoutedEventArgs e)
    {
        BindingOperations.ClearAllBindings(this);
        (DataContext as IDisposable)?.Dispose();
        DataContext = null;
    }
}
```

---

## 렌더링 최적화 핵심

```xml
<!-- ✅ 대용량 리스트 필수 설정 -->
<DataGrid ItemsSource="{Binding Items}"
          AutoGenerateColumns="False"
          VirtualizingPanel.IsVirtualizing="True"
          VirtualizingPanel.VirtualizationMode="Recycling"
          ScrollViewer.IsDeferredScrollingEnabled="True"
          EnableRowVirtualization="True"
          EnableColumnVirtualization="True">
</DataGrid>
```

```csharp
// ✅ Freeze() — 변경 없는 리소스 동결
var brush = new SolidColorBrush(Colors.Blue);
brush.Freeze();

var bitmap = new BitmapImage(new Uri("pack://application:,,,/logo.png"));
bitmap.CacheOption = BitmapCacheOption.OnLoad;
bitmap.Freeze();
```

---

## 잘못된 예시 (금지 패턴)

```csharp
// 금지 - 코드비하인드에 비즈니스 로직
private void Button_Click(object sender, RoutedEventArgs e)
{
    var items = database.GetAll(); // 프리징 + MVVM 위반
    listBox.Items.Clear();
    foreach (var item in items)
        listBox.Items.Add(item);
}

// 올바른 예 - ViewModel에서 Command
// Button Command="{Binding LoadCommand}"
[RelayCommand]
private async Task LoadAsync()
{
    var items = await Task.Run(() => database.GetAll());
    Items = new ObservableCollection<Item>(items);
}
```

---

## 상세 템플릿 (on-demand 로딩)

| 파일 | 내용 |
|------|------|
| `templates/wpf-patterns.md` | MVVM Toolkit 상세, Navigation, Converter, Behavior, Validation, Dialog |
| `templates/threading-memory.md` | Dispatcher 상세, 메모리 프로파일링, GPU 렌더링 최적화, WriteableBitmap |
