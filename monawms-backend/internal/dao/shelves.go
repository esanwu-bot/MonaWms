// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package dao

import (
	"github.com/esanwu-bot/monawms-backend/internal/dao/internal"
	"github.com/graingo/maltose/database/mdb"
)

type ShelfDao struct {
	*internal.ShelfDao
}

func NewShelfDao(db *mdb.DB) *ShelfDao {
	return &ShelfDao{
		internal.NewShelfDao(db),
	}
}
