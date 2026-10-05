<template>
  <GridLayout rows="auto,*" class="sub-page">
    <FlexboxLayout row="0" class="sub-head" flexDirection="row" alignItems="center">
      <GridLayout class="back-btn pressable" @tap="$emit('back')">
        <MiIcon name="chevron_left" :size="17" color="#e8edf6" />
      </GridLayout>
      <Label text="报废管理" class="sub-title font-disp-b" />
    </FlexboxLayout>

    <ScrollView row="1" scrollBarEnabled="false">
      <StackLayout paddingBottom="40">
        <OrderCard
          v-for="s in items"
          :key="s.id"
          :order="s"
          kind="scrap"
          @primary="onPrimary"
          @detail="onDetail"
        />
        <GridLayout v-if="!loading && !items.length" class="empty-box">
          <StackLayout horizontalAlignment="center">
            <MiIcon name="delete_outline" :size="34" color="#2a3448" />
            <Label text="暂无报废申请" class="empty-text" />
          </StackLayout>
        </GridLayout>
        <ActivityIndicator v-if="loading && !items.length" busy="true" color="#22d3ee" margin="50" />
      </StackLayout>
    </ScrollView>
  </GridLayout>
</template>

<script setup>
/** 报废管理（对应原型 #sub-scrap） */
import { ref, onMounted, watch } from 'nativescript-vue';
import { store, openSheet, showToast, bumpRefresh } from '../services/store';
import { api } from '../services/api';
import MiIcon from '../components/MiIcon.vue';
import OrderCard from '../components/OrderCard.vue';

defineEmits(['back']);

const items = ref([]);
const loading = ref(false);
const busyId = ref(null);

async function load() {
  loading.value = true;
  try {
    items.value = await api.listScrap();
  } catch (e) {
    showToast((e && e.message) || '报废数据加载失败', 'close');
  } finally {
    loading.value = false;
  }
}

async function onPrimary(s) {
  if (s.status !== 'pending') return showToast('凭证打印请在 Web 端执行');
  if (busyId.value) return;
  busyId.value = s.id;
  try {
    await api.approveScrap(s);
    showToast('报废申请已审批通过');
    await load();
    bumpRefresh();
  } catch (e) {
    showToast((e && e.message) || '审批失败', 'close');
  } finally {
    busyId.value = null;
  }
}

function onDetail(s) {
  openSheet('order-detail', { order: s, kind: 'scrap' });
}

onMounted(load);
watch(() => store.refreshTick, load);
</script>
