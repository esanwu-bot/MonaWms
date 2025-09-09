<?php

namespace app\common\library;

/**
 * 响应格式化工具类
 */
class Response
{
    /**
     * 成功响应
     *
     * @param mixed $data 响应数据
     * @param string $message 响应消息
     * @param int $code 响应码
     * @return \think\Response
     */
    public static function success($data = null, $message = '操作成功', $code = 200)
    {
        return json([
            'code' => $code,
            'message' => $message,
            'data' => $data,
            'timestamp' => time()
        ], $code);
    }
    
    /**
     * 失败响应
     *
     * @param string $message 错误消息
     * @param int $code 错误码
     * @param mixed $data 响应数据
     * @return \think\Response
     */
    public static function error($message = '操作失败', $code = 400, $data = null)
    {
        return json([
            'code' => $code,
            'message' => $message,
            'data' => $data,
            'timestamp' => time()
        ], $code);
    }
    
    /**
     * 分页响应
     *
     * @param array $list 数据列表
     * @param int $total 总数
     * @param int $page 当前页
     * @param int $limit 每页数量
     * @param string $message 响应消息
     * @return \think\Response
     */
    public static function paginate($list, $total, $page, $limit, $message = '获取成功')
    {
        $data = [
            'list' => $list,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ]
        ];
        
        return self::success($data, $message);
    }
    
    /**
     * 验证失败响应
     *
     * @param array $errors 验证错误信息
     * @return \think\Response
     */
    public static function validateError($errors)
    {
        return json([
            'code' => 422,
            'message' => '数据验证失败',
            'data' => null,
            'errors' => $errors,
            'timestamp' => time()
        ], 422);
    }
    
    /**
     * 未找到资源响应
     *
     * @param string $message 错误消息
     * @return \think\Response
     */
    public static function notFound($message = '资源不存在')
    {
        return self::error($message, 404);
    }
    
    /**
     * 未授权响应
     *
     * @param string $message 错误消息
     * @return \think\Response
     */
    public static function unauthorized($message = '未授权访问')
    {
        return self::error($message, 401);
    }
    
    /**
     * 禁止访问响应
     *
     * @param string $message 错误消息
     * @return \think\Response
     */
    public static function forbidden($message = '禁止访问')
    {
        return self::error($message, 403);
    }
    
    /**
     * 服务器错误响应
     *
     * @param string $message 错误消息
     * @return \think\Response
     */
    public static function serverError($message = '服务器内部错误')
    {
        return self::error($message, 500);
    }
}