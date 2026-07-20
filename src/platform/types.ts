export interface PlatformProductMeta {
  productId: string;
  productKey: string;
  productName: string;
  status: string;
  description: string | null;
}

export interface PlatformWalletSummary {
  textBalanceCny?: number;
  imageBalanceCny?: number;
  videoBalanceCny?: number;
  textFrozenCny?: number;
  imageFrozenCny?: number;
  videoFrozenCny?: number;
  [key: string]: unknown;
}

export interface PlatformActivationStatus {
  status: string;
  mode: string;
  authType: string;
  canUseApp: boolean;
  customerName: string;
  userId: string;
  licenseId: string;
  inviteCode: string;
  deviceCode: string;
  activatedAt: string;
  expiresAt: string;
  sessionToken: string;
  walletSummary: PlatformWalletSummary | null;
  activePackage?: {
    id?: string;
    code?: string;
    name?: string;
    capabilityConfig?: Record<string, unknown> | null;
  } | null;
  message: string;
  nextAction: string;
}

export interface PlatformOrderPaymentPayload {
  checkoutUrl?: string;
  paymentUrl?: string;
  payUrl?: string;
  redirectUrl?: string;
  cashierUrl?: string;
  mockPayUrl?: string;
  [key: string]: unknown;
}

export interface PlatformSoftwarePackage {
  id: string;
  code: string;
  name: string;
  productName: string;
  description: string | null;
  priceAmount: number;
  officialPriceAmount: number;
  agentSalePriceAmount: number;
  agentSettlementPriceAmount: number;
  currency: string;
  durationDays: number;
  deviceLimit: number;
  capabilityConfig: Record<string, unknown> | null;
  capabilitySummary?: Record<string, unknown> | null;
}

export interface PlatformSubscriptionPackage {
  id: string;
  code: string;
  name: string;
  productName: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationDays: number;
  includedTextBalanceCny: number;
  includedImageBalanceCny: number;
  includedVideoBalanceCny: number;
  overageEnabled: boolean;
  tier: 'STANDARD' | 'MEMBER';
  linkedServicePlans?: unknown;
  primaryServicePlan?: unknown;
}

export interface PlatformAgentQuote {
  valid: boolean;
  agent: {
    id: string;
    displayName: string;
    agentInviteCode: string;
  } | null;
  items: Array<{
    saleItemType: 'license' | 'subscription';
    saleItemCode: string;
    officialPrice: number;
    agentSalePrice: number;
    settlementPrice: number | null;
  }>;
}

export interface PlatformLicenseOrder {
  id: string;
  merchantOrderNo: string;
  packageCode: string;
  packageName: string;
  productName: string;
  description: string;
  channel: string;
  amountCny: number;
  effectiveSalePriceCny: number;
  settlementPriceCny: number;
  agentProfitCny: number;
  salesChannel: string;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string;
  providerTradeNo: string;
  paymentPayload: PlatformOrderPaymentPayload | null;
  durationDays: number;
  deviceLimit: number;
  statusMessage: string;
  orderAccessToken?: string;
}

export interface PlatformSubscriptionOrder {
  id: string;
  merchantOrderNo: string;
  computePackageId: string;
  computePackageCode: string;
  computePackageName: string;
  productName: string;
  channel: string;
  amountCny: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string;
  fulfilledAt: string;
  providerTradeNo: string;
  paymentPayload: PlatformOrderPaymentPayload | null;
  includedTextBalanceCny: number;
  includedImageBalanceCny: number;
  includedVideoBalanceCny: number;
  durationDays: number;
  overageEnabled: boolean;
  linkedServicePlans?: unknown;
  primaryServicePlan?: unknown;
  statusMessage: string;
}

export interface PlatformTopupOrder {
  id: string;
  merchantOrderNo: string;
  walletType: 'text' | 'image' | 'video';
  channel: string;
  originalAmountCny: number;
  payAmountCny: number;
  bonusAmountCny: number;
  status: string;
  createdAt: string;
  paidAt: string;
  failedAt: string;
  closedAt: string;
  providerTradeNo: string;
  paymentPayload: PlatformOrderPaymentPayload | null;
  statusMessage: string;
}

export type DesignerAiTargetRole =
  | 'background'
  | 'title'
  | 'subtitle'
  | 'body-text'
  | 'cta'
  | 'price'
  | 'product-image'
  | 'logo'
  | 'decoration';

export type DesignerAiMode = 'image-generate' | 'text-generate' | 'image-edit' | 'layout-suggest';

export type DesignerAiActionCategory = 'material' | 'edit';

export interface DesignerAiTemplateMeta {
  templateVersion?: number;
  aiReady?: boolean;
  scene?: string;
  defaultLanguage?: string;
  supportedTargets?: string[];
  [key: string]: unknown;
}

export interface DesignerAiTemplateSnapshot {
  meta?: DesignerAiTemplateMeta;
  objects: Array<Record<string, unknown>>;
}

export interface DesignerAiTemplateSlot {
  id: string;
  role: DesignerAiTargetRole;
  slotName: string;
  objectType: string;
  aiEnabled: boolean;
  aiMode: DesignerAiMode;
  editableAfterGenerate: boolean;
  regenerateScope: 'self' | 'group' | 'none';
  constraints: Record<string, unknown>;
}

export interface DesignerAiTemplateSlotsPayload {
  templateId: string;
  templateVersion: number;
  scene: string;
  slots: DesignerAiTemplateSlot[];
}

export type DesignerAssistantConversationRole = 'assistant' | 'user' | 'error';

export interface DesignerAssistantConversationMessage {
  id?: string;
  role: DesignerAssistantConversationRole;
  title?: string;
  content: string;
  createdAt?: string;
}

export type DesignerAssistantMode = 'chat' | 'quick_image' | 'layered_design' | 'layer_edit';

export type DesignerAssistantToolCall =
  | {
      type: 'generate_image';
      model: 'nano-banana-2';
      prompt: string;
      targetRole?: DesignerAiTargetRole;
    }
  | {
      type: 'plan_layers';
      brief: Record<string, unknown>;
    }
  | {
      type: 'revise_layer';
      layerId: string;
      instruction: string;
    };

export interface DesignerAssistantDesignLayer {
  id: string;
  slotId: string;
  role: DesignerAiTargetRole;
  type: 'background' | 'image' | 'text' | 'shape' | 'decoration';
  editable: boolean;
  generationMode: 'image' | 'text' | 'edit';
  label: string;
  prompt: string;
}

export interface DesignerAssistantDesignPlan {
  objective: string;
  layers: DesignerAssistantDesignLayer[];
  review: {
    status: 'passed' | 'needs_attention';
    notes: string[];
  };
}

export interface DesignerAssistantTurnRequest {
  conversationId: string;
  templateId: string;
  message: string;
  language: string;
  conversationHistory?: DesignerAssistantConversationMessage[];
  canvas: {
    width: number;
    height: number;
  };
  templateSnapshot: DesignerAiTemplateSnapshot;
  selection?: {
    objectId: string;
    objectType: string;
  } | null;
  targets?: Array<{
    slotId: string;
    role: DesignerAiTargetRole;
    mode: DesignerAiMode;
    targetSource?: 'ai-slot' | 'selected-layer';
  }>;
  clientRequestId?: string;
  actionKey?: string;
  actionCategory?: DesignerAiActionCategory;
  preserveLayout?: boolean;
  candidateCount?: number;
}

export interface DesignerAssistantTurnResponse {
  conversationId?: string;
  mode: DesignerAssistantMode;
  reply: string;
  confidence: number;
  needsConfirmation: boolean;
  toolCalls: DesignerAssistantToolCall[];
  designPlan?: DesignerAssistantDesignPlan;
  jobIds?: string[];
  error?: {
    code: string;
    message: string;
  };
}

export interface DesignerAiPatchReplaceImageAction {
  type: 'replace-image-src';
  targetId: string;
  src: string;
  meta?: Record<string, unknown>;
}

export interface DesignerAiPatchUpdateTextAction {
  type: 'update-text';
  targetId: string;
  text: string;
}

export interface DesignerAiPatchUpdateStyleAction {
  type: 'update-style';
  targetId: string;
  props: Record<string, unknown>;
}

export interface DesignerAiPatchAddObjectAction {
  type: 'add-object';
  afterTargetId?: string;
  object: Record<string, unknown>;
}

export interface DesignerAiPatchRemoveObjectAction {
  type: 'remove-object';
  targetId: string;
}

export type DesignerAiPatchAction =
  | DesignerAiPatchReplaceImageAction
  | DesignerAiPatchUpdateTextAction
  | DesignerAiPatchUpdateStyleAction
  | DesignerAiPatchAddObjectAction
  | DesignerAiPatchRemoveObjectAction;

export interface DesignerAiPatch {
  patchVersion: 1;
  actions: DesignerAiPatchAction[];
}

export interface DesignerAiCapabilities {
  imageTargets: string[];
  imageEditTargets?: string[];
  textTargets: string[];
  maxTargetsPerJob: number;
  supportedLanguages: string[];
  supportedImageSizes?: string[];
  defaultImageModel?: string;
  defaultImageSize?: string;
  defaultTextProvider?: string;
  defaultTextModel?: string;
  patchVersion: 1;
  mockEnabled: boolean;
}

export interface DesignerAiJobTarget {
  slotId: string;
  role: DesignerAiTargetRole;
  mode: DesignerAiMode;
  targetSource?: 'ai-slot' | 'selected-layer';
}

export interface DesignerAiJobCreatePayload {
  templateId: string;
  clientRequestId?: string;
  language: string;
  userPrompt: string;
  actionKey?: string;
  actionCategory?: DesignerAiActionCategory;
  preserveLayout?: boolean;
  candidateCount?: number;
  targets: DesignerAiJobTarget[];
  canvas: {
    width: number;
    height: number;
  };
  templateSnapshot: DesignerAiTemplateSnapshot;
}

export interface DesignerAiJobCandidate {
  id: string;
  label: string;
  targetId: string;
  role: DesignerAiTargetRole;
  mode: DesignerAiMode;
  previewText: string | null;
  previewImageSrc: string | null;
  patch: DesignerAiPatch;
}

export interface DesignerAiJobProgress {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
}

export interface DesignerAiPollingAdvice {
  recommendedIntervalMs: number;
  minIntervalMs: number;
  reason: 'QUEUED' | 'RUNNING_TEXT' | 'RUNNING_IMAGE' | 'RUNNING_VIDEO' | 'TERMINAL';
}

export interface DesignerAiUsageSummary {
  billed: boolean;
  billedAt: string | null;
  currency: 'CNY';
  totalAmountCny: number;
  lines: Array<{
    kind: 'text' | 'image' | 'video';
    label: string;
    model: string;
    units: number;
    unitPriceCny: number;
    amountCny: number;
    metadata?: Record<string, unknown>;
  }>;
}

export interface DesignerAiJobCreateResponse {
  jobId: string;
  status: string;
  queuePosition: number;
}

export interface DesignerAiJob {
  jobId: string;
  productKey: string;
  templateId: string;
  language: string;
  userPrompt: string;
  status: 'queued' | 'running' | 'succeeded' | 'partial_success' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  targets: DesignerAiJobTarget[];
  queuePosition: number;
  result: DesignerAiPatch | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  progress?: DesignerAiJobProgress;
  pollingAdvice?: DesignerAiPollingAdvice;
  usageSummary?: DesignerAiUsageSummary | null;
  metadata: {
    scene: string;
    templateVersion: number;
    mock: boolean;
    actionKey: string;
    clientRequestId?: string;
    actionCategory: DesignerAiActionCategory;
    preserveLayout: boolean;
    candidateCount: number;
    candidates: DesignerAiJobCandidate[];
  };
}
