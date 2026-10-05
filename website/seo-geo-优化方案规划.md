# MonaWMS 官网 SEO + GEO 优化方案规划

> 适用对象：MonaWMS 官网前台（Next.js 16 静态导出，`E:\workspace\MonaWMS_TX\website`）
> 当前线上：`https://caymak2ynl.doubaoapps.com/app/app_17f4zh9hyme/`
> 文档定位：策略规划 + 落地清单，供后续迭代直接照做

---

## 一、现状基线（先摸清再动手）

| 维度 | 现状 | 对 SEO/GEO 的影响 |
|---|---|---|
| 渲染方式 | Next.js 16 静态导出（SSG），HTML 预渲染 | ✅ 首页即完整 HTML，搜索引擎与 AI 爬虫可直接读取正文，无需 JS 渲染 |
| 页面形态 | 单页官网（首页 + 锚点分区） | ⚠️ 无多路由，可覆盖的关键词面窄，缺少落地页承接长尾词 |
| 基础元信息 | `layout.tsx` 已有 title / description | ✅ 基础可用，但缺 OG / Twitter / JSON-LD / canonical |
| 结构化数据 | 无 | ❌ 搜索引擎和 AI 引擎都无法把页面识别为「软件产品 / FAQ / 组织」实体 |
| sitemap / robots | 无 | ❌ 无主动提交入口，收录依赖爬虫自己发现 |
| llms.txt | 无 | ❌ 对生成式引擎（豆包 / DeepSeek / ChatGPT / Perplexity 等）无索引入口 |
| 托管域名 | 妙搭平台二级域名（`*.doubaoapps.com`） | ⚠️ 平台域名权重积累有限，主流收录偏慢；中长期建议绑定自定义域名 |
| 内容事实 | README 已沉淀 25+ 控制器 / 32 表 / 18 迁移 / 14 种子等硬事实 | ✅ 是 GEO「可引用事实」的最佳素材，需结构化呈现 |

**结论**：技术底子（SSG）对 SEO/GEO 友好，短板集中在「机器可读元数据缺失」和「内容面单一」两点。方案先补机器可读层（性价比最高），再扩内容层。

---

## 二、SEO 优化（传统搜索引擎：Google / Bing / 百度）

### 2.1 技术 SEO —— 本轮优先落地

| # | 动作 | 落地文件（Next.js App Router） | 说明 |
|---|---|---|---|
| 1 | 补全 metadata | `src/app/layout.tsx` | title / description / keywords；OG（og:title、og:description、og:type=website、og:image）；Twitter Card（summary_large_image）；`metadataBase` 设为线上地址 |
| 2 | Organization 结构化数据 | `src/app/layout.tsx` 注入 `<script type="application/ld+json">` | 组织实体：名称（MonaWMS）、url、logo、联系方式、同主体仓库链接；统一品牌名与描述口径 |
| 3 | SoftwareApplication 结构化数据 | 首页注入 JSON-LD | 应用类型（`WebApplication`）、name、description、offers（免费/MIT）、aggregateRating 可暂缺、sameAs（GitHub 仓库） |
| 4 | FAQPage 结构化数据 | FAQ 区块同步输出 JSON-LD | 与页面手风琴的 5-6 组问答一一对应，搜索引擎与 AI 都吃这一块 |
| 5 | sitemap.xml | `src/app/sitemap.ts` | 声明 `/`、`/icon.svg` 等真实路由；后续每新增一个页面路由同步补一条 |
| 6 | robots.txt | `src/app/robots.ts` | `Allow: /`；明确放行主流 AI 爬虫（见 GEO 章节）；`Sitemap:` 指向 sitemap.xml 线上地址 |
| 7 | canonical | `layout.tsx` 的 metadata | `alternates.canonical` 指向线上规范 URL，避免平台域名多入口造成重复收录 |
| 8 | 404 体验 | 已有 `404.html` | 保持中文友好文案 + 回首页链接；平台托管会兜底渲染 |
| 9 | 性能基线 | 已达标项保持 | 字体已自托管 fontsource 子集（woff2 最小化）；无大图；LCP 目标 < 2.5s；CLS < 0.1 |
| 10 | 可访问性 | 现有实现继续达标 | 语义化标签、键盘可达、`prefers-reduced-motion`（已有）；alt 文案随新增图片补齐 |

### 2.2 内容 SEO —— 关键词体系与页面结构

**关键词分层（围绕产品语义推导，全部有真实页面/文案支撑）**：

| 层级 | 关键词 | 建议投放位置 |
|---|---|---|
| 核心词（1-2 个） | 仓储管理系统 / WMS | 首页 H1、title 前缀、description |
| 场景词（2-3 个） | 通信代维物资管理、通信物资管理系统 | 首页副标语、功能区文案、FAQ 首条 |
| 长尾词（5-10 个） | 库存盘点对账软件、出入库管理系统、仓库物资台账、开源 WMS、轻量仓储系统 | FAQ 扩容、后续功能详情页、使用指南 |
| 技术词 | ThinkPHP WMS、MySQL 库存管理、Docker 部署仓储系统 | 部署区文案、技术栈区、博客/文档 |

**页面结构规则**：
- 每个页面一个 H1，内容分区用 H2，卡片/小节用 H3；标题层级不可跳级
- title 建议 ≤ 60 字符，description ≤ 150 字符，含核心词且自然
- 段落默认短句 + 一次只讲一件事（也是 GEO 可引用性的基础）

**内容扩容（中期）**：
1. **功能详情页**（多路由）：库存=流水汇总机制、双角色录审、二维授权、幂等迁移——每页一个长尾词主攻
2. **FAQ 扩容**：从 5 条扩到 10-12 条，全部采用「问题即搜索词」句式
3. **使用指南 / 部署教程**：配合 README 输出 3-5 篇短文，天然承接技术词

### 2.3 站外 SEO

- GitHub 仓库保持活跃（star / README 质量、Topics 打上 `wms`、`inventory-management`、`telecom`）
- 演示站 `http://8.152.97.191:9110/login` 保持可访问，作为外链与「可验证产品」信号
- 在 CSDN / 掘金 / 知乎发布部署教程与开源介绍，回链官网与仓库（注意平台外链规范）

---

## 三、GEO 优化（生成式引擎优化）

### 3.1 什么是 GEO，目标是什么

GEO（Generative Engine Optimization）是面向生成式 AI 搜索（豆包、DeepSeek、ChatGPT、Perplexity、Gemini 等）的优化：当用户向 AI 提问「开源 WMS 有哪些」「通信代维仓库管理用什么系统」时，让 MonaWMS 官网成为 AI 回答的**事实来源并被引用**。

AI 引擎的取信逻辑：**结构化、可引用、有出处、与查询语义精确匹配**。因此 GEO 核心不是堆关键词，而是把官网变成「机器一眼就能读懂的权威事实源」。

### 3.2 核心动作（按优先级）

| 优先级 | 动作 | 落地方式 |
|---|---|---|
| P0 | 结构化数据全覆盖 | Organization / SoftwareApplication / FAQPage 三套 JSON-LD（见 SEO 2.1 的 2/3/4 条），一次落地同时服务 SEO 与 GEO |
| P0 | llms.txt | 新建 `public/llms.txt`：一行标题 + 产品一句话定义 + 事实清单（25+ 控制器、32 表、18 迁移、14 种子、库存=流水汇总机制）+ 关键页面 URL 与「数据来源」说明。这是主流 AI 引擎（含规范采纳方）的标准索引协议 |
| P0 | robots 放行 AI 爬虫 | `robots.ts` 中显式 `Allow`：`GPTBot`、`ClaudeBot`、`Google-Extended`、`PerplexityBot`、`CCBot`、`Applebot-Extended` 等；禁止任何 `Disallow` 误伤首页 |
| P1 | 可引用段落设计 | 首页关键区块写成「可直接被引用的完整陈述」：主语 + 定义 + 数字事实 + 出处。例：「MonaWMS 库存数据由 inventory_transactions 流水驱动，通过 18 份幂等迁移保证账实一致」——AI 引用时无需二次拼装 |
| P1 | 事实一致性 | 品牌名（MonaWMS / 通信代维物资仓储管理系统）、数字事实、联系方式、演示地址在官网 / README / llms.txt / JSON-LD 四处完全一致，防止 AI 引擎抓取到互相矛盾的信息 |
| P1 | FAQ 问答式内容 | FAQ 每一条都是「AI 用户会直接问的问题」，答案 40-80 字、直接给结论再给依据，利于被整段引用 |
| P2 | 权威信号外露 | JSON-LD 中 `sameAs` 关联 GitHub 仓库；正文给 README、演示站的链接；作者/维护者信息在页脚与 Organization 中声明 |
| P2 | 更新频率信号 | 官网 + README + 文档随版本迭代更新，AI 引擎更信任「有维护迹象」的来源 |

### 3.3 注意：平台托管域名的 GEO 现实

当前线上地址是妙搭平台二级域名。生成式引擎对平台域名的引用意愿低于独立域名，且品牌露出为 `doubaoapps.com`。**GEO 收益最大化依赖自定义域名**：将官网绑定到独立域名（如 `monawms.com` / 项目子域）后，llms.txt、结构化数据、品牌一致性才能真正转化为「品牌被 AI 直接点名」的效果。此事项需与托管方域名能力确认后推进（见 5.3）。

---

## 四、分阶段执行计划

### 阶段一：机器可读层（1-2 个迭代，本轮即可做）

- [ ] `layout.tsx` 补全 metadata（title/description/OG/Twitter/canonical/metadataBase）
- [ ] 注入 Organization + SoftwareApplication JSON-LD
- [ ] FAQ 区块同步输出 FAQPage JSON-LD
- [ ] 新建 `src/app/sitemap.ts`、`src/app/robots.ts`
- [ ] 新建 `public/llms.txt`
- [ ] 校验：`npm run build` 通过；`out/index.html` 中 ld+json / canonical / og 标签存在；sitemap.xml 与 robots.txt 出现在 out 根
- [ ] 重新发布，交付新线上地址

### 阶段二：内容层（1-2 周）

- [ ] FAQ 扩容至 10-12 条（问题即搜索词）
- [ ] 新增 3-5 个功能详情/指南页面（多路由），sitemap 同步
- [ ] 每个新页面补 H1/H2 结构、JSON-LD（Article/FAQ）、正文短句化
- [ ] 新增图片全部带 alt，无裸根资源引用（遵循现有发布协议）

### 阶段三：权威与监控层（持续）

- [ ] 绑定自定义域名（若托管方支持），metadataBase / canonical / sitemap 切换
- [ ] 站外内容（CSDN/掘金/知乎）+ GitHub Topics
- [ ] 建立监控看板（见下节）

---

## 五、指标与验证

### 5.1 SEO 指标

| 指标 | 工具 | 目标 |
|---|---|---|
| 收录与索引 | Google Search Console、Bing Webmaster、百度搜索资源平台 | 收录首页；sitemap 无报错 |
| 排名 | GSC 效果报告 / 站内关键词排位记录 | 核心词进入前 3 页（平台域名现实预期） |
| 点击与曝光 | GSC 效果报告 | CTR 与展示量环比上升 |
| 技术健康 | Lighthouse（SEO / Performance / Accessibility） | 三项均 ≥ 90 |

### 5.2 GEO 指标

| 指标 | 方法 | 目标 |
|---|---|---|
| AI 引用率 | 周期性在豆包 / DeepSeek / ChatGPT / Perplexity 提问「开源 WMS 推荐」「通信代维物资管理」等 8-10 组问题，记录是否出现官网/仓库并被引用 | 引用出现率持续上升 |
| 回答准确性 | 对比 AI 回答中的事实（控制器数、表数、机制描述）与官网是否一致 | 100% 一致（不一致即事实同步故障） |
| llms.txt 可达性 | 抓取线上 `/llms.txt` 与 `/robots.txt` 确认 200 且内容最新 | 稳定 200 |

### 5.3 现实约束说明

- 平台二级域名对主流搜索引擎与 AI 引擎的权重、收录速度有客观上限；本方案的 GEO 目标（被 AI 直接点名）在自定义域名落地前只做「结构就绪 + 事实就绪」，效果以监控数据为准，不承诺排名结果
- 演示站 `http://8.152.97.191:9110/login` 若长期在线，建议保持稳定（它是外链与验证信号）；若下线，需同步更新官网/README/llms.txt 中的地址引用
- 所有数字事实（25+/32/18/14、机制描述、账号）以 README 为准，任何一处改动需四源同步（官网文案 / README / llms.txt / JSON-LD）

---

## 六、本轮建议落地顺序（最小可执行）

1. **先修布局与元信息**：metadata + 三套 JSON-LD + sitemap + robots + llms.txt（一次改完，一次发布）
2. 本地 `npm run build` 验证 out 产物含全部标签，重新发布
3. 提交 GSC / Bing / 百度站长验证
4. 启动 AI 引擎基线提问（记录当前 0 引用基线）
5. 进入阶段二内容扩容

> 附：本方案所有「落地文件」路径均针对当前 Next.js 16 App Router 工程；新增页面时保持现有发布协议（静态导出、base path 注入、routes.json 同步），避免回归样式 404 问题。
