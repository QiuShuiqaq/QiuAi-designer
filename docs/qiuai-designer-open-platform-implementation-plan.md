# QiuAi Designer 开放能力实施计划

状态：Draft，待审核
日期：2026-07-15
关联文档：`docs/qiuai-designer-open-platform-spec.md`

## 1. 实施目标

本计划把开放规范拆成可执行任务。当前优先级不是一次性做完整企业级设计 Agent，而是先把现有 QiuAi Designer 和 QiuAi Platform 的 AI 链路稳定下来，再逐步做成设计师真正可用的 Agent 工作流。

第一阶段目标：

- 修复当前 AI 链路基础问题。
- 保证授权、算力、AI Job、Patch、候选结果稳定可用。
- 明确 `selected-layer image-edit` 为正式能力，不再只是临时兼容。
- 不影响 QiuAi-ECMS 当前生产功能，特别是不影响 `nano-banana-fast`。

第二阶段目标：

- 把 AI 助手做成轻量聊天式 Agent。
- 保留右键图层快捷操作。
- 支持针对单个图层精准修改和候选版本选择。

第三阶段目标：

- 支持最小版“生成可编辑海报初稿”。
- 支持素材沉淀和透明底后处理的接口预留。
- 为企业批量生产预留协议，但不在当前阶段强行实现完整批量系统。

## 2. 实施原则

- 每次只做一个可验证的垂直切片。
- 优先改协议边界和稳定性，不优先堆 UI 功能。
- 客户端和服务端类型字段必须保持一致。
- 新字段优先做可选字段，避免破坏现有客户端。
- QiuAi-ECMS 和 QiuAi Designer 的模型、套餐、计费、数据必须隔离。
- 所有中文文件必须确认 UTF-8，禁止继续引入乱码。
- 如果涉及数据库 schema、计费规则、支付流程，必须先单独确认。

## 3. 依赖关系

实施依赖顺序：

```text
产品隔离与授权状态
  -> Designer AI capabilities
  -> AI Job 请求/响应类型
  -> Generation 任务映射
  -> Patch 应用
  -> AI 助手 UI
  -> Agent Session
  -> 可编辑整稿生成
  -> 素材库和批量生产
```

不能跳过的原因：

- 如果 capabilities 不准确，客户端会暴露不能用的模式。
- 如果 Job 协议不稳定，Agent 和批量生产都会返工。
- 如果 Patch 不稳定，AI 生成结果无法安全回写画布。
- 如果产品隔离不稳定，会再次出现 QiuAi-ECMS 和 Designer 数据混用问题。

## 4. Phase 1：稳定当前 Designer AI 基础链路

### Task 1：修复 AI 相关中文乱码

**说明：** 当前 Designer 和 Platform 的 AI 相关文件里存在明显乱码，先修复文案，避免用户界面和服务端默认 slotName 继续污染。

**验收标准：**

- [ ] `designerAiContent.vue` 的用户可见文案全部是正常中文。
- [ ] `context-menu-plugin.ts` 的右键菜单文案全部是正常中文。
- [ ] `template-slots.ts` 的默认 slotName 全部是正常中文。
- [ ] Platform `designer-ai/service.ts` 中默认 prompt、slotName、candidate label 全部是正常中文。
- [ ] 不改变业务逻辑。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx eslint src/components/designerAiContent.vue src/modules/designer-ai/context-menu-plugin.ts src/modules/designer-ai/template-slots.ts
npx pnpm build

cd F:\Workspace_VS\QiuAi\qiuai-platform
npm run test -- designer-ai
npm run build
```

**可能改动文件：**

- `src/components/designerAiContent.vue`
- `src/modules/designer-ai/context-menu-plugin.ts`
- `src/modules/designer-ai/template-slots.ts`
- `qiuai-platform/src/modules/designer-ai/service.ts`
- `qiuai-platform/test/designer-ai/service.test.ts`

**依赖：** 无
**范围：** Medium

### Task 2：修正 capabilities，明确 image-generate 和 image-edit 边界

**说明：** 当前 capabilities 只有 `imageTargets`，但服务端实际已经支持 `image-edit` 的 `background`、`product-image`、`decoration`。需要把能力表达清楚，避免客户端误判。

**验收标准：**

- [ ] `GET /api/products/qiuai-designer/ai/capabilities` 返回 `imageEditTargets`。
- [ ] `imageTargets` 仍只表示纯生图目标，保持 `["background"]`。
- [ ] `imageEditTargets` 返回 `["background", "product-image", "decoration"]`。
- [ ] 旧客户端不依赖 `imageEditTargets` 时仍可运行。
- [ ] Designer 客户端优先读取 `imageEditTargets`，缺省时降级到旧逻辑。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\qiuai-platform
npm run test -- designer-ai
npm run build

cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx pnpm build
```

**可能改动文件：**

- `qiuai-platform/src/modules/designer-ai/types.ts`
- `qiuai-platform/src/modules/designer-ai/service.ts`
- `qiuai-platform/test/designer-ai/service.test.ts`
- `QiuAi-designer/src/platform/types.ts`
- `QiuAi-designer/src/components/designerAiContent.vue`

**依赖：** Task 1
**范围：** Medium

### Task 3：把 selected-layer image-edit 固化为正式请求协议

**说明：** 当前客户端通过把选中图片临时包装成 `ai-slot` 来兼容服务端。这个方式可用，但协议不清晰。建议新增可选 `targetSource` 或 `sourceLayer` 字段，让“选中图层直改”成为正式能力。

**验收标准：**

- [ ] 客户端提交图片编辑任务时明确标记来源为 `selected-layer`。
- [ ] 服务端仍兼容旧的 `ai-slot` 方式。
- [ ] 服务端对 `selected-layer` 的图片源做校验：必须有 `src`、`originSrc` 或内联 data URL。
- [ ] 没有源图时返回 `DESIGNER_AI_IMAGE_SOURCE_REQUIRED`。
- [ ] 不影响模板预置 `ai-slot` 的旧流程。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\qiuai-platform
npm run test -- designer-ai
npm run build

cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx pnpm build
```

**可能改动文件：**

- `QiuAi-designer/src/platform/types.ts`
- `QiuAi-designer/src/components/designerAiContent.vue`
- `qiuai-platform/src/modules/designer-ai/schema.ts`
- `qiuai-platform/src/modules/designer-ai/types.ts`
- `qiuai-platform/src/modules/designer-ai/service.ts`
- `qiuai-platform/test/designer-ai/service.test.ts`

**依赖：** Task 2
**范围：** Medium

### Task 4：透传 Designer AI 任务进度、轮询建议和计费摘要

**说明：** 通用 generation 已经有 `pollingAdvice` 和 `usageSummary`，Designer AI Job 当前没有完整暴露。客户端需要这些信息减少无意义轮询，并让用户知道任务状态和消耗。

**验收标准：**

- [ ] Designer AI Job 响应新增可选 `progress`。
- [ ] Designer AI Job 响应新增可选 `pollingAdvice`。
- [ ] Designer AI Job 响应新增可选 `usageSummary`。
- [ ] 客户端轮询间隔优先使用服务端建议，缺省时使用当前 1500ms。
- [ ] 旧字段不删除。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\qiuai-platform
npm run test -- designer-ai
npm run build

cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx pnpm build
```

**可能改动文件：**

- `qiuai-platform/src/modules/designer-ai/types.ts`
- `qiuai-platform/src/modules/designer-ai/service.ts`
- `QiuAi-designer/src/platform/types.ts`
- `QiuAi-designer/src/components/designerAiContent.vue`

**依赖：** Task 3
**范围：** Medium

### Task 5：增加客户端请求幂等标识

**说明：** AI 任务容易因为重复点击、网络重试导致重复任务。先加客户端 `clientRequestId`，服务端可先记录在 draftSnapshot，后续再决定是否做数据库级幂等。

**验收标准：**

- [ ] 客户端每次提交任务生成 `clientRequestId`。
- [ ] 服务端 schema 接受 `clientRequestId`。
- [ ] `clientRequestId` 写入 generation draftSnapshot。
- [ ] 不改变当前扣费逻辑。
- [ ] 文档中明确这是软幂等，数据库唯一约束另行确认。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\qiuai-platform
npm run test -- designer-ai

cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx pnpm build
```

**可能改动文件：**

- `QiuAi-designer/src/platform/types.ts`
- `QiuAi-designer/src/components/designerAiContent.vue`
- `qiuai-platform/src/modules/designer-ai/schema.ts`
- `qiuai-platform/src/modules/designer-ai/types.ts`
- `qiuai-platform/src/modules/designer-ai/service.ts`

**依赖：** Task 4
**范围：** Small

### Checkpoint 1：当前 AI 基础链路可用

**验收标准：**

- [ ] 已激活 Designer 用户刷新后仍保持授权。
- [ ] 选中图片图层可以提交 `image-edit`。
- [ ] 服务端创建任务成功。
- [ ] 任务成功后 Patch 可以应用到画布。
- [ ] 候选版本可以选择应用。
- [ ] QiuAi-ECMS 客户端原有 `nano-banana-fast` 不受影响。
- [ ] Platform `npm run build` 通过。
- [ ] Designer `npx pnpm build` 通过。

## 5. Phase 2：聊天式 AI 助手 MVP

### Task 6：简化 AI 助手 UI 为对话主线

**说明：** 当前 AI 面板信息较多，设计师会感到复杂。改成“聊天输入 + 当前目标 + 候选结果”的主线，复杂选项收起。

**验收标准：**

- [ ] AI 面板首屏以聊天输入为核心。
- [ ] 当前选中图层信息简洁展示。
- [ ] 常用功能不堆在主面板，优先通过右键菜单进入。
- [ ] 高级参数折叠，不影响普通用户。
- [ ] 未激活时提示去“我的”激活，不影响本地编辑。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx eslint src/components/designerAiContent.vue
npx pnpm build
```

**可能改动文件：**

- `src/components/designerAiContent.vue`

**依赖：** Checkpoint 1
**范围：** Medium

### Task 7：右键菜单整理为图层快捷操作

**说明：** 常用 AI 功能应放在右键菜单中，例如换背景、改材质、清理杂物、重写文案。

**验收标准：**

- [ ] 图片图层右键出现图片相关 AI 操作。
- [ ] 文字图层右键出现文案相关 AI 操作。
- [ ] 非图片非文字图层只显示“打开 AI 助手”。
- [ ] 右键操作会切换 AI 面板到当前图层模式。
- [ ] 文案无乱码。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx eslint src/modules/designer-ai/context-menu-plugin.ts src/modules/designer-ai/quick-actions.ts
npx pnpm build
```

**可能改动文件：**

- `src/modules/designer-ai/context-menu-plugin.ts`
- `src/modules/designer-ai/quick-actions.ts`
- `src/components/designerAiContent.vue`

**依赖：** Task 6
**范围：** Small

### Task 8：增加轻量 Agent Session 本地上下文

**说明：** 先不做服务端持久化 Agent Session，客户端保存当前对话上下文，提交任务时带最近用户意图和当前画布摘要。

**验收标准：**

- [ ] AI 面板可显示最近对话记录。
- [ ] 每次提交任务记录用户输入和任务结果。
- [ ] 刷新页面前的本次会话可保留在组件状态。
- [ ] 不新增数据库表。
- [ ] 服务端仍按当前 Job 接口处理。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx pnpm build
```

**可能改动文件：**

- `src/components/designerAiContent.vue`
- 可选：`src/modules/designer-ai/agent-session.ts`

**依赖：** Task 6
**范围：** Medium

### Task 9：候选版本交互优化

**说明：** 当前候选版本可用，但需要更符合设计师工作流：预览、应用、继续追问、保留当前版本。

**验收标准：**

- [ ] 候选卡片能清楚显示版本。
- [ ] 已应用版本有明确状态。
- [ ] 应用候选后不清空对话。
- [ ] 用户可继续输入“再换一个方向”。
- [ ] Patch 应用失败时展示失败项，不影响成功项。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx pnpm build
```

**可能改动文件：**

- `src/components/designerAiContent.vue`
- `src/modules/designer-ai/patch.ts`

**依赖：** Task 8
**范围：** Medium

### Checkpoint 2：AI 助手可被设计师正常使用

**验收标准：**

- [ ] 用户可以直接和 AI 对话。
- [ ] 用户可以右键图层调用 AI。
- [ ] 用户可以只改当前图片图层。
- [ ] 用户可以只改当前文字图层。
- [ ] 用户可以选择候选版本。
- [ ] UI 不拥挤、不乱码、不误导。

## 6. Phase 3：可编辑整稿生成 MVP

### Task 10：定义最小可编辑海报生成输入

**说明：** 先只支持 `poster` 场景，用户输入主题、商品信息、风格，服务端返回可编辑图层 Patch。

**验收标准：**

- [ ] 请求中明确 `scene = poster`。
- [ ] 支持用户 prompt。
- [ ] 支持画布宽高。
- [ ] 支持可选商品图 URL。
- [ ] 不引入详情页、价格表等复杂场景。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\qiuai-platform
npm run test -- designer-ai
```

**可能改动文件：**

- `qiuai-platform/src/modules/designer-ai/schema.ts`
- `qiuai-platform/src/modules/designer-ai/types.ts`
- `qiuai-platform/src/modules/designer-ai/service.ts`

**依赖：** Checkpoint 2
**范围：** Medium

### Task 11：服务端返回基础多图层 Patch

**说明：** MVP 不要求复杂排版 Agent，先返回基础图层：背景图、标题、副标题、CTA 或装饰元素。

**验收标准：**

- [ ] 服务端可以生成 `add-object` Patch。
- [ ] 新增文字图层可编辑。
- [ ] 新增图片图层可替换。
- [ ] 背景作为独立图片图层。
- [ ] 不把整张海报烘焙成单张图。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\qiuai-platform
npm run test -- designer-ai

cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx pnpm build
```

**可能改动文件：**

- `qiuai-platform/src/modules/designer-ai/service.ts`
- `qiuai-platform/test/designer-ai/service.test.ts`
- `QiuAi-designer/src/modules/designer-ai/patch.ts`

**依赖：** Task 10
**范围：** Medium

### Task 12：客户端支持应用整稿 Patch

**说明：** 当前 Patch 应用主要用于替换现有图层。整稿生成需要能安全新增多个对象。

**验收标准：**

- [ ] `add-object` 支持新增基础 Fabric 对象。
- [ ] 新增对象有稳定 id。
- [ ] 应用整稿 Patch 后画布可撤销。
- [ ] Patch 部分失败时提示，不影响已添加图层。
- [ ] 不删除用户已有内容，除非用户明确选择新建画布。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx pnpm build
```

**可能改动文件：**

- `src/modules/designer-ai/patch.ts`
- `src/components/designerAiContent.vue`

**依赖：** Task 11
**范围：** Medium

### Checkpoint 3：可编辑海报初稿可用

**验收标准：**

- [ ] 用户输入一句话能生成基础海报。
- [ ] 生成结果是多个可编辑图层。
- [ ] 文字可直接编辑。
- [ ] 图片可移动和替换。
- [ ] 背景可单独重新生成。
- [ ] 不影响已有 QiuAi-ECMS。

## 7. Phase 4：素材与透明底后处理预留

### Task 13：定义 AI 资产返回结构

**说明：** 当前直接返回 data URL，后续对大图、批量、素材复用不友好。先定义资产元数据结构，但不强制替换所有返回。

**验收标准：**

- [ ] Patch meta 中包含 `artifactId`、`providerModel`、`assetType`。
- [ ] 可选包含 `downloadUrl`、`previewUrl`。
- [ ] 客户端不依赖 data URL 才能工作。
- [ ] 旧 data URL 仍兼容。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\qiuai-platform
npm run test -- designer-ai
```

**可能改动文件：**

- `qiuai-platform/src/modules/designer-ai/service.ts`
- `QiuAi-designer/src/platform/types.ts`

**依赖：** Checkpoint 3
**范围：** Small

### Task 14：预留透明底和抠图输出策略

**说明：** 不假设 `nano-banana-2` 稳定返回透明底。先在协议层支持 `transparentBackground` 和 `cutoutAfterGenerate`。

**验收标准：**

- [ ] Job 请求支持可选 `outputPolicy.transparentBackground`。
- [ ] Job 请求支持可选 `outputPolicy.cutoutAfterGenerate`。
- [ ] 服务端可以记录策略，但未接抠图 Provider 时不虚假承诺。
- [ ] capabilities 明确 `supportsTransparentOutput` 和 `supportsCutoutPipeline`。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\qiuai-platform
npm run test -- designer-ai
npm run build
```

**可能改动文件：**

- `qiuai-platform/src/modules/designer-ai/schema.ts`
- `qiuai-platform/src/modules/designer-ai/types.ts`
- `qiuai-platform/src/modules/designer-ai/service.ts`
- `QiuAi-designer/src/platform/types.ts`

**依赖：** Task 13
**范围：** Small

## 8. Phase 5：企业批量生产协议预研

### Task 15：补充批量生产设计文档

**说明：** 先只写协议和任务模型，不实现完整批量 UI。

**验收标准：**

- [ ] 定义 BatchJob、InputRow、VariableMapping、OutputPolicy。
- [ ] 明确与 generation Job 的关系。
- [ ] 明确成本预估、部分成功、失败重试。
- [ ] 明确暂不改数据库还是需要后续 schema。

**验证：**

```powershell
cd F:\Workspace_VS\QiuAi\QiuAi-designer
git diff -- docs
```

**可能改动文件：**

- `docs/qiuai-designer-batch-production-spec.md`

**依赖：** Checkpoint 3
**范围：** Small

## 9. 风险与处理

| 风险 | 影响 | 处理方式 |
| --- | --- | --- |
| Designer 和 Platform 类型不一致 | 任务创建失败或运行时异常 | 每次协议字段变更同步客户端和服务端类型 |
| 中文再次乱码 | UI 不可用、文档不可读 | 所有中文文件用 UTF-8 读取检查 |
| selected-layer 协议过早复杂化 | 开发慢、容易返工 | 先正式标记来源，复杂字段延后 |
| data URL 大图导致卡顿 | 客户端性能差 | 先兼容，后续切换 asset URL |
| Agent Session 做太重 | 影响当前可用性 | MVP 先客户端本地上下文，不建表 |
| 误伤 QiuAi-ECMS | 生产风险高 | Designer 模型、接口、测试全部按 productKey 隔离 |
| 透明底能力不稳定 | 设计师体验差 | 不承诺模型透明底，走后处理策略 |
| 批量生产提前实现 | 范围过大 | 先写协议，不进入本轮实现 |

## 10. 建议立即执行顺序

如果你确认继续实现，建议按下面顺序推进：

1. Task 1：修复乱码。
2. Task 2：修正 capabilities。
3. Task 3：固化 selected-layer image-edit。
4. Task 4：透传任务进度、轮询建议、计费摘要。
5. Task 5：增加 clientRequestId。
6. 做 Checkpoint 1，本地和服务端各跑一次完整链路。
7. 再进入 AI 助手 UI 和 Agent MVP。

## 10.1 Phase 1 当前执行状态

状态：已完成 Task 1 到 Task 5 的代码实现和自动化验证。

已完成内容：

- Task 1：AI 相关中文乱码已扫描，计划内 AI 文件未再发现典型乱码；补齐了 `template-slots.ts` 的格式问题。
- Task 2：`capabilities` 已区分 `imageTargets` 和 `imageEditTargets`，服务端返回 `imageEditTargets: ["background", "product-image", "decoration"]`，客户端兼容读取。
- Task 3：`selected-layer image-edit` 已成为正式请求字段，客户端选中图片直改会提交 `targetSource: "selected-layer"`。
- Task 4：Designer AI Job 已透传 `progress`、`pollingAdvice`、`usageSummary`，客户端轮询优先使用服务端建议间隔。
- Task 5：客户端提交任务会生成 `clientRequestId`，服务端接收并写入 `draftSnapshot`，当前为软幂等，不改数据库唯一约束。

已补充验证：

```powershell
cd F:\Workspace_VS\QiuAi\qiuai-platform
node --test --import tsx test/designer-ai/mock-flow.test.ts test/designer-ai/service.test.ts

cd F:\Workspace_VS\QiuAi\QiuAi-designer
npx eslint src/components/designerAiContent.vue src/platform/types.ts src/modules/designer-ai/context-menu-plugin.ts src/modules/designer-ai/template-slots.ts src/modules/designer-ai/quick-actions.ts
npx pnpm build

cd F:\Workspace_VS\QiuAi\qiuai-platform
npm run build
```

该测试覆盖：

- capabilities 字段稳定。
- `selected-layer image-edit` schema 可解析。
- mock 模式下可创建 Designer AI Job。
- mock 模式下可返回 `replace-image-src` Patch。
- `clientRequestId` 可被保留。
- `selected-layer image-edit` 缺少源图时会返回 `DESIGNER_AI_IMAGE_SOURCE_REQUIRED`。
- Designer AI Job 响应包含稳定的 `progress`、`pollingAdvice`、`usageSummary` 形状。
- Designer 客户端生产构建通过。
- Platform 服务端生产构建通过。

仍需人工或服务端环境验证：

- 2026-07-15 线上只读检查 `GET https://admin.qiuaihub.com/api/products/qiuai-designer/ai/capabilities` 仍未返回 `imageEditTargets`，说明当前本地 Phase 1 改动尚未部署到生产服务端，或生产服务端版本不是本地这版。
- 使用真实线上或测试 session token 创建非 mock Designer AI Job。
- 确认真实 Provider 返回后，客户端可应用 Patch 到画布。
- 确认用户刷新后授权状态仍保持。
- 确认 QiuAi-ECMS 的 `nano-banana-fast` 生产链路未受影响。

## 10.2 Phase 1 当前验收审计

审计时间：2026-07-15
服务端提交：`86ada0b feat: stabilize designer ai phase one`

已证明完成：

- Task 1：计划内 AI 相关源码和测试未检出典型中文乱码；Designer 目标文件 eslint 通过。
- Task 2：服务端代码和测试已证明 `imageTargets = ["background"]`，`imageEditTargets = ["background", "product-image", "decoration"]`；客户端已按 `imageEditTargets` 优先、缺省降级旧逻辑读取。
- Task 3：客户端提交当前图片直改时带 `targetSource: "selected-layer"`；服务端 schema 接受该字段；缺源图会返回 `DESIGNER_AI_IMAGE_SOURCE_REQUIRED`；默认 `targetSource` 仍为 `ai-slot`，兼容旧模板流程。
- Task 4：服务端 Designer AI Job 类型和映射包含 `progress`、`pollingAdvice`、`usageSummary`；客户端轮询优先使用 `pollingAdvice.recommendedIntervalMs`，最低保留 1500ms。
- Task 5：客户端提交任务会生成 `clientRequestId`；服务端 schema 接受该字段并写入 `draftSnapshot`；当前仍是软幂等，不改数据库唯一约束和扣费逻辑。
- 本地验证：Platform Designer AI 目标测试 6 项通过；Platform `npm run build` 通过；Designer AI 目标 eslint 通过；Designer `npx pnpm build` 通过。

尚未证明完成：

- 生产服务端尚未返回 `imageEditTargets`，说明生产环境未部署到 `86ada0b` 或 PM2 仍在运行旧构建。
- 真实非 mock Designer AI Job 创建、Provider 返回、Patch 回写画布仍需部署后用真实 session token 验证。
- QiuAi-ECMS `nano-banana-fast` 未受影响仍需部署后做一次只读配置检查或最小真实任务验证。

部署后第一组验收命令：

```bash
cd /opt/qiuai-platform
git rev-parse --short HEAD
curl -sS https://admin.qiuaihub.com/api/products/qiuai-designer/ai/capabilities
pm2 logs qiu-commerce-license-platform --lines 120 --nostream
```

验收通过条件：

- `git rev-parse --short HEAD` 等于或晚于 `86ada0b`。
- capabilities 返回包含 `imageEditTargets:["background","product-image","decoration"]`。
- PM2 日志没有 Designer AI route 启动或运行期异常。

## 11. 本轮不建议做的内容

本轮不建议立即做：

- 数据库大改。
- 支付和计费规则重构。
- 企业团队空间。
- 完整云端设计稿项目库。
- 完整批量生产 UI。
- 接入新模型 Provider。
- 替换 QiuAi-ECMS 当前生产模型。

这些都可以做，但应该在基础链路稳定后单独立项。

## 12. 审核点

进入代码实现前，建议确认以下 4 个点：

1. Phase 1 是否按本文顺序直接开始实现。
2. Agent Session MVP 是否先只做客户端本地上下文，不建数据库表。
3. 透明底是否先只做协议预留，不接真实抠图服务。
4. 批量生产是否先只补文档，不进入本轮开发。
