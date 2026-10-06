<template>
  <Label :text="ch" class="font-mi" :class="iconClass" :style="{ fontSize: Number(size), color }" textAlignment="center" />
</template>

<script setup>
import { computed } from 'nativescript-vue';
import { glyph } from '../utils/icons';

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  color: { type: String, default: '#9aa5bb' },
  iconClass: { type: [String, Array, Object], default: '' },
});

const ch = computed(() => glyph(props.name));
</script>
