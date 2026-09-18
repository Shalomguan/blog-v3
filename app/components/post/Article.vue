<script setup lang="ts">
import type ArticleProps from '~/types/article'

const props = defineProps<{ eagerImage?: boolean, useUpdated?: boolean } & ArticleProps>()

const showAllDate = isTimeDiffSignificant(props.date, props.updated)

const categoryLabel = computed(() => props.categories?.[0])
const categoryColor = computed(() => getCategoryColor(categoryLabel.value))
const categoryIcon = computed(() => getCategoryIcon(categoryLabel.value))

/**
 * 未配置封面的文章此前会留出整块空白，这里按标题哈希生成稳定的渐变封面。
 * 使用分类色作为基准色，使同一分类的文章视觉上成组；无分类时退回主题色。
 */
const generatedCover = computed(() => {
	if (props.image)
		return undefined

	const seed = props.title || props.path || ''
	let hash = 0
	for (let index = 0; index < seed.length; index++) {
		hash = (hash * 31 + seed.charCodeAt(index)) % 360
	}

	const base = categoryColor.value || 'var(--c-primary)'
	return {
		'--cover-angle': `${hash}deg`,
		'--cover-hue': `${hash}deg`,
		'--cover-base': base,
	}
})
</script>

<template>
<UtilLink class="article-card card">
	<NuxtImg
		v-if="image"
		class="article-cover"
		:src="image"
		:alt="title"
		:decoding="eagerImage ? 'auto' : 'async'"
		:fetchpriority="eagerImage ? 'high' : 'auto'"
		:loading="eagerImage ? 'eager' : 'lazy'"
	/>

	<!-- 无封面时生成装饰性色块（纯装饰，对读屏隐藏） -->
	<div
		v-else-if="generatedCover"
		class="article-cover generated"
		:style="generatedCover"
		aria-hidden="true"
	/>

	<article>
		<h2 class="article-title text-creative">
			{{ title }}
		</h2>

		<p v-if="description" class="article-description">
			{{ description }}
		</p>

		<div class="article-info">
			<span
				v-if="categoryLabel"
				class="article-chip article-category"
				:style="{ '--cg-color': categoryColor }"
			>
				<Icon :name="categoryIcon" />
				{{ categoryLabel }}
			</span>

			<UtilDate
				v-if="date && (showAllDate || !useUpdated)"
				class="article-chip"
				:date="date"
				icon="ph:calendar-dots-bold"
			/>

			<UtilDate
				v-if="updated && (showAllDate || useUpdated)"
				class="article-chip"
				:date="updated"
				icon="ph:calendar-plus-bold"
			/>

			<span v-if="readingTime?.words" class="article-chip article-words">
				<Icon name="ph:paragraph-bold" />
				{{ formatNumber(readingTime?.words) }}字
			</span>
		</div>
	</article>
</UtilLink>
</template>

<style lang="scss" scoped>
.article-card {
	container-type: inline-size;
	position: relative;
	margin: 1rem 0;
	border-radius: 0.8rem;
	color: var(--c-text);
	animation: float-in 0.2s var(--delay) backwards;

	> article {
		display: grid;
		gap: 0.55rem;
		padding: 1.15rem 1.25rem;
	}
}

.article-info {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5em;
	margin-top: 0.15rem;
	font-size: 0.78em;
	color: var(--c-text-2);

	&:empty {
		display: none;
	}

	.use-updated {
		order: -1;
	}
}

// 元信息统一为胶囊芯片，比裸文字更容易扫读
.article-chip {
	display: inline-flex;
	align-items: center;
	gap: 0.35em;
	padding: 0.2em 0.6em;
	border-radius: 999px;
	background-color: var(--c-bg-soft);
	line-height: 1.6;
	white-space: nowrap;
}

.article-title {
	font-size: 1.24em;
	letter-spacing: -0.01em;
	line-height: 1.4;
	color: var(--c-text);
	transition: color 0.2s;

	:hover > article > & {
		color: var(--c-primary);
	}
}

.article-description {
	display: -webkit-box;
	overflow: hidden;
	font-size: 0.9em;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	line-height: 1.7;
	color: var(--c-text-2);
	-webkit-box-orient: vertical;
}

// 分类芯片用分类色着色，是卡片上最醒目的识别点
.article-category {
	background-color: color-mix(in srgb, var(--cg-color) 16%, transparent);
	font-weight: 600;
	color: var(--cg-color);

	:deep(.iconify) {
		color: var(--cg-color);
	}
}

.article-cover {
	position: absolute;
	opacity: 0.8;
	top: 0;
	inset-inline-end: 0;
	width: min(320px, 50%);
	height: 100%;
	margin: 0;
	mask-image: linear-gradient(to var(--end), transparent, #FFF 50%);
	transition: opacity 0.2s;
	object-fit: cover;

	:hover > & {
		opacity: 1;
	}

	// 生成封面：同一分类共享色相，按标题哈希错开角度，避免每张都长一样
	&.generated {
		background-image:
			radial-gradient(circle at 22% 18%, hsl(var(--cover-hue) 90% 72% / 55%), transparent 58%),
			radial-gradient(circle at 78% 82%, hsl(calc(var(--cover-hue) + 48deg) 85% 62% / 45%), transparent 55%),
			linear-gradient(var(--cover-angle), hsl(var(--cover-hue) 70% 58% / 85%), hsl(calc(var(--cover-hue) + 70deg) 65% 52% / 70%));

		&::after {
			content: "";
			position: absolute;
			inset: 0;
			background-image:
				repeating-linear-gradient(
					calc(var(--cover-angle) + 45deg),
					#FFF1 0 1px,
					transparent 1px 9px
				);
			mix-blend-mode: overlay;
		}
	}

	& + article {
		position: relative;
		width: 60%;
		text-shadow: 0 0 0.5rem var(--ld-bg-card), 0 0 1rem var(--ld-bg-card);
	}

	@mixin cover-narrow {
		position: revert;
		width: 100%;
		height: auto;
		max-width: none;
		max-height: 256px;
		aspect-ratio: 2.4;
		margin-bottom: -10%;
		mask-image: linear-gradient(#FFF 50%, transparent);

		& + article {
			width: auto;
		}
	}

	@media (max-width: $breakpoint-phone) {
		@include cover-narrow;
	}

	@container (max-width: #{$breakpoint-phone}) {
		@include cover-narrow;
	}
}
</style>
