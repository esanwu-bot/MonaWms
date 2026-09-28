<?php
declare(strict_types=1);

namespace app\common;

/**
 * 业务异常
 *
 * 约定：业务错误用 HTTP 200 承载业务码（除权限类用 401/403），
 * 由全局异常接管统一输出 {code, message, data, trace_id}
 */
class BizException extends \RuntimeException
{
    /** 业务错误码 */
    protected string $bizCode;

    /** 附加数据（如缺料明细、warehouse_id） */
    protected array $bizData;

    /** HTTP 状态码 */
    protected int $httpStatus;

    public function __construct(
        string $bizCode,
        string $message = '',
        array $bizData = [],
        int $httpStatus = 200
    ) {
        parent::__construct($message ?: $bizCode);
        $this->bizCode    = $bizCode;
        $this->bizData    = $bizData;
        $this->httpStatus = $httpStatus;
    }

    public function getBizCode(): string
    {
        return $this->bizCode;
    }

    public function getBizData(): array
    {
        return $this->bizData;
    }

    public function getHttpStatus(): int
    {
        return $this->httpStatus;
    }
}
