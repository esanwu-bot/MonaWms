# monawms-mobile 手工安装 Android 模拟器环境（腾讯镜像加速版）

> 网络卡、Google 下载慢时用这份说明。所有组件改从**腾讯镜像**下载（速度通常快 5-10 倍），不经过 sdkmanager，直接下载 zip 解压到 SDK 目录。

## 已完成（无需重做）

- ✅ JDK 17：`D:\Program Files (x86)\java\jdk-17.0.20.1+1`，`JAVA_HOME` 已写入用户环境变量
- ✅ Android cmdline-tools：`D:\Program Files (x86)\as\sdk\cmdline-tools\latest`
- ✅ SDK 许可证：已全部接受
- ⏳ 如果 sdkmanager 还在下 system image（Google 源），**Ctrl+C 停掉它**，改用下面脚本

## 一键脚本（PowerShell 管理员，直接整体粘贴执行）

```powershell
$env:JAVA_HOME = "D:\Program Files (x86)\java\jdk-17.0.20.1+1"
$sdk = "D:\Program Files (x86)\as\sdk"
$mirror = "https://mirrors.cloud.tencent.com/AndroidSDK"
$tmp = "$env:TEMP\sdkdl"
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

Write-Host "== 1/5 platform-tools =="
curl.exe -L -o "$tmp\platform-tools.zip" "$mirror/platform-tools_r37.0.1-win.zip"
Expand-Archive -Path "$tmp\platform-tools.zip" -DestinationPath $tmp -Force
Move-Item "$tmp\platform-tools" "$sdk\platform-tools" -Force -ErrorAction SilentlyContinue

Write-Host "== 2/5 platforms;android-34 =="
curl.exe -L -o "$tmp\platform-34.zip" "$mirror/platform-34-ext12_r01.zip"
New-Item -ItemType Directory -Path "$sdk\platforms" -Force | Out-Null
Expand-Archive -Path "$tmp\platform-34.zip" -DestinationPath "$sdk\platforms" -Force
if (-not (Test-Path "$sdk\platforms\android-34")) {
  $d = Get-ChildItem "$sdk\platforms" -Directory | Where-Object { $_.Name -like "android-34*" } | Select-Object -First 1
  if ($d) { Rename-Item $d.FullName "$sdk\platforms\android-34" -Force }
}

Write-Host "== 3/5 build-tools;34.0.0 =="
curl.exe -L -o "$tmp\bt34.zip" "$mirror/build-tools_r34-windows.zip"
New-Item -ItemType Directory -Path "$sdk\build-tools\34.0.0" -Force | Out-Null
Expand-Archive -Path "$tmp\bt34.zip" -DestinationPath "$sdk\build-tools\34.0.0" -Force

Write-Host "== 4/5 emulator =="
curl.exe -L -o "$tmp\emulator.zip" "$mirror/emulator-windows_x64-16433917.zip"
Expand-Archive -Path "$tmp\emulator.zip" -DestinationPath $sdk -Force

Write-Host "== 5/5 system image (817MB，最慢的一步) =="
curl.exe -L -o "$tmp\sysimg.zip" "$mirror/sys-img/google_apis/x86_64-34_r14.zip"
New-Item -ItemType Directory -Path "$sdk\system-images\android-34\google_apis" -Force | Out-Null
Expand-Archive -Path "$tmp\sysimg.zip" -DestinationPath "$sdk\system-images\android-34\google_apis" -Force

Write-Host "== 完成，核对结构 =="
Get-ChildItem "$sdk" -Directory | Select-Object Name
Get-ChildItem "$sdk\system-images\android-34\google_apis" -Directory | Select-Object Name
```

### 核对点（脚本跑完后确认）

- `$sdk\platform-tools\adb.exe` 存在
- `$sdk\platforms\android-34` 存在
- `$sdk\build-tools\34.0.0\aapt2.exe` 存在
- `$sdk\emulator\emulator.exe` 存在
- `$sdk\system-images\android-34\google_apis\x86_64` 存在

如果某步解压出来的目录名带后缀（如 `android-34_ext12`），手动把 `$sdk\platforms\android-34_ext12` 改名为 `android-34`。

## 创建模拟器并运行（下载完成后）

```powershell
# 创建 AVD
$avd = "$sdk\cmdline-tools\latest\bin\avdmanager.bat"
cmd /c "echo no | `"$avd`" create avd -n monawms_test -k `"system-images;android-34;google_apis;x86_64`" -d pixel_5"

# 启动模拟器（保持窗口）
& "$sdk\emulator\emulator.exe" -avd monawms_test

# 另开窗口运行移动版（首次 gradle 构建较久）
cd E:\workspace\MonaWMS_TX\monawms-mobile
npm run android
```

## 验证

```powershell
& "$sdk\platform-tools\adb.exe" devices   # 模拟器开机后应显示 emulator-5554 device
```
