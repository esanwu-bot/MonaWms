<?php

namespace app\middleware;

use think\Request;
use think\Response;
use think\exception\Handle;
use think\exception\HttpException;
use think\exception\ValidateException;
use think\exception\HttpResponseException;
use think\db\exception\DataNotFoundException;
use think\db\exception\ModelNotFoundException;
use think\db\exception\DbException;
use app\common\library\Response as ApiResponse;
use think\facade\Log;
use think\facade\Env;

/**
 * 异常处理中间件
 */
class ExceptionHandle extends Handle
{
    /**
     * 不需要记录信息（日志）的异常类型
     * @var array
     */
    protected $ignoreReport = [
        HttpException::class,
        HttpResponseException::class,
        ModelNotFoundException::class,
        DataNotFoundException::class,
        ValidateException::class,
    ];

    /**
     * 记录异常信息（包括日志或者其它方式记录）
     *
     * @access public
     * @param \Throwable $exception
     * @return void
     */
    public function report(\Throwable $exception): void
    {
        // 检查是否需要记录日志
        if (!$this->isIgnoreReport($exception)) {
            // 记录异常日志
            $this->recordException($exception);
        }
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @access public
     * @param Request $request
     * @param \Throwable $e
     * @return Response
     */
    public function render($request, \Throwable $e): Response
    {
        // 添加自定义异常处理机制
        if ($e instanceof HttpResponseException) {
            return $e->getResponse();
        }

        // 验证异常
        if ($e instanceof ValidateException) {
            return ApiResponse::error($e->getError(), 422);
        }

        // HTTP异常
        if ($e instanceof HttpException) {
            return $this->renderHttpException($e);
        }

        // 数据库异常
        if ($e instanceof DbException) {
            return $this->renderDbException($e);
        }

        // 模型未找到异常
        if ($e instanceof ModelNotFoundException || $e instanceof DataNotFoundException) {
            return ApiResponse::error('数据不存在', 404);
        }

        // JWT相关异常
        if ($this->isJwtException($e)) {
            return $this->renderJwtException($e);
        }

        // 业务逻辑异常
        if ($this->isBusinessException($e)) {
            return $this->renderBusinessException($e);
        }

        // 系统异常
        return $this->renderSystemException($e);
    }

    /**
     * 处理HTTP异常
     *
     * @param HttpException $e
     * @return Response
     */
    protected function renderHttpException(HttpException $e): Response
    {
        $statusCode = $e->getStatusCode();
        $message = $e->getMessage();

        // 常见HTTP状态码处理
        switch ($statusCode) {
            case 401:
                $message = $message ?: '未授权访问';
                break;
            case 403:
                $message = $message ?: '禁止访问';
                break;
            case 404:
                $message = $message ?: '页面不存在';
                break;
            case 405:
                $message = $message ?: '请求方法不允许';
                break;
            case 429:
                $message = $message ?: '请求过于频繁';
                break;
            case 500:
                $message = $message ?: '服务器内部错误';
                break;
            default:
                $message = $message ?: 'HTTP错误';
        }

        return ApiResponse::error($message, $statusCode);
    }

    /**
     * 处理数据库异常
     *
     * @param DbException $e
     * @return Response
     */
    protected function renderDbException(DbException $e): Response
    {
        $message = '数据库操作失败';
        $code = 500;

        // 开发环境显示详细错误信息
        if (Env::get('app_debug', false)) {
            $message = $e->getMessage();
        } else {
            // 生产环境根据错误类型返回友好提示
            $errorMessage = $e->getMessage();
            
            if (strpos($errorMessage, 'Duplicate entry') !== false) {
                $message = '数据已存在，请检查唯一性约束';
                $code = 409;
            } elseif (strpos($errorMessage, 'foreign key constraint') !== false) {
                $message = '数据关联约束，无法执行此操作';
                $code = 409;
            } elseif (strpos($errorMessage, 'Data too long') !== false) {
                $message = '数据长度超出限制';
                $code = 422;
            } elseif (strpos($errorMessage, 'Connection refused') !== false) {
                $message = '数据库连接失败';
            }
        }

        return ApiResponse::error($message, $code);
    }

    /**
     * 处理JWT异常
     *
     * @param \Throwable $e
     * @return Response
     */
    protected function renderJwtException(\Throwable $e): Response
    {
        $message = $e->getMessage();
        
        // JWT异常消息映射
        $jwtMessages = [
            'Token has expired' => 'Token已过期',
            'Token is invalid' => 'Token无效',
            'Token is blacklisted' => 'Token已被禁用',
            'Token not provided' => '未提供Token',
            'Could not decode token' => 'Token解析失败',
        ];
        
        foreach ($jwtMessages as $key => $value) {
            if (strpos($message, $key) !== false) {
                $message = $value;
                break;
            }
        }
        
        return ApiResponse::error($message, 401);
    }

    /**
     * 处理业务逻辑异常
     *
     * @param \Throwable $e
     * @return Response
     */
    protected function renderBusinessException(\Throwable $e): Response
    {
        return ApiResponse::error($e->getMessage(), 400);
    }

    /**
     * 处理系统异常
     *
     * @param \Throwable $e
     * @return Response
     */
    protected function renderSystemException(\Throwable $e): Response
    {
        $message = '系统错误';
        
        // 开发环境显示详细错误信息
        if (Env::get('app_debug', false)) {
            $message = $e->getMessage();
            
            // 返回详细错误信息（包括堆栈跟踪）
            return ApiResponse::error($message, 500, [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        return ApiResponse::error($message, 500);
    }

    /**
     * 记录异常信息
     *
     * @param \Throwable $exception
     */
    private function recordException(\Throwable $exception): void
    {
        $request = request();
        
        $logData = [
            'exception' => get_class($exception),
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'url' => $request->url(true),
            'method' => $request->method(),
            'ip' => $request->ip(),
            'user_agent' => $request->header('User-Agent'),
            'params' => $request->param(),
            'headers' => $request->header(),
            'trace' => $exception->getTraceAsString(),
            'time' => date('Y-m-d H:i:s'),
        ];
        
        // 过滤敏感信息
        $logData = $this->filterSensitiveData($logData);
        
        // 记录错误日志
        Log::error('系统异常', $logData);
        
        // 严重错误发送通知（可选）
        if ($this->isCriticalException($exception)) {
            $this->sendCriticalAlert($exception, $logData);
        }
    }

    /**
     * 过滤敏感数据
     *
     * @param array $data
     * @return array
     */
    private function filterSensitiveData(array $data): array
    {
        $sensitiveFields = ['password', 'token', 'authorization', 'cookie'];
        
        // 过滤请求参数中的敏感信息
        if (isset($data['params'])) {
            foreach ($sensitiveFields as $field) {
                if (isset($data['params'][$field])) {
                    $data['params'][$field] = '***';
                }
            }
        }
        
        // 过滤请求头中的敏感信息
        if (isset($data['headers'])) {
            foreach ($sensitiveFields as $field) {
                $key = strtolower($field);
                if (isset($data['headers'][$key])) {
                    $data['headers'][$key] = '***';
                }
            }
        }
        
        return $data;
    }

    /**
     * 检查是否为JWT异常
     *
     * @param \Throwable $e
     * @return bool
     */
    private function isJwtException(\Throwable $e): bool
    {
        $jwtExceptions = [
            'Firebase\\JWT\\ExpiredException',
            'Firebase\\JWT\\SignatureInvalidException',
            'Firebase\\JWT\\BeforeValidException',
            'UnexpectedValueException'
        ];
        
        $className = get_class($e);
        foreach ($jwtExceptions as $exception) {
            if (strpos($className, $exception) !== false) {
                return true;
            }
        }
        
        $message = $e->getMessage();
        $jwtKeywords = ['Token', 'JWT', 'token', 'jwt'];
        foreach ($jwtKeywords as $keyword) {
            if (strpos($message, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 检查是否为业务逻辑异常
     *
     * @param \Throwable $e
     * @return bool
     */
    private function isBusinessException(\Throwable $e): bool
    {
        // 可以根据异常类名或消息判断
        $className = get_class($e);
        return strpos($className, 'BusinessException') !== false ||
               strpos($className, 'LogicException') !== false;
    }

    /**
     * 检查是否为严重异常
     *
     * @param \Throwable $exception
     * @return bool
     */
    private function isCriticalException(\Throwable $exception): bool
    {
        $criticalExceptions = [
            'Error',
            'ParseError',
            'TypeError',
            'FatalError'
        ];
        
        $className = get_class($exception);
        foreach ($criticalExceptions as $critical) {
            if (strpos($className, $critical) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 发送严重错误警报
     *
     * @param \Throwable $exception
     * @param array $logData
     */
    private function sendCriticalAlert(\Throwable $exception, array $logData): void
    {
        // 这里可以实现邮件、短信、钉钉等通知方式
        // 例如：发送邮件给管理员
        try {
            // Mail::send('admin@example.com', '系统严重错误', $logData);
            // 或者发送到监控系统
            // Monitor::alert('critical_error', $logData);
        } catch (\Exception $e) {
            // 发送通知失败，记录日志
            Log::error('发送严重错误警报失败', ['error' => $e->getMessage()]);
        }
    }
}