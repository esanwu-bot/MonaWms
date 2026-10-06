<template>
  <FlexboxLayout flexDirection="row" justifyContent="space-between" alignItems="center">
    <Label :text="title" class="sheet-title" textWrap="true" />
    <GridLayout class="sheet-close pressable no-shrink" @tap="closeSheet">
      <MiIcon name="close" :size="14" color="#9aa5bb" />
    </GridLayout>
  </FlexboxLayout>
</template>

<script setup>
import { closeSheet } from '../services/store';
import MiIcon from './MiIcon.vue';

defineProps({ title: { type: String, default: '' } });
</script>
