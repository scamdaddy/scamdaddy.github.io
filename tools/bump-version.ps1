# Обновляет номер версии (?v=…) у CSS и JS в index.html и 404.html.
# Зачем: GitHub Pages разрешает браузеру 10 минут держать файлы в кэше.
# Без новой версии посетитель может получить новую страницу со старыми скриптами,
# и часть блоков окажется пустой. С новым ?v=… браузер скачает свежие файлы.
#
# Запускать перед каждым коммитом, который меняет css/ или js/:
#   powershell -ExecutionPolicy Bypass -File tools\bump-version.ps1

$root = Split-Path -Parent $PSScriptRoot
$version = 'v=' + (Get-Date -Format 'yyyyMMdd-HHmm')

$files = @{
  'index.html' = '(href="css/style\.css|src="js/[a-z0-9]+\.js)(\?v=[^"]*)?"'
  '404.html'   = '(href="/css/style\.css|src="/js/stars\.js)(\?v=[^"]*)?"'
}

foreach ($name in $files.Keys) {
  $path = Join-Path $root $name
  $text = [IO.File]::ReadAllText($path)
  $text = [regex]::Replace($text, $files[$name], { param($m) "$($m.Groups[1].Value)?$version`"" })
  [IO.File]::WriteAllText($path, $text)
}

Write-Host "версия обновлена: $version"
