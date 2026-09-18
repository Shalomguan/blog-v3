import type ArticleProps from '~/types/article'
import type { ArticleOrderType } from '~/types/article'
import { alphabetical } from 'radash'

/**
 * 生成文章查询参数，完全包装 useAsyncData 会使 SSR 行为异常，缓存 key 需要暴露
 * @see https://nuxt.com/docs/4.x/api/composables/use-async-data#usage
 * @see https://github.com/nuxt/nuxt/issues/14736
 * @todo 支持分页/分类筛选
 */
export function useArticleIndexOptions(path = 'posts/%', options?: { includeDrafts?: boolean }) {
	const query = queryCollection('content')
		.where('stem', 'LIKE', path)

	// 未标记 draft 的文章才对外展示，`draft: true` 的草稿不应出现在首页/归档/订阅源
	return (options?.includeDrafts ? query : query.where('draft', '=', false))
		.select('categories', 'date', 'description', 'image', 'path', 'readingTime', 'recommend', 'title', 'type', 'updated')
		.all()
}

interface UseCategoryOptions {
	bindQuery?: string
}

export function useCategory(list: MaybeRefOrGetter<ArticleProps[]>, options?: UseCategoryOptions) {
	const { bindQuery } = options || {}

	const category = bindQuery
		? useRouteQuery(bindQuery, undefined)
		: ref<string | undefined>()

	const categories = computed(() => [...new Set(toValue(list).map(item => item.categories?.[0]))])

	const listCategorized = computed(
		() => toValue(list).filter(
			item => !category.value || item.categories?.[0] === category.value,
		),
	)

	return {
		category,
		categories,
		listCategorized,
	}
}

interface UseArticleSortOptions {
	bindDirectionQuery?: string
	bindOrderQuery?: string
	initialAscend?: boolean
	initialOrder?: ArticleOrderType
}

export function useArticleSort(list: MaybeRefOrGetter<ArticleProps[]>, options?: UseArticleSortOptions) {
	const appConfig = useAppConfig()
	const {
		bindDirectionQuery,
		bindOrderQuery,
		initialAscend = false,
		initialOrder = appConfig.pagination.sortOrder || 'date',
	} = options || {}

	const sortOrder = bindOrderQuery
		? useRouteQuery(bindOrderQuery, initialOrder)
		: ref<ArticleOrderType>(initialOrder)

	const booleanQueryTransformer = {
		get: (val: string) => val === 'true',
		set: (val: boolean) => val.toString(),
	}

	const isAscending = bindDirectionQuery
		? useRouteQuery(bindDirectionQuery, initialAscend.toString(), { transform: booleanQueryTransformer })
		: ref<boolean>(initialAscend)

	const listSorted = computed(() => alphabetical(
		toValue(list),
		item => item[sortOrder.value] || '',
		isAscending.value ? 'asc' : 'desc',
	))

	return {
		sortOrder,
		isAscending,
		listSorted,
	}
}

export function getCategoryIcon(category?: string) {
	const appConfig = useAppConfig()
	return appConfig.article.categories[category!]?.icon ?? 'ph:folder-bold'
}

/**
 * 分类兜底配色。
 *
 * 未在 blog.config 的 article.categories 中声明的分类（新增分类时容易忘记补配置）
 * 此前会拿到 undefined 而全部显示为灰色，这里按名称哈希生成稳定色相，
 * 保证任何分类都有可区分、且每次渲染一致的颜色。
 */
export function getCategoryColor(category?: string) {
	if (!category)
		return undefined

	const appConfig = useAppConfig()
	const configured = appConfig.article.categories[category]?.color
	if (configured)
		return configured

	let hash = 0
	for (let index = 0; index < category.length; index++) {
		hash = (hash * 31 + category.charCodeAt(index)) % 360
	}
	// 与 blog.config 中手工配色保持同一强度区间，避免兜底色比显式配置更刺眼
	return `hsl(${hash}deg 46% 60%)`
}

interface GetPostTypeClassNameOptions {
	prefix?: string
}

export function getPostTypeClassName(type = 'tech', options?: GetPostTypeClassNameOptions) {
	const { prefix = 'text' } = options || {}
	return `${prefix}-${type}`
}
