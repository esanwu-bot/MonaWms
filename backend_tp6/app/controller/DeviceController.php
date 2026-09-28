<?php

namespace app\controller;

use app\BaseController;
use app\model\Device;
use think\Request;
use think\Response;
use think\exception\ValidateException;
use think\facade\Db;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class DeviceController extends BaseController
{
    /**
     * 获取设备列表
     */
    public function index(Request $request)
    {
        try {
            $page = $request->param('page', 1);
            $limit = $request->param('limit', 20);
            $keyword = $request->param('keyword', '');
            $deviceType = $request->param('device_type', '');
            $status = $request->param('status', '');
            
            $query = Device::order('created_at', 'desc');
            
            // 关键词搜索
            if (!empty($keyword)) {
                $query->where(function($q) use ($keyword) {
                    $q->whereLike('device_code', "%{$keyword}%")
                      ->whereOr('device_name', 'like', "%{$keyword}%")
                      ->whereOr('model', 'like', "%{$keyword}%")
                      ->whereOr('brand', 'like', "%{$keyword}%")
                      ->whereOr('serial_number', 'like', "%{$keyword}%");
                });
            }
            
            // 设备类型筛选
            if (!empty($deviceType)) {
                $query->where('device_type', $deviceType);
            }
            
            // 状态筛选
            if (!empty($status)) {
                $query->where('status', $status);
            }
            
            $result = $query->paginate([
                'list_rows' => $limit,
                'page' => $page
            ]);
            
            return json([
                'code' => 200,
                'message' => '获取成功',
                'data' => [
                    'list' => $result->items(),
                    'pagination' => [
                        'total' => $result->total(),
                        'current_page' => $result->currentPage(),
                        'per_page' => $result->listRows(),
                        'last_page' => $result->lastPage()
                    ]
                ]
            ]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return json([
                'code' => 500,
                'message' => '获取失败：' . $e->getMessage()
            ]);
        }
    }
    
    /**
     * 创建设备
     */
    public function save(Request $request)
    {
        try {
            $data = $request->post();
            
            // 验证必填字段
            $this->validateRequired($data, ['device_code', 'device_name', 'device_type', 'serial_number']);
            
            // 验证唯一性
            if (!Device::validateDeviceCode($data['device_code'])) {
                return json(['code' => 400, 'message' => '设备编号已存在']);
            }
            
            if (!Device::validateSerialNumber($data['serial_number'])) {
                return json(['code' => 400, 'message' => '序列号已存在']);
            }
            
            // 设置默认值
            $data['status'] = $data['status'] ?? Device::STATUS_ACTIVE;
            
            $device = Device::create($data);
            
            return json([
                'code' => 200,
                'message' => '创建成功',
                'data' => $device
            ]);
        } catch (ValidateException $e) {
            return json(['code' => 400, 'message' => $e->getError()]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return json(['code' => 500, 'message' => '创建失败：' . $e->getMessage()]);
        }
    }
    
    /**
     * 更新设备
     */
    public function update(Request $request, $id)
    {
        try {
            $device = Device::find($id);
            if (!$device) {
                return json(['code' => 404, 'message' => '设备不存在']);
            }
            
            $data = $request->post();
            
            // 验证唯一性（排除当前记录）
            if (isset($data['device_code']) && !Device::validateDeviceCode($data['device_code'], $id)) {
                return json(['code' => 400, 'message' => '设备编号已存在']);
            }
            
            if (isset($data['serial_number']) && !Device::validateSerialNumber($data['serial_number'], $id)) {
                return json(['code' => 400, 'message' => '序列号已存在']);
            }
            
            $device->save($data);
            
            return json([
                'code' => 200,
                'message' => '更新成功',
                'data' => $device
            ]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return json(['code' => 500, 'message' => '更新失败：' . $e->getMessage()]);
        }
    }
    
    /**
     * 删除设备
     */
    public function delete($id)
    {
        try {
            $device = Device::find($id);
            if (!$device) {
                return json(['code' => 404, 'message' => '设备不存在']);
            }
            
            $device->delete();
            
            return json([
                'code' => 200,
                'message' => '删除成功'
            ]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return json(['code' => 500, 'message' => '删除失败：' . $e->getMessage()]);
        }
    }
    
    /**
     * 批量导入设备
     */
    public function batchImport(Request $request)
    {
        try {
            $file = $request->file('file');
            if (!$file) {
                return json(['code' => 400, 'message' => '请选择要上传的文件']);
            }
            
            // 验证文件类型
            $allowedTypes = ['xlsx', 'xls'];
            $extension = strtolower($file->getOriginalExtension());
            if (!in_array($extension, $allowedTypes)) {
                return json(['code' => 400, 'message' => '只支持Excel文件格式(.xlsx, .xls)']);
            }
            
            // 读取Excel文件
            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $data = $worksheet->toArray();
            
            // 移除表头
            array_shift($data);
            
            // 过滤空行
            $data = array_filter($data, function($row) {
                return !empty(array_filter($row));
            });
            
            if (empty($data)) {
                return json(['code' => 400, 'message' => 'Excel文件中没有有效数据']);
            }
            
            // 转换数据格式
            $devices = [];
            foreach ($data as $row) {
                $devices[] = [
                    'device_code' => trim($row[0] ?? ''),
                    'device_name' => trim($row[1] ?? ''),
                    'device_type' => trim($row[2] ?? ''),
                    'model' => trim($row[3] ?? ''),
                    'brand' => trim($row[4] ?? ''),
                    'serial_number' => trim($row[5] ?? ''),
                    'status' => trim($row[6] ?? Device::STATUS_ACTIVE),
                    'location' => trim($row[7] ?? ''),
                    'purchase_date' => !empty($row[8]) ? date('Y-m-d', strtotime($row[8])) : null,
                    'warranty_period' => is_numeric($row[9]) ? intval($row[9]) : 0,
                    'notes' => trim($row[10] ?? '')
                ];
            }
            
            // 验证数据
            $errors = Device::validateBatchData($devices);
            if (!empty($errors)) {
                return json([
                    'code' => 400,
                    'message' => '数据验证失败',
                    'errors' => $errors
                ]);
            }
            
            // 开始事务
            Db::startTrans();
            try {
                $successCount = 0;
                foreach ($devices as $deviceData) {
                    // 计算保修结束日期
                    if (!empty($deviceData['purchase_date']) && $deviceData['warranty_period'] > 0) {
                        $deviceData['warranty_end_date'] = date('Y-m-d', strtotime($deviceData['purchase_date'] . ' + ' . $deviceData['warranty_period'] . ' months'));
                    }
                    
                    Device::create($deviceData);
                    $successCount++;
                }
                
                Db::commit();
                
                return json([
                    'code' => 200,
                    'message' => "批量导入成功，共导入 {$successCount} 条设备记录",
                    'data' => [
                        'success_count' => $successCount,
                        'total_count' => count($devices)
                    ]
                ]);
            } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return json([
                'code' => 500,
                'message' => '导入失败：' . $e->getMessage()
            ]);
        }
    }
    
    /**
     * 下载导入模板
     */
    public function downloadTemplate()
    {
        try {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // 设置表头
            $headers = [
                'A1' => '设备编号*',
                'B1' => '设备名称*',
                'C1' => '设备类型*',
                'D1' => '型号',
                'E1' => '品牌',
                'F1' => '序列号*',
                'G1' => '状态',
                'H1' => '位置',
                'I1' => '采购日期',
                'J1' => '保修期(月)',
                'K1' => '备注'
            ];
            
            foreach ($headers as $cell => $value) {
                $sheet->setCellValue($cell, $value);
            }
            
            // 添加示例数据
            $sheet->setCellValue('A2', 'DEV-001');
            $sheet->setCellValue('B2', '5G基站设备');
            $sheet->setCellValue('C2', '基站设备');
            $sheet->setCellValue('D2', 'AAU5613');
            $sheet->setCellValue('E2', '华为');
            $sheet->setCellValue('F2', 'HW202401001');
            $sheet->setCellValue('G2', 'active');
            $sheet->setCellValue('H2', '机房A-01');
            $sheet->setCellValue('I2', '2024-01-15');
            $sheet->setCellValue('J2', '36');
            $sheet->setCellValue('K2', '5G基站主设备');
            
            // 设置列宽
            $sheet->getColumnDimension('A')->setWidth(15);
            $sheet->getColumnDimension('B')->setWidth(20);
            $sheet->getColumnDimension('C')->setWidth(15);
            $sheet->getColumnDimension('D')->setWidth(15);
            $sheet->getColumnDimension('E')->setWidth(10);
            $sheet->getColumnDimension('F')->setWidth(15);
            $sheet->getColumnDimension('G')->setWidth(10);
            $sheet->getColumnDimension('H')->setWidth(15);
            $sheet->getColumnDimension('I')->setWidth(12);
            $sheet->getColumnDimension('J')->setWidth(12);
            $sheet->getColumnDimension('K')->setWidth(20);
            
            // 设置表头样式
            $headerStyle = [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E6E6FA']
                ]
            ];
            $sheet->getStyle('A1:K1')->applyFromArray($headerStyle);
            
            $writer = new Xlsx($spreadsheet);
            
            // 设置响应头
            $filename = '设备导入模板_' . date('YmdHis') . '.xlsx';
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment;filename="' . $filename . '"');
            header('Cache-Control: max-age=0');
            
            $writer->save('php://output');
            exit;
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return json([
                'code' => 500,
                'message' => '模板下载失败：' . $e->getMessage()
            ]);
        }
    }
    
    /**
     * 验证必填字段
     */
    private function validateRequired($data, $fields)
    {
        foreach ($fields as $field) {
            if (empty($data[$field])) {
                throw new ValidateException("字段 {$field} 不能为空");
            }
        }
    }
    
    /**
     * 获取设备统计
     */
    public function stats()
    {
        try {
            $total = Device::count();
            $active = Device::where('status', Device::STATUS_ACTIVE)->count();
            $maintenance = Device::where('status', Device::STATUS_MAINTENANCE)->count();
            $inactive = Device::where('status', Device::STATUS_INACTIVE)->count();
            $scrapped = Device::where('status', Device::STATUS_SCRAPPED)->count();
            
            return json([
                'code' => 200,
                'message' => '获取成功',
                'data' => [
                    'total' => $total,
                    'active' => $active,
                    'maintenance' => $maintenance,
                    'inactive' => $inactive,
                    'scrapped' => $scrapped
                ]
            ]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return json([
                'code' => 500,
                'message' => '获取失败：' . $e->getMessage()
            ]);
        }
    }
}