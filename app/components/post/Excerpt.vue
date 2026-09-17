<script setup lang="ts">
const props = defineProps<{
	excerpt: string
}>()

const appConfig = useAppConfig()

const excerpt = ref(props.excerpt)
const caret = ref('')

if (appConfig.component.excerpt?.animation !== false) {
	onMounted(async () => {
		// 尊重用户的减少动态效果偏好
		if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
			return

		// 此处才清空：预渲染与首屏 HTML 保留完整摘要，避免服务端输出空内容
		// 打字机播放期间高度由 .excerpt-sizer 占位固定，因此正文不会被持续下推
		excerpt.value = ''
		caret.value = appConfig.component.excerpt?.caret ?? '_'
		for (const char of props.excerpt) {
			excerpt.value += char
			await delay(50)
		}
		caret.value = ''
	})
}

if (import.meta.dev) {
	watch(() => props.excerpt, (newExcerpt) => {
		excerpt.value = newExcerpt
	})
}
</script>

<template>
<div class="md-excerpt gradient-card">
	<Icon name="ph:highlighter-bold" />
	<span class="excerpt-body">
		<!-- 用完整摘要占位撑起高度，使打字机播放时容器尺寸不变 -->
		<span class="excerpt-sizer" aria-hidden="true">{{ props.excerpt }}</span>
		<span class="excerpt-live">{{ excerpt }}{{ caret }}</span>
	</span>
</div>
</template>

<style lang="scss" scoped>
@keyframes fadein {
	from { opacity: 0; }
	to { opacity: 1; }
}

.md-excerpt {
	margin: 1rem;
	padding: 0.5rem;
	font-size: 0.9em;
	color: var(--c-text-2);

	// animation: fadein 3s;

	.iconify {
		margin-inline-end: 0.3em;
	}

	&:hover {
		color: currentcolor;
	}
}

.excerpt-body {
	position: relative;
	display: inline;
}

// 不可见但参与布局，负责固定容器高度
.excerpt-sizer {
	visibility: hidden;
}

// 覆盖在占位文本之上，逐字显示时不会改变容器高度
.excerpt-live {
	position: absolute;
	inset-block-start: 0;
	inset-inline-start: 0;
}
</style>
