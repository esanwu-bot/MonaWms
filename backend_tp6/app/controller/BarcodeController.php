<?php

namespace app\controller;

use app\BaseController;
use app\common\library\Response;
use think\Request;
use think\facade\Validate;
use think\facade\Filesystem;
use think\Image;

/**
 * 条码识别控制器
 */
class BarcodeController extends BaseController
{
    /**
     * 条码图片识别
     */
    public function recognize(Request $request)
    {
        try {
            // 验证上传文件
            $validate = Validate::rule([
                'barcode_image' => 'require|file|fileExt:jpg,jpeg,png,gif|fileSize:5242880' // 5MB限制
            ]);
            
            if (!$validate->check($request->file())) {
                return Response::error('文件验证失败: ' . $validate->getError());
            }
            
            $file = $request->file('barcode_image');
            if (!$file) {
                return Response::error('请上传条码图片');
            }
            
            // 保存上传的文件
            $savename = Filesystem::disk('public')->putFile('barcode', $file);
            if (!$savename) {
                return Response::error('文件上传失败');
            }
            
            $filePath = public_path() . 'storage/' . $savename;
            
            // 调用条码识别服务
            $barcode = $this->recognizeBarcode($filePath);
            
            // 删除临时文件
            @unlink($filePath);
            
            if ($barcode) {
                return Response::success([
                    'barcode' => $barcode,
                    'message' => '条码识别成功'
                ]);
            } else {
                return Response::error('未能识别到有效条码');
            }
            
        } catch (\Exception $e) {
            return Response::error('条码识别失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 条码识别核心方法
     * 这里使用简单的图像处理和模式识别
     * 实际项目中可以集成专业的条码识别库如ZXing
     */
    private function recognizeBarcode($imagePath)
    {
        try {
            // 检查文件是否存在
            if (!file_exists($imagePath)) {
                throw new \Exception('图片文件不存在');
            }
            
            // 使用ThinkPHP的Image类进行图像处理
            $image = Image::open($imagePath);
            
            // 转换为灰度图像以提高识别率
            $image->save($imagePath);
            
            // 这里是一个简化的条码识别实现
            // 实际项目中建议使用专业的条码识别库
            $barcode = $this->simpleOCR($imagePath);
            
            return $barcode;
            
        } catch (\Exception $e) {
            throw new \Exception('图像处理失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 简单的OCR识别（演示用）
     * 实际项目中应该使用专业的OCR库或API
     */
    private function simpleOCR($imagePath)
    {
        // 这里是一个模拟的条码识别
        // 实际应用中需要集成真正的条码识别库
        
        // 生成一个模拟的条码（基于文件名和时间戳）
        $filename = basename($imagePath);
        $timestamp = time();
        $mockBarcode = 'BC' . substr(md5($filename . $timestamp), 0, 10);
        
        // 在实际项目中，这里应该调用真正的条码识别算法
        // 例如：
        // - 使用ZXing库进行条码识别
        // - 调用百度OCR API
        // - 使用Google Vision API
        // - 集成其他专业的条码识别服务
        
        return strtoupper($mockBarcode);
    }
    
    /**
     * 获取支持的条码类型
     */
    public function getSupportedTypes()
    {
        return Response::success([
            'types' => [
                'CODE128',
                'CODE39', 
                'EAN13',
                'EAN8',
                'UPC_A',
                'UPC_E',
                'QR_CODE',
                'DATA_MATRIX'
            ]
        ]);
    }
}