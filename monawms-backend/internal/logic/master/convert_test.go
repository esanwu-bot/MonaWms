package master

import (
	"testing"
	"time"

	"github.com/esanwu-bot/monawms-backend/internal/model/entity"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/shopspring/decimal"
)

func TestMeasureTypeHelpers(t *testing.T) {
	if !validMeasureType(measureCount) || !validMeasureType(measureVolume) {
		t.Fatal("合法计量方式应通过校验")
	}
	if validMeasureType("pieces") {
		t.Fatal("非法计量方式应被拒绝")
	}
	if got := measureTypeText(measureWeight); got != "重量" {
		t.Fatalf("计量方式文案错误: %s", got)
	}
	if got := measureTypeText("unknown"); got != "计件" {
		t.Fatalf("未知计量方式应回退为计件，实际: %s", got)
	}

	// E1：仅计件类需要序列号
	if got := deriveRequiresSerial(measureCount); got != 1 {
		t.Fatalf("计件类应要求序列号，实际 %d", got)
	}
	if got := deriveRequiresSerial(measureLength); got != 0 {
		t.Fatalf("长度类不应要求序列号，实际 %d", got)
	}
	// 空值按计件处理
	if got := deriveRequiresSerial(""); got != 1 {
		t.Fatalf("空计量方式应按计件处理，实际 %d", got)
	}
}

func TestStockStatus(t *testing.T) {
	product := &entity.Product{MinStock: 10, MinStockLevel: 20, MaxStock: 100}

	cases := []struct {
		total    int64
		wantCode string
		wantText string
	}{
		{0, "out_of_stock", "缺货"},
		{15, "low_stock", "库存不足"},
		{50, "normal", "正常"},
		{100, "over_stock", "库存过多"},
	}
	for _, item := range cases {
		code, text := stockStatus(product, item.total)
		if code != item.wantCode || text != item.wantText {
			t.Fatalf("库存量 %d 判定为 (%s,%s)，期望 (%s,%s)", item.total, code, text, item.wantCode, item.wantText)
		}
	}

	// 未设置安全库存下限时回退使用最小库存
	fallback := &entity.Product{MinStock: 8}
	if code, _ := stockStatus(fallback, 5); code != "low_stock" {
		t.Fatal("未设置安全库存下限时应回退使用最小库存")
	}
}

func TestToProductItem(t *testing.T) {
	product := &entity.Product{
		Id:          1,
		Sku:         "SKU-1",
		Name:        "5G基站",
		CategoryId:  3,
		Price:       decimal.NewFromInt(1299),
		CostPrice:   decimal.NewFromFloat(999.5),
		MeasureType: measureCount,
		Unit:        "台",
		Status:      productStatusActive,
		CreatedAt:   time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC),
	}

	item := toProductItem(product, "主设备", 30)
	if item.Sku != "SKU-1" || item.CategoryName != "主设备" {
		t.Fatalf("基础字段转换错误: %+v", item)
	}
	if item.Price != "1299" || item.CostPrice != "999.5" {
		t.Fatalf("金额应以字符串透传，实际 price=%s cost=%s", item.Price, item.CostPrice)
	}
	if item.RequiresSerial != 1 || item.MeasureTypeText != "计件" {
		t.Fatalf("计量方式与SN推导错误: %+v", item)
	}
	if item.StatusText != "正常在用" {
		t.Fatalf("状态文案错误: %s", item.StatusText)
	}
	if item.CreatedAt != "2026-01-02 03:04:05" {
		t.Fatalf("时间格式错误: %s", item.CreatedAt)
	}
	if item.TotalStock != 30 || item.AvailableStock != 30 {
		t.Fatalf("库存汇总错误: total=%d available=%d", item.TotalStock, item.AvailableStock)
	}
}

func TestCategoryTreeMeta(t *testing.T) {
	categories := []*entity.Category{
		{Id: 1, ParentId: 0, Name: "一级"},
		{Id: 2, ParentId: 1, Name: "二级"},
		{Id: 3, ParentId: 2, Name: "三级"},
	}

	levels, paths := categoryTreeMeta(categories)
	if levels[1] != 1 || levels[2] != 2 || levels[3] != 3 {
		t.Fatalf("层级计算错误: %+v", levels)
	}
	if paths[1] != "/1/" || paths[2] != "/1/2/" || paths[3] != "/1/2/3/" {
		t.Fatalf("路径计算错误: %+v", paths)
	}
}

func TestCategoryTreeMetaWithCycle(t *testing.T) {
	// 数据被人为写坏（父子互相指向）时不应死循环
	categories := []*entity.Category{
		{Id: 1, ParentId: 2},
		{Id: 2, ParentId: 1},
	}
	levels, _ := categoryTreeMeta(categories)
	if levels[1] < 1 || levels[2] < 1 {
		t.Fatalf("成环时仍应给出合法层级，实际 %+v", levels)
	}
}

func TestNormalizeStatus(t *testing.T) {
	got, err := normalizeStatus("", statusActive, categoryStatuses)
	if err != nil || got != statusActive {
		t.Fatalf("空值应回退默认状态，实际 got=%s err=%v", got, err)
	}
	if _, err := normalizeStatus("deleted", statusActive, categoryStatuses); err == nil {
		t.Fatal("非法状态应返回错误")
	} else if merror.Code(err) != mcode.CodeValidationFailed {
		t.Fatalf("非法状态应返回校验失败码，实际 %v", merror.Code(err))
	}
}

func TestBuildOptionAndIndent(t *testing.T) {
	option := buildOption(7, "WH-01", "主仓")
	if option.Value != 7 || option.Id != 7 || option.Code != "WH-01" || option.Name != "主仓" {
		t.Fatalf("选项结构错误: %+v", option)
	}
	if option.Label != "WH-01 - 主仓" {
		t.Fatalf("选项文案错误: %s", option.Label)
	}
	if got := repeatSpace(2); got != "　　" {
		t.Fatalf("缩进应为两个全角空格，实际 %q", got)
	}
}

func TestBuildPagination(t *testing.T) {
	got := buildPagination(101, 2, 10, 11)
	if got.Total != 101 || got.Page != 2 || got.Limit != 10 || got.Pages != 11 {
		t.Fatalf("分页元信息错误: %+v", got)
	}
}
