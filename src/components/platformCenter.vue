<template>
  <div class="platform-center">
    <Button type="text" class="platform-center__trigger" @click="openModal">
      <span class="platform-center__trigger-main">{{ triggerTitle }}</span>
      <span class="platform-center__trigger-sub">{{ triggerSubtitle }}</span>
    </Button>

    <Modal v-model="visible" title="平台中心" width="980" footer-hide>
      <div v-if="!platformReady" class="platform-center__empty">
        <Alert type="warning" show-icon>
          <template #desc>
            未配置 `APP_PLATFORM_API_BASE_URL`，当前无法连接 qiuai-platform。
          </template>
        </Alert>
      </div>

      <div v-else class="platform-center__body">
        <Spin fix v-if="isBootstrapping" />

        <Alert v-if="bootError" type="error" show-icon>
          <template #desc>{{ bootError }}</template>
        </Alert>

        <div class="platform-center__summary">
          <div class="platform-center__summary-card">
            <span class="platform-center__label">产品</span>
            <strong>{{ productMeta?.productName || 'QiuAi Designer' }}</strong>
            <span>{{ productMeta?.productKey || PLATFORM_PRODUCT_KEY }}</span>
          </div>
          <div class="platform-center__summary-card">
            <span class="platform-center__label">状态</span>
            <strong>{{ statusLabel }}</strong>
            <span>{{ activationStatus?.nextAction || 'activate-license' }}</span>
          </div>
          <div class="platform-center__summary-card">
            <span class="platform-center__label">设备</span>
            <strong>{{ shortDeviceCode }}</strong>
            <span>{{ deviceName }}</span>
          </div>
        </div>

        <Tabs :animated="false">
          <TabPane label="授权">
            <div class="platform-center__grid">
              <div class="platform-center__panel">
                <div class="platform-center__panel-head">
                  <h4>当前状态</h4>
                  <Button size="small" @click="refreshAll">刷新</Button>
                </div>

                <div class="platform-center__kv">
                  <span>用户</span>
                  <strong>{{ activationStatus?.customerName || '-' }}</strong>
                </div>
                <div class="platform-center__kv">
                  <span>授权包</span>
                  <strong>{{ activePackageName }}</strong>
                </div>
                <div class="platform-center__kv">
                  <span>到期时间</span>
                  <strong>{{ formattedExpireAt }}</strong>
                </div>
                <div class="platform-center__kv">
                  <span>说明</span>
                  <strong>{{ activationStatus?.message || '未激活' }}</strong>
                </div>

                <div class="platform-center__panel-actions">
                  <Button v-if="isActivated" @click="clearSession">清除会话</Button>
                </div>
              </div>

              <div class="platform-center__panel">
                <div class="platform-center__panel-head">
                  <h4>设备激活</h4>
                </div>

                <Form :label-width="88">
                  <FormItem label="客户名称">
                    <Input
                      v-model="activationForm.customerName"
                      placeholder="输入购买时对应的客户名称"
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
              </div>
            </div>
          </TabPane>

          <TabPane label="钱包">
            <div v-if="!isActivated" class="platform-center__empty">
              <Alert type="info" show-icon>
                <template #desc>当前未激活，钱包余额需要在激活后读取。</template>
              </Alert>
            </div>

            <template v-else>
              <div class="platform-center__wallet">
                <div class="platform-center__wallet-card">
                  <span>文本余额</span>
                  <strong>{{ formatBalance(walletSummary?.textBalanceCny) }}</strong>
                </div>
                <div class="platform-center__wallet-card">
                  <span>图片余额</span>
                  <strong>{{ formatBalance(walletSummary?.imageBalanceCny) }}</strong>
                </div>
                <div class="platform-center__wallet-card">
                  <span>视频余额</span>
                  <strong>{{ formatBalance(walletSummary?.videoBalanceCny) }}</strong>
                </div>
              </div>

              <div class="platform-center__panel platform-center__panel--stacked">
                <div class="platform-center__panel-head">
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

                <div class="platform-center__topup-form">
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

                <div v-if="currentTopupOrder" class="platform-center__order-card">
                  <div class="platform-center__order-head">
                    <strong>最近直充订单</strong>
                    <Tag>{{ currentTopupOrder.status }}</Tag>
                  </div>
                  <div class="platform-center__order-meta">
                    <span>订单号：{{ currentTopupOrder.merchantOrderNo }}</span>
                    <span>金额：{{ formatPrice(currentTopupOrder.payAmountCny) }}</span>
                    <span>类型：{{ currentTopupOrder.walletType }}</span>
                  </div>
                  <div class="platform-center__panel-actions">
                    <Button @click="openPaymentForOrder(currentTopupOrder)">打开支付</Button>
                  </div>
                </div>
              </div>
            </template>
          </TabPane>

          <TabPane label="购买">
            <div class="platform-center__panel platform-center__panel--full">
              <div class="platform-center__panel-head">
                <h4>代理价格校验</h4>
                <Button size="small" :loading="isVerifyingAgent" @click="verifyAgentCode">
                  校验
                </Button>
              </div>

              <div class="platform-center__agent-row">
                <Input
                  v-model="activationForm.agentInviteCode"
                  placeholder="输入代理邀请码后点击校验"
                />
                <span class="platform-center__agent-tip">{{ agentQuoteTip }}</span>
              </div>
            </div>

            <div v-if="packageError" class="platform-center__empty">
              <Alert type="warning" show-icon>
                <template #desc>{{ packageError }}</template>
              </Alert>
            </div>

            <div v-else class="platform-center__stack">
              <section class="platform-center__section">
                <div class="platform-center__section-head">
                  <h4>授权套餐</h4>
                </div>
                <div class="platform-center__package-grid">
                  <div
                    v-for="pkg in softwarePackages"
                    :key="pkg.id"
                    class="platform-center__package-card"
                  >
                    <div class="platform-center__package-head">
                      <strong>{{ pkg.name }}</strong>
                      <Tag>{{ pkg.code }}</Tag>
                    </div>
                    <div class="platform-center__package-price">
                      <span class="platform-center__package-price-now">
                        {{ formatPrice(resolveLicensePrice(pkg)) }}
                      </span>
                      <span
                        v-if="hasLicenseDiscount(pkg)"
                        class="platform-center__package-price-raw"
                      >
                        {{ formatPrice(pkg.officialPriceAmount || pkg.priceAmount) }}
                      </span>
                    </div>
                    <p class="platform-center__package-desc">
                      {{ pkg.description || '暂无描述' }}
                    </p>
                    <div class="platform-center__package-meta">
                      <span>{{ pkg.durationDays || 0 }} 天</span>
                      <span>{{ pkg.deviceLimit || 0 }} 设备</span>
                      <span>{{ readCapability(pkg, 'taskConcurrencyLimit') }} 项目并发</span>
                    </div>
                    <div class="platform-center__panel-actions">
                      <Button
                        type="primary"
                        :loading="isLicenseSubmitting"
                        @click="submitLicenseOrder(pkg)"
                      >
                        购买授权
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              <section class="platform-center__section">
                <div class="platform-center__section-head">
                  <h4>订阅套餐</h4>
                  <span class="platform-center__section-tip">购买后自动入账到钱包</span>
                </div>
                <div class="platform-center__package-grid">
                  <div
                    v-for="pkg in subscriptionPackages"
                    :key="pkg.id"
                    class="platform-center__package-card"
                  >
                    <div class="platform-center__package-head">
                      <strong>{{ pkg.name }}</strong>
                      <Tag>{{ pkg.code }}</Tag>
                    </div>
                    <div class="platform-center__package-price">
                      <span class="platform-center__package-price-now">
                        {{ formatPrice(resolveSubscriptionPrice(pkg)) }}
                      </span>
                      <span
                        v-if="hasSubscriptionDiscount(pkg)"
                        class="platform-center__package-price-raw"
                      >
                        {{ formatPrice(pkg.priceAmount) }}
                      </span>
                    </div>
                    <p class="platform-center__package-desc">
                      {{ pkg.description || '暂无描述' }}
                    </p>
                    <div class="platform-center__package-meta">
                      <span>{{ pkg.durationDays }} 天</span>
                      <span>图 {{ formatBalance(pkg.includedImageBalanceCny) }}</span>
                      <span>文 {{ formatBalance(pkg.includedTextBalanceCny) }}</span>
                      <span>视 {{ formatBalance(pkg.includedVideoBalanceCny) }}</span>
                    </div>
                    <div class="platform-center__panel-actions">
                      <Button
                        type="primary"
                        :disabled="!isActivated"
                        :loading="isSubscriptionSubmitting"
                        @click="submitSubscriptionOrder(pkg)"
                      >
                        购买订阅
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              <section
                v-if="currentLicenseOrder || currentSubscriptionOrder"
                class="platform-center__section"
              >
                <div class="platform-center__section-head">
                  <h4>订单状态</h4>
                </div>
                <div class="platform-center__order-grid">
                  <div v-if="currentLicenseOrder" class="platform-center__order-card">
                    <div class="platform-center__order-head">
                      <strong>授权订单</strong>
                      <Tag>{{ currentLicenseOrder.status }}</Tag>
                    </div>
                    <div class="platform-center__order-meta">
                      <span>订单号：{{ currentLicenseOrder.merchantOrderNo }}</span>
                      <span>套餐：{{ currentLicenseOrder.packageName }}</span>
                      <span>金额：{{ formatPrice(currentLicenseOrder.amountCny) }}</span>
                    </div>
                    <div class="platform-center__panel-actions">
                      <Button @click="openPaymentForOrder(currentLicenseOrder)">打开支付</Button>
                      <Button :loading="isLicenseRefreshing" @click="refreshLicenseOrder">
                        刷新订单
                      </Button>
                    </div>
                  </div>

                  <div v-if="currentSubscriptionOrder" class="platform-center__order-card">
                    <div class="platform-center__order-head">
                      <strong>订阅订单</strong>
                      <Tag>{{ currentSubscriptionOrder.status }}</Tag>
                    </div>
                    <div class="platform-center__order-meta">
                      <span>订单号：{{ currentSubscriptionOrder.merchantOrderNo }}</span>
                      <span>套餐：{{ currentSubscriptionOrder.computePackageName }}</span>
                      <span>金额：{{ formatPrice(currentSubscriptionOrder.amountCny) }}</span>
                    </div>
                    <div class="platform-center__panel-actions">
                      <Button @click="openPaymentForOrder(currentSubscriptionOrder)">
                        打开支付
                      </Button>
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
    </Modal>
  </div>
</template>

<script setup lang="ts" name="PlatformCenter">
import { Message } from 'view-ui-plus';

import { quotePlatformAgentPrices } from '@/platform/agent';
import { PLATFORM_PRODUCT_KEY, isPlatformApiConfigured } from '@/platform/config';
import {
  createPlatformLicenseOrder,
  createPlatformSubscriptionOrder,
  createPlatformTopupOrder,
  getPlatformLicenseOrder,
  getPlatformSubscriptionOrder,
  getPlatformTopupOrder,
} from '@/platform/orders';
import { listPlatformSoftwarePackages } from '@/platform/packages';
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
  saveStoredPlatformProfile,
} from '@/platform/storage';
import { listPlatformSubscriptionPackages } from '@/platform/subscriptions';
import { getPlatformWalletSummary } from '@/platform/wallet';
import type {
  PlatformActivationStatus,
  PlatformAgentQuote,
  PlatformLicenseOrder,
  PlatformProductMeta,
  PlatformSoftwarePackage,
  PlatformSubscriptionOrder,
  PlatformSubscriptionPackage,
  PlatformTopupOrder,
  PlatformWalletSummary,
} from '@/platform/types';

const platformReady = isPlatformApiConfigured();
const visible = ref(false);
const isBootstrapping = ref(false);
const isActivating = ref(false);
const isVerifyingAgent = ref(false);
const isLicenseSubmitting = ref(false);
const isLicenseRefreshing = ref(false);
const isSubscriptionSubmitting = ref(false);
const isSubscriptionRefreshing = ref(false);
const isTopupSubmitting = ref(false);
const isTopupRefreshing = ref(false);
const bootError = ref('');
const packageError = ref('');

const productMeta = ref<PlatformProductMeta | null>(null);
const activationStatus = ref<PlatformActivationStatus | null>(null);
const walletSummary = ref<PlatformWalletSummary | null>(null);
const softwarePackages = ref<PlatformSoftwarePackage[]>([]);
const subscriptionPackages = ref<PlatformSubscriptionPackage[]>([]);
const agentQuote = ref<PlatformAgentQuote | null>(null);
const currentLicenseOrder = ref<PlatformLicenseOrder | null>(null);
const currentSubscriptionOrder = ref<PlatformSubscriptionOrder | null>(null);
const currentTopupOrder = ref<PlatformTopupOrder | null>(null);

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
const triggerTitle = computed(() =>
  isActivated.value ? activationStatus.value?.customerName || '已激活' : '平台中心'
);
const triggerSubtitle = computed(() => (isActivated.value ? '授权正常' : '未激活'));
const statusLabel = computed(() => {
  const status = String(activationStatus.value?.status || '').trim();
  if (status === 'activated') return '已激活';
  if (status === 'expired') return '已过期';
  if (status === 'device_mismatch') return '设备不匹配';
  if (status === 'not_logged_in') return '未登录';
  return status || '未配置';
});
const activePackageName = computed(() => activationStatus.value?.activePackage?.name || '-');
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

function readCapability(pkg: PlatformSoftwarePackage, key: string) {
  const capability = (pkg.capabilityConfig || {}) as Record<string, unknown>;
  const rawValue = capability[key];
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return '-';
  }
  return String(rawValue);
}

function findAgentQuoteItem(type: 'license' | 'subscription', code: string) {
  return agentQuote.value?.items?.find(
    (item) => item.saleItemType === type && item.saleItemCode === code
  );
}

function resolveLicensePrice(pkg: PlatformSoftwarePackage) {
  const quoteItem = findAgentQuoteItem('license', pkg.code);
  if (quoteItem && agentQuote.value?.valid) {
    return Number(quoteItem.agentSalePrice || pkg.officialPriceAmount || pkg.priceAmount || 0);
  }

  return Number(pkg.officialPriceAmount || pkg.priceAmount || 0);
}

function resolveSubscriptionPrice(pkg: PlatformSubscriptionPackage) {
  const quoteItem = findAgentQuoteItem('subscription', pkg.code);
  if (quoteItem && agentQuote.value?.valid) {
    return Number(quoteItem.agentSalePrice || pkg.priceAmount || 0);
  }

  return Number(pkg.priceAmount || 0);
}

function hasLicenseDiscount(pkg: PlatformSoftwarePackage) {
  return resolveLicensePrice(pkg) < Number(pkg.officialPriceAmount || pkg.priceAmount || 0);
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

function getPaymentUrl(order: { paymentPayload?: Record<string, unknown> | null }) {
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

async function openPaymentForOrder(order: { paymentPayload?: Record<string, unknown> | null }) {
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
    walletSummary.value = activationStatus.value.walletSummary || null;
  }
}

async function loadSoftwarePackages() {
  softwarePackages.value = await listPlatformSoftwarePackages();
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
    await Promise.all([loadSoftwarePackages(), loadSubscriptionPackages(), loadWalletSummary()]);
    persistProfile();
  } catch (error) {
    const message = error instanceof Error ? error.message : '平台初始化失败';
    bootError.value = message;
    packageError.value = message;
  } finally {
    isBootstrapping.value = false;
  }
}

async function openModal() {
  visible.value = true;
  if (!platformReady) {
    return;
  }

  await refreshAll();
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
  clearPlatformSession();
  activationStatus.value = null;
  walletSummary.value = null;
  Message.success('平台会话已清除');
}

async function submitLicenseOrder(pkg: PlatformSoftwarePackage) {
  const customerName = activationForm.customerName.trim();
  const contact = activationForm.contact.trim();

  if (!customerName || !contact) {
    Message.warning('购买授权前请先填写客户名称和联系方式');
    return;
  }

  isLicenseSubmitting.value = true;
  try {
    currentLicenseOrder.value = await createPlatformLicenseOrder({
      packageCode: pkg.code,
      customerName,
      contact,
      agentInviteCode: activationForm.agentInviteCode.trim(),
    });
    persistProfile();
    await openPaymentForOrder(currentLicenseOrder.value);
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '创建授权订单失败');
  } finally {
    isLicenseSubmitting.value = false;
  }
}

async function refreshLicenseOrder() {
  if (!currentLicenseOrder.value?.id) {
    return;
  }

  isLicenseRefreshing.value = true;
  try {
    currentLicenseOrder.value = await getPlatformLicenseOrder({
      id: currentLicenseOrder.value.id,
      orderAccessToken: currentLicenseOrder.value.orderAccessToken,
    });

    if (currentLicenseOrder.value.status === 'paid') {
      Message.success('授权订单已支付');
      if (
        !isActivated.value &&
        activationForm.customerName.trim() &&
        activationForm.contact.trim()
      ) {
        await submitActivation();
      } else {
        await refreshAll();
      }
      return;
    }

    Message.info('授权订单状态已刷新');
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '刷新授权订单失败');
  } finally {
    isLicenseRefreshing.value = false;
  }
}

async function submitSubscriptionOrder(pkg: PlatformSubscriptionPackage) {
  if (!isActivated.value) {
    Message.warning('请先激活设备，再购买订阅');
    return;
  }

  isSubscriptionSubmitting.value = true;
  try {
    currentSubscriptionOrder.value = await createPlatformSubscriptionOrder({
      subscriptionCode: pkg.code,
    });
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
      await refreshAll();
      Message.success('订阅已入账');
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

onMounted(async () => {
  if (!platformReady) {
    return;
  }

  try {
    await loadProductMeta();
    await loadActivationStatus();
    if (isActivated.value) {
      await loadWalletSummary();
    }
  } catch {
    // Keep initial page load lightweight.
  }
});
</script>

<style scoped lang="less">
.platform-center {
  display: inline-flex;
  align-items: center;
}

.platform-center__trigger {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  height: auto;
  line-height: 1.1;
  padding: 4px 8px;
}

.platform-center__trigger-main {
  font-size: 13px;
  color: #0f172a;
}

.platform-center__trigger-sub {
  font-size: 11px;
  color: #667085;
}

.platform-center__body {
  position: relative;
  min-height: 220px;
}

.platform-center__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.platform-center__summary-card,
.platform-center__panel,
.platform-center__wallet-card,
.platform-center__package-card,
.platform-center__order-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
}

.platform-center__summary-card {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.platform-center__summary-card strong {
  font-size: 16px;
  color: #111827;
}

.platform-center__summary-card span {
  color: #667085;
  word-break: break-all;
}

.platform-center__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.platform-center__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.platform-center__stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.platform-center__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.platform-center__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.platform-center__section-head h4 {
  margin: 0;
  font-size: 15px;
  color: #111827;
}

.platform-center__section-tip {
  color: #667085;
  font-size: 12px;
}

.platform-center__panel {
  padding: 16px;
}

.platform-center__panel--full {
  margin-bottom: 0;
}

.platform-center__panel--stacked {
  margin-top: 16px;
}

.platform-center__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.platform-center__panel-head h4 {
  margin: 0;
  font-size: 15px;
  color: #111827;
}

.platform-center__kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid #f3f4f6;
}

.platform-center__kv span {
  color: #667085;
}

.platform-center__kv strong {
  color: #111827;
  text-align: right;
}

.platform-center__panel-actions {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.platform-center__wallet {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.platform-center__wallet-card {
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.platform-center__wallet-card span {
  color: #667085;
}

.platform-center__wallet-card strong {
  font-size: 22px;
  color: #111827;
}

.platform-center__topup-form {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) 160px;
  gap: 12px;
}

.platform-center__agent-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.platform-center__agent-row :deep(.ivu-input-wrapper) {
  flex: 1;
}

.platform-center__agent-tip {
  color: #667085;
  font-size: 12px;
  min-width: 180px;
  text-align: right;
}

.platform-center__package-grid,
.platform-center__order-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.platform-center__package-card,
.platform-center__order-card {
  padding: 16px;
}

.platform-center__package-head,
.platform-center__order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.platform-center__package-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.platform-center__package-price-now {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.platform-center__package-price-raw {
  color: #98a2b3;
  text-decoration: line-through;
}

.platform-center__package-desc {
  margin: 0 0 12px;
  color: #667085;
  min-height: 40px;
  line-height: 1.6;
}

.platform-center__package-meta,
.platform-center__order-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #475467;
  font-size: 12px;
}

.platform-center__empty {
  padding: 12px 0;
}

@media (max-width: 900px) {
  .platform-center__summary,
  .platform-center__grid,
  .platform-center__wallet,
  .platform-center__package-grid,
  .platform-center__order-grid,
  .platform-center__topup-form {
    grid-template-columns: 1fr;
  }

  .platform-center__agent-row {
    flex-direction: column;
    align-items: stretch;
  }

  .platform-center__agent-tip {
    min-width: 0;
    text-align: left;
  }
}
</style>
