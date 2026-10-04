package master

import (
	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/model/entity"
)

// validMeasureType 校验计量方式取值。
func validMeasureType(measureType string) bool {
	switch measureType {
	case measureCount, measureLength, measureWeight, measureArea, measureVolume:
		return true
	default:
		return false
	}
}

// measureTypeText 返回计量方式中文文案。
func measureTypeText(measureType string) string {
	switch measureType {
	case measureCount:
		return "计件"
	case measureLength:
		return "长度"
	case measureWeight:
		return "重量"
	case measureArea:
		return "面积"
	case measureVolume:
		return "体积"
	default:
		return "计件"
	}
}

// deriveRequiresSerial 由计量方式推导是否需要序列号：计件类需要 SN。
func deriveRequiresSerial(measureType string) int8 {
	if validMeasureType(measureType) && measureType != measureCount {
		return 0
	}
	return 1
}

// productStatusText 返回物资状态中文文案，与原 PHP Product 模型一致。
func productStatusText(status string) string {
	switch status {
	case productStatusActive:
		return "正常在用"
	case productStatusInactive:
		return "禁用"
	case productStatusDiscontinued:
		return "停产"
	case productStatusRepairing:
		return "返修中"
	case productStatusToScrap:
		return "待报废"
	default:
		return "未知"
	}
}

// stockStatus 计算库存状态：缺货/库存不足/库存过多/正常。
func stockStatus(product *entity.Product, totalStock int64) (status, text string) {
	// 安全库存下限优先，未设置时回退到最小库存。
	baseline := product.MinStockLevel
	if baseline <= 0 {
		baseline = product.MinStock
	}

	switch {
	case totalStock <= 0:
		return "out_of_stock", "缺货"
	case totalStock <= int64(baseline):
		return "low_stock", "库存不足"
	case product.MaxStock > 0 && totalStock >= int64(product.MaxStock):
		return "over_stock", "库存过多"
	default:
		return "normal", "正常"
	}
}

// toProductItem 把物资实体转换为响应结构。
func toProductItem(product *entity.Product, categoryName string, totalStock int64) v1.ProductItem {
	measureType := product.MeasureType
	if measureType == "" {
		measureType = measureCount
	}
	// E1：是否需要序列号以库表列为准，列未初始化时按计量方式推导（保存时会回填该列）。
	requiresSerial := int(product.RequiresSerial)
	if product.RequiresSerial == 0 {
		requiresSerial = int(deriveRequiresSerial(measureType))
	}
	status, statusText := stockStatus(product, totalStock)

	return v1.ProductItem{
		Id:                product.Id,
		Sku:               product.Sku,
		Name:              product.Name,
		Description:       product.Description,
		DeviceType:        product.DeviceType,
		ModelNumber:       product.ModelNumber,
		Brand:             product.Brand,
		ProductionDate:    dateString(product.ProductionDate),
		WarrantyMonths:    product.WarrantyMonths,
		FrequencyProtocol: product.FrequencyProtocol,
		FirmwareVersion:   product.FirmwareVersion,
		CategoryId:        product.CategoryId,
		CategoryName:      categoryName,
		Barcode:           product.Barcode,
		BarcodeImage:      product.BarcodeImage,
		Price:             product.Price.String(),
		CostPrice:         product.CostPrice.String(),
		Unit:              product.Unit,
		MeasureType:       measureType,
		MeasureTypeText:   measureTypeText(measureType),
		RequiresSerial:    requiresSerial,
		Weight:            product.Weight.String(),
		Length:            product.Length.String(),
		Width:             product.Width.String(),
		Height:            product.Height.String(),
		Volume:            product.Length.Mul(product.Width).Mul(product.Height).String(),
		MinStock:          product.MinStock,
		MaxStock:          product.MaxStock,
		MinStockLevel:     product.MinStockLevel,
		StockQuantity:     product.StockQuantity,
		TotalStock:        totalStock,
		AvailableStock:    totalStock,
		StockStatus:       status,
		StockStatusText:   statusText,
		Status:            product.Status,
		StatusText:        productStatusText(product.Status),
		ProjectId:         product.ProjectId,
		CreatedAt:         formatTime(product.CreatedAt),
		UpdatedAt:         formatTime(product.UpdatedAt),
	}
}
