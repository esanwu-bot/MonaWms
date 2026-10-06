<template>
  <FlexboxLayout class="tabbar" flexDirection="row">
    <GridLayout v-for="t in tabs" :key="t.key" class="tab-cell pressable" @tap="onTap(t.key)">
      <StackLayout horizontalAlignment="center">
        <StackLayout :class="['tab-indicator', store.tab === t.key ? '' : 'tab-indicator-off']" />
        <GridLayout class="tab-icon-wrap">
          <MiIcon :name="t.icon" :size="21" :color="store.tab === t.key ? '#22d3ee' : '#5c677d'" />
          <Label
            v-if="badgeOf(t.key)"
            :text="String(badgeOf(t.key))"
            class="tab-badge font-mono"
          />
        </GridLayout>
        <Label
          :text="t.label"
          :class="['tab-label', store.tab === t.key ? 'tab-label-active' : 'tab-label-inactive']"
        />
      </StackLayout>
    </GridLayout>
  </FlexboxLayout>
</template>

<script setup>
import { store, switchTab } from '../services/store';
import MiIcon from './MiIcon.vue';

const tabs = [
  { key: 'home', icon: 'home', label: '首页' },
  { key: 'inbound', icon: 'file_download', label: '入库' },
  { key: 'outbound', icon: 'file_upload', label: '出库' },
  { key: 'devices', icon: 'desktop_windows', label: '设备' },
  { key: 'mine', icon: 'person', label: '我的' },
];

function badgeOf(key) {
  if (key === 'inbound') return store.pendingBadges.inbound || 0;
  if (key === 'outbound') return store.pendingBadges.outbound || 0;
  return 0;
}

function onTap(key) {
  switchTab(key);
}
</script>
