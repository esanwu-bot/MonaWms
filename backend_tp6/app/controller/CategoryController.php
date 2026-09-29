<?php

namespace app\controller;

use app\BaseController;
use app\common\Grant;
use app\model\Category;
use app\common\library\Response;
use think\Request;
use think\facade\Db;
use think\facade\Validate;

/**
 * 产品分类管理控制器
 */
class CategoryController extends BaseController
{
    /**
     * 获取分类列表
     */
    public function index(Request $request)
    {
        try {
            $params = $request->get();
            $page = $params['page'] ?? 1;
            $limit = $params['limit'] ?? 15;
            
            $query = Category::where('id', '>', 0);
            
            // 搜索条件
            if (!empty($params['name'])) {
                $query->where('name', 'like', '%' . $params['name'] . '%');
            }
            
            if (!empty($params['parent_id'])) {
                $query->where('parent_id', $params['parent_id']);
            }
            
            if (!empty($params['status'])) {
                $query->where('status', $params['status']);
            }
            
            // 分页查询
            $result = $query->order('id', 'asc')
                          ->paginate([
                              'list_rows' => $limit,
                              'page' => $page
                          ]);
            
            $list = [];
            foreach ($result->items() as $category) {
                $item = $category->toArray();
                $item['status_text'] = $category->status_text;
                $list[] = $item;
            }
            
            return Response::success([
                'list' => $list,
                'pagination' => [
                    'total' => $result->total(),
                    'page' => $page,
                    'limit' => $limit,
                    'pages' => ceil($result->total() / $limit)
                ]
            ]);
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取分类列表失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取分类树
     */
    public function tree()
    {
        try {
            $categories = Category::order('id', 'asc')
                                ->select()
                                ->toArray();
            
            $tree = $this->buildTree($categories);
            
            return Response::success($tree, '获取分类树成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取分类树失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 构建分类树
     */
    private function buildTree($categories, $parentId = 0)
    {
        $tree = [];
        
        foreach ($categories as $category) {
            if ($category['parent_id'] == $parentId) {
                $children = $this->buildTree($categories, $category['id']);
                if ($children) {
                    $category['children'] = $children;
                }
                $tree[] = $category;
            }
        }
        
        return $tree;
    }
    
    /**
     * 创建分类
     */
    public function save(Request $request)
    {
        Grant::assert('category:write');
        try {
            $data = $request->post();
            
            // 验证数据
            $validate = Validate::rule([
                'name' => 'require|max:50',
                'parent_id' => 'integer',
                'sort_order' => 'integer',
                'description' => 'max:200',
                'status' => 'in:active,inactive'
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            $category = Category::create($data);
            
            return Response::success($category, '创建分类成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('创建分类失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 下载分类批量导入模板（xlsx）
     * 列：一级分类名称* / 一级分类编码* / 二级分类名称 / 二级分类编码 / 描述 / 状态
     * 匹配规则：
     * - 一级：按「一级分类编码」全局唯一匹配（upsert，编码存在则更新名称/状态）；无编码记录时按名称在顶级中匹配
     * - 二级：填了二级名称/编码才处理；二级编码必填，挂在同行的一级之下
     * - 状态：启用/停用（默认启用）
     */
    public function downloadTemplate()
    {
        try {
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();

            $headers = [
                'A1' => '一级分类名称*',
                'B1' => '一级分类编码*',
                'C1' => '二级分类名称',
                'D1' => '二级分类编码',
                'E1' => '描述',
                'F1' => '状态',
            ];
            foreach ($headers as $cell => $value) {
                $sheet->setCellValue($cell, $value);
            }

            // 示例：仅一级 / 一级+一条二级（一行一条二级，多条二级写多行，一级列重复填写）
            $sheet->setCellValue('A2', '电子产品');
            $sheet->setCellValue('B2', 'ELEC');
            $sheet->setCellValue('E2', '仅一级分类示例');
            $sheet->setCellValue('F2', '启用');
            $sheet->setCellValue('A3', '通信设备');
            $sheet->setCellValue('B3', 'COMM');
            $sheet->setCellValue('C3', '基站设备');
            $sheet->setCellValue('D3', 'COMM-BASE');
            $sheet->setCellValue('F3', '启用');
            $sheet->setCellValue('A4', '通信设备');
            $sheet->setCellValue('B4', 'COMM');
            $sheet->setCellValue('C4', '光缆');
            $sheet->setCellValue('D4', 'COMM-CABLE');
            $sheet->setCellValue('F4', '启用');

            foreach (['A' => 18, 'B' => 16, 'C' => 18, 'D' => 16, 'E' => 24, 'F' => 8] as $col => $width) {
                $sheet->getColumnDimension($col)->setWidth($width);
            }
            $sheet->getStyle('A1:F1')->applyFromArray([
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E6E6FA']
                ]
            ]);

            $filename = '分类导入模板_' . date('YmdHis') . '.xlsx';
            $dir = runtime_path() . 'downloads';
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $fullPath = $dir . DIRECTORY_SEPARATOR . $filename;
            (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save($fullPath);

            // 清理 1 小时前的临时模板
            foreach (glob($dir . DIRECTORY_SEPARATOR . '分类导入模板_*.xlsx') ?: [] as $old) {
                if (is_file($old) && filemtime($old) < time() - 3600) {
                    @unlink($old);
                }
            }

            return download($fullPath, $filename);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('模板下载失败：' . $e->getMessage());
        }
    }

    /**
     * 分类批量导入（Excel，upsert）
     * 返回 { success_count, total_count, warnings }
     */
    public function batchImport(Request $request)
    {
        Grant::assert('category:write');
        try {
            $file = $request->file('file');
            if (!$file) {
                return Response::validateError('请选择要上传的文件');
            }
            $extension = strtolower($file->getOriginalExtension());
            if (!in_array($extension, ['xlsx', 'xls'])) {
                return Response::validateError('只支持Excel文件格式(.xlsx, .xls)');
            }

            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
            $data = $spreadsheet->getActiveSheet()->toArray();

            // 列定位（表头识别，兜底固定列序）
            $aliases = [
                'parent_name' => ['一级分类名称', '一级分类', '一级名称'],
                'parent_code' => ['一级分类编码', '一级编码'],
                'child_name'  => ['二级分类名称', '二级分类', '二级名称'],
                'child_code'  => ['二级分类编码', '二级编码'],
                'description' => ['描述', '备注'],
                'status'      => ['状态'],
            ];
            $colMap = [];
            foreach (($data[0] ?? []) as $idx => $raw) {
                $key = trim(str_replace(['*', ' ', '　'], '', (string)$raw));
                if ($key === '') continue;
                foreach ($aliases as $field => $names) {
                    if (in_array($key, $names, true) && !isset($colMap[$field])) {
                        $colMap[$field] = $idx;
                        break;
                    }
                }
            }
            if (!isset($colMap['parent_name']) || !isset($colMap['parent_code'])) {
                $colMap = ['parent_name' => 0, 'parent_code' => 1, 'child_name' => 2, 'child_code' => 3, 'description' => 4, 'status' => 5];
            }
            $col = function (array $row, string $key) use ($colMap) {
                $idx = $colMap[$key] ?? null;
                return $idx === null ? null : ($row[$idx] ?? null);
            };

            array_shift($data);
            $data = array_filter($data, function ($row) {
                return !empty(array_filter($row));
            });
            if (empty($data)) {
                return Response::validateError('Excel文件中没有有效数据');
            }

            // 预加载：顶级分类（code/name 索引）、全部 code 索引
            $topByCode = [];
            $topByName = [];
            $codeOwner = [];   // code => ['id'=>, 'parent_id'=>]
            $categories = Category::column('id,name,code,parent_id,status');
            foreach ($categories as $c) {
                $codeOwner[$c['code']] = ['id' => (int)$c['id'], 'parent_id' => $c['parent_id'] !== null ? (int)$c['parent_id'] : null];
                if ($c['parent_id'] === null) {
                    $topByCode[$c['code']] = (int)$c['id'];
                    $topByName[$c['name']] = (int)$c['id'];
                } else {
                    $childByName[$c['parent_id'] . '|' . $c['name']] = (int)$c['id'];
                }
            }

            $seenCodes = [];  // 文件内编码查重
            $childByName = []; // parent_id|name => id（同父级同名二级沿用）
            $rows = [];
            $errors = [];
            $warnings = [];
            $line = 1;

            foreach ($data as $row) {
                $line++;
                $parentName = trim((string)($col($row, 'parent_name') ?? ''));
                $parentCode = trim((string)($col($row, 'parent_code') ?? ''));
                $childName  = trim((string)($col($row, 'child_name') ?? ''));
                $childCode  = trim((string)($col($row, 'child_code') ?? ''));
                $desc       = trim((string)($col($row, 'description') ?? ''));
                $statusRaw  = trim((string)($col($row, 'status') ?? ''));
                $status     = $statusRaw === '' ? 'active' : (in_array($statusRaw, ['启用', 'active']) ? 'active' : (in_array($statusRaw, ['停用', '禁用', 'inactive']) ? 'inactive' : null));

                if ($parentName === '' && $parentCode === '') {
                    continue;
                }
                if ($parentName === '' || $parentCode === '') {
                    $errors[] = ['row' => $line, 'message' => '一级分类名称与编码均为必填'];
                    continue;
                }
                if ($status === null) {
                    $errors[] = ['row' => $line, 'message' => "状态[{$statusRaw}] 无效，允许：启用/停用"];
                    continue;
                }
                if (mb_strlen($parentCode) > 20) {
                    $errors[] = ['row' => $line, 'message' => "一级分类编码[{$parentCode}] 超过 20 字符"];
                    continue;
                }
                if (isset($seenCodes[$parentCode]) && $childCode === '' && $childName === '') {
                    // 一级行重复：跳过（一级以首次出现的行为准，仅提示）
                    $warnings[] = "第 {$line} 行：一级分类[{$parentCode}] 重复，已跳过";
                    continue;
                }

                // 解析/创建一级分类
                $parentId = null;
                if (isset($topByCode[$parentCode])) {
                    $parentId = $topByCode[$parentCode];
                    if (isset($topByName[$parentName]) && $topByName[$parentName] !== $parentId) {
                        $errors[] = ['row' => $line, 'message' => "一级分类名称[{$parentName}] 已被其他编码占用"];
                        continue;
                    }
                } elseif (isset($topByName[$parentName])) {
                    // 按名称匹配到一级：沿用原编码（提示不一致）
                    $parentId = $topByName[$parentName];
                    $existCode = array_search($parentId, $topByCode);
                    if ($existCode !== $parentCode) {
                        $warnings[] = "第 {$line} 行：一级分类[{$parentName}] 已存在（原编码 {$existCode}），已沿用原编码";
                    }
                }

                $rows[] = [
                    'line' => $line,
                    'level' => 'top',
                    'id' => $parentId,
                    'name' => $parentName,
                    'code' => $parentCode,
                    'description' => $desc,
                    'status' => $status,
                ];
                $seenCodes[$parentCode] = $parentCode;

                // 二级分类
                if ($childName !== '' || $childCode !== '') {
                    if ($childName === '' || $childCode === '') {
                        $errors[] = ['row' => $line, 'message' => '二级分类名称与编码需同时填写'];
                        continue;
                    }
                    if (mb_strlen($childCode) > 20) {
                        $errors[] = ['row' => $line, 'message' => "二级分类编码[{$childCode}] 超过 20 字符"];
                        continue;
                    }
                    if (isset($seenCodes[$childCode])) {
                        $errors[] = ['row' => $line, 'message' => "编码[{$childCode}] 在文件内重复"];
                        continue;
                    }
                    if (isset($codeOwner[$childCode]) && ($codeOwner[$childCode]['parent_id'] === null || $codeOwner[$childCode]['parent_id'] !== $parentId)) {
                        $errors[] = ['row' => $line, 'message' => "二级分类编码[{$childCode}] 已被其他分类占用"];
                        continue;
                    }
                    // 同父级下已有同名二级（编码不同）→ 沿用该分类并提示
                    $childId = $codeOwner[$childCode]['id'] ?? null;
                    if ($childId === null && $parentId !== null && isset($childByName[$parentId . '|' . $childName])) {
                        $childId = $childByName[$parentId . '|' . $childName];
                        $warnings[] = "第 {$line} 行：二级分类[{$childName}] 已存在（编码 {$childCode} 未使用），已沿用现有分类";
                    }

                    $seenCodes[$childCode] = $childCode;
                    $rows[] = [
                        'line' => $line,
                        'level' => 'child',
                        'id' => $childId,
                        'parent_code' => $parentCode,  // 写库时经 codeToId 解析（含本文件新建的一级）
                        'name' => $childName,
                        'code' => $childCode,
                        'description' => $desc,
                        'status' => $status,
                    ];
                }
            }

            if (!empty($errors)) {
                return json([
                    'code' => 400, 'success' => false,
                    'message' => '数据验证失败', 'errors' => $errors,
                ]);
            }
            if (empty($rows)) {
                return Response::validateError('没有可导入的有效数据');
            }

            Db::startTrans();
            try {
                $successCount = 0;
                $codeToId = [];
                foreach ($rows as $row) {
                    if ($row['level'] === 'top') {
                        if (!empty($row['id'])) {
                            $cat = Category::find($row['id']);
                            $cat->name = $row['name'];
                            $cat->description = $row['description'] ?: $cat->description;
                            $cat->status = $row['status'];
                            $cat->save();
                            $codeToId[$row['code']] = (int)$cat->id;
                        } else {
                            $cat = Category::create([
                                'name' => $row['name'],
                                'code' => $row['code'],
                                'parent_id' => null,
                                'description' => $row['description'],
                                'status' => $row['status'],
                                'sort_order' => 0,
                            ]);
                            $codeToId[$row['code']] = (int)$cat->id;
                            $topByCode[$row['code']] = (int)$cat->id;
                        }
                    } else {
                        $pid = $codeToId[$row['parent_code']] ?? null;
                        if ($pid === null) {
                            throw new \Exception("第 {$row['line']} 行：父级分类解析失败");
                        }
                        $exist = !empty($row['id']) ? Category::find($row['id']) : Category::where('code', $row['code'])->find();
                        if ($exist) {
                            $exist->name = $row['name'];
                            $exist->parent_id = $pid;
                            $exist->description = $row['description'] ?: $exist->description;
                            $exist->status = $row['status'];
                            $exist->save();
                        } else {
                            Category::create([
                                'name' => $row['name'],
                                'code' => $row['code'],
                                'parent_id' => $pid,
                                'description' => $row['description'],
                                'status' => $row['status'],
                                'sort_order' => 0,
                            ]);
                        }
                    }
                    $successCount++;
                }
                Db::commit();
            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }

            return json([
                'code' => 200, 'success' => true,
                'message' => "批量导入成功，共处理 {$successCount} 条分类记录",
                'data' => [
                    'success_count' => $successCount,
                    'fail_count' => count($errors),
                    'total_count' => count($rows) + count($errors),
                    'errors' => $errors,
                    'warnings' => $warnings,
                ],
            ]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::serverError('导入失败：' . $e->getMessage());
        }
    }

    /**
     * 获取分类详情
     */
    public function read($id)
    {
        try {
            $category = Category::find($id);
            
            if (!$category) {
                return Response::error('分类不存在', 404);
            }
            
            $data = $category->toArray();
            $data['status_text'] = $category->status_text;
            
            return Response::success($data, '获取分类详情成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取分类详情失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 更新分类
     */
    public function update(Request $request, $id)
    {
        Grant::assert('category:write');
        try {
            $category = Category::find($id);
            
            if (!$category) {
                return Response::error('分类不存在', 404);
            }
            
            $data = $request->put();
            
            // 验证数据
            $validate = Validate::rule([
                'name' => 'require|max:50',
                'parent_id' => 'integer',
                'sort_order' => 'integer',
                'description' => 'max:200',
                'status' => 'in:active,inactive'
            ]);
            
            if (!$validate->check($data)) {
                return Response::error($validate->getError());
            }
            
            // 检查是否设置自己为父分类
            if (isset($data['parent_id']) && $data['parent_id'] == $id) {
                return Response::error('不能设置自己为父分类');
            }
            
            $category->save($data);
            
            return Response::success($category, '更新分类成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('更新分类失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 删除分类
     */
    public function delete($id)
    {
        Grant::assert('category:write');
        try {
            $category = Category::find($id);
            
            if (!$category) {
                return Response::error('分类不存在', 404);
            }
            
            // 检查是否有子分类
            $hasChildren = Category::where('parent_id', $id)->count();
            if ($hasChildren > 0) {
                return Response::error('该分类下还有子分类，无法删除');
            }
            
            // 检查是否有关联产品
            $hasProducts = \app\model\Product::where('category_id', $id)->count();
            if ($hasProducts > 0) {
                return Response::error('该分类下还有产品，无法删除');
            }
            
            $category->delete();
            
            return Response::success(null, '删除分类成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('删除分类失败: ' . $e->getMessage());
        }
    }
    
    /**
     * 获取分类统计信息
     */
    public function statistics()
    {
        try {
            $categories = Category::field('id, parent_id')->select()->toArray();

            $total = count($categories);
            $rootCategories = 0;
            $parentMap = [];
            foreach ($categories as $category) {
                $parentMap[$category['id']] = $category['parent_id'];
                if (empty($category['parent_id'])) {
                    $rootCategories++;
                }
            }

            // 计算最大层级（防御性限制循环次数，避免脏数据造成死循环）
            $maxLevel = 0;
            foreach ($categories as $category) {
                $level = 1;
                $parentId = $category['parent_id'];
                $guard = 0;
                while (!empty($parentId) && isset($parentMap[$parentId]) && $guard < 50) {
                    $level++;
                    $parentId = $parentMap[$parentId];
                    $guard++;
                }
                $maxLevel = max($maxLevel, $level);
            }

            // 各分类下的商品数量
            $productsCount = [];
            $rows = Db::name('products')
                      ->whereNotNull('category_id')
                      ->field('category_id, COUNT(*) AS num')
                      ->group('category_id')
                      ->select()
                      ->toArray();
            foreach ($rows as $row) {
                $productsCount[(string) $row['category_id']] = (int) $row['num'];
            }

            return Response::success([
                'total' => $total,
                'rootCategories' => $rootCategories,
                'maxLevel' => $maxLevel,
                'productsCount' => $productsCount
            ], '获取分类统计成功');

        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取分类统计失败: ' . $e->getMessage());
        }
    }

    /**
     * 获取分类选项
     */
    public function options()
    {
        try {
            $categories = Category::where('status', 'active')
                                ->field('id, name, parent_id')
                                ->order('sort_order', 'asc')
                                ->select()
                                ->toArray();
            
            return Response::success($categories, '获取分类选项成功');
            
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            return Response::error('获取分类选项失败: ' . $e->getMessage());
        }
    }
}