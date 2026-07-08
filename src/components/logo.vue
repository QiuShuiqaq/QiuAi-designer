<template>
  <div class="logo">
    <img class="logo__image" :src="logoSrc" alt="QiuAi" />
    <div class="logo__text">
      <strong>QiuAi</strong>
      <span>Designer</span>
    </div>
  </div>
</template>

<script setup lang="ts" name="Logo">
import logoSrc from '../../icon/Q.png';
</script>

<style scoped lang="less">
.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: 2px;
}

.logo__image {
  width: 30px;
  height: 30px;
  object-fit: contain;
  display: block;
}

.logo__text {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.05;

  strong {
    font-size: 16px;
    color: #0f172a;
  }

  span {
    font-size: 11px;
    color: #475467;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}
</style>
