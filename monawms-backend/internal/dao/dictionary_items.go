// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package dao

import (
	"github.com/esanwu-bot/monawms-backend/internal/dao/internal"
	"github.com/graingo/maltose/database/mdb"
)

type DictionaryItemDao struct {
	*internal.DictionaryItemDao
}

func NewDictionaryItemDao(db *mdb.DB) *DictionaryItemDao {
	return &DictionaryItemDao{
		internal.NewDictionaryItemDao(db),
	}
}
