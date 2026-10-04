// Package master 实现主数据模块（物资/分类/仓库/字典/供应商/客户）的业务逻辑。
// 事务与外部调用均在本层收口，controller 与 dao 层保持无业务逻辑。
package master

import (
	"context"
	"strings"
	"time"

	"github.com/esanwu-bot/monawms-backend/api/master/v1"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/permission"
	"github.com/graingo/maltose/errors/mcode"
	"github.com/graingo/maltose/errors/merror"
	"github.com/shopspring/decimal"
)

// 通用状态取值。
const (
	statusActive   = "active"
	statusInactive = "inactive"
)

// requireWrite 校验系统级写动作权限（不带仓库上下文）。
func requireWrite(ctx context.Context, action string) error {
	return permission.Require(ctx, action, 0)
}

// activeStatusText 返回启用/停用状态的中文文案。
func activeStatusText(status string) string {
	switch status {
	case statusActive:
		return "启用"
	case statusInactive:
		return "停用"
	default:
		return "未知"
	}
}

// normalizeStatus 校验并归一状态，空值回退到 fallback。
func normalizeStatus(raw, fallback string, allowed []string) (string, error) {
	status := strings.TrimSpace(raw)
	if status == "" {
		return fallback, nil
	}
	for _, item := range allowed {
		if item == status {
			return status, nil
		}
	}
	return "", merror.NewCode(mcode.CodeValidationFailed, "状态取值非法")
}

// parseDecimal 解析金额/数量字符串，空字符串视为 0。
func parseDecimal(raw string) (decimal.Decimal, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return decimal.Zero, nil
	}
	value, err := decimal.NewFromString(raw)
	if err != nil {
		return decimal.Zero, merror.NewCode(mcode.CodeValidationFailed, "数值格式非法")
	}
	return value, nil
}

// formatTime 格式化时间为 YYYY-MM-DD HH:MM:SS，零值返回空串。
func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format(time.DateTime)
}

// formatDate 格式化时间为 YYYY-MM-DD，零值返回空串。
func formatDate(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format(time.DateOnly)
}

// parseDate 解析日期字符串：空值返回 nil（写入 NULL），非法值返回错误。
func parseDate(raw string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.DateOnly, raw)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

// dateString 格式化可空日期，空值返回空串。
func dateString(t *time.Time) string {
	if t == nil || t.IsZero() {
		return ""
	}
	return t.Format(time.DateOnly)
}

// buildOption 构造下拉选项项（value=ID，label=编码 - 名称）。
func buildOption(id int, code, name string) v1.OptionItem {
	label := code
	if name != "" {
		if label == "" {
			label = name
		} else {
			label = label + " - " + name
		}
	}
	return v1.OptionItem{Value: id, Label: label, Id: id, Code: code, Name: name}
}

// buildPagination 构造分页元信息。
func buildPagination(total int64, page, limit int, pages int64) v1.Pagination {
	return v1.Pagination{Total: total, Page: page, Limit: limit, Pages: pages}
}
