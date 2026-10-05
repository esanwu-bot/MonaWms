<template>
  <ScrollView orientation="horizontal" class="chips-scroll" scrollBarEnabled="false">
    <FlexboxLayout flexDirection="row">
      <FlexboxLayout
        v-for="c in items"
        :key="c.key"
        flexDirection="row"
        :class="['chip', modelValue === c.key ? 'chip-active' : '']"
        @tap="$emit('update:modelValue', c.key)"
      >
        <Label :text="c.label" :class="['chip-label', modelValue === c.key ? 'chip-label-active' : '']" />
        <Label
          v-if="c.count !== undefined && c.count !== null"
          :text="String(c.count)"
          :class="['chip-count', 'font-mono', modelValue === c.key ? 'chip-count-active' : '']"
        />
      </FlexboxLayout>
    </FlexboxLayout>
  </ScrollView>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] }, // [{key,label,count}]
  modelValue: { type: String, default: 'all' },
});
defineEmits(['update:modelValue']);
</script>
