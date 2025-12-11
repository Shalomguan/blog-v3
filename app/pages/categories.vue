<script setup lang="ts">
const appConfig = useAppConfig()
const layoutStore = useLayoutStore()

// 1. 设置侧边栏
layoutStore.setAside([])

// 2. 获取数据
const { data: categoryData } = await useAsyncData('all-categories-stats', async () => {
  // 获取所有内容
  const allDocs = await queryCollection('content').all()

  const stats: Record<string, number> = {}

  if (Array.isArray(allDocs)) {
    allDocs.forEach((article: any) => {
      // 【核心修复】不再强制检查 /posts/ 路径
      // 只要文章不是 link 或 about 这种特殊页面，且有分类字段，就纳入统计
      const path = article.path || article._path
      if (path === '/link' || path === '/about') return 

      // 获取分类
      const rawCats = article.categories
      if (!rawCats) return // 如果没有分类字段，直接跳过

      // 【防弹处理】不管 md 里写的是 "测试" 还是 ["测试"]，都统一转成数组
      let catList: string[] = []
      if (Array.isArray(rawCats)) {
        catList = rawCats
      } else if (typeof rawCats === 'string') {
        // 如果是字符串，按逗号分隔（防止有人写 "技术,前端"）
        catList = rawCats.split(/[,，]/).map(s => s.trim())
      }

      // 统计数量
      catList.forEach((cat) => {
        if (cat) {
          stats[cat] = (stats[cat] || 0) + 1
        }
      })
    })
  }

  // 转换为数组并按数量排序
  return Object.entries(stats)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})

useSeoMeta({
  title: '分类索引',
  description: `${appConfig.title}的文章分类索引页面。`,
})
</script>

<template>
  <div class="mobile-only">
    <BlogHeader to="/" suffix="分类" tag="h1" />
  </div>

  <div class="categories-container">
    <div class="hidden md:flex items-center gap-2 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
      <Icon name="ph:folders-bold" class="text-2xl text-gray-500" />
      <h1 class="text-2xl font-bold">全站分类</h1>
      <span class="text-sm text-gray-400 ml-auto" v-if="categoryData">
        共 {{ categoryData.length }} 个类目
      </span>
    </div>

    <div v-if="categoryData && categoryData.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <NuxtLink
        v-for="cat in categoryData"
        :key="cat.name"
        :to="`/categories/${cat.name}`"
        class="category-card group"
      >
        <div class="flex items-center justify-between mb-2">
          <Icon name="ph:folder-notch-open-duotone" class="icon" />
          <span class="count">{{ cat.count }}</span>
        </div>
        <div class="name">{{ cat.name }}</div>
        <div class="bg-decoration"></div>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-12 text-gray-400">
      <Icon name="ph:ghost" class="text-4xl mb-2" />
      <p>还没有读取到分类</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.categories-container {
  margin: 1rem;
  @media (min-width: 768px) { margin: 2rem; }
}

.category-card {
  @apply relative flex flex-col p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 transition-all duration-300;
  &:hover {
    @apply shadow-lg -translate-y-1 border-blue-100 dark:border-blue-900;
    .icon { @apply text-blue-500 scale-110; }
    .bg-decoration { @apply opacity-100; }
  }
  .icon { @apply text-2xl text-gray-400 transition-all duration-300; }
  .count { @apply text-xs font-mono text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 rounded-full; }
  .name { @apply font-bold text-gray-700 dark:text-gray-200 truncate mt-2; }
  .bg-decoration { @apply absolute inset-0 bg-blue-50/50 dark:bg-blue-500/5 opacity-0 rounded-2xl transition-opacity duration-300 pointer-events-none; }
}
.hidden { display: none; }
.md\:flex { @media (min-width: 768px) { display: flex; } }
</style>