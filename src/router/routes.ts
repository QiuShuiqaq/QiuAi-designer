import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views/home/index.vue'),
  },
  {
    path: '/template',
    component: () => import('@/views/template/index.vue'),
  },
];

export default routes;
