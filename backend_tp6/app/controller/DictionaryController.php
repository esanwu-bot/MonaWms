<?php
declare (strict_types = 1);

namespace app\controller;

use app\BaseController;
use app\model\DictionaryType;
use app\model\DictionaryItem;
use think\facade\Db;
use think\facade\Validate;

class DictionaryController extends BaseController
{
    /**
     * 获取所有字典类型
     */
    public function getTypes()
    {
        $types = DictionaryType::select();
        return json(['code' => 200, 'message' => 'success', 'data' => $types]);
    }
    
    /**
     * 获取指定字典类型的所有字典项
     */
    public function getItems($typeId = null)
    {
        if (!$typeId) {
            return json(['code' => 400, 'message' => '字典类型ID不能为空']);
        }
        
        $items = DictionaryItem::getByTypeId($typeId);
        return json(['code' => 200, 'message' => 'success', 'data' => $items]);
    }
    
    /**
     * 根据字典类型编码获取字典项
     */
    public function getItemsByTypeCode($typeCode = null)
    {
        if (!$typeCode) {
            return json(['code' => 400, 'message' => '字典类型编码不能为空']);
        }
        
        $type = DictionaryType::getByCode($typeCode);
        if (!$type) {
            return json(['code' => 404, 'message' => '字典类型不存在']);
        }
        
        $items = DictionaryItem::getByTypeId($type->id);
        return json(['code' => 200, 'message' => 'success', 'data' => $items]);
    }
    
    /**
     * 创建字典类型
     */
    public function createType()
    {
        $data = $this->request->post();
        
        $validate = Validate::rule([
            'code' => 'require|alphaDash|unique:dictionary_types',
            'name' => 'require|max:100',
            'description' => 'max:255',
            'status' => 'in:active,inactive',
        ]);
        
        if (!$validate->check($data)) {
            return json(['code' => 400, 'message' => $validate->getError()]);
        }
        
        Db::startTrans();
        try {
            $type = new DictionaryType;
            $type->save($data);
            Db::commit();
            return json(['code' => 200, 'message' => '创建成功', 'data' => $type]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'message' => '创建失败: ' . $e->getMessage()]);
        }
    }
    
    /**
     * 更新字典类型
     */
    public function updateType($id)
    {
        $data = $this->request->put();
        
        $type = DictionaryType::find($id);
        if (!$type) {
            return json(['code' => 404, 'message' => '字典类型不存在']);
        }
        
        $validate = Validate::rule([
            'code' => 'alphaDash|unique:dictionary_types,code,' . $id . ',id',
            'name' => 'max:100',
            'description' => 'max:255',
            'status' => 'in:active,inactive',
        ]);
        
        if (!$validate->check($data)) {
            return json(['code' => 400, 'message' => $validate->getError()]);
        }
        
        Db::startTrans();
        try {
            $type->save($data);
            Db::commit();
            return json(['code' => 200, 'message' => '更新成功', 'data' => $type]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'message' => '更新失败: ' . $e->getMessage()]);
        }
    }
    
    /**
     * 删除字典类型
     */
    public function deleteType($id)
    {
        $type = DictionaryType::find($id);
        if (!$type) {
            return json(['code' => 404, 'message' => '字典类型不存在']);
        }
        
        Db::startTrans();
        try {
            $type->delete();
            Db::commit();
            return json(['code' => 200, 'message' => '删除成功']);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'message' => '删除失败: ' . $e->getMessage()]);
        }
    }
    
    /**
     * 创建字典项
     */
    public function createItem()
    {
        $data = $this->request->post();
        
        $validate = Validate::rule([
            'type_id' => 'require|number|exist:dictionary_types,id',
            'code' => 'require|alphaDash',
            'name' => 'require|max:100',
            'value' => 'max:255',
            'sort_order' => 'number',
            'status' => 'in:active,inactive',
        ]);
        
        if (!$validate->check($data)) {
            return json(['code' => 400, 'message' => $validate->getError()]);
        }
        
        // 检查同一类型下编码是否重复
        $exists = DictionaryItem::where([
            'type_id' => $data['type_id'],
            'code' => $data['code']
        ])->find();
        
        if ($exists) {
            return json(['code' => 400, 'message' => '同一字典类型下编码不能重复']);
        }
        
        Db::startTrans();
        try {
            $item = new DictionaryItem;
            $item->save($data);
            Db::commit();
            return json(['code' => 200, 'message' => '创建成功', 'data' => $item]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'message' => '创建失败: ' . $e->getMessage()]);
        }
    }
    
    /**
     * 更新字典项
     */
    public function updateItem($id)
    {
        $data = $this->request->put();
        
        $item = DictionaryItem::find($id);
        if (!$item) {
            return json(['code' => 404, 'message' => '字典项不存在']);
        }
        
        $validate = Validate::rule([
            'type_id' => 'number|exist:dictionary_types,id',
            'code' => 'alphaDash',
            'name' => 'max:100',
            'value' => 'max:255',
            'sort_order' => 'number',
            'status' => 'in:active,inactive',
        ]);
        
        if (!$validate->check($data)) {
            return json(['code' => 400, 'message' => $validate->getError()]);
        }
        
        // 如果修改了type_id或code，检查是否会导致重复
        if ((isset($data['type_id']) && $data['type_id'] != $item->type_id) || 
            (isset($data['code']) && $data['code'] != $item->code)) {
            $typeId = isset($data['type_id']) ? $data['type_id'] : $item->type_id;
            $code = isset($data['code']) ? $data['code'] : $item->code;
            
            $exists = DictionaryItem::where([
                'type_id' => $typeId,
                'code' => $code
            ])->where('id', '<>', $id)->find();
            
            if ($exists) {
                return json(['code' => 400, 'message' => '同一字典类型下编码不能重复']);
            }
        }
        
        Db::startTrans();
        try {
            $item->save($data);
            Db::commit();
            return json(['code' => 200, 'message' => '更新成功', 'data' => $item]);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'message' => '更新失败: ' . $e->getMessage()]);
        }
    }
    
    /**
     * 删除字典项
     */
    public function deleteItem($id)
    {
        $item = DictionaryItem::find($id);
        if (!$item) {
            return json(['code' => 404, 'message' => '字典项不存在']);
        }
        
        Db::startTrans();
        try {
            $item->delete();
            Db::commit();
            return json(['code' => 200, 'message' => '删除成功']);
        } catch (\app\common\BizException $e) { throw $e; } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'message' => '删除失败: ' . $e->getMessage()]);
        }
    }
}