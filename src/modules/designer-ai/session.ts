import { v4 as uuidv4 } from 'uuid';

import type { DesignerAiActionCategory } from '@/platform/types';

const SESSION_STORAGE_KEY_PREFIX = 'qiuai-designer.designer-ai.panel-session';
const SESSION_STORAGE_VERSION = 1;
const MAX_CONVERSATION_MESSAGES = 24;
const WELCOME_MESSAGE = '您好，我是您的专属智能体设计师';

export type DesignerAiConversationRole = 'assistant' | 'user' | 'error';

export interface DesignerAiConversationMessage {
  id: string;
  role: DesignerAiConversationRole;
  title: string;
  content: string;
  createdAt: string;
}

export interface DesignerAiPanelSessionState {
  prompt: string;
  language: string;
  agentRunMode: 'compose' | 'layer';
  targetingMode: 'current' | 'smart' | 'manual';
  preserveLayout: boolean;
  transparentOutput: boolean;
  candidateVariantsEnabled: boolean;
  actionCategory: DesignerAiActionCategory;
  selectedActionKey: string;
  manualSelectedSlotIds: string[];
  conversationMessages: DesignerAiConversationMessage[];
}

interface StoredDesignerAiPanelSession extends DesignerAiPanelSessionState {
  version: 1;
  templateId: string;
  updatedAt: string;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getSessionStorageKey(templateId: string) {
  return `${SESSION_STORAGE_KEY_PREFIX}.${encodeURIComponent(
    String(templateId || 'local-current')
  )}`;
}

function normalizeMessage(value: unknown): DesignerAiConversationMessage | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<DesignerAiConversationMessage>;
  const role = String(candidate.role || '').trim() as DesignerAiConversationRole;
  if (role !== 'assistant' && role !== 'user' && role !== 'error') {
    return null;
  }

  const title = String(candidate.title || '').trim();
  const content = String(candidate.content || '').trim();
  const createdAt = String(candidate.createdAt || '').trim();
  if (!title || !content || !createdAt) {
    return null;
  }

  return {
    id: String(candidate.id || uuidv4()).trim() || uuidv4(),
    role,
    title,
    content,
    createdAt,
  };
}

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeMessage(item))
    .filter((item): item is DesignerAiConversationMessage => Boolean(item))
    .slice(-MAX_CONVERSATION_MESSAGES);
}

function normalizeState(templateId: string, value: unknown): StoredDesignerAiPanelSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<StoredDesignerAiPanelSession>;
  if (Number(candidate.version || 0) !== SESSION_STORAGE_VERSION) {
    return null;
  }

  return {
    version: SESSION_STORAGE_VERSION,
    templateId: String(candidate.templateId || templateId || 'local-current').trim(),
    updatedAt: String(candidate.updatedAt || new Date().toISOString()).trim(),
    prompt: String(candidate.prompt || '').trim(),
    language: String(candidate.language || 'zh-CN').trim() || 'zh-CN',
    agentRunMode: candidate.agentRunMode === 'layer' ? 'layer' : 'compose',
    targetingMode:
      candidate.targetingMode === 'current' ||
      candidate.targetingMode === 'smart' ||
      candidate.targetingMode === 'manual'
        ? candidate.targetingMode
        : 'smart',
    preserveLayout: candidate.preserveLayout !== false,
    transparentOutput: candidate.transparentOutput === true,
    candidateVariantsEnabled: candidate.candidateVariantsEnabled === true,
    actionCategory:
      candidate.actionCategory === 'material' || candidate.actionCategory === 'edit'
        ? candidate.actionCategory
        : 'edit',
    selectedActionKey: String(candidate.selectedActionKey || '').trim(),
    manualSelectedSlotIds: Array.isArray(candidate.manualSelectedSlotIds)
      ? candidate.manualSelectedSlotIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    conversationMessages: normalizeMessages(candidate.conversationMessages),
  };
}

export function createDesignerAiConversationMessage(
  role: DesignerAiConversationRole,
  title: string,
  content: string
) {
  return {
    id: uuidv4(),
    role,
    title,
    content: String(content || '').trim(),
    createdAt: new Date().toISOString(),
  } satisfies DesignerAiConversationMessage;
}

export function createDesignerAiWelcomeMessage() {
  return createDesignerAiConversationMessage('assistant', 'AI', WELCOME_MESSAGE);
}

export function loadDesignerAiPanelSession(templateId: string): DesignerAiPanelSessionState | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(getSessionStorageKey(templateId));
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as unknown;
    const normalized = normalizeState(templateId, parsed);
    if (!normalized) {
      return null;
    }

    return {
      prompt: normalized.prompt,
      language: normalized.language,
      agentRunMode: normalized.agentRunMode,
      targetingMode: normalized.targetingMode,
      preserveLayout: normalized.preserveLayout,
      transparentOutput: normalized.transparentOutput,
      candidateVariantsEnabled: normalized.candidateVariantsEnabled,
      actionCategory: normalized.actionCategory,
      selectedActionKey: normalized.selectedActionKey,
      manualSelectedSlotIds: normalized.manualSelectedSlotIds,
      conversationMessages: normalized.conversationMessages,
    };
  } catch {
    return null;
  }
}

export function saveDesignerAiPanelSession(templateId: string, state: DesignerAiPanelSessionState) {
  if (!canUseStorage()) {
    return;
  }

  const normalizedState = normalizeState(templateId, {
    version: SESSION_STORAGE_VERSION,
    templateId,
    updatedAt: new Date().toISOString(),
    ...state,
    conversationMessages: Array.isArray(state.conversationMessages)
      ? state.conversationMessages.slice(-MAX_CONVERSATION_MESSAGES)
      : [],
  });

  if (!normalizedState) {
    return;
  }

  const payload: StoredDesignerAiPanelSession = {
    version: SESSION_STORAGE_VERSION,
    templateId: normalizedState.templateId,
    updatedAt: new Date().toISOString(),
    prompt: normalizedState.prompt,
    language: normalizedState.language,
    agentRunMode: normalizedState.agentRunMode,
    targetingMode: normalizedState.targetingMode,
    preserveLayout: normalizedState.preserveLayout,
    transparentOutput: normalizedState.transparentOutput,
    candidateVariantsEnabled: normalizedState.candidateVariantsEnabled,
    actionCategory: normalizedState.actionCategory,
    selectedActionKey: normalizedState.selectedActionKey,
    manualSelectedSlotIds: normalizedState.manualSelectedSlotIds,
    conversationMessages: normalizedState.conversationMessages,
  };

  window.localStorage.setItem(getSessionStorageKey(templateId), JSON.stringify(payload));
}

export function clearDesignerAiPanelSession(templateId: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(getSessionStorageKey(templateId));
}
