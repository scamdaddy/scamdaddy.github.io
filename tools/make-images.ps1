# Пересоздаёт картинки сайта с помощью Edge в «безголовом» режиме (без окна):
#   assets/og-image.png        — превью ссылки 1200×630 (из tools/og-image.html)
#   assets/favicon-32.png      — иконка для старых браузеров (из assets/favicon.svg)
#   assets/apple-touch-icon.png — иконка 180×180 для iPhone
#
# Запуск из папки проекта:
#   powershell -ExecutionPolicy Bypass -File tools\make-images.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }

# Отдельный временный профиль, чтобы не трогать обычный Edge
$profileDir = Join-Path $env:TEMP 'artem-site-edge-profile'

function Take-Screenshot($source, $output, $width, $height, $transparent) {
  $url = 'file:///' + ($source -replace '\\', '/')
  $edgeArgs = @(
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    "--user-data-dir=$profileDir",
    "--window-size=$width,$height",
    '--virtual-time-budget=8000',   # даём время загрузить шрифты
    "--screenshot=$output"
  )
  if ($transparent) { $edgeArgs += '--default-background-color=00000000' }
  $edgeArgs += $url
  if (Test-Path $output) { Remove-Item $output }
  # Start-Process ждёт завершения Edge и не пугается его служебных сообщений
  $quoted = $edgeArgs | ForEach-Object { '"' + $_ + '"' }
  Start-Process -FilePath $edge -ArgumentList $quoted -Wait -WindowStyle Hidden
  # Edge может вернуть управление чуть раньше, чем допишет файл
  for ($i = 0; $i -lt 40 -and -not (Test-Path $output); $i++) { Start-Sleep -Milliseconds 250 }
  if (-not (Test-Path $output)) { throw "не получилось создать $output" }
  Write-Host "готово: $output"
}

# Обёртка-страница для иконки: SVG растянутый на всё окно
function Make-Icon($size, $output) {
  $svg = Join-Path $root 'assets\favicon.svg'
  $tmp = Join-Path $env:TEMP "artem-icon-$size.html"
  $svgUrl = 'file:///' + ($svg -replace '\\', '/')
  "<html><body style='margin:0;background:transparent'><img src='$svgUrl' style='display:block;width:${size}px;height:${size}px'></body></html>" |
    Set-Content -Path $tmp -Encoding UTF8
  Take-Screenshot $tmp $output $size $size $true
  Remove-Item $tmp
}

Take-Screenshot (Join-Path $root 'tools\og-image.html') (Join-Path $root 'assets\og-image.png') 1200 630 $false
Make-Icon 32 (Join-Path $root 'assets\favicon-32.png')
Make-Icon 180 (Join-Path $root 'assets\apple-touch-icon.png')
