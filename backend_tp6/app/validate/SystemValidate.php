<?php

namespace app\validate;

use think\Validate;

/**
 * 系统配置验证器
 */
class SystemValidate extends Validate
{
    /**
     * 验证规则
     * @var array
     */
    protected $rule = [
        'system_name' => 'require|max:100',
        'system_logo' => 'max:255',
        'system_version' => 'max:20',
        'company_name' => 'require|max:100',
        'company_address' => 'max:255',
        'company_phone' => 'max:20',
        'company_email' => 'email|max:100',
        'company_website' => 'url|max:255',
        'timezone' => 'require|max:50',
        'language' => 'require|in:zh-cn,en-us',
        'currency' => 'require|max:10',
        'date_format' => 'require|max:20',
        'time_format' => 'require|max:20',
        'decimal_places' => 'require|integer|between:0,6',
        'thousand_separator' => 'max:5',
        'decimal_separator' => 'max:5',
        'backup_enabled' => 'boolean',
        'backup_frequency' => 'in:daily,weekly,monthly',
        'backup_retention' => 'integer|between:1,365',
        'backup_path' => 'max:255',
        'log_enabled' => 'boolean',
        'log_level' => 'in:debug,info,warning,error',
        'log_retention' => 'integer|between:1,365',
        'log_max_size' => 'integer|between:1,1024',
        'email_enabled' => 'boolean',
        'email_host' => 'max:100',
        'email_port' => 'integer|between:1,65535',
        'email_username' => 'max:100',
        'email_password' => 'max:100',
        'email_encryption' => 'in:none,ssl,tls',
        'email_from_name' => 'max:100',
        'email_from_address' => 'email|max:100',
        'sms_enabled' => 'boolean',
        'sms_provider' => 'in:aliyun,tencent,huawei',
        'sms_access_key' => 'max:100',
        'sms_secret_key' => 'max:100',
        'sms_sign_name' => 'max:50',
        'notification_enabled' => 'boolean',
        'notification_types' => 'array',
        'alert_enabled' => 'boolean',
        'alert_low_stock' => 'boolean',
        'alert_expiry' => 'boolean',
        'alert_overstock' => 'boolean',
        'alert_email' => 'email|max:100',
        'alert_sms' => 'max:20',
        'security_password_min_length' => 'integer|between:6,20',
        'security_password_complexity' => 'boolean',
        'security_login_attempts' => 'integer|between:3,10',
        'security_lockout_duration' => 'integer|between:5,60',
        'security_session_timeout' => 'integer|between:30,1440',
        'security_two_factor' => 'boolean',
        'api_rate_limit' => 'integer|between:10,10000',
        'api_timeout' => 'integer|between:5,300',
        'api_cache_enabled' => 'boolean',
        'api_cache_duration' => 'integer|between:60,3600',
        'warehouse_code_prefix' => 'max:10|alphaNum',
        'warehouse_code_length' => 'integer|between:4,20',
        'product_sku_prefix' => 'max:10|alphaNum',
        'product_sku_length' => 'integer|between:6,30',
        'order_number_prefix' => 'max:10|alphaNum',
        'order_number_length' => 'integer|between:8,20',
        'barcode_enabled' => 'boolean',
        'barcode_type' => 'in:code128,code39,ean13,qrcode',
        'print_enabled' => 'boolean',
        'print_template' => 'max:50',
        'print_copies' => 'integer|between:1,10',
    ];
    
    /**
     * 验证消息
     * @var array
     */
    protected $message = [
        'system_name.require' => '系统名称不能为空',
        'system_name.max' => '系统名称长度不能超过100个字符',
        'system_logo.max' => '系统Logo路径长度不能超过255个字符',
        'system_version.max' => '系统版本长度不能超过20个字符',
        'company_name.require' => '公司名称不能为空',
        'company_name.max' => '公司名称长度不能超过100个字符',
        'company_address.max' => '公司地址长度不能超过255个字符',
        'company_phone.max' => '公司电话长度不能超过20个字符',
        'company_email.email' => '公司邮箱格式不正确',
        'company_email.max' => '公司邮箱长度不能超过100个字符',
        'company_website.url' => '公司网站格式不正确',
        'company_website.max' => '公司网站长度不能超过255个字符',
        'timezone.require' => '时区不能为空',
        'timezone.max' => '时区长度不能超过50个字符',
        'language.require' => '语言不能为空',
        'language.in' => '语言选择无效',
        'currency.require' => '货币不能为空',
        'currency.max' => '货币长度不能超过10个字符',
        'date_format.require' => '日期格式不能为空',
        'date_format.max' => '日期格式长度不能超过20个字符',
        'time_format.require' => '时间格式不能为空',
        'time_format.max' => '时间格式长度不能超过20个字符',
        'decimal_places.require' => '小数位数不能为空',
        'decimal_places.integer' => '小数位数必须是整数',
        'decimal_places.between' => '小数位数必须在0-6之间',
        'thousand_separator.max' => '千位分隔符长度不能超过5个字符',
        'decimal_separator.max' => '小数分隔符长度不能超过5个字符',
        'backup_enabled.boolean' => '备份启用状态必须是布尔值',
        'backup_frequency.in' => '备份频率选择无效',
        'backup_retention.integer' => '备份保留天数必须是整数',
        'backup_retention.between' => '备份保留天数必须在1-365之间',
        'backup_path.max' => '备份路径长度不能超过255个字符',
        'log_enabled.boolean' => '日志启用状态必须是布尔值',
        'log_level.in' => '日志级别选择无效',
        'log_retention.integer' => '日志保留天数必须是整数',
        'log_retention.between' => '日志保留天数必须在1-365之间',
        'log_max_size.integer' => '日志最大大小必须是整数',
        'log_max_size.between' => '日志最大大小必须在1-1024MB之间',
        'email_enabled.boolean' => '邮件启用状态必须是布尔值',
        'email_host.max' => '邮件服务器长度不能超过100个字符',
        'email_port.integer' => '邮件端口必须是整数',
        'email_port.between' => '邮件端口必须在1-65535之间',
        'email_username.max' => '邮件用户名长度不能超过100个字符',
        'email_password.max' => '邮件密码长度不能超过100个字符',
        'email_encryption.in' => '邮件加密方式选择无效',
        'email_from_name.max' => '发件人名称长度不能超过100个字符',
        'email_from_address.email' => '发件人邮箱格式不正确',
        'email_from_address.max' => '发件人邮箱长度不能超过100个字符',
        'sms_enabled.boolean' => '短信启用状态必须是布尔值',
        'sms_provider.in' => '短信服务商选择无效',
        'sms_access_key.max' => '短信AccessKey长度不能超过100个字符',
        'sms_secret_key.max' => '短信SecretKey长度不能超过100个字符',
        'sms_sign_name.max' => '短信签名长度不能超过50个字符',
        'notification_enabled.boolean' => '通知启用状态必须是布尔值',
        'notification_types.array' => '通知类型必须是数组',
        'alert_enabled.boolean' => '预警启用状态必须是布尔值',
        'alert_low_stock.boolean' => '低库存预警必须是布尔值',
        'alert_expiry.boolean' => '过期预警必须是布尔值',
        'alert_overstock.boolean' => '超库存预警必须是布尔值',
        'alert_email.email' => '预警邮箱格式不正确',
        'alert_email.max' => '预警邮箱长度不能超过100个字符',
        'alert_sms.max' => '预警手机号长度不能超过20个字符',
        'security_password_min_length.integer' => '密码最小长度必须是整数',
        'security_password_min_length.between' => '密码最小长度必须在6-20之间',
        'security_password_complexity.boolean' => '密码复杂度要求必须是布尔值',
        'security_login_attempts.integer' => '登录尝试次数必须是整数',
        'security_login_attempts.between' => '登录尝试次数必须在3-10之间',
        'security_lockout_duration.integer' => '锁定时长必须是整数',
        'security_lockout_duration.between' => '锁定时长必须在5-60分钟之间',
        'security_session_timeout.integer' => '会话超时时间必须是整数',
        'security_session_timeout.between' => '会话超时时间必须在30-1440分钟之间',
        'security_two_factor.boolean' => '双因子认证必须是布尔值',
        'api_rate_limit.integer' => 'API速率限制必须是整数',
        'api_rate_limit.between' => 'API速率限制必须在10-10000之间',
        'api_timeout.integer' => 'API超时时间必须是整数',
        'api_timeout.between' => 'API超时时间必须在5-300秒之间',
        'api_cache_enabled.boolean' => 'API缓存启用状态必须是布尔值',
        'api_cache_duration.integer' => 'API缓存时长必须是整数',
        'api_cache_duration.between' => 'API缓存时长必须在60-3600秒之间',
        'warehouse_code_prefix.max' => '仓库编码前缀长度不能超过10个字符',
        'warehouse_code_prefix.alphaNum' => '仓库编码前缀只能包含字母和数字',
        'warehouse_code_length.integer' => '仓库编码长度必须是整数',
        'warehouse_code_length.between' => '仓库编码长度必须在4-20之间',
        'product_sku_prefix.max' => '产品SKU前缀长度不能超过10个字符',
        'product_sku_prefix.alphaNum' => '产品SKU前缀只能包含字母和数字',
        'product_sku_length.integer' => '产品SKU长度必须是整数',
        'product_sku_length.between' => '产品SKU长度必须在6-30之间',
        'order_number_prefix.max' => '订单号前缀长度不能超过10个字符',
        'order_number_prefix.alphaNum' => '订单号前缀只能包含字母和数字',
        'order_number_length.integer' => '订单号长度必须是整数',
        'order_number_length.between' => '订单号长度必须在8-20之间',
        'barcode_enabled.boolean' => '条码启用状态必须是布尔值',
        'barcode_type.in' => '条码类型选择无效',
        'print_enabled.boolean' => '打印启用状态必须是布尔值',
        'print_template.max' => '打印模板长度不能超过50个字符',
        'print_copies.integer' => '打印份数必须是整数',
        'print_copies.between' => '打印份数必须在1-10之间',
    ];
    
    /**
     * 验证场景
     * @var array
     */
    protected $scene = [
        'basic' => ['system_name', 'system_logo', 'company_name', 'company_address', 'company_phone', 'company_email', 'company_website'],
        'localization' => ['timezone', 'language', 'currency', 'date_format', 'time_format', 'decimal_places', 'thousand_separator', 'decimal_separator'],
        'backup' => ['backup_enabled', 'backup_frequency', 'backup_retention', 'backup_path'],
        'log' => ['log_enabled', 'log_level', 'log_retention', 'log_max_size'],
        'email' => ['email_enabled', 'email_host', 'email_port', 'email_username', 'email_password', 'email_encryption', 'email_from_name', 'email_from_address'],
        'sms' => ['sms_enabled', 'sms_provider', 'sms_access_key', 'sms_secret_key', 'sms_sign_name'],
        'notification' => ['notification_enabled', 'notification_types'],
        'alert' => ['alert_enabled', 'alert_low_stock', 'alert_expiry', 'alert_overstock', 'alert_email', 'alert_sms'],
        'security' => ['security_password_min_length', 'security_password_complexity', 'security_login_attempts', 'security_lockout_duration', 'security_session_timeout', 'security_two_factor'],
        'api' => ['api_rate_limit', 'api_timeout', 'api_cache_enabled', 'api_cache_duration'],
        'coding' => ['warehouse_code_prefix', 'warehouse_code_length', 'product_sku_prefix', 'product_sku_length', 'order_number_prefix', 'order_number_length'],
        'barcode' => ['barcode_enabled', 'barcode_type'],
        'print' => ['print_enabled', 'print_template', 'print_copies'],
    ];
    
    /**
     * 基础设置验证
     * @param array $data
     * @return bool|string
     */
    public function sceneBasic($data)
    {
        return $this->only(['system_name', 'system_logo', 'company_name', 'company_address', 'company_phone', 'company_email', 'company_website'])
                    ->append('company_phone', 'checkPhoneFormat')
                    ->check($data);
    }
    
    /**
     * 本地化设置验证
     * @param array $data
     * @return bool|string
     */
    public function sceneLocalization($data)
    {
        return $this->only(['timezone', 'language', 'currency', 'date_format', 'time_format', 'decimal_places', 'thousand_separator', 'decimal_separator'])
                    ->append('timezone', 'checkTimezone')
                    ->append('currency', 'checkCurrency')
                    ->append('date_format', 'checkDateFormat')
                    ->append('time_format', 'checkTimeFormat')
                    ->check($data);
    }
    
    /**
     * 备份设置验证
     * @param array $data
     * @return bool|string
     */
    public function sceneBackup($data)
    {
        return $this->only(['backup_enabled', 'backup_frequency', 'backup_retention', 'backup_path'])
                    ->append('backup_path', 'checkBackupPath')
                    ->check($data);
    }
    
    /**
     * 邮件设置验证
     * @param array $data
     * @return bool|string
     */
    public function sceneEmail($data)
    {
        return $this->only(['email_enabled', 'email_host', 'email_port', 'email_username', 'email_password', 'email_encryption', 'email_from_name', 'email_from_address'])
                    ->append('email_enabled', 'checkEmailConfig')
                    ->check($data);
    }
    
    /**
     * 短信设置验证
     * @param array $data
     * @return bool|string
     */
    public function sceneSms($data)
    {
        return $this->only(['sms_enabled', 'sms_provider', 'sms_access_key', 'sms_secret_key', 'sms_sign_name'])
                    ->append('sms_enabled', 'checkSmsConfig')
                    ->check($data);
    }
    
    /**
     * 预警设置验证
     * @param array $data
     * @return bool|string
     */
    public function sceneAlert($data)
    {
        return $this->only(['alert_enabled', 'alert_low_stock', 'alert_expiry', 'alert_overstock', 'alert_email', 'alert_sms'])
                    ->append('alert_enabled', 'checkAlertConfig')
                    ->append('alert_sms', 'checkPhoneFormat')
                    ->check($data);
    }
    
    /**
     * 安全设置验证
     * @param array $data
     * @return bool|string
     */
    public function sceneSecurity($data)
    {
        return $this->only(['security_password_min_length', 'security_password_complexity', 'security_login_attempts', 'security_lockout_duration', 'security_session_timeout', 'security_two_factor'])
                    ->check($data);
    }
    
    /**
     * 编码规则验证
     * @param array $data
     * @return bool|string
     */
    public function sceneCoding($data)
    {
        return $this->only(['warehouse_code_prefix', 'warehouse_code_length', 'product_sku_prefix', 'product_sku_length', 'order_number_prefix', 'order_number_length'])
                    ->check($data);
    }
    
    /**
     * 自定义验证规则：检查手机号格式
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkPhoneFormat($value, $rule, $data)
    {
        if (empty($value)) {
            return true;
        }
        
        // 简单的手机号格式验证
        if (!preg_match('/^[0-9+\-\s()]+$/', $value)) {
            return '手机号格式不正确';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查时区
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkTimezone($value, $rule, $data)
    {
        $validTimezones = [
            'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei',
            'UTC', 'America/New_York', 'Europe/London',
            'Asia/Tokyo', 'Australia/Sydney'
        ];
        
        if (!in_array($value, $validTimezones)) {
            return '时区选择无效';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查货币
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkCurrency($value, $rule, $data)
    {
        $validCurrencies = ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD', 'TWD'];
        
        if (!in_array($value, $validCurrencies)) {
            return '货币选择无效';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查日期格式
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkDateFormat($value, $rule, $data)
    {
        $validFormats = ['Y-m-d', 'Y/m/d', 'd-m-Y', 'd/m/Y', 'm-d-Y', 'm/d/Y'];
        
        if (!in_array($value, $validFormats)) {
            return '日期格式选择无效';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查时间格式
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkTimeFormat($value, $rule, $data)
    {
        $validFormats = ['H:i:s', 'H:i', 'h:i:s A', 'h:i A'];
        
        if (!in_array($value, $validFormats)) {
            return '时间格式选择无效';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查备份路径
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkBackupPath($value, $rule, $data)
    {
        if (empty($value) || !isset($data['backup_enabled']) || !$data['backup_enabled']) {
            return true;
        }
        
        // 检查路径格式
        if (!preg_match('/^[a-zA-Z]:\\|^\//', $value)) {
            return '备份路径格式不正确';
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查邮件配置
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkEmailConfig($value, $rule, $data)
    {
        if (!$value) {
            return true;
        }
        
        $requiredFields = ['email_host', 'email_port', 'email_username', 'email_password', 'email_from_address'];
        
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                return '启用邮件功能时，' . $this->getFieldName($field) . '不能为空';
            }
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查短信配置
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkSmsConfig($value, $rule, $data)
    {
        if (!$value) {
            return true;
        }
        
        $requiredFields = ['sms_provider', 'sms_access_key', 'sms_secret_key', 'sms_sign_name'];
        
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                return '启用短信功能时，' . $this->getFieldName($field) . '不能为空';
            }
        }
        
        return true;
    }
    
    /**
     * 自定义验证规则：检查预警配置
     * @param mixed $value
     * @param mixed $rule
     * @param array $data
     * @return bool|string
     */
    protected function checkAlertConfig($value, $rule, $data)
    {
        if (!$value) {
            return true;
        }
        
        // 至少需要配置一种预警方式
        if (empty($data['alert_email']) && empty($data['alert_sms'])) {
            return '启用预警功能时，至少需要配置邮箱或手机号';
        }
        
        // 至少需要启用一种预警类型
        $alertTypes = ['alert_low_stock', 'alert_expiry', 'alert_overstock'];
        $hasAlertType = false;
        
        foreach ($alertTypes as $type) {
            if (!empty($data[$type])) {
                $hasAlertType = true;
                break;
            }
        }
        
        if (!$hasAlertType) {
            return '启用预警功能时，至少需要启用一种预警类型';
        }
        
        return true;
    }
    
    /**
     * 获取字段中文名称
     * @param string $field
     * @return string
     */
    private function getFieldName($field)
    {
        $fieldNames = [
            'email_host' => '邮件服务器',
            'email_port' => '邮件端口',
            'email_username' => '邮件用户名',
            'email_password' => '邮件密码',
            'email_from_address' => '发件人邮箱',
            'sms_provider' => '短信服务商',
            'sms_access_key' => 'AccessKey',
            'sms_secret_key' => 'SecretKey',
            'sms_sign_name' => '短信签名',
        ];
        
        return $fieldNames[$field] ?? $field;
    }
}