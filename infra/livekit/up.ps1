param(
  [string]$NodeIp = ''
)

$ErrorActionPreference = 'Stop'

function Get-PreferredIPv4 {
  $defaultRoute = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' |
    Sort-Object -Property RouteMetric, InterfaceMetric |
    Select-Object -First 1

  if (-not $defaultRoute) {
    throw '未找到默认路由，无法自动识别本机 IPv4。'
  }

  $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $defaultRoute.InterfaceIndex |
    Where-Object {
      $_.IPAddress -ne '127.0.0.1' -and
      $_.IPAddress -notlike '169.254.*'
    } |
    Select-Object -First 1 -ExpandProperty IPAddress

  if (-not $ip) {
    throw '未找到可用 IPv4，请手动传入 -NodeIp。'
  }

  return $ip
}

if (-not $NodeIp) {
  $NodeIp = Get-PreferredIPv4
}

$env:NUXT_PUBLIC_SERVER_HOST = $NodeIp
Write-Host "NUXT_PUBLIC_SERVER_HOST=$NodeIp"

docker compose -f "$PSScriptRoot/docker-compose.yml" up -d
