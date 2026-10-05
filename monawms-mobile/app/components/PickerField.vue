<template>
  <StackLayout class="fg">
    <FlexboxLayout flexDirection="row">
      <Label :text="label" class="fg-label" />
      <Label v-if="required" text="*" class="fg-req" />
    </FlexboxLayout>
    <FlexboxLayout class="picker-field pressable" flexDirection="row" alignItems="center" @tap="pick">
      <Label
        :text="displayText || placeholder"
        :class="['picker-value', displayText ? '' : 'picker-placeholder']"
        textWrap="true"
      />
      <MiIcon name="arrow_downward" :size="14" color="#5c677d" />
    </FlexboxLayout>
  </StackLayout>
</template>

<script setup>
/**
 * 下拉选择字段：点击弹出原生 ActionSheet（对齐原型 select 交互）
 * options: [{id, name, extra?}]
 */
import { computed } from 'nativescript-vue';
import { action } from '@nativescript/core';
import MiIcon from './MiIcon.vue';

const props = defineProps({
  label: { type: String, default: '' },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: '请选择' },
  options: { type: Array, default: () => [] },
  modelValue: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'select']);

const displayText = computed(() => (props.modelValue ? props.modelValue.name || '' : ''));

async function pick() {
  const labels = props.options.map((o) => o.name + (o.extra ? ' · ' + o.extra : ''));
  if (!labels.length) {
    emit('select', null);
    return;
  }
  const picked = await action({
    title: props.label,
    cancelButtonText: '取消',
    actions: labels,
  });
  const idx = labels.indexOf(picked);
  if (idx >= 0) {
    emit('update:modelValue', props.options[idx]);
    emit('select', props.options[idx]);
  }
}
</script>
