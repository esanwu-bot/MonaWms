<template>
  <FlexboxLayout flexDirection="row" justifyContent="space-between" alignItems="center" class="sec-title">
    <FlexboxLayout flexDirection="row" alignItems="center">
      <StackLayout class="sec-bar" />
      <Label :text="title" class="sec-h3" />
    </FlexboxLayout>
    <Label v-if="link" :text="link" class="sec-link pressable" @tap="$emit('linkTap')" />
    <Label v-else-if="note" :text="note" class="sec-note" />
  </FlexboxLayout>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  link: { type: String, default: '' },
  note: { type: String, default: '' },
});
defineEmits(['linkTap']);
</script>
