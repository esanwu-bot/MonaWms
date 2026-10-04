package mhttp

import (
	"reflect"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/locales/en"
	"github.com/go-playground/locales/zh"
	ut "github.com/go-playground/universal-translator"
	"github.com/go-playground/validator/v10"
	en_translations "github.com/go-playground/validator/v10/translations/en"
	zh_translations "github.com/go-playground/validator/v10/translations/zh"
)

// RuleFunc 是自定义校验规则函数。
type RuleFunc func(fl validator.FieldLevel) bool

// registerValidateTranslator 注册 gin 校验器的翻译器，并确保只执行一次。
func (s *Server) registerValidateTranslator(locale string) {
	if s.uni != nil {
		// 若 uni 已初始化，只需确保设置了服务端默认翻译器。
		if trans, found := s.uni.GetTranslator(locale); found {
			s.translator = trans
		}
		return
	}
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		zhT := zh.New()
		enT := en.New()
		s.uni = ut.New(enT, zhT, enT)
		trans, _ := s.uni.GetTranslator(locale)
		s.translator = trans

		// 为所有支持的语言注册默认翻译
		_ = en_translations.RegisterDefaultTranslations(v, s.uni.GetFallback())
		if zhTrans, found := s.uni.GetTranslator("zh"); found {
			_ = zh_translations.RegisterDefaultTranslations(v, zhTrans)
		}
	}
	s.setupExtendedTags()
}

// RegisterRuleWithTranslation 注册自定义校验规则及其多语言翻译。
func (s *Server) RegisterRuleWithTranslation(rule string, fn RuleFunc, errMessage map[string]string) {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		// 注册校验规则函数本身。
		_ = v.RegisterValidation(rule, func(fl validator.FieldLevel) bool {
			return fn(fl)
		})

		// 确保通用翻译器已初始化。
		if s.uni == nil {
			s.registerValidateTranslator(s.config.ServerLocale)
		}

		// 为提供的每种语言注册翻译。
		for lang, msg := range errMessage {
			if trans, found := s.uni.GetTranslator(lang); found {
				registerTranslation(v, trans, rule, msg)
			}
		}
	}
}

// registerTranslation 注册翻译。
func registerTranslation(v *validator.Validate, trans ut.Translator, tag string, msg string) {
	_ = v.RegisterTranslation(tag, trans, func(ut ut.Translator) error {
		return ut.Add(tag, msg, true)
	}, func(ut ut.Translator, fe validator.FieldError) string {
		t, _ := ut.T(tag, fe.Field())
		return t
	})
}

// setupExtendedTags 扩展结构体标签的支持。
func (s *Server) setupExtendedTags() {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		// 支持将 "dc" 标签作为字段描述
		v.RegisterTagNameFunc(func(fld reflect.StructField) string {
			name := fld.Tag.Get("dc")
			if name == "" {
				name = fld.Tag.Get("json")
			}
			if name == "" {
				name = fld.Name
			}
			return name
		})
	}
}
