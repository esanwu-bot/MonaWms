package model

// HelloInput 是生成问候语所需的数据。
type HelloInput struct {
	Name string `json:"name"`
}

// HelloOutput 是生成的问候语。
type HelloOutput struct {
	Greeting string `json:"greeting"`
}
