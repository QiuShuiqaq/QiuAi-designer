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

export type DesignerAiMode =
  | 'image-generate'
  | 'text-generate'
  | 'image-edit'
  | 'layout-suggest';

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
  textTargets: string[];
  maxTargetsPerJob: number;
  supportedLanguages: string[];
  patchVersion: 1;
  mockEnabled: boolean;
}

export interface DesignerAiJobTarget {
  slotId: string;
  role: DesignerAiTargetRole;
  mode: DesignerAiMode;
}

export interface DesignerAiJobCreatePayload {
  templateId: string;
  language: string;
  userPrompt: string;
  targets: DesignerAiJobTarget[];
  canvas: {
    width: number;
    height: number;
  };
  templateSnapshot: DesignerAiTemplateSnapshot;
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
  status:
    | 'queued'
    | 'running'
    | 'succeeded'
    | 'partial_success'
    | 'failed'
    | 'cancelled';
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
  metadata: {
    scene: string;
    templateVersion: number;
    mock: boolean;
  };
}
