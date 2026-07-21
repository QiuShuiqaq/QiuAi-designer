<template>
  <section class="my-material">
    <div class="my-material__head">
      <h3>我的素材</h3>
      <p>本机图片素材库</p>
    </div>

    <uploadMaterial />
  </section>
</template>

<script setup lang="ts" name="MyMaterial">
import uploadMaterial from './uploadMaterial.vue';
</script>

<style scoped lang="less">
.my-material {
  height: 100%;
  min-height: 0;
}

.my-material__head {
  padding-top: 12px;
}

.my-material__head h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  line-height: 1.3;
}

.my-material__head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}
</style>
