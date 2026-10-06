<template>
  <ScrollView class="view-scroll" scrollBarEnabled="false">
    <StackLayout paddingBottom="100">
      <!-- ===== 顶栏 ===== -->
      <FlexboxLayout class="topbar" flexDirection="row" justifyContent="space-between" alignItems="center">
        <StackLayout>
          <Label :text="dateText" class="topbar-date font-mono" />
          <FlexboxLayout flexDirection="row" alignItems="center">
            <Label :text="greetText" class="topbar-title font-disp-b" />
            <Label text="👋" class="greet-wave" />
          </FlexboxLayout>
        </StackLayout>
        <FlexboxLayout flexDirection="row" alignItems="center">
          <GridLayout class="icbtn bell-wrap pressable" @tap="openSub('logs')">
            <MiIcon name="notifications_none" :size="18" color="#9aa5bb" />
            <StackLayout class="nd" />
          </GridLayout>
          <GridLayout class="avatar">
            <Image :src="avatarUrl" stretch="aspectFill" class="avatar-img" />
          </GridLayout>
        </FlexboxLayout>
      </FlexboxLayout>

      <!-- ===== 渲染/加载异常可见化：宁可显示错误卡，也不要整屏空白 ===== -->
      <StackLayout v-if="renderError" class="render-error-card hpad-12">
        <Label :text="renderErrorTitle" class="re-title" />
        <Label :text="renderError" class="re-msg font-mono" textWrap="true" />
        <Label text="重试" class="re-btn" @tap="load" />
      </StackLayout>

      <ActivityIndicator v-if="!dash && !renderError" busy="true" color="#22d3ee" margin="60" />

      <StackLayout v-if="dash && !stats.length" class="render-error-card hpad-12">
        <Label text="接口返回结构异常" class="re-title" />
        <Label text="/reports/dashboard 返回内容里没有 stats 字段，首页无法渲染卡片。可切到演示模式核对界面。" class="re-msg font-mono" textWrap="true" />
        <Label text="重试" class="re-btn" @tap="load" />
      </StackLayout>

      <StackLayout v-if="dash && stats.length">
        <!-- ===== 统计卡 ===== -->
        <GridLayout class="hpad-12" rows="auto,auto" columns="*,*">
          <StatCard
            v-for="(s, i) in stats"
            :key="s.key"
            :row="Math.floor(i / 2)"
            :col="i % 2"
            :stat="s"
            :display="displayVals[i] || 0"
          />
        </GridLayout>

        <!-- ===== 快捷操作 ===== -->
        <StackLayout class="pad-18">
          <SectionTitle title="快捷操作" />
        </StackLayout>
        <GridLayout class="hpad-12" rows="auto,auto" columns="*,*,*">
          <StackLayout
            v-for="(q, i) in quicks"
            :key="q.label"
            class="qk pressable"
            :row="Math.floor(i / 3)"
            :col="i % 3"
            @tap="q.go()"
          >
            <GridLayout :class="['qi', q.bg]">
              <MiIcon :name="q.icon" :size="20" :color="q.color" />
            </GridLayout>
            <Label :text="q.label" :class="['qn', q.qn]" />
          </StackLayout>
        </GridLayout>

        <!-- ===== 出入库趋势 ===== -->
        <StackLayout class="pad-18">
          <FlexboxLayout flexDirection="row" justifyContent="space-between" alignItems="center" class="sec-title">
            <FlexboxLayout flexDirection="row" alignItems="center">
              <StackLayout class="sec-bar" />
              <Label text="出入库趋势" class="sec-h3" />
            </FlexboxLayout>
            <Label :text="trendNote" class="sec-note" />
          </FlexboxLayout>
          <StackLayout class="trend-card">
            <FlexboxLayout class="trend-head" flexDirection="row" justifyContent="space-between" alignItems="center">
              <Label text="实时流水" class="trend-t" />
              <FlexboxLayout flexDirection="row" alignItems="center">
                <StackLayout class="legend-dot ld-cyan" />
                <Label text="入库" class="legend-text" />
                <StackLayout class="legend-dot ld-amber" />
                <Label text="出库" class="legend-text" />
              </FlexboxLayout>
            </FlexboxLayout>
            <TrendChart ref="trendRef" :inbound="trend.inbound" :outbound="trend.outbound" :labels="trend.labels" />
          </StackLayout>
        </StackLayout>

        <!-- ===== 待办提醒 ===== -->
        <StackLayout class="pad-18">
          <SectionTitle title="待办提醒" />
        </StackLayout>
        <ScrollView orientation="horizontal" class="todos-scroll" scrollBarEnabled="false">
          <FlexboxLayout flexDirection="row">
            <StackLayout
              v-for="(t, i) in todos"
              :key="i"
              :class="['todo-card', 'pressable', t.warn ? 'todo-warn' : '']"
              @tap="onTodo(t)"
            >
              <Label :text="t.label" class="todo-label" />
              <Label
                :text="t.value"
                :class="['todo-value', 'font-disp-b', t.warn ? 'todo-value-amber' : t.tone === 'cyan' ? 'todo-value-cyan' : '']"
              />
              <Label :text="t.sub" class="todo-time font-mono" />
            </StackLayout>
          </FlexboxLayout>
        </ScrollView>

        <!-- ===== 最近活动 ===== -->
        <StackLayout class="pad-18">
          <SectionTitle title="最近活动" link="全部 ›" @linkTap="openSub('logs')" />
          <StackLayout>
            <FlexboxLayout
              v-for="(a, i) in activities"
              :key="i"
              class="act-item divider-b"
              flexDirection="row"
              alignItems="flex-start"
            >
              <GridLayout :class="['act-icon-wrap', 'no-shrink', dimCls(a.tone)]">
                <MiIcon :name="a.icon" :size="16" :color="toneColor(a.tone)" />
              </GridLayout>
              <StackLayout flexGrow="1" flexShrink="1">
                <Label :text="a.title" class="act-title" textWrap="true" />
                <Label :text="a.meta" class="act-meta font-mono" />
              </StackLayout>
            </FlexboxLayout>
          </StackLayout>
        </StackLayout>
      </StackLayout>
    </StackLayout>
  </ScrollView>
</template>

<script setup>
/**
 * 首页（对应原型 #view-home）
 * 统计卡（滚动数字 + 迷你趋势线）/ 六宫格快捷操作 / 出入库趋势图 / 待办横滚 / 最近活动
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount, onErrorCaptured, watch, nextTick } from 'nativescript-vue';
import { store, switchTab, openSub, showToast, BUILD } from '../services/store';
import { api } from '../services/api';
import { C, STATUS_TONE } from '../services/theme';
import { cnDate, greeting } from '../utils/format';
import MiIcon from '../components/MiIcon.vue';
import SectionTitle from '../components/SectionTitle.vue';
import StatCard from '../components/StatCard.vue';
import TrendChart from '../components/TrendChart.vue';

const dash = ref(null);
const displayVals = reactive([0, 0, 0, 0]);
const trendRef = ref(null);
const dateText = ref(cnDate() + ' · build ' + BUILD);
const greetText = ref(greeting() + '，管理员');
const avatarUrl = 'https://picsum.photos/seed/wms-admin-avatar/80/80';

/* ---- 渲染异常兜底：子组件抛错时留痕并显示错误卡，不再整屏空白 ---- */
const renderError = ref('');
const renderErrorTitle = ref('首页渲染异常');
onErrorCaptured((err) => {
  renderError.value = String((err && err.message) || err);
  console.error('[HomeView] 子组件渲染异常:', err);
  return false;
});

/* ---- 数据形状兜底：任一字段缺失只影响该区块 ---- */
const stats = computed(() => (dash.value && dash.value.stats) || []);
const trend = computed(() => (dash.value && dash.value.trend) || { labels: [], inbound: [], outbound: [] });
const todos = computed(() => (dash.value && dash.value.todos) || []);
const activities = computed(() => (dash.value && dash.value.activities) || []);

let counterTimer = null;
let scrambleTimer = null;
let loadWatchdog = null;
let dateTimer = null;

const quicks = [
  { label: '新增入库', icon: 'file_download', bg: 'qi-cyan', color: C.cyan, qn: 'qn-c1', go: () => switchTab('inbound') },
  { label: '设备出库', icon: 'file_upload', bg: 'qi-amber', color: C.amber, qn: 'qn-c2', go: () => switchTab('outbound') },
  { label: '查找设备', icon: 'search', bg: 'qi-violet', color: C.violet, qn: 'qn-c3', go: () => switchTab('devices') },
  { label: '仓库管理', icon: 'home_work', bg: 'qi-green', color: C.green, qn: 'qn-c4', go: () => openSub('warehouse') },
  { label: '数据报表', icon: 'show_chart', bg: 'qi-red', color: C.red, qn: 'qn-c5', go: () => openSub('reports') },
  { label: '报废申请', icon: 'delete', bg: 'qi-slate', color: '#94a3b8', qn: 'qn-c6', go: () => openSub('scrap') },
];

const trendNote = computed(() => {
  if (!dash.value) return '近 14 天';
  const n = (trend.value.inbound || []).length;
  return n > 6 ? `近 ${n} 天` : `近 ${n} 期`;
});

function dimCls(tone) {
  return { cyan: 'qi-cyan', green: 'qi-green', amber: 'qi-amber', red: 'qi-red', violet: 'qi-violet' }[tone] || 'qi-cyan';
}
function toneColor(tone) {
  return (STATUS_TONE[tone] || STATUS_TONE.cyan).color;
}

/* ---- 数据加载 ---- */
async function load() {
  renderError.value = '';
  renderErrorTitle.value = '首页渲染异常';
  if (loadWatchdog) clearTimeout(loadWatchdog);
  // 接口长时间无响应时也要给出可见反馈，不能停在无限转圈
  loadWatchdog = setTimeout(() => {
    if (!dash.value) {
      renderErrorTitle.value = '首页数据加载超时';
      renderError.value = '接口无响应：' + store.baseUrl + '/reports/dashboard';
      console.error('[HomeView] dashboard 加载超时, baseUrl=' + store.baseUrl);
    }
  }, 12000);
  try {
    const d = await api.dashboard();
    dash.value = d;
    if (d.badges) store.pendingBadges = { inbound: d.badges.inbound || 0, outbound: d.badges.outbound || 0 };
    animateCounters();
    runScramble();
    nextTick(() => trendRef.value && trendRef.value.redraw && trendRef.value.redraw());
  } catch (e) {
    renderErrorTitle.value = '首页数据加载失败';
    renderError.value = String((e && e.message) || e);
    console.error('[HomeView] dashboard 加载失败:', e);
    showToast((e && e.message) || '首页数据加载失败', 'close');
  } finally {
    clearTimeout(loadWatchdog);
    loadWatchdog = null;
  }
}

/* ---- 数字滚动 ---- */
function animateCounters() {
  if (!dash.value) return;
  const targets = stats.value.map((s) => Number(s.value) || 0);
  const dur = 1300;
  const start = Date.now();
  if (counterTimer) clearInterval(counterTimer);
  counterTimer = setInterval(() => {
    const p = Math.min((Date.now() - start) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    targets.forEach((t, i) => (displayVals[i] = Math.round(t * e)));
    if (p >= 1) clearInterval(counterTimer);
  }, 32);
}

/* ---- 问候语解码动画（原型 scramble） ---- */
const GLYPHS = '█▓▒░<>/#01*+';
function runScramble() {
  const name =
    store.user && store.user.username && store.user.username !== 'demo' ? store.user.username : '管理员';
  const target = greeting() + '，' + name;
  let f = 0;
  if (scrambleTimer) clearInterval(scrambleTimer);
  scrambleTimer = setInterval(() => {
    let out = '';
    for (let i = 0; i < target.length; i++) {
      out += f / 3 > i ? target[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    greetText.value = out;
    f++;
    if (f > target.length * 3 + 6) {
      greetText.value = target;
      clearInterval(scrambleTimer);
    }
  }, 40);
}

/* ---- 待办点击 ---- */
function onTodo(t) {
  if (t.tab) switchTab(t.tab);
  else if (t.sub2) openSub(t.sub2);
}

onMounted(() => {
  load();
  // 每分钟刷新日期
  dateTimer = setInterval(() => (dateText.value = cnDate() + ' · build ' + BUILD), 60000);
});

onBeforeUnmount(() => {
  clearInterval(dateTimer);
  clearInterval(counterTimer);
  clearInterval(scrambleTimer);
  if (loadWatchdog) clearTimeout(loadWatchdog);
});

watch(() => store.refreshTick, () => load());
watch(
  () => store.tab,
  (t) => {
    if (t === 'home') nextTick(() => trendRef.value && trendRef.value.redraw && trendRef.value.redraw());
  }
);
</script>
