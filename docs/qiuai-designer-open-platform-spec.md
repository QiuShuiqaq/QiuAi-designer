# QiuAi Designer 与 QiuAi Platform 开放对接规范草案

状态：Draft，待审核
日期：2026-07-15
范围：`qiuai-designer` 客户端、`qiuai-platform` 服务端、Designer AI 生成链路、授权与算力链路
目标读者：产品负责人、客户端开发、服务端开发、后续接入新产品或插件的开发者

## 1. 文档目标

这份文档用于定义 QiuAi Designer 如何通过 QiuAi Platform 获得授权、算力、AI 生成和结果回写能力，并把这些能力整理成后续可扩展、可维护、可审计的开放协议。

当前目标不是直接写代码，而是先明确以下问题：

- QiuAi Designer 当前已经接入了哪些 Platform 能力。
- 设计师最终需要的 AI 工作流应该如何抽象。
- Designer 的画布 JSON、图层、AI 任务、候选结果、补丁回写应该如何稳定约定。
- 服务端如何保证产品隔离、授权隔离、计费隔离和任务隔离。
- 后续新增产品、批量化生产、企业级稳定性应该预留哪些接口边界。

本文把内容分成两类：

- 当前事实：已经在当前代码中存在或基本存在的能力。
- v1 建议：建议后续按此协议稳定下来的开放能力。

## 2. 核心结论

QiuAi Designer 的最终形态不应该只是“调用模型生成一张图”，而应该是一个以设计稿为中心的 AI Agent 工作台：

- 用户用自然语言和 Agent 对话。
- Agent 生成可编辑的设计稿，例如海报、价格表、详情页、活动图、商品主图等。
- 设计稿由图层组成，文字图层可编辑，图片图层可移动、裁切、替换，背景和商品图可单独 AI 重生成。
- 对某个图层不满意时，可以只对该图层做精准生成，并返回多个候选版本。
- 用户选择候选版本后，客户端通过 Patch 应用到画布，不破坏其它图层。
- 最终结果可以导出，也可以沉淀为企业素材或模板。

因此开放协议的核心不是“图片生成接口”，而是：

- 设计文档协议：定义画布、页面、图层和 AI 元数据。
- AI 任务协议：定义目标图层、任务模式、上下文、候选数量和任务生命周期。
- Patch 协议：定义服务端如何把 AI 结果变成客户端可执行的图层修改。
- 产品隔离协议：定义不同产品的数据、授权、套餐和算力不能混用。
- 批量生产协议：定义中型企业需要的高产能、多任务、可追踪能力。

## 3. 当前系统现状

### 3.1 QiuAi Designer 客户端

当前 Designer 是 Vue 3、Vite、Fabric.js 技术栈，核心 AI 相关文件如下：

- `src/platform/config.ts`：读取 `APP_PLATFORM_PRODUCT_KEY` 和 `APP_PLATFORM_API_BASE_URL`。
- `src/platform/http.ts`：封装 axios，请求自动带 `Authorization: Bearer <sessionToken>`。
- `src/platform/storage.ts`：保存 session token、设备指纹、激活资料。
- `src/platform/session.ts`：授权状态查询、授权激活。
- `src/platform/wallet.ts`：算力余额查询。
- `src/platform/designer-ai.ts`：Designer AI 相关 HTTP API。
- `src/platform/types.ts`：Platform、授权、套餐、AI Job、AI Patch 等类型定义。
- `src/components/designerAiContent.vue`：AI 助手面板，负责选层、构建任务、轮询任务和应用结果。
- `src/modules/designer-ai/patch.ts`：执行服务端返回的 Patch。
- `src/modules/designer-ai/template-slots.ts`：从模板 JSON 中解析 AI 槽位。
- `src/modules/designer-ai/context-menu-plugin.ts`：右键菜单 AI 快捷操作。
- `src/modules/designer-ai/quick-actions.ts`：AI 面板和右键菜单之间的事件通信。

当前客户端已经具备的能力：

- 授权激活后保存 session token。
- 根据设备指纹查询授权状态。
- 查询算力余额。
- 查询 Designer AI capabilities。
- 解析模板中的 `ai-slot`。
- 选中图片图层后，不依赖模板预置 `ai-slot`，也可以构建 `image-edit` 请求。
- 提交 AI Job。
- 轮询 AI Job。
- 支持多个候选版本。
- 把服务端返回的 Patch 应用到 Fabric 画布。
- 右键图层可触发 AI 快捷操作。

当前明显不足：

- 部分中文文案已经出现乱码，需要统一修复编码和文案来源。
- AI 助手仍偏“功能面板”，还不是完整聊天式 Agent。
- 当前直接图片编辑是客户端临时把选中图片包装成 `ai-slot`，协议层还不够正式。
- 当前返回结果主要是 Patch，不包含完整 Agent 对话上下文。
- 当前 Patch 能力可用，但还不够覆盖复杂排版、裁切、透明背景、组合图层、表格等专业设计场景。
- 当前没有企业级批量生成协议。
- 当前没有服务端设计稿云端项目、版本、审计和团队协作协议。

### 3.2 QiuAi Platform 服务端

当前 Platform 是 Next.js、Prisma、PostgreSQL 技术栈，Designer 相关服务端文件如下：

- `src/app/api/products/qiuai-designer/activation/status/route.ts`
- `src/app/api/products/qiuai-designer/activation/activate/route.ts`
- `src/app/api/products/qiuai-designer/packages/route.ts`
- `src/app/api/products/qiuai-designer/license/orders/route.ts`
- `src/app/api/products/qiuai-designer/assets/summary/route.ts`
- `src/app/api/products/qiuai-designer/assets/subscriptions/route.ts`
- `src/app/api/products/qiuai-designer/assets/subscription-orders/route.ts`
- `src/app/api/products/qiuai-designer/assets/topup-orders/route.ts`
- `src/app/api/products/qiuai-designer/ai/capabilities/route.ts`
- `src/app/api/products/qiuai-designer/ai/templates/slots/parse/route.ts`
- `src/app/api/products/qiuai-designer/ai/jobs/route.ts`
- `src/app/api/products/qiuai-designer/ai/jobs/[jobId]/route.ts`
- `src/app/api/products/qiuai-designer/ai/jobs/[jobId]/cancel/route.ts`
- `src/modules/designer-ai/schema.ts`
- `src/modules/designer-ai/types.ts`
- `src/modules/designer-ai/service.ts`
- `test/designer-ai/service.test.ts`

当前服务端已经具备的能力：

- QiuAi Designer 产品通过 `productKey = "qiuai-designer"` 独立接入。
- 授权、套餐、算力、订单接口按产品维度查询。
- Designer AI 的输入使用 Zod 校验。
- Designer AI 创建任务时，会转成通用 `generation` 任务。
- 图片任务走 `GenerationProviderType.GRSAI`。
- Designer 默认图片模型为 `nano-banana-2`，可通过 `DESIGNER_AI_IMAGE_MODEL` 环境变量覆盖。
- 文本任务走 `GenerationProviderType.DEEPSEEK`。
- 图片尺寸策略已经存在：最长边小于 1024 使用 `1K`，1024 到 2047 使用 `2K`，2048 及以上使用 `4K`。
- 服务端从生成任务 artifacts 映射回 Designer Patch。
- 支持 `succeeded`、`partial_success`、`failed`、`cancelled` 等状态。

当前服务端明显不足：

- Designer AI service 中存在中文乱码，说明源码或历史编辑链路存在编码问题。
- `layout-suggest` 仍未连接 Provider。
- Designer AI 当前创建 GenerationJob 时 `requestedConcurrency` 固定为 1，不适合后续批量化生产。
- 当前任务结果以 data URL 回传给 Designer，适合快速验证，但对大图、批量、审计和复用不够理想。
- 当前没有 Agent Session、Conversation Message、Design Project、Design Document 的服务端模型。
- 当前没有专门的 Designer 素材库、企业资产库、透明底处理、抠图管线。
- 当前错误、轮询建议、任务进度、候选版本元数据还需要进一步统一。

## 4. 产品与数据隔离原则

这是必须长期坚持的底线。

### 4.1 产品隔离

每个产品都必须有独立的产品标识：

- QiuAi-ECMS：`qiuai-ecms` 或兼容历史 `QIUAI_ECMS`
- QiuAi Designer：`qiuai-designer`
- 未来新产品：必须新增独立 `productKey`

所有客户端请求必须显式绑定产品：

```http
/api/products/{productKey}/...
```

所有服务端查询必须按产品过滤：

- 用户列表按产品关系过滤。
- 授权按产品过滤。
- 软件套餐按产品过滤。
- 算力套餐按产品过滤。
- 订单按产品过滤。
- AI Job 按产品、用户、授权过滤。
- 素材和设计稿按产品过滤。

### 4.2 禁止跨产品复用数据

禁止出现以下行为：

- QiuAi Designer 用户列表展示 QiuAi-ECMS 用户。
- QiuAi Designer 授权页面展示 QiuAi-ECMS 授权套餐。
- QiuAi-ECMS 客户端看到 QiuAi Designer 的授权购买项。
- 不同产品共用一份“默认用户详情”或“默认产品详情”数据。
- 服务端写操作不带产品上下文，导致写入全局数据。

### 4.3 推荐服务端保护方式

v1 建议服务端建立统一 Product Scoped Facade：

```ts
interface ProductScopedContext {
  productKey: string;
  productId: string;
  userId?: string;
  licenseId?: string;
  sessionToken?: string;
}
```

所有产品级接口先解析 `productKey`，再进入业务服务。业务服务不直接信任客户端传来的 `productId`。

## 5. 当前 API 清单

### 5.1 产品元信息

当前客户端调用：

```http
GET /api/platform/products/{productKey}
```

用途：

- 获取产品名称、状态、描述。
- 判断 Platform 是否识别当前产品。

建议响应：

```json
{
  "productId": "cmxxx",
  "productKey": "qiuai-designer",
  "productName": "QiuAi Designer",
  "status": "ACTIVE",
  "description": ""
}
```

### 5.2 授权状态

当前接口：

```http
GET /api/products/qiuai-designer/activation/status?deviceFingerprint={deviceFingerprint}
Authorization: Bearer {sessionToken}
```

Bearer 可选；未登录时服务端返回未激活或会话无效状态。

当前用途：

- 查询设备是否已激活。
- 查询 session 是否仍有效。
- 返回钱包摘要和当前授权套餐。

建议响应核心字段：

```json
{
  "status": "active",
  "mode": "server-license",
  "authType": "session-token",
  "canUseApp": true,
  "customerName": "客户名称",
  "userId": "user_id",
  "licenseId": "license_id",
  "deviceCode": "device_fingerprint",
  "activatedAt": "2026-07-15T00:00:00.000Z",
  "expiresAt": "2027-07-15T00:00:00.000Z",
  "sessionToken": "",
  "walletSummary": {},
  "activePackage": {
    "id": "package_id",
    "code": "QIUAI_DESIGNER_STANDARD_ANNUAL",
    "name": "标准版年卡",
    "capabilityConfig": {}
  },
  "message": "",
  "nextAction": "none"
}
```

### 5.3 授权激活

当前接口：

```http
POST /api/products/qiuai-designer/activation/activate
Content-Type: application/json
```

请求：

```json
{
  "customerName": "客户名称",
  "contact": "手机号或联系方式",
  "inviteCode": "",
  "deviceName": "QiuAi Designer / Windows",
  "deviceFingerprint": "device_fingerprint"
}
```

要求：

- 激活成功必须返回 `sessionToken`。
- 客户端必须持久化 `sessionToken`。
- 刷新页面或重启客户端后，授权状态必须保持。

### 5.4 套餐与订单

当前接口：

```http
GET  /api/products/qiuai-designer/packages
POST /api/products/qiuai-designer/license/orders
GET  /api/products/qiuai-designer/license/orders/{id}
GET  /api/products/qiuai-designer/assets/subscriptions
POST /api/products/qiuai-designer/assets/subscription-orders
GET  /api/products/qiuai-designer/assets/subscription-orders/{id}
POST /api/products/qiuai-designer/assets/topup-orders
GET  /api/products/qiuai-designer/assets/topup-orders/{id}
GET  /api/products/qiuai-designer/assets/summary
```

要求：

- 所有套餐必须来自 `qiuai-designer` 产品。
- 所有订单必须绑定 `qiuai-designer` 产品。
- 所有算力余额必须按产品授权上下文计算。
- 客户端只展示当前产品可购买项。

### 5.5 AI Capabilities

当前接口：

```http
GET /api/products/qiuai-designer/ai/capabilities
```

当前响应字段：

```json
{
  "imageTargets": ["background"],
  "textTargets": ["title", "subtitle", "body-text", "cta", "price"],
  "maxTargetsPerJob": 5,
  "supportedLanguages": ["zh-CN", "en-US"],
  "supportedImageSizes": ["1K", "2K", "4K"],
  "defaultImageModel": "nano-banana-2",
  "defaultImageSize": "2K",
  "patchVersion": 1,
  "mockEnabled": false
}
```

v1 建议新增可选字段：

```json
{
  "imageEditTargets": ["background", "product-image", "decoration"],
  "supportedScenes": ["poster", "price-list", "detail-page", "banner"],
  "supportedPatchActions": [
    "replace-image-src",
    "update-text",
    "update-style",
    "add-object",
    "remove-object"
  ],
  "supportsCandidates": true,
  "maxCandidateCount": 3,
  "supportsTransparentOutput": false,
  "supportsCutoutPipeline": false,
  "recommendedPollingIntervalMs": 3000
}
```

说明：

- `imageTargets` 当前只表示“纯生图目标”，所以只有 `background`。
- `imageEditTargets` 应该单独表达“可图片编辑目标”，包括 `background`、`product-image`、`decoration`。
- `layout-suggest` 当前不应暴露为已连接能力，除非服务端真正有 Provider。

### 5.6 解析模板 AI 槽位

当前接口：

```http
POST /api/products/qiuai-designer/ai/templates/slots/parse
```

请求：

```json
{
  "templateId": "template_001",
  "templateSnapshot": {
    "meta": {
      "templateVersion": 1,
      "scene": "poster"
    },
    "objects": []
  }
}
```

响应：

```json
{
  "templateId": "template_001",
  "templateVersion": 1,
  "scene": "poster",
  "slots": [
    {
      "id": "layer_id",
      "role": "product-image",
      "slotName": "商品图",
      "objectType": "image",
      "aiEnabled": true,
      "aiMode": "image-edit",
      "editableAfterGenerate": true,
      "regenerateScope": "self",
      "constraints": {}
    }
  ]
}
```

当前解析规则：

- 只解析 `extensionType = "ai-slot"` 的对象。
- `extension.role` 必须是允许的 role。
- `extension.aiMode` 缺省时按 role 推断。

v1 建议：

- 继续支持 `ai-slot`，用于模板作者显式声明 AI 槽位。
- 同时支持客户端提交 `selected-layer` 目标，不要求默认模板必须预置 `ai-slot`。
- 服务端不应该依赖中文 `slotName` 判断业务，必须依赖 ASCII role 枚举。

## 6. 设计文档 JSON 协议 v1

### 6.1 设计原则

Designer 的 JSON 协议必须兼容 Fabric.js，但不能完全等同于 Fabric.js 内部格式。

原因：

- Fabric JSON 是渲染层格式，不是稳定业务协议。
- AI Agent 需要理解图层语义，例如背景、商品图、标题、价格、CTA。
- 后续可能替换渲染引擎，业务协议不应被 Fabric 锁死。

### 6.2 推荐外层结构

v1 建议设计文档使用以下结构：

```json
{
  "schemaVersion": "designer-document-v1",
  "documentId": "doc_001",
  "productKey": "qiuai-designer",
  "templateId": "template_001",
  "templateVersion": 1,
  "scene": "poster",
  "language": "zh-CN",
  "canvas": {
    "width": 1242,
    "height": 1660,
    "background": "#ffffff"
  },
  "pages": [
    {
      "pageId": "page_001",
      "name": "主画布",
      "objects": []
    }
  ],
  "meta": {
    "createdAt": "2026-07-15T00:00:00.000Z",
    "updatedAt": "2026-07-15T00:00:00.000Z",
    "source": "qiuai-designer"
  }
}
```

### 6.3 当前兼容策略

当前代码已经使用：

```json
{
  "meta": {
    "templateVersion": 1,
    "scene": "poster"
  },
  "objects": []
}
```

所以 v1 不要求一次性替换现有结构，可以采用兼容策略：

- 当前接口继续接受 `{ meta, objects }`。
- 新接口可以接受完整 `designer-document-v1`。
- 服务端内部统一转换成 `DesignerAiTemplateSnapshotRecord`。

### 6.4 图层 AI 元数据

当前 `ai-slot` 结构应继续保留：

```json
{
  "id": "layer_product_001",
  "type": "image",
  "extensionType": "ai-slot",
  "extension": {
    "role": "product-image",
    "slotName": "商品图",
    "aiEnabled": true,
    "aiMode": "image-edit",
    "editableAfterGenerate": true,
    "regenerateScope": "self",
    "constraints": {
      "maxChars": 20,
      "keepAspectRatio": true
    }
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `role` | string | 图层语义角色，必须是稳定枚举 |
| `slotName` | string | 展示名称，只用于 UI，不参与业务判断 |
| `aiEnabled` | boolean | 是否允许 AI 操作 |
| `aiMode` | string | 默认 AI 操作模式 |
| `editableAfterGenerate` | boolean | 生成后是否可继续编辑 |
| `regenerateScope` | string | 重新生成影响范围 |
| `constraints` | object | 字数、尺寸、风格、透明底等限制 |

### 6.5 图层角色枚举

当前已支持：

| role | 说明 | 当前推荐 mode |
| --- | --- | --- |
| `background` | 背景 | `image-generate` 或 `image-edit` |
| `product-image` | 商品图、主体图 | `image-edit` |
| `decoration` | 装饰元素 | `image-edit` |
| `title` | 主标题 | `text-generate` |
| `subtitle` | 副标题 | `text-generate` |
| `body-text` | 正文说明 | `text-generate` |
| `cta` | 按钮文案 | `text-generate` |
| `price` | 价格信息 | `text-generate` |
| `logo` | 品牌标识 | 暂不建议 AI 生成 |

v1 未来可新增，但必须向后兼容：

- `table`：价格表、参数表。
- `badge`：角标、优惠标。
- `shape`：基础形状。
- `mask`：蒙版。
- `group`：组合容器。
- `layout-guide`：排版参考线。

## 7. AI Job 协议 v1

### 7.1 当前创建任务接口

```http
POST /api/products/qiuai-designer/ai/jobs
Authorization: Bearer {sessionToken}
Content-Type: application/json
```

当前请求：

```json
{
  "templateId": "direct-image-edit",
  "language": "zh-CN",
  "userPrompt": "换背景，保持主体不变",
  "actionKey": "image-scene",
  "actionCategory": "edit",
  "preserveLayout": true,
  "candidateCount": 3,
  "targets": [
    {
      "slotId": "layer_product_001",
      "role": "product-image",
      "mode": "image-edit"
    }
  ],
  "canvas": {
    "width": 1114,
    "height": 1229
  },
  "templateSnapshot": {
    "meta": {
      "templateVersion": 1,
      "scene": "poster"
    },
    "objects": []
  }
}
```

当前限制：

- `targets` 最少 1 个，最多 5 个。
- `candidateCount` 最少 1，最多 3。
- `image-generate` 当前只允许 `background`。
- `image-edit` 当前允许 `background`、`product-image`、`decoration`。
- `text-generate` 当前允许 `title`、`subtitle`、`body-text`、`cta`、`price`。
- `layout-suggest` 当前未接 Provider，不应作为可用功能暴露。

### 7.2 建议新增字段

v1 建议在不破坏当前字段的前提下增加：

```json
{
  "clientRequestId": "uuid-from-client",
  "agentSessionId": "agent_session_001",
  "source": "ai-panel",
  "outputPolicy": {
    "returnMode": "patch",
    "assetPersistence": "temporary",
    "transparentBackground": "prefer",
    "cutoutAfterGenerate": false
  },
  "qualityPolicy": {
    "imageSize": "2K",
    "preserveIdentity": true,
    "preserveLayout": true,
    "maxWaitSeconds": 300
  }
}
```

说明：

- `clientRequestId`：用于幂等，防止重复点击导致重复扣费或重复任务。
- `agentSessionId`：把一次对话里的多次修改串起来。
- `source`：区分 AI 面板、右键菜单、批量任务、模板生成。
- `outputPolicy`：控制返回 Patch、资产 URL、临时 data URL 或云端素材。
- `qualityPolicy`：控制图片尺寸、透明底、保结构、超时等策略。

### 7.3 任务状态

当前状态：

| status | 说明 |
| --- | --- |
| `queued` | 已入队，等待执行 |
| `running` | 执行中 |
| `succeeded` | 全部成功 |
| `partial_success` | 部分成功，已有可用结果 |
| `failed` | 全部失败 |
| `cancelled` | 已取消 |

v1 要求：

- 只要有可用结果，就不应让用户空等。
- `partial_success` 必须返回可应用 Patch 或候选结果。
- 客户端应允许用户先应用已有结果。
- 失败项应该展示具体失败原因，不影响成功项使用。

### 7.4 查询任务

当前接口：

```http
GET /api/products/qiuai-designer/ai/jobs/{jobId}
Authorization: Bearer {sessionToken}
```

当前响应：

```json
{
  "jobId": "job_id",
  "productKey": "qiuai-designer",
  "templateId": "direct-image-edit",
  "language": "zh-CN",
  "userPrompt": "换背景",
  "status": "succeeded",
  "createdAt": "2026-07-15T00:00:00.000Z",
  "updatedAt": "2026-07-15T00:00:10.000Z",
  "targets": [],
  "queuePosition": 0,
  "result": {
    "patchVersion": 1,
    "actions": []
  },
  "error": null,
  "metadata": {
    "scene": "poster",
    "templateVersion": 1,
    "mock": false,
    "actionKey": "image-scene",
    "actionCategory": "edit",
    "preserveLayout": true,
    "candidateCount": 1,
    "candidates": []
  }
}
```

v1 建议新增：

```json
{
  "progress": {
    "total": 3,
    "succeeded": 2,
    "failed": 1,
    "running": 0
  },
  "pollingAdvice": {
    "recommendedIntervalMs": 3000,
    "minIntervalMs": 1500,
    "reason": "RUNNING_IMAGE"
  },
  "usageSummary": {
    "billed": true,
    "totalAmountCny": 0.54,
    "lines": []
  }
}
```

说明：

- 当前通用 generation service 已经有 `pollingAdvice` 和 `usageSummary`，但 Designer AI Job 没有完整透传。
- v1 建议透传必要信息，方便客户端减少无意义轮询，并让企业用户看到任务成本。

### 7.5 取消任务

当前接口：

```http
POST /api/products/qiuai-designer/ai/jobs/{jobId}/cancel
Authorization: Bearer {sessionToken}
```

响应：

```json
{
  "jobId": "job_id",
  "status": "cancelled"
}
```

要求：

- 已完成任务不能取消。
- 取消只影响当前用户和当前产品下的任务。

## 8. Patch 协议 v1

### 8.1 设计原则

Patch 是服务端对客户端画布的修改指令。它的目标是：

- 只修改需要修改的图层。
- 保留其它图层不变。
- 让生成结果可撤销、可重做、可审计。
- 允许部分应用成功。
- 避免直接传回一整张不可编辑的大图。

### 8.2 当前 Patch 结构

```json
{
  "patchVersion": 1,
  "actions": [
    {
      "type": "replace-image-src",
      "targetId": "layer_product_001",
      "src": "data:image/png;base64,...",
      "meta": {
        "providerModel": "nano-banana-2",
        "artifactId": "artifact_id"
      }
    }
  ]
}
```

### 8.3 当前支持的 Action

| action | 说明 |
| --- | --- |
| `replace-image-src` | 替换图片图层的 src，并保持原图层尺寸比例 |
| `update-text` | 修改文本图层内容 |
| `update-style` | 修改白名单内的样式 |
| `add-object` | 新增 Fabric 对象 |
| `remove-object` | 删除对象，禁止删除 workspace |

当前 `update-style` 白名单：

- `fill`
- `fontSize`
- `fontFamily`
- `fontWeight`
- `textAlign`
- `opacity`
- `charSpacing`
- `lineHeight`

### 8.4 v1 建议新增 Action

后续建议逐步增加：

| action | 用途 |
| --- | --- |
| `update-transform` | 修改位置、旋转、缩放 |
| `update-crop` | 修改图片裁切区域 |
| `replace-image-with-mask` | 替换图片并附带透明通道或蒙版 |
| `add-group` | 新增组合图层 |
| `update-table` | 更新价格表、参数表 |
| `apply-layout` | 根据排版建议调整多个图层 |
| `set-layer-name` | 更新图层名称，便于设计师管理 |

新增 Action 必须满足：

- 不破坏旧客户端。
- `patchVersion` 不变时只能新增可忽略字段。
- 破坏性变更必须升级 `patchVersion`。
- 客户端遇到不支持的 Action 应跳过并提示，不应崩溃。

## 9. Agent 交互协议 v1

### 9.1 为什么需要 Agent Session

当前 AI 面板本质上是一次性任务提交。设计师真实工作流更像：

1. 我想做一张新品上市海报。
2. Agent 生成初稿。
3. 用户说标题太普通，换一个。
4. 用户右键商品图，说换成更高级的场景。
5. 用户选择候选版本 2。
6. 用户说整体加一点促销氛围，但不要动商品。
7. 最终导出。

这要求服务端理解上下文，而不是每次只看一个 prompt。

### 9.2 建议 Agent Session 结构

```json
{
  "agentSessionId": "ags_001",
  "productKey": "qiuai-designer",
  "userId": "user_001",
  "documentId": "doc_001",
  "scene": "poster",
  "createdAt": "2026-07-15T00:00:00.000Z",
  "updatedAt": "2026-07-15T00:00:00.000Z",
  "messages": [
    {
      "messageId": "msg_001",
      "role": "user",
      "content": "做一张新品上市海报",
      "createdAt": "2026-07-15T00:00:00.000Z"
    },
    {
      "messageId": "msg_002",
      "role": "assistant",
      "content": "已生成初稿，可以继续调整标题、商品图或背景。",
      "jobId": "job_001",
      "createdAt": "2026-07-15T00:00:10.000Z"
    }
  ]
}
```

### 9.3 Agent 能力分层

建议把 AI 功能分成三层：

| 层级 | 用户入口 | 能力 |
| --- | --- | --- |
| 对话式 Agent | AI 助手主面板 | 生成整稿、理解需求、拆分任务、解释候选 |
| 图层快捷操作 | 右键菜单 | 改图层、重写文案、换背景、清理杂物 |
| 批量生产 | 批量面板或企业任务 | 多 SKU、多尺寸、多模板批量生成 |

### 9.4 Agent 不应该做的事

- 不应该把整张海报全部重生成，除非用户明确要求。
- 不应该把文字烘焙进位图，除非用户明确导出最终图。
- 不应该随意改变商品结构、品牌 Logo、价格数字。
- 不应该对不可编辑图层做静默修改。
- 不应该因为某个图层失败就丢弃其它成功结果。

## 10. 模型策略

### 10.1 当前策略

当前 Designer 图片模型默认：

```txt
nano-banana-2
```

当前图片尺寸：

| 画布最长边 | 请求尺寸 |
| --- | --- |
| `< 1024` | `1K` |
| `1024 - 2047` | `2K` |
| `>= 2048` | `4K` |

当前文本模型默认：

```txt
deepseek-chat
```

### 10.2 建议策略

Designer 应统一使用 `nano-banana-2` 作为默认生图和图片编辑模型，避免在 Designer 中混用 `gpt-image-2` 和 `nano-banana-2` 导致提示词歧义、效果差异和用户预期不稳定。

QiuAi-ECMS 现有 `nano-banana-fast` 不应被 Designer 改动影响。模型选择必须按产品和业务线隔离：

- QiuAi-ECMS：继续保留当前业务模型和计费策略。
- QiuAi Designer：默认 `nano-banana-2`，支持 `1K`、`2K`、`4K`。

### 10.3 透明底问题

当前不能假设 `nano-banana-2` 一定稳定返回透明 PNG。即使模型返回 PNG，也不代表一定有 alpha 通道。

v1 建议把透明底作为输出策略，而不是默认承诺：

```json
{
  "outputPolicy": {
    "transparentBackground": "off | prefer | required",
    "cutoutAfterGenerate": true
  }
}
```

处理建议：

- 普通背景生成：不要求透明底。
- 商品图、装饰图、图标：优先走抠图后处理。
- 用户明确要求透明素材：如果模型不支持透明底，服务端执行抠图管线。
- 抠图结果应返回 `replace-image-with-mask` 或 `replace-image-src`，并标记 `meta.alphaProcessed = true`。

## 11. 企业级批量生产协议

中型企业关注稳定性和产能，因此必须预留批量能力。

### 11.1 批量任务对象

```json
{
  "batchJobId": "batch_001",
  "productKey": "qiuai-designer",
  "scene": "poster",
  "status": "running",
  "templateId": "template_001",
  "inputRows": [
    {
      "rowId": "sku_001",
      "variables": {
        "productName": "电动研磨机",
        "price": "99",
        "imageUrl": "https://..."
      }
    }
  ],
  "outputPolicy": {
    "formats": ["png", "editable-json"],
    "assetPersistence": "workspace"
  }
}
```

### 11.2 批量能力要求

- 支持多 SKU。
- 支持多尺寸。
- 支持同模板变量替换。
- 支持失败重试。
- 支持部分成功先下载。
- 支持任务级成本预估。
- 支持导出可编辑 JSON 和最终图片。
- 支持企业素材沉淀。

### 11.3 与当前 generation 的关系

当前 `generation` 已经有 Job、Group、WorkItem、Artifact 模型，适合成为批量任务底座。

Designer 批量协议不应重新造一套底层队列，而应在上层增加：

- 批量输入解析。
- 批量变量映射。
- 批量设计稿输出。
- 批量导出和下载。
- 批量任务 UI。

## 12. 稳定性要求

### 12.1 客户端稳定性

客户端必须做到：

- session token 持久化。
- 未激活时只阻止生成，不阻止用户编辑本地画布。
- 任务提交按钮要防重复点击。
- 使用 `clientRequestId` 防重复任务。
- 轮询失败要可恢复，不应丢失 jobId。
- Patch 部分失败时，成功部分仍可保留。
- 大图或 data URL 不应导致 UI 卡死。
- 右键快捷操作必须只作用于当前选中图层。
- 中文文案必须统一 UTF-8，不允许出现乱码。

### 12.2 服务端稳定性

服务端必须做到：

- 所有输入用 Zod 或等价 schema 校验。
- 所有第三方 Provider 返回值都必须校验后再入库。
- 任务创建必须先估算余额，不足时不能入队。
- 任务状态必须可追踪。
- Provider 超时、失败、空结果必须有明确错误码。
- 有 artifact 的任务不能被简单标成完全失败。
- 用户只能查询自己的任务。
- 产品维度必须隔离。
- 计费必须和 artifact、work item、usage summary 对齐。

### 12.3 轮询建议

当前 Designer 客户端固定 1.5 秒轮询一次。v1 建议服务端透出 `pollingAdvice`，客户端按建议轮询：

- 排队中：5 到 10 秒。
- 文本生成：2.5 到 4 秒。
- 图片生成：3 到 5 秒。
- 视频生成：8 到 12 秒。
- 终态：停止轮询。

## 13. 错误协议

当前服务端错误格式：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request payload is invalid.",
    "details": {}
  }
}
```

v1 必须固定这个格式。

### 13.1 当前常见错误码

| code | HTTP | 说明 |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | 请求参数不合法 |
| `INVALID_JSON` | 400 | 请求体不是合法 JSON |
| `PRODUCT_NOT_FOUND` | 404 | 产品未配置 |
| `PLATFORM_SESSION_REQUIRED` | 401 | 缺少 session token |
| `PLATFORM_SESSION_INVALID` | 401 | session token 无效 |
| `PLATFORM_LICENSE_INACTIVE` | 403 | 授权未激活或已过期 |
| `DESIGNER_AI_TEMPLATE_INVALID` | 422 | 模板没有可用 AI 槽位 |
| `DESIGNER_AI_SLOT_NOT_FOUND` | 422 | 目标图层不存在 |
| `DESIGNER_AI_SLOT_NOT_SUPPORTED` | 422 | 图层不支持该 AI 操作 |
| `DESIGNER_AI_SLOT_ROLE_MISMATCH` | 422 | 图层 role 不匹配 |
| `DESIGNER_AI_TOO_MANY_BACKGROUND_TARGETS` | 422 | 单任务背景目标过多 |
| `DESIGNER_AI_MODE_NOT_SUPPORTED` | 422 | 模式未接入 Provider |
| `DESIGNER_AI_IMAGE_SOURCE_REQUIRED` | 422 | 图片编辑缺少源图 |
| `DESIGNER_AI_GENERATION_FAILED` | 500 或 502 | 生成失败 |
| `GENERATION_WALLET_BALANCE_INSUFFICIENT` | 409 | 余额不足 |
| `GENERATION_CONCURRENCY_LIMIT_EXCEEDED` | 422 | 并发超限 |
| `GENERATION_JOB_NOT_FOUND` | 404 | 任务不存在 |
| `GENERATION_JOB_CANCEL_NOT_ALLOWED` | 409 | 任务不可取消 |

### 13.2 错误展示要求

客户端展示错误时：

- 用户可理解的 message 放在 UI。
- code 保留在调试信息里。
- details 不直接暴露给普通用户，除非是余额、套餐、并发等可操作信息。
- Provider 原始错误不应完整展示给用户，避免泄漏内部实现。

## 14. 计费与余额

### 14.1 当前计费路径

Designer AI 创建任务时会进入通用 generation：

- 创建前估算消耗。
- 检查钱包余额。
- 执行任务。
- generation 保存 usage summary。

### 14.2 v1 要求

- AI Job 响应可选透出 `usageSummary`。
- 客户端应展示本次预计消耗和实际消耗。
- 文本、图片、视频余额应分开。
- 月度算力包和永久充值余额应分开。
- 到期时间必须在客户端可见。
- 批量任务必须先展示成本预估。
- 失败任务的扣费规则必须清晰，不能让用户认为“没结果也扣费”。

## 15. 素材与资产

### 15.1 当前状态

当前 Designer 主要把 AI 结果直接应用到画布，没有形成完整的服务端素材库协议。

### 15.2 v1 建议资产类型

```json
{
  "assetId": "asset_001",
  "productKey": "qiuai-designer",
  "userId": "user_001",
  "assetType": "image",
  "source": "ai-generated",
  "url": "https://...",
  "previewUrl": "https://...",
  "width": 2048,
  "height": 2048,
  "format": "png",
  "hasAlpha": true,
  "metadata": {
    "model": "nano-banana-2",
    "prompt": "换背景",
    "jobId": "job_001"
  }
}
```

建议：

- AI 生成的可复用素材进入“我的素材”。
- 临时生成结果可以短期保存。
- 企业客户后续可有团队素材库。
- 资产必须按产品和用户隔离。

## 16. 安全与权限

### 16.1 客户端

- 不允许把 Provider API Key 放到客户端。
- 客户端只保存 Platform session token。
- session token 存储在 localStorage，后续桌面端可考虑更安全的本地安全存储。
- 请求必须通过 Platform 转发或任务化，不直接调用上游模型。

### 16.2 服务端

- 所有 AI Job 必须校验 session token。
- session token 对应 license 必须有效。
- license 必须属于当前 user。
- 任务查询必须限制 userId。
- artifact 下载必须限制 userId 和 product。
- 管理后台写操作必须要求管理员身份。
- 日志中不要输出完整 token、手机号、支付链接和 Provider Key。

## 17. 开发命令

### 17.1 QiuAi Designer

目录：

```powershell
cd F:\Workspace_VS\QiuAi\QiuAi-designer
```

常用命令：

```powershell
npx pnpm dev
npx pnpm build
npx pnpm test
npx pnpm -C packages/core test
```

环境变量：

```env
APP_PLATFORM_PRODUCT_KEY=qiuai-designer
APP_PLATFORM_API_BASE_URL=https://admin.qiuaihub.com
```

### 17.2 QiuAi Platform

目录：

```powershell
cd F:\Workspace_VS\QiuAi\qiuai-platform
```

常用命令：

```powershell
npm run dev
npm run build
npm run test
npm run lint
npm run prisma:migrate:deploy
npm run ops:provision-qiuai-designer -- --apply
npm run ops:provision-qiuai-designer-test-user
```

关键环境变量：

```env
DATABASE_URL=postgresql://...
DESIGNER_AI_IMAGE_MODEL=nano-banana-2
DESIGNER_AI_TEXT_MODEL=deepseek-chat
DESIGNER_AI_MOCK_ENABLED=false
```

## 18. 实施边界

### 18.1 Always

- 所有开放接口必须有输入校验。
- 所有产品数据必须按 productKey 隔离。
- 所有 AI 任务必须有 jobId。
- 所有 AI 结果必须可追踪到 providerModel 和 artifactId。
- 所有中文文案必须使用 UTF-8，禁止乱码提交。
- Patch 必须可部分失败，不能导致客户端崩溃。
- 新增字段优先使用可选字段，避免破坏旧客户端。

### 18.2 Ask First

- 改数据库 schema。
- 改计费规则。
- 改现有 QiuAi-ECMS 模型、价格、并发策略。
- 改 session token 生命周期。
- 改订单和支付流程。
- 引入新的 AI Provider。
- 把设计稿默认上传云端。
- 开启企业团队空间。

### 18.3 Never

- 不得在客户端保存上游模型 API Key。
- 不得让 QiuAi Designer 读取 QiuAi-ECMS 用户和订单数据。
- 不得用不可编辑整图替代可编辑图层，除非用户明确选择导出最终图。
- 不得因为单个图层失败丢弃其它成功图层结果。
- 不得把服务端内部异常栈直接返回给客户端。
- 不得静默扣费。

## 19. 建议实施路线

### Phase 0：审核本文档

目标：

- 确认开放协议方向。
- 确认 Designer 的产品定位。
- 确认 v1 先做哪些能力，哪些延后。

验收：

- 本文档获得确认。
- 未决问题有明确答案或排期。

### Phase 1：修正当前接入基础

目标：

- 修复 Designer 和 Platform 中 AI 文案乱码。
- 明确 `imageTargets` 和 `imageEditTargets`。
- Designer AI Job 透传 `pollingAdvice` 和 `usageSummary`。
- 为 AI Job 增加 `clientRequestId` 幂等。
- 让直接选中图片编辑成为正式协议，不再只依赖临时注入 `ai-slot`。

验收：

- 已激活用户刷新后仍保持激活。
- 选中图片图层可以稳定 `image-edit`。
- 服务端返回部分成功时客户端可应用成功结果。
- QiuAi-ECMS 原有 nano-banana-fast 不受影响。

### Phase 2：聊天式 Agent MVP

目标：

- AI 助手主面板改成真正对话式 Agent。
- 支持“生成整稿”和“修改当前图层”两类意图。
- 支持候选版本选择。
- 支持 Agent Session。

验收：

- 用户能用一句话生成一张基础海报初稿。
- 用户能右键某个图层精准修改。
- 用户能选择候选版本并应用。
- 生成结果仍保持图层可编辑。

### Phase 3：设计稿协议与可编辑内容生成

目标：

- 建立 `designer-document-v1`。
- 支持文字、图片、背景、装饰、价格等基础图层生成。
- 支持服务端返回 `add-object`、`update-text`、`replace-image-src` 组合 Patch。
- 支持模板变量填充。

验收：

- 生成的海报不是一张整图，而是多图层设计稿。
- 文案可编辑。
- 图片可替换、移动、裁切。
- 背景可单独重生成。

### Phase 4：素材库与透明底处理

目标：

- AI 生成图片进入素材库。
- 支持抠图后处理。
- 支持透明底素材。
- 支持素材复用和收藏。

验收：

- 商品图或装饰图可以生成透明底版本。
- 生成素材可以二次拖入画布。
- 素材和资产按产品、用户隔离。

### Phase 5：企业批量生产

目标：

- 支持 SKU 表格导入。
- 支持模板变量映射。
- 支持批量生成多尺寸、多版本。
- 支持批量导出。
- 支持任务成本预估和失败重试。

验收：

- 企业用户能批量生成一组商品海报。
- 部分失败不影响成功结果下载。
- 每个批量任务有成本、状态、结果、失败原因。

## 20. 当前优先级建议

如果目标是尽快让 Designer AI 变得可用，建议优先级如下：

1. 修复乱码和 UI 交互基本问题。
2. 固化 `selected-layer image-edit` 协议。
3. 固化 Patch v1，并补充 `pollingAdvice`、`usageSummary`。
4. 做 Agent Session MVP，但先不做复杂规划器。
5. 做“生成整稿”最小能力：先支持海报，输出可编辑图层。
6. 做透明底后处理和素材沉淀。
7. 最后做企业批量生产。

不建议一开始就做完整复杂 Agent。先把“选中图层精准修改”和“一句话生成基础可编辑海报”做好，更容易稳定落地。

## 21. 审核问题

以下问题需要确认后才能进入实现：

1. Designer v1 是否以“海报 poster”为第一个完整场景，详情页和价格表延后。
2. AI 生成整稿是否需要默认保存到服务端项目库，还是先本地保存。
3. AI 生成素材是否默认进入“我的素材”，还是用户手动收藏后进入。
4. 透明底是否作为 v1 必需能力，还是先用“抠图后处理”作为增强能力。
5. 企业批量生产是否在 v1 进入设计，还是 v2 再做。
6. Agent Session 是否需要服务端持久化完整对话，还是先只在客户端保留上下文。
7. 是否允许 Designer 后续接入团队空间、企业素材库、多人协作。

## 22. 当前审核结论建议

建议本次先确认以下决策：

- QiuAi Designer 的默认生图和图像编辑模型统一为 `nano-banana-2`。
- QiuAi Designer 的 AI 结果必须尽量以 Patch 形式回写，避免不可编辑整图。
- 当前图层精准编辑是第一优先级。
- 一句话生成可编辑海报是第二优先级。
- 产品隔离、授权隔离、计费隔离是不可妥协边界。
- 透明底先通过后处理管线解决，不依赖模型稳定输出 alpha。
- 批量生产先进入协议设计，但不阻塞当前 AI MVP。
