# WPF Patterns - MVVM, Navigation, Converter, Behavior, Validation, Dialog

> `skills/wpf-coding-standards/SKILL.md`의 상세 참조 템플릿

---

## MVVM Toolkit 상세 설정

### Source Generator 활성화 (.csproj)

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="CommunityToolkit.Mvvm" Version="8.*" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="8.*" />
    <PackageReference Include="Microsoft.Extensions.Hosting" Version="8.*" />
  </ItemGroup>
</Project>
```

### ViewModelBase (공통 기반)

```csharp
// CommunityToolkit.Mvvm의 ObservableObject 직접 상속 (별도 base 불필요)
public partial class ViewModelBase : ObservableObject
{
    [ObservableProperty]
    private bool _isBusy;

    [ObservableProperty]
    private string _errorMessage = string.Empty;

    // 공통 에러 처리
    protected async Task SafeExecuteAsync(
        Func<CancellationToken, Task> action,
        CancellationToken ct = default)
    {
        IsBusy = true;
        ErrorMessage = string.Empty;
        try
        {
            await action(ct);
        }
        catch (OperationCanceledException) { /* 취소됨 */ }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsBusy = false;
        }
    }
}
```

### Property 변경 감지

```csharp
public partial class OrderViewModel : ViewModelBase
{
    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(Total))]  // Quantity 변경 시 Total도 갱신
    [NotifyCanExecuteChangedFor(nameof(SubmitCommand))]  // CanExecute 재평가
    private int _quantity;

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(Total))]
    private decimal _unitPrice;

    public decimal Total => Quantity * UnitPrice;

    // Quantity 변경 후 자동 호출
    partial void OnQuantityChanged(int oldValue, int newValue)
    {
        if (newValue < 0) Quantity = 0;
    }

    // Quantity 변경 전 자동 호출
    partial void OnQuantityChanging(int oldValue, int newValue)
    {
        // 유효성 검사 등
    }

    [RelayCommand(CanExecute = nameof(CanSubmit))]
    private async Task SubmitAsync(CancellationToken ct)
    {
        await SafeExecuteAsync(async token =>
        {
            await Task.Run(() => _orderService.Submit(Quantity, UnitPrice), token);
        }, ct);
    }

    private bool CanSubmit() => Quantity > 0 && UnitPrice > 0;
}
```

---

## Navigation 패턴

### INavigationService 인터페이스

```csharp
public interface INavigationService
{
    void NavigateTo<TViewModel>() where TViewModel : ViewModelBase;
    void NavigateTo<TViewModel>(object parameter) where TViewModel : ViewModelBase;
    bool CanGoBack { get; }
    void GoBack();
}
```

### Frame 기반 Navigation

```csharp
public class NavigationService : INavigationService
{
    private readonly IServiceProvider _services;
    private readonly Frame _frame;
    private readonly Dictionary<Type, Type> _viewMap = new();

    public NavigationService(IServiceProvider services, Frame frame)
    {
        _services = services;
        _frame = frame;
    }

    public void Register<TViewModel, TView>()
        where TViewModel : ViewModelBase
        where TView : Page
    {
        _viewMap[typeof(TViewModel)] = typeof(TView);
    }

    public void NavigateTo<TViewModel>() where TViewModel : ViewModelBase
    {
        var viewType = _viewMap[typeof(TViewModel)];
        var view = (Page)_services.GetRequiredService(viewType);
        view.DataContext = _services.GetRequiredService<TViewModel>();
        _frame.Navigate(view);
    }

    public void NavigateTo<TViewModel>(object parameter) where TViewModel : ViewModelBase
    {
        NavigateTo<TViewModel>();
        if (_frame.Content is Page page && page.DataContext is TViewModel vm)
        {
            (vm as INavigationAware)?.OnNavigatedTo(parameter);
        }
    }

    public bool CanGoBack => _frame.CanGoBack;
    public void GoBack() => _frame.GoBack();
}

// ViewModel이 구현하는 인터페이스
public interface INavigationAware
{
    void OnNavigatedTo(object parameter);
    void OnNavigatedFrom();
}
```

### ContentControl 기반 Navigation (MVVM 순수)

```csharp
// MainViewModel에서 현재 ViewModel 관리
public partial class MainViewModel : ViewModelBase
{
    [ObservableProperty]
    private ViewModelBase _currentViewModel;

    [RelayCommand]
    private void NavigateToSettings()
    {
        CurrentViewModel = _services.GetRequiredService<SettingsViewModel>();
    }
}
```

```xml
<!-- MainWindow.xaml — DataTemplate으로 View 매핑 -->
<Window.Resources>
    <DataTemplate DataType="{x:Type vm:SettingsViewModel}">
        <views:SettingsView />
    </DataTemplate>
    <DataTemplate DataType="{x:Type vm:DashboardViewModel}">
        <views:DashboardView />
    </DataTemplate>
</Window.Resources>

<ContentControl Content="{Binding CurrentViewModel}" />
```

---

## Converter 패턴

### BoolToVisibilityConverter

```csharp
[ValueConversion(typeof(bool), typeof(Visibility))]
public class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType,
        object parameter, CultureInfo culture)
    {
        if (value is bool b)
        {
            // parameter가 "Inverse"면 반전
            bool invert = parameter?.ToString() == "Inverse";
            return (b ^ invert) ? Visibility.Visible : Visibility.Collapsed;
        }
        return Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType,
        object parameter, CultureInfo culture)
    {
        return value is Visibility v && v == Visibility.Visible;
    }
}
```

### App.xaml 리소스 등록

```xml
<Application.Resources>
    <local:BoolToVisibilityConverter x:Key="BoolToVisibility" />
    <local:NullToVisibilityConverter x:Key="NullToVisibility" />
    <local:InverseBoolConverter x:Key="InverseBool" />
</Application.Resources>
```

### MultiValueConverter

```csharp
// 여러 값 조합 (예: 이름 + 성 → 전체 이름)
public class FullNameConverter : IMultiValueConverter
{
    public object Convert(object[] values, Type targetType,
        object parameter, CultureInfo culture)
    {
        if (values.Length >= 2 && values[0] is string first && values[1] is string last)
            return $"{last} {first}";
        return string.Empty;
    }

    public object[] ConvertBack(object value, Type[] targetTypes,
        object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}
```

```xml
<TextBlock>
    <TextBlock.Text>
        <MultiBinding Converter="{StaticResource FullNameConverter}">
            <Binding Path="FirstName" />
            <Binding Path="LastName" />
        </MultiBinding>
    </TextBlock.Text>
</TextBlock>
```

---

## Behavior 패턴

### Interaction.Behaviors (Microsoft.Xaml.Behaviors.Wpf)

```xml
<!-- NuGet: Microsoft.Xaml.Behaviors.Wpf -->
<xmlns:i="http://schemas.microsoft.com/xaml/behaviors">

<TextBox>
    <i:Interaction.Behaviors>
        <local:TextBoxSelectAllBehavior />
    </i:Interaction.Behaviors>
</TextBox>
```

```csharp
// 포커스 시 전체 선택
public class TextBoxSelectAllBehavior : Behavior<TextBox>
{
    protected override void OnAttached()
    {
        AssociatedObject.GotFocus += OnGotFocus;
    }

    protected override void OnDetaching()
    {
        AssociatedObject.GotFocus -= OnGotFocus;  // 반드시 해제
    }

    private void OnGotFocus(object sender, RoutedEventArgs e)
    {
        AssociatedObject.SelectAll();
    }
}
```

### EventTrigger → Command 연결

```xml
<!-- 이벤트를 Command로 변환 (코드비하인드 없이) -->
<Window>
    <i:Interaction.Triggers>
        <i:EventTrigger EventName="Loaded">
            <i:InvokeCommandAction Command="{Binding LoadDataCommand}" />
        </i:EventTrigger>
        <i:EventTrigger EventName="Closing">
            <i:InvokeCommandAction Command="{Binding CleanupCommand}" />
        </i:EventTrigger>
    </i:Interaction.Triggers>
</Window>
```

---

## Validation 패턴

### INotifyDataErrorInfo (권장)

```csharp
public partial class CustomerViewModel : ObservableValidator
{
    [ObservableProperty]
    [Required(ErrorMessage = "이름은 필수입니다")]
    [MinLength(2, ErrorMessage = "2자 이상 입력하세요")]
    private string _name = string.Empty;

    [ObservableProperty]
    [EmailAddress(ErrorMessage = "올바른 이메일 형식이 아닙니다")]
    private string _email = string.Empty;

    [ObservableProperty]
    [Range(1, 150, ErrorMessage = "1~150 사이 값을 입력하세요")]
    private int _age;

    [RelayCommand]
    private void Save()
    {
        ValidateAllProperties();
        if (HasErrors) return;

        // 저장 로직
    }
}
```

```xml
<!-- XAML에서 에러 표시 -->
<TextBox Text="{Binding Name, UpdateSourceTrigger=PropertyChanged,
    ValidatesOnNotifyDataErrors=True}" />

<!-- 에러 메시지 스타일 -->
<Style TargetType="TextBox">
    <Setter Property="Validation.ErrorTemplate">
        <Setter.Value>
            <ControlTemplate>
                <StackPanel>
                    <AdornedElementPlaceholder />
                    <TextBlock Foreground="Red" FontSize="11"
                        Text="{Binding [0].ErrorContent}" />
                </StackPanel>
            </ControlTemplate>
        </Setter.Value>
    </Setter>
</Style>
```

---

## Dialog 패턴

### Dialog Service (MVVM 방식)

```csharp
public interface IDialogService
{
    Task<bool> ShowConfirmAsync(string title, string message);
    Task ShowErrorAsync(string title, string message);
    Task<string?> ShowInputAsync(string title, string prompt);
    Task<string?> ShowOpenFileAsync(string filter);
}

public class DialogService : IDialogService
{
    public Task<bool> ShowConfirmAsync(string title, string message)
    {
        var result = MessageBox.Show(message, title,
            MessageBoxButton.YesNo, MessageBoxImage.Question);
        return Task.FromResult(result == MessageBoxResult.Yes);
    }

    public Task ShowErrorAsync(string title, string message)
    {
        MessageBox.Show(message, title,
            MessageBoxButton.OK, MessageBoxImage.Error);
        return Task.CompletedTask;
    }

    public Task<string?> ShowOpenFileAsync(string filter)
    {
        var dialog = new OpenFileDialog { Filter = filter };
        return Task.FromResult(dialog.ShowDialog() == true ? dialog.FileName : null);
    }
}
```

### ViewModel에서 사용

```csharp
public partial class ItemListViewModel : ViewModelBase
{
    private readonly IDialogService _dialog;

    [RelayCommand]
    private async Task DeleteItemAsync(ItemViewModel item)
    {
        var confirm = await _dialog.ShowConfirmAsync(
            "삭제 확인", $"'{item.Name}'을(를) 삭제하시겠습니까?");

        if (confirm)
        {
            Items.Remove(item);
        }
    }
}
```

---

## 커스텀 Attached Property

```csharp
// 워터마크 텍스트 (Placeholder)
public static class WatermarkHelper
{
    public static readonly DependencyProperty WatermarkProperty =
        DependencyProperty.RegisterAttached(
            "Watermark", typeof(string), typeof(WatermarkHelper),
            new PropertyMetadata(string.Empty));

    public static string GetWatermark(DependencyObject obj)
        => (string)obj.GetValue(WatermarkProperty);

    public static void SetWatermark(DependencyObject obj, string value)
        => obj.SetValue(WatermarkProperty, value);
}
```

```xml
<TextBox local:WatermarkHelper.Watermark="검색어를 입력하세요" />
```

---

## Style / Template 구조

### 리소스 분리 권장

```
Resources/
├── Colors.xaml          # 색상 정의
├── Brushes.xaml         # Brush (Frozen)
├── Fonts.xaml           # 폰트 패밀리/크기
├── Styles.xaml          # 공통 스타일
├── DataTemplates.xaml   # DataTemplate
└── ControlTemplates.xaml # ControlTemplate
```

### MergedDictionaries

```xml
<Application.Resources>
    <ResourceDictionary>
        <ResourceDictionary.MergedDictionaries>
            <ResourceDictionary Source="Resources/Colors.xaml" />
            <ResourceDictionary Source="Resources/Brushes.xaml" />
            <ResourceDictionary Source="Resources/Styles.xaml" />
        </ResourceDictionary.MergedDictionaries>

        <!-- 글로벌 Converter -->
        <local:BoolToVisibilityConverter x:Key="BoolToVisibility" />
    </ResourceDictionary>
</Application.Resources>
```

### Brush Freezing (리소스 파일)

```xml
<!-- Resources/Brushes.xaml -->
<ResourceDictionary>
    <!-- ✅ PresentationOptions:Freeze="True" → 성능 향상 -->
    <SolidColorBrush x:Key="PrimaryBrush" Color="#1976D2"
        PresentationOptions:Freeze="True" />
    <SolidColorBrush x:Key="AccentBrush" Color="#FF4081"
        PresentationOptions:Freeze="True" />

    <LinearGradientBrush x:Key="HeaderGradient"
        PresentationOptions:Freeze="True">
        <GradientStop Color="#1976D2" Offset="0" />
        <GradientStop Color="#42A5F5" Offset="1" />
    </LinearGradientBrush>
</ResourceDictionary>
```
