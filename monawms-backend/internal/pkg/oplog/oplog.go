// Package oplog 统一写操作审计：写 operation_log 表并用 mlog 双写关键节点。
// AGENTS.md 要求所有写操作必须留痕，且审计写入失败不得影响主流程。
package oplog

import (
	"context"
	"encoding/json"

	"github.com/esanwu-bot/monawms-backend/internal/dao"
	"github.com/esanwu-bot/monawms-backend/internal/model/entity"
	"github.com/esanwu-bot/monawms-backend/internal/pkg/token"
	"github.com/graingo/maltose/frame/m"
	"github.com/graingo/maltose/net/mhttp"
	"github.com/graingo/maltose/os/mlog"
	"time"
)

// Entry 是一次写操作的审计记录。
type Entry struct {
	// Action 是动作名，如 create / update / delete / product:write。
	Action string
	// TargetType 是目标类型，如 product / warehouse / dictionary_item。
	TargetType string
	// TargetID 是目标主键。
	TargetID int
	// Before / After 是变更前后的数据快照，会被序列化为 JSON。
	Before any
	After  any
}

// Write 落一条审计日志。失败只记录 warn，不向上抛错。
func Write(ctx context.Context, entry Entry) {
	if entry.Action == "" || entry.TargetType == "" {
		return
	}

	log := entity.OperationLog{
		Action:     entry.Action,
		TargetType: entry.TargetType,
		TargetId:   entry.TargetID,
		CreatedAt:  time.Now(),
	}
	if identity, ok := token.IdentityFromCtx(ctx); ok {
		log.OperatorId = identity.UserID
	}
	// HTTP 元数据仅用于留痕，不作为业务输入；缺失时留空。
	if req := mhttp.RequestFromCtx(ctx); req != nil {
		log.Method = req.Request.Method
		log.Path = req.Request.URL.Path
		log.Ip = req.ClientIP()
	}

	if entry.Before != nil {
		if raw, err := json.Marshal(entry.Before); err == nil {
			log.Before = string(raw)
		}
	}
	if entry.After != nil {
		if raw, err := json.Marshal(entry.After); err == nil {
			log.After = string(raw)
		}
	}

	if err := dao.NewOperationLogDao(m.DB()).Create(ctx, &log); err != nil {
		mlog.Warnf(ctx, "写入操作日志失败: action=%s target=%s/%d err=%v", entry.Action, entry.TargetType, entry.TargetID, err)
		return
	}
	mlog.Infof(ctx, "操作留痕: operator=%d action=%s target=%s/%d", log.OperatorId, entry.Action, entry.TargetType, entry.TargetID)
}
