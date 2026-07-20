import { v4 as uuidv4 } from 'uuid';

import type { DesignerAiJobCandidate, DesignerAiPatch } from '@/platform/types';

type PosterTheme = {
  key: string;
  label: string;
  description: string;
  background: string;
  surface: string;
  accent: string;
  accentSoft: string;
  text: string;
  muted: string;
};

type PosterScene = 'poster' | 'price-list' | 'detail-page' | 'banner';

type PosterBrief = {
  scene: PosterScene;
  sceneLabel: string;
  productName: string;
  headline: string;
  subtitle: string;
  body: string;
  price: string;
  cta: string;
  bullets: string[];
  trustLine: string;
};

export type LayeredPosterAgentInput = {
  prompt: string;
  canvas: {
    width: number;
    height: number;
  };
  sourceImageUrl?: string;
  candidateCount?: number;
};

const THEMES: PosterTheme[] = [
  {
    key: 'premium',
    label: '高级商业主图',
    description: '偏品牌主视觉，适合海报、主图和高客单展示。',
    background: '#F7F2EA',
    surface: '#FFFDF8',
    accent: '#9B5C32',
    accentSoft: '#E8CDB4',
    text: '#2A1F18',
    muted: '#7A6658',
  },
  {
    key: 'clean',
    label: '清爽信息海报',
    description: '偏信息分层，适合详情页、教育、工具和企业服务。',
    background: '#EEF6F4',
    surface: '#FFFFFF',
    accent: '#20796B',
    accentSoft: '#BFE7DF',
    text: '#102522',
    muted: '#52706B',
  },
  {
    key: 'bold',
    label: '强转化活动稿',
    description: '偏价格转化，适合促销、报价和活动页。',
    background: '#FFF1E8',
    surface: '#FFFFFF',
    accent: '#D7461F',
    accentSoft: '#FFD4C2',
    text: '#2C150D',
    muted: '#8A5542',
  },
];

const SCENE_LABELS: Record<PosterScene, string> = {
  poster: '海报',
  'price-list': '价格表',
  'detail-page': '详情页',
  banner: '横幅',
};

const SCENE_DEFAULT_BULLETS: Record<PosterScene, string[]> = {
  poster: ['卖点清晰', '质感高级', '适合投放', '图层可改'],
  'price-list': ['套餐清楚', '价格可对比', '重点更突出', '方便成交'],
  'detail-page': ['信息完整', '说明更清楚', '层级更稳定', '便于继续编辑'],
  banner: ['首屏抓重点', '节奏更简洁', '可快速替换', '视觉更集中'],
};

const SCENE_DEFAULT_HEADLINES: Record<PosterScene, string> = {
  poster: '焕新上线',
  'price-list': '价格结构一眼看清',
  'detail-page': '信息可以一页讲透',
  banner: '首屏只保留最重要的信息',
};

const SCENE_DEFAULT_SUBTITLES: Record<PosterScene, string> = {
  poster: '围绕主视觉和卖点组织成可继续编辑的设计稿。',
  'price-list': '把套餐、价格和重点说明组织成便于对比的结构。',
  'detail-page': '把说明、证明和卖点排成适合长图阅读的层级。',
  banner: '首屏要抓住注意力，同时保留继续扩展的空间。',
};

const SCENE_DEFAULT_CTAS: Record<PosterScene, string> = {
  poster: '立即购买',
  'price-list': '获取报价',
  'detail-page': '查看详情',
  banner: '立即了解',
};

const SCENE_DEFAULT_TRUST: Record<PosterScene, string> = {
  poster: '图层保持独立，方便继续微调。',
  'price-list': '价格结构清楚，便于后续替换。',
  'detail-page': '适合企业解释型页面和长图展示。',
  banner: '保留首屏节奏，适合继续往下延展。',
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeBullet(value: string) {
  return compactText(value)
    .replace(/^(请|帮我|需要|希望|生成|设计|改成|改为|换成|把|将|做成|做成一个)\s*/, '')
    .replace(/[“”"']/g, '')
    .replace(/^[:：\-\s]+/, '')
    .trim();
}

function truncate(value: string, maxLength: number) {
  const normalized = compactText(value);
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function getCanvasShape(width: number, height: number) {
  const ratio = width / Math.max(1, height);
  if (ratio >= 1.12) {
    return 'wide' as const;
  }

  if (ratio <= 0.88) {
    return 'tall' as const;
  }

  return 'square' as const;
}

function inferScene(prompt: string) {
  if (/价格表|价目表|报价|套餐|收费|定价|会员|月费|年费|订阅|对比|清单/.test(prompt)) {
    return 'price-list' as const;
  }

  if (/详情页|长图|介绍页|参数|规格|说明|卖点页|功能页|教程/.test(prompt)) {
    return 'detail-page' as const;
  }

  if (/横幅|banner|首屏|头图|封面|顶部图|广告图/.test(prompt)) {
    return 'banner' as const;
  }

  return 'poster' as const;
}

function pickFirstMatch(prompt: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    const value = compactText(match?.[1] || '');
    if (value) {
      return value;
    }
  }
  return '';
}

function inferProductName(prompt: string) {
  const explicit = pickFirstMatch(prompt, [
    /(?:产品|商品|名称|主题)\s*[:：]\s*([^，。；;\n]+)/i,
    /(?:关于|围绕|为)\s*([^，。；;\n]{2,18})(?:做|生成|设计|海报|主图)/i,
  ]);
  if (explicit) {
    return truncate(explicit, 14);
  }

  if (/面霜|护肤|精华|美妆|口红|乳液/.test(prompt)) return '高端修护面霜';
  if (/课程|培训|教育|学校|老师/.test(prompt)) return 'AI 实战课程';
  if (/企业|知识库|Agent|智能体|SaaS|系统/.test(prompt)) return '企业 AI 方案';
  if (/咖啡|茶饮|饮品|餐饮/.test(prompt)) return '限定风味饮品';

  return '精选产品';
}

function inferPrice(prompt: string) {
  const match = prompt.match(/(?:￥|¥)?\s*(\d+(?:\.\d+)?)\s*(?:元|块|RMB|rmb)?/);
  return match ? `¥${match[1]}` : '¥299';
}

function inferHeadline(prompt: string, productName: string, scene: PosterScene) {
  const explicit = pickFirstMatch(prompt, [
    /(?:标题|主标题)\s*[:：]\s*([^，。；;\n]+)/i,
    /(?:突出|强调)\s*([^，。；;\n]{2,20})/i,
  ]);
  if (explicit) {
    return truncate(explicit, 18);
  }

  if (scene === 'price-list') return SCENE_DEFAULT_HEADLINES[scene];
  if (scene === 'detail-page')
    return /企业|方案|系统/.test(prompt) ? '企业方案一页讲清' : '信息可以一页讲清';
  if (scene === 'banner')
    return /优惠|活动|促销|限时/.test(prompt) ? '限时活动首屏聚焦' : '首屏只保留最重要的信息';
  if (/抗皱|紧致|修护|保湿/.test(prompt)) return '密集修护 焕亮紧致';
  if (/效率|自动化|降本|提效/.test(prompt)) return '让业务效率真正提升';
  if (/新品|上市|发布/.test(prompt)) return '新品限时首发';

  return truncate(`${productName} 焕新上市`, 18);
}

function inferBullets(prompt: string, scene: PosterScene) {
  const stopWords = new Set([
    '海报',
    '主图',
    '详情页',
    'banner',
    '页面',
    '内容',
    '文案',
    '设计',
    '生成',
    '修改',
    '优化',
    '请',
    '帮我',
    '需要',
    '希望',
    '一个',
    '一些',
    '这个',
    '那个',
    '产品',
    '商品',
  ]);

  const candidates = compactText(prompt)
    .split(/[，,。；;、\n/｜|]/)
    .map((item) =>
      normalizeBullet(item)
        .replace(/^(突出|强调|包含|需要|希望|生成|设计)/, '')
        .trim()
    )
    .filter(
      (item) =>
        item.length >= 2 &&
        item.length <= 18 &&
        !stopWords.has(item) &&
        !/^(海报|主图|详情页|banner|页面|内容|文案|设计)$/.test(item)
    );

  const picked = Array.from(new Set(candidates)).slice(0, 4);
  if (picked.length >= 3) {
    return picked;
  }

  return [...picked, ...SCENE_DEFAULT_BULLETS[scene]].slice(0, 4);
}

function buildBrief(prompt: string): PosterBrief {
  const scene = inferScene(prompt);
  const productName = inferProductName(prompt);
  const price = inferPrice(prompt);
  const bullets = inferBullets(prompt, scene);
  const headline = inferHeadline(prompt, productName, scene);

  return {
    scene,
    sceneLabel: SCENE_LABELS[scene],
    productName,
    headline,
    subtitle: truncate(SCENE_DEFAULT_SUBTITLES[scene], 28),
    body: truncate(bullets.join(' / '), 42),
    price,
    cta: /咨询|服务|方案|企业/.test(prompt) ? '立即咨询' : SCENE_DEFAULT_CTAS[scene],
    bullets,
    trustLine: SCENE_DEFAULT_TRUST[scene],
  };
}

function makeTextObject(input: {
  id: string;
  text: string;
  left: number;
  top: number;
  width: number;
  fontSize: number;
  fill: string;
  fontWeight?: string;
  textAlign?: string;
}) {
  return {
    type: 'textbox',
    version: '5.3.0',
    originX: 'left',
    originY: 'top',
    id: input.id,
    name: input.text,
    left: input.left,
    top: input.top,
    width: input.width,
    height: input.fontSize * 1.4,
    fill: input.fill,
    fontFamily: 'Microsoft YaHei',
    fontSize: input.fontSize,
    fontWeight: input.fontWeight || 'normal',
    textAlign: input.textAlign || 'left',
    lineHeight: 1.16,
    splitByGrapheme: false,
    text: input.text,
  };
}

function makeRectObject(input: {
  id: string;
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fill: string;
  opacity?: number;
  roundValue?: number;
  stroke?: string;
  strokeWidth?: number;
}) {
  return {
    type: 'rect',
    version: '5.3.0',
    originX: 'left',
    originY: 'top',
    id: input.id,
    name: input.name,
    left: input.left,
    top: input.top,
    width: input.width,
    height: input.height,
    fill: input.fill,
    opacity: input.opacity ?? 1,
    roundValue: input.roundValue || 0,
    stroke: input.stroke || '',
    strokeWidth: input.strokeWidth || 0,
  };
}

function buildProductVisual(input: {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  theme: PosterTheme;
  sourceImageUrl?: string;
}) {
  if (input.sourceImageUrl) {
    return {
      type: 'image',
      version: '5.3.0',
      originX: 'left',
      originY: 'top',
      id: input.id,
      name: 'AI 商品图',
      left: input.left,
      top: input.top,
      width: input.width,
      height: input.height,
      src: input.sourceImageUrl,
      crossOrigin: 'anonymous',
    };
  }

  return makeRectObject({
    id: input.id,
    name: '商品图占位',
    left: input.left,
    top: input.top,
    width: input.width,
    height: input.height,
    fill: input.theme.surface,
    roundValue: 28,
    stroke: input.theme.accentSoft,
    strokeWidth: 2,
  });
}

function addText(
  actions: DesignerAiPatch['actions'],
  params: Parameters<typeof makeTextObject>[0]
) {
  actions.push({ type: 'add-object', object: makeTextObject(params) });
}

function addRect(
  actions: DesignerAiPatch['actions'],
  params: Parameters<typeof makeRectObject>[0],
  afterTargetId?: string
) {
  actions.push({ type: 'add-object', afterTargetId, object: makeRectObject(params) });
}

function addPill(
  actions: DesignerAiPatch['actions'],
  input: {
    id: string;
    text: string;
    left: number;
    top: number;
    theme: PosterTheme;
    fill?: string;
    textColor?: string;
    minWidth?: number;
  }
) {
  const width = Math.max(input.minWidth || 64, input.text.length * 10 + 24);
  const height = 24;

  addRect(actions, {
    id: `${input.id}-bg`,
    name: input.text,
    left: input.left,
    top: input.top,
    width,
    height,
    fill: input.fill || input.theme.surface,
    roundValue: 999,
    stroke: input.theme.accentSoft,
    strokeWidth: 1,
  });

  addText(actions, {
    id: `${input.id}-text`,
    text: input.text,
    left: input.left + 8,
    top: input.top + 4,
    width: width - 16,
    fontSize: 12,
    fill: input.textColor || input.theme.text,
    fontWeight: '600',
    textAlign: 'center',
  });
}

function addIntroBlock(
  actions: DesignerAiPatch['actions'],
  input: {
    prefix: string;
    theme: PosterTheme;
    left: number;
    top: number;
    width: number;
    brand: string;
    title: string;
    subtitle: string;
    titleSize: number;
    subtitleSize?: number;
    brandTextColor?: string;
  }
) {
  addPill(actions, {
    id: `${input.prefix}-brand`,
    text: input.brand,
    left: input.left,
    top: input.top,
    theme: input.theme,
    fill: input.theme.surface,
    textColor: input.brandTextColor || input.theme.accent,
    minWidth: 92,
  });

  addText(actions, {
    id: `${input.prefix}-title`,
    text: input.title,
    left: input.left,
    top: input.top + 38,
    width: input.width,
    fontSize: input.titleSize,
    fill: input.theme.text,
    fontWeight: '800',
  });

  addText(actions, {
    id: `${input.prefix}-subtitle`,
    text: input.subtitle,
    left: input.left,
    top: input.top + 38 + Math.round(input.titleSize * 1.35),
    width: input.width,
    fontSize: input.subtitleSize || 14,
    fill: input.theme.muted,
  });
}

function addHeroStage(
  actions: DesignerAiPatch['actions'],
  input: {
    prefix: string;
    theme: PosterTheme;
    left: number;
    top: number;
    width: number;
    height: number;
    sourceImageUrl?: string;
    tagText: string;
  }
) {
  const inset = Math.max(12, Math.round(Math.min(input.width, input.height) * 0.04));
  const roundValue = Math.round(Math.min(input.width, input.height) * 0.18);

  addRect(actions, {
    id: `${input.prefix}-hero-halo`,
    name: '主视觉氛围光',
    left: input.left - inset,
    top: input.top - inset,
    width: input.width + inset * 2,
    height: input.height + inset * 2,
    fill: input.theme.accentSoft,
    opacity: 0.32,
    roundValue,
  });

  addRect(actions, {
    id: `${input.prefix}-hero-frame`,
    name: '主视觉框',
    left: input.left,
    top: input.top,
    width: input.width,
    height: input.height,
    fill: input.theme.surface,
    stroke: input.theme.accentSoft,
    strokeWidth: 2,
    roundValue,
  });

  actions.push({
    type: 'add-object',
    object: buildProductVisual({
      id: `${input.prefix}-hero-visual`,
      left: input.left + inset,
      top: input.top + inset,
      width: Math.max(12, input.width - inset * 2),
      height: Math.max(12, input.height - inset * 2),
      theme: input.theme,
      sourceImageUrl: input.sourceImageUrl,
    }),
  });

  addPill(actions, {
    id: `${input.prefix}-hero-tag`,
    text: input.tagText,
    left: input.left + 14,
    top: Math.max(10, input.top - 30),
    theme: input.theme,
    fill: input.theme.surface,
    textColor: input.theme.accent,
    minWidth: 88,
  });
}

function resolveBulletDetail(scene: PosterScene, bullet: string) {
  switch (scene) {
    case 'price-list':
      return truncate(`「${bullet}」更适合放到对比式报价结构里。`, 26);
    case 'detail-page':
      return truncate('单独成层后，仍然可以继续微调这部分。', 26);
    case 'banner':
      return truncate('保留首屏节奏，先把注意力抓住。', 26);
    default:
      return truncate(`围绕「${bullet}」继续扩展，方便直接上版。`, 26);
  }
}

function buildCardItems(brief: PosterBrief) {
  return brief.bullets.slice(0, 4).map((bullet, index) => ({
    index: index + 1,
    title: truncate(bullet, 12),
    detail: resolveBulletDetail(brief.scene, bullet),
  }));
}

function addFeatureCard(
  actions: DesignerAiPatch['actions'],
  input: {
    prefix: string;
    theme: PosterTheme;
    left: number;
    top: number;
    width: number;
    height: number;
    item: { index: number; title: string; detail: string };
    emphasis?: boolean;
  }
) {
  const accentWidth = Math.max(14, Math.round(input.width * 0.12));

  addRect(actions, {
    id: `${input.prefix}-card-${input.item.index}`,
    name: `卖点卡片 ${input.item.index}`,
    left: input.left,
    top: input.top,
    width: input.width,
    height: input.height,
    fill: input.theme.surface,
    roundValue: 18,
    stroke: input.emphasis ? input.theme.accent : input.theme.accentSoft,
    strokeWidth: input.emphasis ? 2 : 1,
  });

  addRect(actions, {
    id: `${input.prefix}-card-${input.item.index}-bar`,
    name: `卖点强调 ${input.item.index}`,
    left: input.left,
    top: input.top,
    width: accentWidth,
    height: input.height,
    fill: input.theme.accent,
    opacity: input.emphasis ? 0.92 : 0.72,
    roundValue: 18,
  });

  addText(actions, {
    id: `${input.prefix}-card-${input.item.index}-index`,
    text: String(input.item.index).padStart(2, '0'),
    left: input.left + accentWidth + 12,
    top: input.top + 12,
    width: 28,
    fontSize: 12,
    fill: input.theme.accent,
    fontWeight: '700',
  });

  addText(actions, {
    id: `${input.prefix}-card-${input.item.index}-title`,
    text: input.item.title,
    left: input.left + accentWidth + 12,
    top: input.top + 28,
    width: input.width - accentWidth - 24,
    fontSize: Math.max(14, Math.round(input.height * 0.24)),
    fill: input.theme.text,
    fontWeight: '700',
  });

  addText(actions, {
    id: `${input.prefix}-card-${input.item.index}-detail`,
    text: input.item.detail,
    left: input.left + accentWidth + 12,
    top: input.top + Math.max(42, Math.round(input.height * 0.5)),
    width: input.width - accentWidth - 24,
    fontSize: Math.max(12, Math.round(input.height * 0.16)),
    fill: input.theme.muted,
  });
}

function addCardGrid(
  actions: DesignerAiPatch['actions'],
  input: {
    prefix: string;
    theme: PosterTheme;
    left: number;
    top: number;
    columns: number;
    cardWidth: number;
    cardHeight: number;
    gapX: number;
    gapY: number;
    items: Array<{ index: number; title: string; detail: string }>;
    emphasisIndex?: number;
  }
) {
  input.items.forEach((item, index) => {
    const col = index % input.columns;
    const row = Math.floor(index / input.columns);
    addFeatureCard(actions, {
      prefix: input.prefix,
      theme: input.theme,
      left: input.left + col * (input.cardWidth + input.gapX),
      top: input.top + row * (input.cardHeight + input.gapY),
      width: input.cardWidth,
      height: input.cardHeight,
      item,
      emphasis: typeof input.emphasisIndex === 'number' && input.emphasisIndex === index + 1,
    });
  });
}

function addPricePanel(
  actions: DesignerAiPatch['actions'],
  input: {
    prefix: string;
    theme: PosterTheme;
    left: number;
    top: number;
    width: number;
    height: number;
    price: string;
    cta: string;
    summary: string;
  }
) {
  addRect(actions, {
    id: `${input.prefix}-price-panel`,
    name: '价格行动区',
    left: input.left,
    top: input.top,
    width: input.width,
    height: input.height,
    fill: input.theme.surface,
    roundValue: 22,
    stroke: input.theme.accentSoft,
    strokeWidth: 1,
  });

  addPill(actions, {
    id: `${input.prefix}-price-tag`,
    text: '价格行动区',
    left: input.left + 16,
    top: input.top + 14,
    theme: input.theme,
    fill: input.theme.surface,
    textColor: input.theme.accent,
    minWidth: 92,
  });

  addText(actions, {
    id: `${input.prefix}-price-value`,
    text: input.price,
    left: input.left + 18,
    top: input.top + 54,
    width: input.width * 0.5,
    fontSize: Math.max(28, Math.round(input.height * 0.34)),
    fill: input.theme.accent,
    fontWeight: '800',
  });

  addText(actions, {
    id: `${input.prefix}-price-summary`,
    text: input.summary,
    left: input.left + 18,
    top: input.top + Math.max(94, Math.round(input.height * 0.42)),
    width: input.width - 36,
    fontSize: Math.max(12, Math.round(input.height * 0.13)),
    fill: input.theme.muted,
  });

  addRect(actions, {
    id: `${input.prefix}-price-cta`,
    name: '行动按钮',
    left: input.left + 18,
    top: input.top + input.height - 58,
    width: Math.max(88, Math.round(input.width * 0.42)),
    height: 38,
    fill: input.theme.accent,
    roundValue: 18,
  });

  addText(actions, {
    id: `${input.prefix}-price-cta-text`,
    text: input.cta,
    left: input.left + 30,
    top: input.top + input.height - 47,
    width: Math.max(72, Math.round(input.width * 0.34)),
    fontSize: 13,
    fill: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  });
}

function addSceneNote(
  actions: DesignerAiPatch['actions'],
  input: {
    prefix: string;
    theme: PosterTheme;
    left: number;
    top: number;
    width: number;
    text: string;
  }
) {
  addText(actions, {
    id: `${input.prefix}-note`,
    text: input.text,
    left: input.left,
    top: input.top,
    width: input.width,
    fontSize: 13,
    fill: input.theme.muted,
  });
}

function buildPosterScenePatch(input: {
  prefix: string;
  theme: PosterTheme;
  brief: PosterBrief;
  canvas: { width: number; height: number };
  sourceImageUrl?: string;
}) {
  const width = clamp(Math.round(input.canvas.width || 900), 320, 2400);
  const height = clamp(Math.round(input.canvas.height || 1200), 480, 3200);
  const unit = Math.min(width, height) / 100;
  const shape = getCanvasShape(width, height);
  const actions: DesignerAiPatch['actions'] = [];
  const padX = width * 0.08;
  const padY = height * 0.08;

  addRect(
    actions,
    {
      id: `${input.prefix}-bg`,
      name: 'AI 背景',
      left: 0,
      top: 0,
      width,
      height,
      fill: input.theme.background,
    },
    'workspace'
  );

  addRect(actions, {
    id: `${input.prefix}-accent-line`,
    name: '视觉强调线',
    left: 0,
    top: 0,
    width: 10,
    height: height * 0.24,
    fill: input.theme.accent,
    opacity: 0.92,
  });

  addIntroBlock(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: padY,
    width: shape === 'wide' ? width * 0.45 : width * 0.82,
    brand: `AI ${input.brief.sceneLabel} 草稿`,
    title: input.brief.headline,
    subtitle: input.brief.subtitle,
    titleSize: Math.max(30, Math.round(unit * (shape === 'wide' ? 5.8 : 5.2))),
    subtitleSize: 14,
  });

  const hero =
    shape === 'wide'
      ? { left: width * 0.57, top: height * 0.18, width: width * 0.35, height: height * 0.4 }
      : shape === 'square'
      ? { left: width * 0.56, top: height * 0.16, width: width * 0.34, height: height * 0.34 }
      : { left: padX, top: height * 0.24, width: width * 0.84, height: height * 0.25 };

  addHeroStage(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: hero.left,
    top: hero.top,
    width: hero.width,
    height: hero.height,
    sourceImageUrl: input.sourceImageUrl,
    tagText: '主视觉图层',
  });

  const items = buildCardItems(input.brief);
  if (shape === 'tall') {
    addCardGrid(actions, {
      prefix: input.prefix,
      theme: input.theme,
      left: padX,
      top: height * 0.54,
      columns: 2,
      cardWidth: (width - padX * 2 - unit * 2) / 2,
      cardHeight: unit * 7.2,
      gapX: unit * 2,
      gapY: unit * 1.6,
      items,
    });
    addPricePanel(actions, {
      prefix: input.prefix,
      theme: input.theme,
      left: padX,
      top: height - padY - unit * 13.5,
      width: width - padX * 2,
      height: unit * 11,
      price: input.brief.price,
      cta: input.brief.cta,
      summary: input.brief.body,
    });
    addSceneNote(actions, {
      prefix: input.prefix,
      theme: input.theme,
      left: padX,
      top: height - padY - 4,
      width: width * 0.84,
      text: input.brief.trustLine,
    });
    return {
      patchVersion: 1,
      actions,
    } satisfies DesignerAiPatch;
  }

  addCardGrid(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: height * 0.46,
    columns: 1,
    cardWidth: width * 0.38,
    cardHeight: unit * 6.3,
    gapX: 0,
    gapY: unit * 1.3,
    items: items.slice(0, 3),
  });

  addPricePanel(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: height - padY - unit * 15.5,
    width: width * 0.42,
    height: unit * 12.5,
    price: input.brief.price,
    cta: input.brief.cta,
    summary: input.brief.body,
  });

  addSceneNote(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: width * 0.56,
    top: height - padY - 18,
    width: width * 0.34,
    text: input.brief.trustLine,
  });

  return {
    patchVersion: 1,
    actions,
  } satisfies DesignerAiPatch;
}

function buildPriceListScenePatch(input: {
  prefix: string;
  theme: PosterTheme;
  brief: PosterBrief;
  canvas: { width: number; height: number };
  sourceImageUrl?: string;
}) {
  const width = clamp(Math.round(input.canvas.width || 900), 320, 2400);
  const height = clamp(Math.round(input.canvas.height || 1200), 480, 3200);
  const unit = Math.min(width, height) / 100;
  const shape = getCanvasShape(width, height);
  const actions: DesignerAiPatch['actions'] = [];
  const padX = width * 0.08;
  const padY = height * 0.08;

  addRect(
    actions,
    {
      id: `${input.prefix}-bg`,
      name: 'AI 背景',
      left: 0,
      top: 0,
      width,
      height,
      fill: input.theme.background,
    },
    'workspace'
  );

  addIntroBlock(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: padY,
    width: shape === 'wide' ? width * 0.54 : width * 0.84,
    brand: `AI ${input.brief.sceneLabel} 草稿`,
    title: input.brief.headline,
    subtitle: input.brief.subtitle,
    titleSize: Math.max(28, Math.round(unit * (shape === 'wide' ? 5.0 : 4.8))),
    subtitleSize: 14,
  });

  const hero =
    shape === 'wide'
      ? { left: width * 0.62, top: height * 0.16, width: width * 0.24, height: height * 0.26 }
      : { left: padX, top: height * 0.25, width: width * 0.84, height: height * 0.22 };

  addHeroStage(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: hero.left,
    top: hero.top,
    width: hero.width,
    height: hero.height,
    sourceImageUrl: input.sourceImageUrl,
    tagText: '价格参考图层',
  });

  addPricePanel(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: shape === 'wide' ? height * 0.34 : height * 0.5,
    width: shape === 'wide' ? width * 0.36 : width * 0.84,
    height: shape === 'wide' ? height * 0.32 : unit * 12,
    price: input.brief.price,
    cta: input.brief.cta,
    summary: input.brief.body,
  });

  const items = buildCardItems(input.brief);
  const cardTop = shape === 'wide' ? height * 0.58 : height * 0.68;
  addCardGrid(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: shape === 'wide' ? width * 0.42 : padX,
    top: cardTop,
    columns: shape === 'wide' ? 2 : 1,
    cardWidth: shape === 'wide' ? (width * 0.48 - unit * 2) / 2 : width * 0.84,
    cardHeight: unit * 6.6,
    gapX: unit * 2,
    gapY: unit * 1.4,
    items,
  });

  addSceneNote(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: height - padY - 18,
    width: width * 0.84,
    text: input.brief.trustLine,
  });

  return {
    patchVersion: 1,
    actions,
  } satisfies DesignerAiPatch;
}

function buildDetailPageScenePatch(input: {
  prefix: string;
  theme: PosterTheme;
  brief: PosterBrief;
  canvas: { width: number; height: number };
  sourceImageUrl?: string;
}) {
  const width = clamp(Math.round(input.canvas.width || 900), 320, 2400);
  const height = clamp(Math.round(input.canvas.height || 1200), 480, 3200);
  const unit = Math.min(width, height) / 100;
  const shape = getCanvasShape(width, height);
  const actions: DesignerAiPatch['actions'] = [];
  const padX = width * 0.08;
  const padY = height * 0.08;

  addRect(
    actions,
    {
      id: `${input.prefix}-bg`,
      name: 'AI 背景',
      left: 0,
      top: 0,
      width,
      height,
      fill: input.theme.background,
    },
    'workspace'
  );

  addIntroBlock(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: padY,
    width: shape === 'wide' ? width * 0.46 : width * 0.84,
    brand: `AI ${input.brief.sceneLabel} 草稿`,
    title: input.brief.headline,
    subtitle: input.brief.subtitle,
    titleSize: Math.max(26, Math.round(unit * (shape === 'wide' ? 4.8 : 4.4))),
    subtitleSize: 14,
  });

  const hero =
    shape === 'wide'
      ? { left: width * 0.56, top: height * 0.16, width: width * 0.34, height: height * 0.36 }
      : { left: padX, top: height * 0.26, width: width * 0.84, height: height * 0.26 };

  addHeroStage(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: hero.left,
    top: hero.top,
    width: hero.width,
    height: hero.height,
    sourceImageUrl: input.sourceImageUrl,
    tagText: '详情主视觉',
  });

  const items = buildCardItems(input.brief);
  const gridTop = shape === 'wide' ? height * 0.54 : height * 0.58;
  addCardGrid(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: gridTop,
    columns: 2,
    cardWidth: shape === 'wide' ? (width * 0.42 - unit * 2) / 2 : (width * 0.84 - unit * 2) / 2,
    cardHeight: unit * 6.5,
    gapX: unit * 2,
    gapY: unit * 1.6,
    items,
  });

  addPricePanel(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: shape === 'wide' ? width * 0.56 : padX,
    top: shape === 'wide' ? height * 0.58 : height * 0.82,
    width: shape === 'wide' ? width * 0.34 : width * 0.84,
    height: shape === 'wide' ? unit * 12 : unit * 11,
    price: input.brief.price,
    cta: input.brief.cta,
    summary: input.brief.trustLine,
  });

  addSceneNote(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: height - padY - 18,
    width: width * 0.84,
    text: input.brief.trustLine,
  });

  return {
    patchVersion: 1,
    actions,
  } satisfies DesignerAiPatch;
}

function buildBannerScenePatch(input: {
  prefix: string;
  theme: PosterTheme;
  brief: PosterBrief;
  canvas: { width: number; height: number };
  sourceImageUrl?: string;
}) {
  const width = clamp(Math.round(input.canvas.width || 900), 320, 2400);
  const height = clamp(Math.round(input.canvas.height || 1200), 480, 3200);
  const unit = Math.min(width, height) / 100;
  const shape = getCanvasShape(width, height);
  const actions: DesignerAiPatch['actions'] = [];
  const padX = width * 0.08;
  const padY = height * 0.08;

  addRect(
    actions,
    {
      id: `${input.prefix}-bg`,
      name: 'AI 背景',
      left: 0,
      top: 0,
      width,
      height,
      fill: input.theme.background,
    },
    'workspace'
  );

  addIntroBlock(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: padY,
    width: shape === 'wide' ? width * 0.52 : width * 0.84,
    brand: `AI ${input.brief.sceneLabel} 草稿`,
    title: input.brief.headline,
    subtitle: input.brief.subtitle,
    titleSize: Math.max(32, Math.round(unit * (shape === 'wide' ? 5.4 : 4.6))),
    subtitleSize: 14,
  });

  const hero =
    shape === 'wide'
      ? { left: width * 0.66, top: height * 0.2, width: width * 0.22, height: height * 0.3 }
      : { left: padX, top: height * 0.3, width: width * 0.84, height: height * 0.24 };

  addHeroStage(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: hero.left,
    top: hero.top,
    width: hero.width,
    height: hero.height,
    sourceImageUrl: input.sourceImageUrl,
    tagText: '首屏横幅',
  });

  const items = buildCardItems(input.brief).slice(0, 2);
  addCardGrid(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: shape === 'wide' ? height * 0.5 : height * 0.62,
    columns: shape === 'wide' ? 2 : 1,
    cardWidth: shape === 'wide' ? width * 0.18 : width * 0.84,
    cardHeight: unit * 5.8,
    gapX: unit * 2,
    gapY: unit * 1.2,
    items,
  });

  addPricePanel(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: shape === 'wide' ? width * 0.44 : padX,
    top: shape === 'wide' ? height * 0.62 : height * 0.82,
    width: shape === 'wide' ? width * 0.2 : width * 0.84,
    height: shape === 'wide' ? unit * 9.6 : unit * 10.6,
    price: input.brief.price,
    cta: input.brief.cta,
    summary: input.brief.trustLine,
  });

  addSceneNote(actions, {
    prefix: input.prefix,
    theme: input.theme,
    left: padX,
    top: height - padY - 18,
    width: width * 0.84,
    text: input.brief.trustLine,
  });

  return {
    patchVersion: 1,
    actions,
  } satisfies DesignerAiPatch;
}

function buildPatch(input: {
  theme: PosterTheme;
  brief: PosterBrief;
  canvas: { width: number; height: number };
  sourceImageUrl?: string;
}) {
  const prefix = `qad-agent-${input.theme.key}-${uuidv4().slice(0, 8)}`;

  switch (input.brief.scene) {
    case 'price-list':
      return buildPriceListScenePatch({
        prefix,
        theme: input.theme,
        brief: input.brief,
        canvas: input.canvas,
        sourceImageUrl: input.sourceImageUrl,
      });
    case 'detail-page':
      return buildDetailPageScenePatch({
        prefix,
        theme: input.theme,
        brief: input.brief,
        canvas: input.canvas,
        sourceImageUrl: input.sourceImageUrl,
      });
    case 'banner':
      return buildBannerScenePatch({
        prefix,
        theme: input.theme,
        brief: input.brief,
        canvas: input.canvas,
        sourceImageUrl: input.sourceImageUrl,
      });
    case 'poster':
    default:
      return buildPosterScenePatch({
        prefix,
        theme: input.theme,
        brief: input.brief,
        canvas: input.canvas,
        sourceImageUrl: input.sourceImageUrl,
      });
  }
}

function normalizeCandidateCount(candidateCount?: number) {
  const value = Number(candidateCount || 1);
  if (!Number.isFinite(value) || value <= 1) {
    return 1;
  }

  return Math.min(THEMES.length, Math.max(1, Math.floor(value)));
}

export function buildLayeredPosterCandidates(input: LayeredPosterAgentInput) {
  const prompt = compactText(input.prompt);
  const brief = buildBrief(prompt);
  const candidateCount = normalizeCandidateCount(input.candidateCount);

  return THEMES.slice(0, candidateCount).map((theme, index) => {
    const patch = buildPatch({
      theme,
      brief,
      canvas: input.canvas,
      sourceImageUrl: input.sourceImageUrl,
    });

    return {
      id: `local-poster-${brief.scene}-${theme.key}-${index + 1}`,
      label: theme.label,
      targetId: 'local-layered-poster',
      role: 'background',
      mode: 'layout-suggest',
      previewText: `${theme.description}\n场景：${brief.sceneLabel}\n标题：${
        brief.headline
      }\n卖点：${brief.bullets.slice(0, 4).join(' / ')}`,
      previewImageSrc: null,
      patch,
    } satisfies DesignerAiJobCandidate;
  });
}
