<?php

namespace app\validate;

use think\Validate;

/**
 * 认证相关验证器
 */
class AuthValidate extends Validate
{
    /**
     * 验证规则
     * @var array
     */
    protected $rule = [
        'username' => 'require|max:50|alphaNum',
        'password' => 'require|min:6|max:20',
        'email' => 'require|email|max:100',
        'real_name' => 'require|max:50|chs',
        'phone' => 'mobile',
        'old_password' => 'require',
        'new_password' => 'require|min:6|max:20|different:old_password',
        'confirm_password' => 'require|confirm:new_password',
        'code' => 'require|length:6|number',
    ];
    
    /**
     * 验证消息
     * @var array
     */
    protected $message = [
        'username.require' => '用户名不能为空',
        'username.max' => '用户名长度不能超过50个字符',
        'username.alphaNum' => '用户名只能包含字母和数字',
        'password.require' => '密码不能为空',
        'password.min' => '密码长度不能少于6位',
        'password.max' => '密码长度不能超过20位',
        'email.require' => '邮箱不能为空',
        'email.email' => '邮箱格式不正确',
        'email.max' => '邮箱长度不能超过100个字符',
        'real_name.require' => '真实姓名不能为空',
        'real_name.max' => '真实姓名长度不能超过50个字符',
        'real_name.chs' => '真实姓名只能包含中文字符',
        'phone.mobile' => '手机号格式不正确',
        'old_password.require' => '原密码不能为空',
        'new_password.require' => '新密码不能为空',
        'new_password.min' => '新密码长度不能少于6位',
        'new_password.max' => '新密码长度不能超过20位',
        'new_password.different' => '新密码不能与原密码相同',
        'confirm_password.require' => '确认密码不能为空',
        'confirm_password.confirm' => '确认密码与新密码不一致',
        'code.require' => '验证码不能为空',
        'code.length' => '验证码必须是6位数字',
        'code.number' => '验证码只能包含数字',
    ];
    
    /**
     * 验证场景
     * @var array
     */
    protected $scene = [
        'login' => ['username', 'password'],
        'register' => ['username', 'password', 'email', 'real_name', 'phone'],
        'change_password' => ['old_password', 'new_password', 'confirm_password'],
        'reset_password' => ['email', 'code', 'new_password', 'confirm_password'],
        'forgot_password' => ['email'],
        'verify_code' => ['email', 'code'],
    ];
    
    /**
     * 登录验证
     * @param array $data
     * @return bool|string
     */
    public function sceneLogin($data)
    {
        return $this->only(['username', 'password'])->check($data);
    }
    
    /**
     * 注册验证
     * @param array $data
     * @return bool|string
     */
    public function sceneRegister($data)
    {
        return $this->only(['username', 'password', 'email', 'real_name', 'phone'])
                    ->append('username', 'unique:user')
                    ->append('email', 'unique:user')
                    ->append('phone', 'unique:user')
                    ->check($data);
    }
    
    /**
     * 修改密码验证
     * @param array $data
     * @return bool|string
     */
    public function sceneChangePassword($data)
    {
        return $this->only(['old_password', 'new_password', 'confirm_password'])->check($data);
    }
    
    /**
     * 重置密码验证
     * @param array $data
     * @return bool|string
     */
    public function sceneResetPassword($data)
    {
        return $this->only(['email', 'code', 'new_password', 'confirm_password'])->check($data);
    }
    
    /**
     * 忘记密码验证
     * @param array $data
     * @return bool|string
     */
    public function sceneForgotPassword($data)
    {
        return $this->only(['email'])->check($data);
    }
    
    /**
     * 验证码验证
     * @param array $data
     * @return bool|string
     */
    public function sceneVerifyCode($data)
    {
        return $this->only(['email', 'code'])->check($data);
    }
    
    /**
     * 自定义验证规则：检查用户名是否存在
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkUserExists($value, $rule, $data)
    {
        $user = \app\model\User::where('username', $value)
                              ->whereOr('email', $value)
                              ->whereOr('phone', $value)
                              ->find();
        
        if (!$user) {
            return '用户不存在';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查密码强度
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkPasswordStrength($value, $rule, $data)
    {
        // 密码必须包含字母和数字
        if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,20}$/', $value)) {
            return '密码必须包含字母和数字，可包含特殊字符@$!%*?&';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查验证码
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkVerifyCode($value, $rule, $data)
    {
        if (!isset($data['email'])) {
            return '邮箱参数缺失';
        }
        
        $cacheKey = 'verify_code_' . $data['email'];
        $cachedCode = \think\facade\Cache::get($cacheKey);
        
        if (!$cachedCode) {
            return '验证码已过期，请重新获取';
        }
        
        if ($cachedCode !== $value) {
            return '验证码错误';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查邮箱是否已注册
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkEmailRegistered($value, $rule, $data)
    {
        $user = \app\model\User::where('email', $value)->find();
        
        if (!$user) {
            return '该邮箱未注册';
        }
        
        return true;
    }
}