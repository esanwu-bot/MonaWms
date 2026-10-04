package utils

import (
	"fmt"
	"strings"

	"github.com/fatih/color"
)

// TplData 为消息中的 {{.Name}} 占位符提供命名取值。
type TplData map[string]any

func formatMessage(messageID string, templateData TplData) string {
	if templateData == nil {
		return messageID
	}
	msg := messageID
	for key, value := range templateData {
		placeholder := fmt.Sprintf("{{.%s}}", key)
		msg = strings.ReplaceAll(msg, placeholder, fmt.Sprintf("%v", value))
	}
	return msg
}

// PrintSuccess 以绿色向控制台输出格式化消息。
func PrintSuccess(messageID string, templateData TplData) {
	message := formatMessage(messageID, templateData)
	color.Green(message)
}

// PrintError 以红色向控制台输出格式化错误消息。
func PrintError(messageID string, templateData TplData) {
	message := formatMessage(messageID, templateData)
	color.Red("Error: " + message)
}

// PrintNotice 以青色向控制台输出格式化提示消息。
func PrintNotice(messageID string, templateData TplData) {
	message := formatMessage(messageID, templateData)
	color.Cyan(message)
}

// PrintWarn 以黄色向控制台输出格式化警告消息。
func PrintWarn(messageID string, templateData TplData) {
	message := formatMessage(messageID, templateData)
	color.Yellow("Warning: " + message)
}

// PrintInfo 向控制台输出格式化消息。
func PrintInfo(messageID string, templateData TplData) {
	message := formatMessage(messageID, templateData)
	color.White(message)
}

// Print 原样返回 messageID。
func Print(messageID string) string {
	return messageID
}

// Printf 替换 messageID 中的命名占位符。
func Printf(messageID string, templateData TplData) string {
	return formatMessage(messageID, templateData)
}
