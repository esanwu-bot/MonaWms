// Package logic 汇总各业务模块的 init 注册，仅做副作用导入。
package logic

import (
	_ "github.com/esanwu-bot/monawms-backend/internal/logic/auth"
	_ "github.com/esanwu-bot/monawms-backend/internal/logic/master"
)
