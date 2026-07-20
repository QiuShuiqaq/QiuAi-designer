<template>
  <div class="template-panel">
    <div class="search-box">
      <Select
        v-model="typeValue"
        class="select"
        :disabled="pageLoading"
        @on-change="handleFilterChange"
      >
        <Option v-for="item in typeList" :key="item.value" :value="item.value">
          {{ item.label }}
        </Option>
      </Select>
      <Input
        v-model="searchKeyWord"
        class="input"
        :placeholder="`在${typeText}中搜索`"
        search
        :disabled="pageLoading"
        @on-search="startGetList"
      />
    </div>

    <div
      id="myTemplBox"
      ref="scrollBoxRef"
      class="scroll-box"
      @scroll.passive="handleTemplateScroll"
    >
      <div class="list-box">
        <Tooltip v-for="info in pageData" :key="info.id" :content="info.name" placement="top">
          <div class="tmpl-img-box">
            <Image
              lazy
              :src="info.previewSrc"
              :alt="info.name"
              fit="contain"
              width="100%"
              @click="beforeClearTip(info)"
            />
          </div>
        </Tooltip>
      </div>

      <Spin size="large" fix :show="pageLoading"></Spin>
      <Divider v-if="isDownBottom" plain>已经到底了</Divider>
    </div>
  </div>
</template>

<script setup lang="ts" name="ImportTmpl">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { debounce } from 'lodash-es';
import { Modal, Spin } from 'view-ui-plus';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import useSelect from '@/hooks/select';
import {
  listLocalTemplateCategories,
  loadLocalTemplateById,
  queryLocalTemplates,
  type LocalTemplateListItem,
} from '@/modules/template-library/service';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { canvasEditor } = useSelect();

const pageLoading = ref(false);
const searchKeyWord = ref('');
const typeValue = ref<number | ''>('');
const typeList = ref<Array<{ value: number | ''; label: string }>>([]);
const pageData = ref<LocalTemplateListItem[]>([]);
const page = ref(1);
const pagination = reactive({
  total: 0,
  pageCount: 1,
  pageSize: 12,
});
const scrollBoxRef = ref<HTMLElement | null>(null);

const typeText = computed(() => {
  const current = typeList.value.find((item) => item.value === typeValue.value);
  return current?.label || '全部模板';
});

const isDownBottom = computed(() => page.value >= pagination.pageCount);

async function reloadTemplates(reset = false) {
  if (pageLoading.value) return;
  pageLoading.value = true;
  try {
    const result = await queryLocalTemplates({
      categoryId: typeValue.value,
      keyword: searchKeyWord.value,
      page: page.value,
      pageSize: pagination.pageSize,
    });
    pagination.total = result.total;
    pagination.pageCount = result.pageCount;
    pageData.value = reset ? result.items : [...pageData.value, ...result.items];
  } finally {
    pageLoading.value = false;
  }
}

async function startGetList() {
  page.value = 1;
  await reloadTemplates(true);
  await nextTick();
  if (scrollBoxRef.value) {
    scrollBoxRef.value.scrollTop = 0;
  }
}

async function nextPage() {
  if (page.value >= pagination.pageCount || pageLoading.value) {
    return;
  }
  page.value += 1;
  await reloadTemplates(false);
}

function handleTemplateScroll(event: Event) {
  const target = event.currentTarget as HTMLElement | null;
  if (!target || pageLoading.value || isDownBottom.value) {
    return;
  }

  const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
  if (distanceToBottom <= 96) {
    void nextPage();
  }
}

const handleFilterChange = debounce(() => {
  startGetList();
}, 120);

function replaceRouteQuery(templateId: number) {
  const query = route.query.admin
    ? {
        tempId: String(templateId),
        admin: 'true',
      }
    : {
        tempId: String(templateId),
      };
  router.replace({ path: '/', query });
}

async function loadTemplateIntoCanvas(templateId: number) {
  Spin.show({
    render: (h) => h('div', t('alert.loading_data')),
  });

  try {
    const template = await loadLocalTemplateById(templateId);
    replaceRouteQuery(templateId);
    canvasEditor.loadJSON(JSON.stringify(template.json), Spin.hide);
  } catch (error) {
    Spin.hide();
    throw error;
  }
}

function beforeClearTip(template: LocalTemplateListItem) {
  Modal.confirm({
    title: t('tip'),
    content: `<p>${t('replaceTip')}</p>`,
    okText: t('ok'),
    cancelText: t('cancel'),
    onOk: async () => {
      await loadTemplateIntoCanvas(template.id);
    },
  });
}

async function loadInitialTemplate() {
  if (!route.query.tempId) {
    return;
  }
  await loadTemplateIntoCanvas(Number(route.query.tempId));
}

onMounted(async () => {
  const categories = await listLocalTemplateCategories();
  typeList.value = [
    { label: '全部', value: '' },
    ...categories.map((item) => ({
      label: item.name,
      value: item.id,
    })),
  ];

  await startGetList();
  await nextTick();
  await loadInitialTemplate();
});
</script>

<style scoped lang="less">
.template-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.search-box {
  flex: 0 0 auto;
  padding-top: 10px;
  padding-bottom: 10px;
  display: flex;

  .input {
    margin-left: 10px;
  }

  .select {
    width: 100px;
  }
}

.scroll-box {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 0 18px;
}

.list-box {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
}

.tmpl-img-box {
  width: 100%;
  cursor: pointer;
  border-radius: 5px;
  overflow: hidden;
  background: #f8fafc;

  &:hover {
    :deep(.ivu-image-img) {
      opacity: 0.8;
    }
  }
}
</style>
