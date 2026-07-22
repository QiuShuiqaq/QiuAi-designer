<template>
  <section
    class="platform-center-content"
    :class="{ 'platform-center-content--embedded': embedded }"
  >
    <div v-if="embedded" class="platform-center-content__header">
      <div>
        <h3>我的</h3>
        <p>这里统一处理激活、订阅、钱包和订单。</p>
      </div>
      <Button size="small" @click="refreshAll" :loading="isBootstrapping">刷新</Button>
    </div>

    <div v-if="!platformReady" class="platform-center-content__empty">
      <Alert type="warning" show-icon>
        <template #desc>
          未配置 `APP_PLATFORM_API_BASE_URL`，当前无法连接 `qiuai-platform`。
        </template>
      </Alert>
    </div>

    <div v-else class="platform-center-content__body">
      <Spin fix v-if="isBootstrapping" />

      <Alert v-if="bootError" type="error" show-icon>
        <template #desc>{{ bootError }}</template>
      </Alert>

      <div v-if="embedded" class="platform-center-content__overview">
        <div
          class="platform-center-content__overview-card platform-center-content__overview-card--primary"
        >
          <div class="platform-center-content__overview-head">
            <div>
              <span>当前状态</span>
              <strong>{{ statusLabel }}</strong>
            </div>
            <Button size="small" @click="setActiveTab('license')">
              {{ isActivated ? '查看订阅' : '去激活' }}
            </Button>
          </div>
          <small>{{ activationStatus?.message || '请先开通订阅并激活设备。' }}</small>
        </div>
        <div class="platform-center-content__overview-grid">
          <div class="platform-center-content__overview-card">
            <span>当前订阅</span>
            <strong>{{ activePackageName }}</strong>
            <small>{{ formattedExpireAt }}</small>
          </div>
          <div class="platform-center-content__overview-card">
            <span>图片余额</span>
            <strong>{{ formatBalance(walletSummary?.imageBalanceCny) }}</strong>
            <small>可直接用于图片生成</small>
          </div>
        </div>
        <div class="platform-center-content__quick-actions">
          <Button size="small" @click="setActiveTab('license')">激活</Button>
          <Button size="small" @click="setActiveTab('wallet')">钱包</Button>
          <Button size="small" @click="setActiveTab('purchase')">订阅</Button>
          <Button size="small" @click="refreshAll" :loading="isBootstrapping">刷新</Button>
        </div>
      </div>

      <div v-if="!embedded" class="platform-center-content__summary">
        <div class="platform-center-content__summary-card">
          <span>产品</span>
          <strong>{{ productMeta?.productName || 'QiuAi Designer' }}</strong>
          <small>{{ productMeta?.productKey || PLATFORM_PRODUCT_KEY }}</small>
        </div>
        <div class="platform-center-content__summary-card">
          <span>状态</span>
          <strong>{{ statusLabel }}</strong>
          <small>{{ activationStatus?.nextAction || 'activate-license' }}</small>
        </div>
        <div class="platform-center-content__summary-card">
          <span>设备</span>
          <strong>{{ shortDeviceCode }}</strong>
          <small>{{ deviceName }}</small>
        </div>
        <div class="platform-center-content__summary-card">
          <span>当前订阅</span>
          <strong>{{ activePackageName }}</strong>
          <small>{{ formattedExpireAt }}</small>
        </div>
      </div>

      <Tabs v-model="activeTab" :animated="false">
        <TabPane label="激活" name="license">
          <div class="platform-center-content__grid">
            <section class="platform-center-content__panel">
              <div class="platform-center-content__panel-head">
                <h4>当前状态</h4>
                <Button v-if="!embedded" size="small" @click="refreshAll">刷新</Button>
              </div>

              <div class="platform-center-content__kv">
                <span>客户名称</span>
                <strong>{{ activationStatus?.customerName || '-' }}</strong>
              </div>
              <div class="platform-center-content__kv">
                <span>联系方式</span>
                <strong>{{ activationForm.contact || '-' }}</strong>
              </div>
              <div class="platform-center-content__kv">
                <span>当前订阅</span>
                <strong>{{ activePackageName }}</strong>
              </div>
              <div class="platform-center-content__kv">
                <span>到期时间</span>
                <strong>{{ formattedExpireAt }}</strong>
              </div>
              <div class="platform-center-content__kv">
                <span>状态说明</span>
                <strong>{{ activationStatus?.message || '未激活' }}</strong>
              </div>

              <div class="platform-center-content__panel-actions">
                <Button v-if="isActivated" @click="clearSession">清除会话</Button>
              </div>
            </section>

            <section class="platform-center-content__panel">
              <div class="platform-center-content__panel-head">
                <h4>设备激活</h4>
              </div>

              <Form :label-width="88">
                <FormItem label="客户名称">
                  <Input
                    v-model="activationForm.customerName"
                    placeholder="输入订阅时对应的客户名称"
                  />
                </FormItem>
                <FormItem label="联系方式">
                  <Input v-model="activationForm.contact" placeholder="输入手机号或邮箱" />
                </FormItem>
                <FormItem label="代理邀请码">
                  <Input
                    v-model="activationForm.agentInviteCode"
                    placeholder="可选，用于代理价格校验和下单"
                  />
                </FormItem>
                <FormItem label="设备标识">
                  <Input :model-value="deviceFingerprint" readonly />
                </FormItem>
                <FormItem>
                  <Button type="primary" :loading="isActivating" @click="submitActivation">
                    绑定并激活
                  </Button>
                </FormItem>
              </Form>
            </section>
          </div>
        </TabPane>

        <TabPane label="钱包" name="wallet">
          <div v-if="!isActivated" class="platform-center-content__empty">
            <Alert type="info" show-icon>
              <template #desc>当前未激活，钱包余额需要在激活后读取。</template>
            </Alert>
          </div>

          <template v-else>
            <div class="platform-center-content__wallet">
              <div class="platform-center-content__wallet-card">
                <span>文本余额</span>
                <strong>{{ formatBalance(walletSummary?.textBalanceCny) }}</strong>
              </div>
              <div class="platform-center-content__wallet-card">
                <span>图片余额</span>
                <strong>{{ formatBalance(walletSummary?.imageBalanceCny) }}</strong>
              </div>
              <div class="platform-center-content__wallet-card">
                <span>视频余额</span>
                <strong>{{ formatBalance(walletSummary?.videoBalanceCny) }}</strong>
              </div>
            </div>

            <section class="platform-center-content__panel">
              <div class="platform-center-content__panel-head">
                <h4>钱包直充</h4>
                <Button
                  size="small"
                  :loading="isTopupRefreshing"
                  :disabled="!currentTopupOrder"
                  @click="refreshTopupOrder"
                >
                  刷新订单
                </Button>
              </div>

              <div class="platform-center-content__inline-form">
                <Select v-model="topupForm.walletType">
                  <Option value="image">图片钱包</Option>
                  <Option value="text">文本钱包</Option>
                  <Option value="video">视频钱包</Option>
                </Select>
                <Input v-model="topupForm.amountCny" placeholder="充值金额，单位 CNY" />
                <Button type="primary" :loading="isTopupSubmitting" @click="submitTopupOrder">
                  创建充值订单
                </Button>
              </div>

              <div v-if="currentTopupOrder" class="platform-center-content__order-card">
                <div class="platform-center-content__order-head">
                  <strong>最近直充订单</strong>
                  <Tag>{{ currentTopupOrder.status }}</Tag>
                </div>
                <div class="platform-center-content__order-meta">
                  <span>订单号：{{ currentTopupOrder.merchantOrderNo }}</span>
                  <span>金额：{{ formatPrice(currentTopupOrder.payAmountCny) }}</span>
                  <span>类型：{{ currentTopupOrder.walletType }}</span>
                </div>
                <div class="platform-center-content__panel-actions">
                  <Button @click="openPaymentForOrder(currentTopupOrder)">打开支付</Button>
                </div>
              </div>
            </section>
          </template>
        </TabPane>

        <TabPane label="订阅" name="purchase">
          <section class="platform-center-content__panel platform-center-content__panel--full">
            <div class="platform-center-content__panel-head">
              <h4>代理价格校验</h4>
              <Button size="small" :loading="isVerifyingAgent" @click="verifyAgentCode">
                校验
              </Button>
            </div>

            <div class="platform-center-content__agent-row">
              <Input
                v-model="activationForm.agentInviteCode"
                placeholder="输入代理邀请码后点击校验"
              />
              <span class="platform-center-content__agent-tip">{{ agentQuoteTip }}</span>
            </div>
          </section>

          <div v-if="packageError" class="platform-center-content__empty">
            <Alert type="warning" show-icon>
              <template #desc>{{ packageError }}</template>
            </Alert>
          </div>

          <div v-else class="platform-center-content__stack">
            <section class="platform-center-content__section">
              <div class="platform-center-content__section-head">
                <h4>订阅套餐</h4>
                <span class="platform-center-content__section-tip">订阅包含软件授权和每月算力</span>
              </div>
              <div class="platform-center-content__package-grid">
                <div
                  v-for="pkg in subscriptionPackages"
                  :key="pkg.id"
                  class="platform-center-content__package-card"
                >
                  <div class="platform-center-content__package-head">
                    <strong>{{ pkg.name }}</strong>
                    <Tag>{{ pkg.code }}</Tag>
                  </div>
                  <div class="platform-center-content__package-price">
                    <span class="platform-center-content__package-price-now">
                      {{ formatPrice(resolveSubscriptionPrice(pkg)) }}
                    </span>
                    <span
                      v-if="hasSubscriptionDiscount(pkg)"
                      class="platform-center-content__package-price-raw"
                    >
                      {{ formatPrice(pkg.priceAmount) }}
                    </span>
                  </div>
                  <p class="platform-center-content__package-desc">
                    {{ pkg.description || '暂无描述' }}
                  </p>
                  <div class="platform-center-content__package-meta">
                    <span>{{ pkg.durationDays }} 天</span>
                    <span>图 {{ formatBalance(pkg.includedImageBalanceCny) }}</span>
                    <span>文 {{ formatBalance(pkg.includedTextBalanceCny) }}</span>
                    <span>视频 {{ formatBalance(pkg.includedVideoBalanceCny) }}</span>
                  </div>
                  <div class="platform-center-content__panel-actions">
                    <Button
                      type="primary"
                      :loading="isSubscriptionSubmitting"
                      @click="submitSubscriptionOrder(pkg)"
                    >
                      购买订阅
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section v-if="currentSubscriptionOrder" class="platform-center-content__section">
              <div class="platform-center-content__section-head">
                <h4>订单状态</h4>
              </div>
              <div class="platform-center-content__order-grid">
                <div v-if="currentSubscriptionOrder" class="platform-center-content__order-card">
                  <div class="platform-center-content__order-head">
                    <strong>订阅订单</strong>
                    <Tag>{{ currentSubscriptionOrder.status }}</Tag>
                  </div>
                  <div class="platform-center-content__order-meta">
                    <span>订单号：{{ currentSubscriptionOrder.merchantOrderNo }}</span>
                    <span>套餐：{{ currentSubscriptionOrder.computePackageName }}</span>
                    <span>金额：{{ formatPrice(currentSubscriptionOrder.amountCny) }}</span>
                  </div>
                  <div class="platform-center-content__panel-actions">
                    <Button @click="openPaymentForOrder(currentSubscriptionOrder)">打开支付</Button>
                    <Button :loading="isSubscriptionRefreshing" @click="refreshSubscriptionOrder">
                      刷新订单
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </TabPane>
      </Tabs>
    </div>
  </section>
</template>

<script setup lang="ts" name="PlatformCenterContent">
import { Message } from 'view-ui-plus';

import { quotePlatformAgentPrices } from '@/platform/agent';
import { PLATFORM_PRODUCT_KEY, isPlatformApiConfigured } from '@/platform/config';
import {
  createPlatformSubscriptionOrder,
  createPlatformTopupOrder,
  getPlatformSubscriptionOrder,
  getPlatformTopupOrder,
} from '@/platform/orders';
import {
  activatePlatformLicense,
  clearPlatformSession,
  getPlatformActivationStatus,
  getPlatformProductMeta,
} from '@/platform/session';
import {
  getPlatformDeviceFingerprint,
  getPlatformDeviceName,
  getStoredPlatformProfile,
  getPlatformSessionToken,
  onPlatformSessionTokenChange,
  saveStoredPlatformProfile,
  setPlatformSessionToken,
} from '@/platform/storage';
import { listPlatformSubscriptionPackages } from '@/platform/subscriptions';
import { getPlatformWalletSummary } from '@/platform/wallet';
import type {
  PlatformActivationStatus,
  PlatformAgentQuote,
  PlatformOrderPaymentPayload,
  PlatformProductMeta,
  PlatformSubscriptionOrder,
  PlatformSubscriptionPackage,
  PlatformTopupOrder,
  PlatformWalletSummary,
} from '@/platform/types';

defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (event: 'status-change', payload: { title: string; subtitle: string }): void;
}>();

const platformReady = isPlatformApiConfigured();
const isBootstrapping = ref(false);
const isActivating = ref(false);
const isVerifyingAgent = ref(false);
const isSubscriptionSubmitting = ref(false);
const isSubscriptionRefreshing = ref(false);
const isTopupSubmitting = ref(false);
const isTopupRefreshing = ref(false);
const bootError = ref('');
const packageError = ref('');

const productMeta = ref<PlatformProductMeta | null>(null);
const activationStatus = ref<PlatformActivationStatus | null>(null);
const walletSummary = ref<PlatformWalletSummary | null>(null);
const subscriptionPackages = ref<PlatformSubscriptionPackage[]>([]);
const agentQuote = ref<PlatformAgentQuote | null>(null);
const currentSubscriptionOrder = ref<PlatformSubscriptionOrder | null>(null);
const currentTopupOrder = ref<PlatformTopupOrder | null>(null);
const activeTab = ref<'license' | 'wallet' | 'purchase'>('license');
let restoringActivation = false;
let stopSessionListener: (() => void) | null = null;
let allowSilentRestore = true;

const storedProfile = getStoredPlatformProfile();
const activationForm = reactive({
  customerName: storedProfile.customerName,
  contact: storedProfile.contact,
  agentInviteCode: storedProfile.agentInviteCode,
});
const topupForm = reactive({
  walletType: 'image' as 'text' | 'image' | 'video',
  amountCny: '100',
});

const deviceFingerprint = getPlatformDeviceFingerprint();
const deviceName = getPlatformDeviceName();

const isActivated = computed(() => activationStatus.value?.status === 'activated');
const statusLabel = computed(() => {
  const status = String(activationStatus.value?.status || '').trim();
  if (status === 'activated') return '已激活';
  if (status === 'expired') return '已过期';
  if (status === 'device_mismatch') return '设备不匹配';
  if (status === 'not_logged_in') return '未登录';
  return status || '未配置';
});
const activePackageName = computed(
  () => activationStatus.value?.activePackage?.name || (isActivated.value ? '订阅授权' : '-')
);
const formattedExpireAt = computed(() => {
  const value = String(activationStatus.value?.expiresAt || '').trim();
  if (!value) return '-';
  return new Date(value).toLocaleString();
});
const shortDeviceCode = computed(() => `${deviceFingerprint.slice(0, 8)}...`);
const agentQuoteTip = computed(() => {
  if (!activationForm.agentInviteCode.trim()) {
    return '未填写代理邀请码';
  }

  if (!agentQuote.value) {
    return '待校验';
  }

  if (!agentQuote.value.valid) {
    return '邀请码无效';
  }

  return `已匹配代理：${agentQuote.value.agent?.displayName || '-'}`;
});

function emitTriggerState() {
  emit('status-change', {
    title: isActivated.value ? activationStatus.value?.customerName || '已激活' : '平台中心',
    subtitle: isActivated.value ? '订阅正常' : '未激活',
  });
}

function setActiveTab(nextTab: 'license' | 'wallet' | 'purchase') {
  activeTab.value = nextTab;
}

function formatBalance(value?: number) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) {
    return '0.00';
  }

  return numericValue.toFixed(2);
}

function formatPrice(value?: number) {
  return `CNY ${formatBalance(value)}`;
}

function findAgentQuoteItem(type: 'subscription', code: string) {
  return agentQuote.value?.items?.find(
    (item) => item.saleItemType === type && item.saleItemCode === code
  );
}

function resolveSubscriptionPrice(pkg: PlatformSubscriptionPackage) {
  const quoteItem = findAgentQuoteItem('subscription', pkg.code);
  if (quoteItem && agentQuote.value?.valid) {
    return Number(quoteItem.agentSalePrice || pkg.priceAmount || 0);
  }

  return Number(pkg.priceAmount || 0);
}

function hasSubscriptionDiscount(pkg: PlatformSubscriptionPackage) {
  return resolveSubscriptionPrice(pkg) < Number(pkg.priceAmount || 0);
}

function persistProfile() {
  saveStoredPlatformProfile({
    customerName: activationForm.customerName,
    contact: activationForm.contact,
    agentInviteCode: activationForm.agentInviteCode,
  });
}

function getPaymentUrl(order: { paymentPayload?: PlatformOrderPaymentPayload | null }) {
  const payload = order?.paymentPayload || {};
  const url =
    payload.checkoutUrl ||
    payload.paymentUrl ||
    payload.payUrl ||
    payload.redirectUrl ||
    payload.cashierUrl ||
    payload.mockPayUrl ||
    '';
  return String(url || '').trim();
}

async function openPaymentForOrder(order: { paymentPayload?: PlatformOrderPaymentPayload | null }) {
  const url = getPaymentUrl(order);
  if (!url) {
    Message.error('订单已创建，但服务端没有返回可用的支付链接');
    return;
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  } catch {
    // Ignore clipboard failures.
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  Message.success('支付链接已打开');
}

async function loadProductMeta() {
  productMeta.value = await getPlatformProductMeta();
}

async function loadActivationStatus() {
  activationStatus.value = await getPlatformActivationStatus();
  if (activationStatus.value?.sessionToken) {
    const currentToken = getPlatformSessionToken();
    if (currentToken !== activationStatus.value.sessionToken) {
      setPlatformSessionToken(activationStatus.value.sessionToken);
    }
  }
  walletSummary.value = activationStatus.value?.walletSummary || null;
  emitTriggerState();
}

async function restoreActivationIfNeeded() {
  if (restoringActivation) {
    return;
  }

  if (activationStatus.value?.status !== 'not_logged_in') {
    return;
  }

  if (!allowSilentRestore) {
    return;
  }

  if (!activationForm.customerName.trim() || !activationForm.contact.trim()) {
    return;
  }

  restoringActivation = true;
  try {
    activationStatus.value = await activatePlatformLicense({
      customerName: activationForm.customerName.trim(),
      contact: activationForm.contact.trim(),
      agentInviteCode: activationForm.agentInviteCode.trim(),
    });
    walletSummary.value = activationStatus.value?.walletSummary || null;
    emitTriggerState();
  } catch {
    // Keep the original state if silent restore fails.
  } finally {
    restoringActivation = false;
  }
}

async function loadSubscriptionPackages() {
  subscriptionPackages.value = await listPlatformSubscriptionPackages();
}

async function loadWalletSummary() {
  if (!isActivated.value) {
    walletSummary.value = activationStatus.value?.walletSummary || null;
    return;
  }

  walletSummary.value = await getPlatformWalletSummary();
}

async function refreshAll() {
  if (!platformReady) {
    return;
  }

  isBootstrapping.value = true;
  bootError.value = '';
  packageError.value = '';

  try {
    await Promise.all([loadProductMeta(), loadActivationStatus()]);
    await restoreActivationIfNeeded();
    await Promise.all([loadSubscriptionPackages(), loadWalletSummary()]);
    persistProfile();
  } catch (error) {
    const message = error instanceof Error ? error.message : '平台初始化失败';
    bootError.value = message;
    packageError.value = message;
  } finally {
    isBootstrapping.value = false;
  }
}

async function submitActivation() {
  const customerName = activationForm.customerName.trim();
  const contact = activationForm.contact.trim();

  if (!customerName || !contact) {
    Message.warning('请先填写客户名称和联系方式');
    return;
  }

  isActivating.value = true;
  try {
    activationStatus.value = await activatePlatformLicense({
      customerName,
      contact,
      agentInviteCode: activationForm.agentInviteCode.trim(),
    });
    walletSummary.value = activationStatus.value?.walletSummary || null;
    persistProfile();
    emitTriggerState();
    Message.success('设备激活成功');
    await loadWalletSummary();
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '激活失败');
  } finally {
    isActivating.value = false;
  }
}

async function verifyAgentCode() {
  const agentInviteCode = activationForm.agentInviteCode.trim();
  if (!agentInviteCode) {
    agentQuote.value = null;
    Message.warning('请先输入代理邀请码');
    return;
  }

  isVerifyingAgent.value = true;
  try {
    agentQuote.value = await quotePlatformAgentPrices(agentInviteCode);
    persistProfile();
    if (agentQuote.value?.valid) {
      Message.success('代理邀请码校验成功');
      return;
    }

    Message.warning('代理邀请码无效');
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '代理邀请码校验失败');
  } finally {
    isVerifyingAgent.value = false;
  }
}

function clearSession() {
  allowSilentRestore = false;
  clearPlatformSession();
  activationStatus.value = null;
  walletSummary.value = null;
  emitTriggerState();
  Message.success('平台会话已清除');
}

async function submitSubscriptionOrder(pkg: PlatformSubscriptionPackage) {
  const customerName = activationForm.customerName.trim();
  const contact = activationForm.contact.trim();

  if (!customerName || !contact) {
    Message.warning('开通订阅前请先填写客户名称和联系方式');
    return;
  }

  isSubscriptionSubmitting.value = true;
  try {
    currentSubscriptionOrder.value = await createPlatformSubscriptionOrder({
      subscriptionCode: pkg.code,
      customerName,
      contact,
      agentInviteCode: activationForm.agentInviteCode.trim(),
    });
    persistProfile();
    await openPaymentForOrder(currentSubscriptionOrder.value);
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '创建订阅订单失败');
  } finally {
    isSubscriptionSubmitting.value = false;
  }
}

async function refreshSubscriptionOrder() {
  if (!currentSubscriptionOrder.value?.id) {
    return;
  }

  isSubscriptionRefreshing.value = true;
  try {
    currentSubscriptionOrder.value = await getPlatformSubscriptionOrder({
      id: currentSubscriptionOrder.value.id,
    });

    if (currentSubscriptionOrder.value.status === 'paid') {
      if (
        !isActivated.value &&
        activationForm.customerName.trim() &&
        activationForm.contact.trim()
      ) {
        await submitActivation();
        if (!isActivated.value) {
          return;
        }
      } else {
        await refreshAll();
      }
      Message.success('订阅已开通，授权已同步');
      return;
    }

    Message.info('订阅订单状态已刷新');
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '刷新订阅订单失败');
  } finally {
    isSubscriptionRefreshing.value = false;
  }
}

async function submitTopupOrder() {
  if (!isActivated.value) {
    Message.warning('请先激活设备，再进行直充');
    return;
  }

  const amountCny = Number(topupForm.amountCny);
  if (!Number.isFinite(amountCny) || amountCny < 1) {
    Message.warning('请输入有效的充值金额');
    return;
  }

  isTopupSubmitting.value = true;
  try {
    currentTopupOrder.value = await createPlatformTopupOrder({
      walletType: topupForm.walletType,
      amountCny,
    });
    await openPaymentForOrder(currentTopupOrder.value);
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '创建充值订单失败');
  } finally {
    isTopupSubmitting.value = false;
  }
}

async function refreshTopupOrder() {
  if (!currentTopupOrder.value?.id) {
    return;
  }

  isTopupRefreshing.value = true;
  try {
    currentTopupOrder.value = await getPlatformTopupOrder({
      id: currentTopupOrder.value.id,
    });

    if (currentTopupOrder.value.status === 'paid') {
      await refreshAll();
      Message.success('充值已入账');
      return;
    }

    Message.info('充值订单状态已刷新');
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '刷新充值订单失败');
  } finally {
    isTopupRefreshing.value = false;
  }
}

onMounted(() => {
  allowSilentRestore = true;
  stopSessionListener = onPlatformSessionTokenChange(() => {
    void loadActivationStatus().then(() => {
      if (activationStatus.value?.status === 'not_logged_in') {
        void restoreActivationIfNeeded();
      }
    });
  });
  emitTriggerState();
  refreshAll();
});

onBeforeUnmount(() => {
  stopSessionListener?.();
  stopSessionListener = null;
});
</script>

<style scoped lang="less">
.platform-center-content {
  position: relative;
}

.platform-center-content--embedded {
  padding: 4px 0 16px;
}

.platform-center-content__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.platform-center-content__header h3 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.platform-center-content__header p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.platform-center-content__body {
  position: relative;
  min-height: 320px;
}

.platform-center-content--embedded .platform-center-content__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.platform-center-content__empty {
  padding: 8px 0;
}

.platform-center-content__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.platform-center-content__overview,
.platform-center-content__summary-card,
.platform-center-content__panel,
.platform-center-content__wallet-card,
.platform-center-content__package-card,
.platform-center-content__order-card,
.platform-center-content__overview-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.platform-center-content__overview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}

.platform-center-content__overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.platform-center-content__overview-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.platform-center-content__overview-card span,
.platform-center-content__overview-card small {
  color: #667085;
  font-size: 12px;
}

.platform-center-content__overview-card strong {
  color: #111827;
  word-break: break-word;
}

.platform-center-content__overview-card--primary {
  background: linear-gradient(135deg, #f5f3ff, #ffffff);
}

.platform-center-content__overview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.platform-center-content__quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.platform-center-content__summary-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
}

.platform-center-content__summary-card span,
.platform-center-content__summary-card small {
  color: #667085;
  font-size: 12px;
}

.platform-center-content__summary-card strong {
  color: #111827;
  word-break: break-word;
}

.platform-center-content__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.platform-center-content__stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.platform-center-content__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.platform-center-content__section-head,
.platform-center-content__panel-head,
.platform-center-content__order-head,
.platform-center-content__package-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.platform-center-content__section-head h4,
.platform-center-content__panel-head h4 {
  margin: 0;
  font-size: 15px;
  color: #111827;
}

.platform-center-content__section-tip {
  font-size: 12px;
  color: #667085;
}

.platform-center-content__panel {
  padding: 16px;
}

.platform-center-content__panel--full {
  width: 100%;
}

.platform-center-content__kv {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px dashed #e5e7eb;
}

.platform-center-content__kv:last-of-type {
  border-bottom: 0;
}

.platform-center-content__kv span {
  color: #667085;
}

.platform-center-content__kv strong {
  color: #111827;
  text-align: right;
  word-break: break-word;
}

.platform-center-content__panel-actions {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.platform-center-content__wallet {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.platform-center-content__wallet-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.platform-center-content__wallet-card span {
  color: #667085;
  font-size: 12px;
}

.platform-center-content__wallet-card strong {
  font-size: 20px;
  color: #111827;
}

.platform-center-content__inline-form {
  display: grid;
  grid-template-columns: 180px 1fr auto;
  gap: 10px;
}

.platform-center-content__agent-row {
  display: grid;
  grid-template-columns: minmax(0, 320px) 1fr;
  gap: 12px;
  align-items: center;
}

.platform-center-content__agent-tip {
  font-size: 12px;
  color: #667085;
}

.platform-center-content__package-grid,
.platform-center-content__order-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.platform-center-content__package-card,
.platform-center-content__order-card {
  padding: 16px;
}

.platform-center-content__package-price {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 12px;
}

.platform-center-content__package-price-now {
  font-size: 24px;
  line-height: 1;
  font-weight: 700;
  color: #111827;
}

.platform-center-content__package-price-raw {
  color: #98a2b3;
  text-decoration: line-through;
}

.platform-center-content__package-desc {
  margin: 12px 0;
  min-height: 36px;
  color: #475467;
  line-height: 1.5;
}

.platform-center-content__package-meta,
.platform-center-content__order-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #667085;
  font-size: 12px;
}

.platform-center-content--embedded .platform-center-content__overview-grid,
.platform-center-content--embedded .platform-center-content__grid,
.platform-center-content--embedded .platform-center-content__wallet,
.platform-center-content--embedded .platform-center-content__package-grid,
.platform-center-content--embedded .platform-center-content__order-grid,
.platform-center-content--embedded .platform-center-content__summary,
.platform-center-content--embedded .platform-center-content__inline-form,
.platform-center-content--embedded .platform-center-content__agent-row {
  grid-template-columns: 1fr;
}

.platform-center-content--embedded .platform-center-content__panel,
.platform-center-content--embedded .platform-center-content__wallet-card,
.platform-center-content--embedded .platform-center-content__package-card,
.platform-center-content--embedded .platform-center-content__order-card,
.platform-center-content--embedded .platform-center-content__overview-card {
  padding: 14px;
}

.platform-center-content--embedded .platform-center-content__kv {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.platform-center-content--embedded .platform-center-content__kv strong {
  text-align: left;
}

@media (max-width: 980px) {
  .platform-center-content__overview-grid,
  .platform-center-content__summary,
  .platform-center-content__grid,
  .platform-center-content__wallet,
  .platform-center-content__package-grid,
  .platform-center-content__order-grid {
    grid-template-columns: 1fr;
  }

  .platform-center-content__inline-form,
  .platform-center-content__agent-row {
    grid-template-columns: 1fr;
  }
}
</style>
