<template>
  <StackLayout class="fg">
    <FlexboxLayout flexDirection="row">
      <Label :text="label" class="fg-label" />
      <Label v-if="required" text="*" class="fg-req" />
    </FlexboxLayout>
    <FlexboxLayout class="picker-field pressable" flexDirection="row" alignItems="center" @tap="expanded = !expanded">
      <Label
        :text="text || placeholder"
        :class="['picker-value', text ? '' : 'picker-placeholder']"
      />
      <MiIcon name="calendar_today" :size="14" color="#5c677d" />
    </FlexboxLayout>
    <StackLayout v-if="expanded" class="datepicker-wrap">
      <DatePicker v-model="date" class="ns-datepicker" />
    </StackLayout>
  </StackLayout>
</template>

<script setup>
/** 日期选择字段：点击展开原生 DatePicker（暗色主题跟随系统深色） */
import { ref, computed, watch } from 'nativescript-vue';
import { dateToYmd } from '../utils/format';
import MiIcon from './MiIcon.vue';

const props = defineProps({
  label: { type: String, default: '日期' },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: '选择日期' },
  modelValue: { type: String, default: '' }, // YYYY-MM-DD
});
const emit = defineEmits(['update:modelValue']);

const expanded = ref(false);
const date = ref(props.modelValue ? new Date(props.modelValue.replace(/-/g, '/')) : new Date());

const text = computed(() => (props.modelValue ? props.modelValue : ''));

// DatePicker 变更 → 同步字符串
watch(date, (v) => {
  if (v instanceof Date) emit('update:modelValue', dateToYmd(v));
});
</script>
