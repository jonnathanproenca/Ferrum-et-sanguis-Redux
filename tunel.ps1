# Publica o jogo para o celular: servidor de desenvolvimento (recarrega sozinho ao salvar) + tunel ngrok com endereco fixo.
# Uso:  npm run tunel        (ou: .\tunel.ps1)  -- deixe a janela aberta; nao precisa reiniciar a cada mudanca.
# Config do ngrok fica FORA do projeto, em %USERPROFILE%\tools\ngrok-ferrum.txt:
#   linha 1 = authtoken, linha 2 = dominio fixo (ex.: xxxx.ngrok-free.dev). Na primeira vez o script pede.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$porta = 5173
$pastaTools = Join-Path $HOME 'tools'
if (-not (Test-Path $pastaTools)) { New-Item -ItemType Directory -Path $pastaTools | Out-Null }
$ngrokExe = Join-Path $pastaTools 'ngrok.exe'
$cfg = Join-Path $pastaTools 'ngrok-ferrum.txt'

# Procura o ngrok em lugares comuns (PATH, tools, WindowsApps, WinGet, Downloads, Program Files).
if (-not (Test-Path $ngrokExe)) {
  $achado = $null
  $cmd = Get-Command ngrok -ErrorAction SilentlyContinue
  if ($cmd) { $achado = $cmd.Source }
  if (-not $achado) {
    $candidatos = @(
      (Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\ngrok.exe'),
      (Join-Path $env:LOCALAPPDATA 'ngrok\ngrok.exe'),
      (Join-Path $HOME 'Downloads\ngrok.exe'),
      (Join-Path $HOME 'ngrok.exe'),
      (Join-Path $env:ProgramFiles 'ngrok\ngrok.exe')
    )
    $achado = $candidatos | Where-Object { Test-Path $_ } | Select-Object -First 1
  }
  if (-not $achado) {
    $achado = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages') -Filter ngrok.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  }
  if ($achado) {
    Write-Host "ngrok encontrado em $achado" -ForegroundColor DarkGray
    $ngrokExe = $achado
  } else {
    Write-Host "ngrok.exe nao encontrado (procurei em $pastaTools, PATH, WindowsApps, WinGet e Downloads)." -ForegroundColor Yellow
    $r = (Read-Host 'Baixar o ngrok oficial agora para a pasta tools? (S/N)').Trim().ToUpper()
    if ($r -ne 'S') { throw 'Sem ngrok nao ha tunel. Baixe em https://ngrok.com/download e coloque o ngrok.exe em ' + $pastaTools }
    $zip = Join-Path $env:TEMP 'ngrok.zip'
    Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $pastaTools -Force
    Remove-Item $zip -ErrorAction SilentlyContinue
    if (-not (Test-Path $ngrokExe)) { throw 'O download terminou mas o ngrok.exe nao apareceu. Baixe manualmente em https://ngrok.com/download.' }
    Write-Host "ngrok instalado em $ngrokExe" -ForegroundColor Green
  }
}

if (Test-Path $cfg) {
  $linhas = @(Get-Content $cfg | Where-Object { $_.Trim() })
  $token = $linhas[0].Trim(); $dominio = $linhas[1].Trim()
} else {
  Write-Host 'Configuracao do ngrok (so na primeira vez):' -ForegroundColor Yellow
  $token = (Read-Host '  Authtoken').Trim()
  $dominio = ((Read-Host '  Dominio fixo (ex.: xxxx.ngrok-free.dev)').Trim().ToLower() -replace '^https?://', '') -replace '/.*$', ''
  if (-not $token -or -not $dominio) { throw 'Authtoken e dominio sao obrigatorios.' }
  Set-Content -Path $cfg -Value @($token, $dominio) -Encoding ASCII
  Write-Host "  Salvo em $cfg (fora do repositorio)." -ForegroundColor DarkGray
}

# Servidor de desenvolvimento (porta fixa). Se ja estiver rodando, reaproveita: as mudancas aparecem sozinhas.
$jaNoAr = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue
if (-not $jaNoAr) {
  Write-Host "Subindo o servidor de desenvolvimento na porta $porta..." -ForegroundColor Cyan
  Start-Process cmd -ArgumentList '/c', "npx vite --host --port $porta --strictPort" -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 4
} else {
  Write-Host "Servidor ja estava no ar na porta $porta (reaproveitado)." -ForegroundColor DarkGray
}

# Tunel ngrok com o dominio fixo. Precisa apontar para a porta do servidor: se estiver apontando para
# outra (ex.: o preview antigo), ele e reiniciado.
$tunelOk = $false
try {
  $t = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 2
  $tunelOk = @($t.tunnels | Where-Object { $_.config.addr -match ":$porta$" }).Count -gt 0
  if (-not $tunelOk -and @($t.tunnels).Count -gt 0) {
    Write-Host 'Tunel antigo apontava para outra porta: reiniciando.' -ForegroundColor Yellow
    Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
  }
} catch {}
if ($tunelOk) {
  Write-Host 'Tunel ngrok ja estava ativo na porta certa (reaproveitado).' -ForegroundColor DarkGray
} else {
  Write-Host 'Abrindo o tunel ngrok...' -ForegroundColor Cyan
  Start-Process $ngrokExe -ArgumentList 'http', "--url=https://$dominio", "--authtoken=$token", '--log=stdout', "$porta" -WindowStyle Hidden | Out-Null
}

$url = $null
foreach ($i in 1..30) {
  Start-Sleep -Milliseconds 700
  try {
    $t = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 2
    if (@($t.tunnels).Count -gt 0) { $url = "https://$dominio"; break }
  } catch {}
}
if (-not $url) { throw 'o ngrok nao subiu. Confira o authtoken e se o dominio e seu (dashboard.ngrok.com > Domains).' }

Write-Host ''
Write-Host "Jogo no ar: $url" -ForegroundColor Green
Write-Host 'Ao salvar um arquivo, o celular recarrega sozinho (ou basta atualizar a pagina).' -ForegroundColor DarkGray
Write-Host 'Na primeira visita o ngrok mostra uma tela de aviso: toque em "Visit Site".' -ForegroundColor DarkGray
Write-Host 'Para parar: feche os processos ngrok.exe e node no Gerenciador de Tarefas.' -ForegroundColor DarkGray
