<template>
  <div class="home">
    <Layout>
      <Header :style="{ position: 'fixed', width: '100%', zIndex: 99 }">
        <div class="left">
          <logo></logo>
          <Divider type="vertical" />
          在线设计工具
        </div>

        <div class="right">
          <Button type="primary" to="/" size="small" target="_blank">新建设计</Button>
          <Divider type="vertical" />
          <lang></lang>
        </div>
      </Header>

      <Content :style="{ margin: '40px 20px 0', minHeight: '500px', minWidth: '1200px' }">
        <banner></banner>

        <div class="search-box">
          <Input
            v-model="keyword"
            size="large"
            class="search-input"
            clearable
            search
            enter-button
            placeholder="请输入关键词"
            @on-search="search"
          />

          <TagSelect v-model="selectedCategories" @on-change="search">
            <TagSelectOption v-for="item in typeList" :key="item.id" :name="item.id">
              {{ item.name }}
            </TagSelectOption>
          </TagSelect>
        </div>

        <div
          id="imgBox"
          class="img-box grid"
          v-masonry
          transition-duration="0.3s"
          :gutter="10"
          item-selector=".grid-item"
        >
          <div v-for="info in templList" :key="info.id" v-masonry-tile class="img-item grid-item">
            <Tooltip :content="info.name" placement="top">
              <img :src="info.previewSrc" :alt="info.name" @click="toInfo(info)" />
            </Tooltip>
          </div>
        </div>

        <Page
          v-model="page"
          class="page"
          :total="total"
          :page-size="pageSize"
          show-sizer
          @on-change="handlePageChange"
          @on-page-size-change="handlePageSizeChange"
        />
      </Content>

      <Footer class="layout-footer-center">
        {{ year }} &copy; 北京迅单科技有限公司 京ICP备2022034407号-2
      </Footer>
    </Layout>
  </div>
</template>

<script setup lang="ts" name="TemplateGallery">
import { onMounted, ref } from 'vue';
import { Spin } from 'view-ui-plus';
import { useRouter } from 'vue-router';
import banner from './components/banner.vue';
import logo from '@/components/logo.vue';
import lang from '@/components/lang.vue';
import {
  listLocalTemplateCategories,
  queryLocalTemplates,
  type LocalTemplateListItem,
} from '@/modules/template-library/service';

const router = useRouter();

const year = ref(new Date().getFullYear());
const typeList = ref<Array<{ id: number; name: string }>>([]);
const templList = ref<LocalTemplateListItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const selectedCategories = ref<number[]>([]);

async function getTypeListHandler() {
  const categories = await listLocalTemplateCategories();
  typeList.value = categories.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}

async function getTemplateListHandler() {
  Spin.show();
  try {
    const activeCategory = selectedCategories.value[0] || '';
    const result = await queryLocalTemplates({
      categoryId: activeCategory,
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value,
    });
    total.value = result.total;
    templList.value = result.items;
  } finally {
    Spin.hide();
  }
}

async function search() {
  page.value = 1;
  await getTemplateListHandler();
}

async function handlePageChange(nextPage: number) {
  page.value = nextPage;
  await getTemplateListHandler();
}

async function handlePageSizeChange(nextPageSize: number) {
  pageSize.value = nextPageSize;
  page.value = 1;
  await getTemplateListHandler();
}

function toInfo(info: LocalTemplateListItem) {
  const href = router.resolve({
    path: '/',
    query: {
      tempId: String(info.id),
    },
  });
  window.open(href.href, '_blank');
}

onMounted(async () => {
  await getTypeListHandler();
  await getTemplateListHandler();
});
</script>

<style scoped lang="less">
:deep(.ivu-layout-header) {
  --height: 45px;
  padding: 0;
  border-bottom: 1px solid #eef2f8;
  background: #fff;
  height: var(--height);
  line-height: var(--height);
  display: flex;
  justify-content: space-between;

  .left,
  .right {
    display: flex;
    align-items: center;
  }
}

.layout-footer-center {
  text-align: center;
}

.search-box {
  width: 1200px;
  margin: 20px auto;
  border-radius: 10px;
  background: #ffffffed;
  padding: 20px;
  border: 2px solid #fff;

  :deep(.ivu-tag-select) {
    line-height: 32px;
    max-height: none;
    margin-left: 0;
    margin-top: 20px;

    .ivu-tag {
      font-size: 20px;
      line-height: 32px;
      height: 32px;
    }
  }
}

.img-box {
  width: 1200px;
  margin: 0 auto;

  .grid-item {
    width: 232px;
    cursor: pointer;
    margin-bottom: 5px;

    img {
      width: 100%;
      border-radius: 10px;

      &:hover {
        transform: scale(1.02);
      }
    }
  }
}

.page {
  margin: 20px auto;
  text-align: center;
}
</style>
