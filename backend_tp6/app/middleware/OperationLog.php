<?php

namespace app\middleware;

use app\common\Current;
use think\facade\Db;
use think\Request;
use think\Response;

/**
 * 操作日志中间件
 *
 * 统一记录 POST/PUT/PATCH/DELETE 写操作到 operation_log（只读审计表）。
 * 敏感字段（password/token）在落库前过滤；授权变更由 GrantService 单独记录更精细的 diff。
 * 日志写入失败绝不影响主流程。
 */
class OperationLog
{
    private const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    /** 这些前缀已有专门的精细日志，避免重复记录 */
    private const SKIP_PREFIXES = ['api/grants', 'api/logs', 'api/auth'];

    public function handle(Request $request, \Closure $next)
    {
        $response = $next($request);

        try {
            $this->record($request, $response);
        } catch (\Throwable $e) {
            // 审计日志失败不阻断业务
        }

        return $response;
    }

    private function record(Request $request, Response $response): void
    {
        if (!in_array(strtoupper($request->method()), self::WRITE_METHODS, true)) {
            return;
        }

        $path = ltrim($request->pathinfo(), '/');
        foreach (self::SKIP_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return;
            }
        }

        // 仅记录成功响应
        if ($response->getCode() >= 400) {
            return;
        }

        $body = json_decode($response->getContent(), true);
        if (is_array($body) && isset($body['code']) && (int) $body['code'] >= 400) {
            return;
        }

        // 目标类型取自路径首段，如 products/5 -> products
        $segments   = explode('/', trim($path, '/'));
        $targetType = $segments[0] ?? null;
        $targetId   = null;
        if (isset($segments[1]) && ctype_digit((string) $segments[1])) {
            $targetId = (int) $segments[1];
        } elseif (is_array($body) && isset($body['data']['id'])) {
            $targetId = (int) $body['data']['id'];
        }

        $params = $this->sanitize($request->param());

        Db::name('operation_log')->insert([
            'operator_id' => Current::idOrNull(),
            'action'      => strtolower($request->method()),
            'target_type' => $targetType,
            'target_id'   => $targetId,
            'before'      => null,
            'after'       => json_encode($params, JSON_UNESCAPED_UNICODE),
            'method'      => strtoupper($request->method()),
            'path'        => $path,
            'ip'          => $request->ip(),
            'created_at'  => date('Y-m-d H:i:s'),
        ]);
    }

    private function sanitize(array $data): array
    {
        foreach (['password', 'old_password', 'new_password', 'confirm_password', 'token', 'refreshToken', 'authorization'] as $field) {
            if (isset($data[$field])) {
                $data[$field] = '***';
            }
        }

        return $data;
    }
}
