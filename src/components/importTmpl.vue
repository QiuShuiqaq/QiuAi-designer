<template>
  <div>
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

    <div id="myTemplBox" class="scroll-box">
      <Scroll
        v-if="showScroll"
        key="template-scroll"
        :on-reach-bottom="nextPage"
        :height="scrollHeight"
        :distance-to-edge="[-1, -1]"
      >
        <div class="list-box">
          <Tooltip v-for="info in pageData" :key="info.id" :content="info.name" placement="top">
            <div class="tmpl-img-box">
              <Image
                lazy
                :src="info.previewSrc"
                :alt="info.name"
                fit="contain"
                height="100%"
                @click="beforeClearTip(info)"
              />
            </div>
          </Tooltip>
        </div>

        <Spin size="large" fix :show="pageLoading"></Spin>
        <Divider v-if="isDownBottom" plain>已经到底了</Divider>
      </Scroll>
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
const scrollHeight = ref(0);
const showScroll = ref(false);

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
}

async function nextPage() {
  if (page.value >= pagination.pageCount || pageLoading.value) {
    return;
  }
  page.value += 1;
  await reloadTemplates(false);
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
  const scrollElement = document.querySelector('#myTemplBox') as HTMLElement | null;
  if (scrollElement) {
    scrollHeight.value = scrollElement.offsetHeight;
    showScroll.value = true;
  }

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
.search-box {
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
  height: calc(100vh - 108px);
}

.list-box {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
}

.tmpl-img-box {
  width: 140px;
  cursor: pointer;
  border-radius: 5px;
  overflow: hidden;

  &:hover {
    :deep(.ivu-image-img) {
      opacity: 0.8;
    }
  }
}
</style>
