<template>
  <StackLayout class="dev-cell">
    <FlexboxLayout class="dev-card pressable" flexDirection="row" alignItems="center" @tap="$emit('open', device)">
      <GridLayout class="dev-thumb no-shrink">
        <Image v-if="device.img" :src="device.img" stretch="aspectFill" class="dev-thumb" />
        <MiIcon v-else name="router" :size="22" color="#5c677d" />
      </GridLayout>
      <StackLayout class="dev-info">
        <Label :text="device.name" class="dev-name" textWrap="true" />
        <Label :text="device.model" class="dev-model font-mono" />
        <FlexboxLayout flexDirection="row" alignItems="center">
          <Label :text="'● ' + device.statusText" :class="['dev-meta-item', device.statusCls || 'dev-st-avail']" />
          <Label :text="device.sn" class="dev-meta-item font-mono" />
          <Label :text="device.loc" class="dev-meta-item font-mono" />
        </FlexboxLayout>
      </StackLayout>
      <GridLayout class="dev-go no-shrink">
        <MiIcon name="chevron_right" :size="15" color="#5c677d" />
      </GridLayout>
    </FlexboxLayout>
  </StackLayout>
</template>

<script setup>
import MiIcon from './MiIcon.vue';

defineProps({
  device: { type: Object, required: true },
});
defineEmits(['open']);
</script>
