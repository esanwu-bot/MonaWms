# 接口连通性体检：登录后逐个 GET 前端菜单依赖的接口，输出状态码
$ErrorActionPreference = 'Continue'
$base = 'http://127.0.0.1:8000/api'

$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' `
  -Body (@{ username = 'admin'; password = 'password' } | ConvertTo-Json)
$token = $login.data.token
if (-not $token) { Write-Output '登录失败'; exit 1 }
Write-Output "登录成功: $($login.data.user.real_name) / $($login.data.user.role)"

$headers = @{ Authorization = "Bearer $token" }

$paths = @(
  '/reports/dashboard',
  '/warehouses?page=1&pageSize=10',
  '/warehouses/statistics',
  '/warehouses/options',
  '/categories',
  '/categories/statistics',
  '/products?page=1&limit=15',
  '/products/statistics',
  '/inventory?page=1&limit=15',
  '/inventory/statistics',
  '/inbound-orders?page=1&limit=15',
  '/inbound-orders/statistics',
  '/outbound-orders?page=1&limit=15',
  '/outbound-orders/statistics',
  '/inventory-transactions?page=1&limit=15',
  '/inventory-transactions/statistics',
  '/inventory-transactions/trend',
  '/inventory-transactions/recent',
  '/locations?page=1&limit=15',
  '/reports/inventory',
  '/reports/orders',
  '/categories/tree',
  '/products/options',
  '/users/options',
  '/projects/1/inventory',
  '/scrap?page=1&limit=15',
  '/scrap/statistics',
  '/scrap/available-devices',
  '/serial-numbers?page=1&limit=15',
  '/bom?page=1&limit=15',
  '/projects?page=1&limit=15',
  '/wireless-spare-parts?page=1&limit=15',
  '/wireless-spare-parts/stats',
  '/logs?page=1&limit=15',
  '/grants/matrix',
  '/grants/user/1',
  '/dictionary/types',
  '/suppliers?page=1&limit=15',
  '/customers?page=1&limit=15',
  '/users?page=1&limit=15'
)

foreach ($p in $paths) {
  try {
    $r = Invoke-WebRequest -Uri "$base$p" -Headers $headers -UseBasicParsing -TimeoutSec 20
    $body = $r.Content
    $len = $body.Length
    $snippet = if ($len -gt 110) { $body.Substring(0, 110) } else { $body }
    $snippet = $snippet -replace '\s+', ' '
    Write-Output ("{0,-6} {1,-42} len={2,-6} {3}" -f $r.StatusCode, $p, $len, $snippet)
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Output ("{0,-6} {1,-42} ERR: {2}" -f $code, $p, $_.Exception.Message)
  }
}
