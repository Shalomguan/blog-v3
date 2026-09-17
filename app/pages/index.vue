<script setup lang="ts">
import { sort } from 'radash'

const appConfig = useAppConfig()
useSeoMeta({
	description: appConfig.description,
	ogImage: appConfig.author.avatar,
})

const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats', 'blog-tech', 'comm-group'])

const { data: listRaw, error: listError, status: listStatus } = await useAsyncData('index_posts', () => useArticleIndexOptions(), { default: () => [] })
const { listSorted, isAscending, sortOrder } = useArticleSort(listRaw, { bindDirectionQuery: 'asc', bindOrderQuery: 'sort' })
const { category, categories, listCategorized } = useCategory(listSorted, { bindQuery: 'category' })
const { page, totalPages, listPaged } = usePagination(listCategorized, { bindQuery: 'page' })

watch(category, () => {
	page.value = 1
})

useSeoMeta({ title: () => (page.value > 1 ? `第${page.value}页` : '') })

const listRecommended = computed(() => sort(
	listRaw.value.filter(item => item?.recommend),
	post => post.recommend || 0,
	true,
))
</script>

<template>
<BlogHeader class="mobile-only" to="/" tag="h1" />

<ClientOnly>
	<LazyPostSlide v-if="listRecommended.length && page === 1 && !category" :list="listRecommended" />
</ClientOnly>

<div class="post-list">
	<div class="toolbar">
		<div>
			<!-- 外层元素用于占位 -->
			<UtilLink to="/preview" class="preview-entrance">
				<Icon name="ph:file-lock-bold" />
				查看预览文章
			</UtilLink>
		</div>

		<PostOrderToggle
			v-model:is-ascending="isAscending"
			v-model:sort-order="sortOrder"
			v-model:category="category"
			:categories
		/>
	</div>

	<TransitionGroup v-if="listPaged.length" tag="menu" class="proper-height" name="float-in">
		<PostArticle
			v-for="article, index in listPaged"
			:key="article.path"
			v-bind="article"
			:eager-image="index < 2"
			:to="article.path"
			:use-updated="sortOrder === 'updated'"
			:style="getFixedDelay(index * 0.05)"
		/>
	</TransitionGroup>

	<p v-else-if="listError" class="post-empty">
		文章加载失败：{{ listError.message }}
	</p>

	<p v-else-if="listStatus !== 'success'" class="post-empty">
		加载中…
	</p>

	<p v-else class="post-empty">
		暂无文章
	</p>

	<ZPagination v-model="page" sticky :total-pages="totalPages" />
</div>
</template>

<style lang="scss" scoped>
.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.preview-entrance {
	position: relative;
	opacity: 0;
	transition: all 0.2s 1s, color 0.2s;
	z-index: -1;

	:hover > &,
	:focus-within > & {
		opacity: 1;
		color: var(--c-primary);
		z-index: 0;
	}
}

.post-list {
	margin: 1rem;
}

.post-empty {
	margin: 20vh 0;
	color: var(--c-text-3);
	text-align: center;
}
</style>
