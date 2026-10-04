// =================================================================================
// 代码由 Maltose 工具生成并维护，可按需自行修改。
// =================================================================================
package hello

// HelloV1 处理 v1 版本的 hello 接口。
type HelloV1 struct{}

// NewV1 创建 v1 版本的 hello controller。
func NewV1() *HelloV1 {
	return &HelloV1{}
}

// HelloV2 处理 v2 版本的 hello 接口。
type HelloV2 struct{}

// NewV2 创建 v2 版本的 hello controller。
func NewV2() *HelloV2 {
	return &HelloV2{}
}
