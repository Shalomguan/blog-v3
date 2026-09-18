<script setup lang="ts">
import type { TalkContentItem } from '~/types/talk'

const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats', 'blog-tech', 'blog-log', 'comm-group'])

const title = '说说'
useSeoMeta({
	title,
	ogTitle: title,
})

const TALK_PAGE_SIZE = 8

async function queryTalkPage(offset = 0) {
	return await queryCollection('talks')
		.order('date', 'DESC')
		.skip(offset)
		.limit(TALK_PAGE_SIZE + 1)
		.all() as TalkContentItem[]
}

const { data: initialTalks } = await useAsyncData('talks:first-page', () => queryTalkPage(), { default: () => [] })
const initialTalkList = (initialTalks.value ?? []) as TalkContentItem[]
const recentTalks = ref<TalkContentItem[]>(initialTalkList.slice(0, TALK_PAGE_SIZE))
const hasMoreTalks = ref(initialTalkList.length > TALK_PAGE_SIZE)
const loadingMore = ref(false)
const visibleTalks = computed(() => recentTalks.value)

watch(initialTalks, (talks) => {
	const list = (talks ?? []) as TalkContentItem[]
	recentTalks.value = list.slice(0, TALK_PAGE_SIZE)
	hasMoreTalks.value = list.length > TALK_PAGE_SIZE
}, { immediate: true })

async function loadMoreTalks(): Promise<void> {
	if (loadingMore.value || !hasMoreTalks.value)
		return

	loadingMore.value = true
	try {
		const nextTalks = await queryTalkPage(recentTalks.value.length)
		recentTalks.value.push(...nextTalks.slice(0, TALK_PAGE_SIZE))
		hasMoreTalks.value = nextTalks.length > TALK_PAGE_SIZE
	}
	finally {
		loadingMore.value = false
	}
}

const commentAnchor = useTemplateRef<HTMLElement>('comment-anchor')
const showComments = ref(false)

onMounted(() => {
	useIntersectionObserver(
		commentAnchor,
		([entry]) => {
			if (entry?.isIntersecting)
				showComments.value = true
		},
		{ rootMargin: '600px 0px' },
	)
})

async function waitForCommentInput(): Promise<HTMLTextAreaElement | null> {
	for (let attempts = 0; attempts < 30; attempts++) {
		const input = document.querySelector('#twikoo .tk-input textarea')
		if (input instanceof HTMLTextAreaElement)
			return input
		await new Promise(resolve => setTimeout(resolve, 100))
	}

	return null
}

async function replyTalk(content: string): Promise<void> {
	showComments.value = true
	await nextTick()

	const input = await waitForCommentInput()
	if (!input) {
		commentAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		return
	}

	if (content.trim()) {
		const quotes = content.split('\n')
			.map(str => `> ${str}`)
			.join('\n')
		input.value = `${quotes}\n\n`
	}
	else {
		input.value = ''
	}
	input.dispatchEvent(new InputEvent('input'))

	const length = input.value.length
	input.setSelectionRange(length, length)
	input.focus()
}
</script>

<template>
<div class="talk-list">
	<TalkCard
		v-for="(talk, index) in visibleTalks"
		:key="talk.path"
		:talk="talk"
		:eager-media="index < 2"
		@reply="replyTalk"
	/>

	<p v-if="!recentTalks.length" class="talk-empty">
		暂无说说
	</p>

	<button
		v-if="hasMoreTalks"
		class="load-more"
		type="button"
		:disabled="loadingMore"
		@click="loadMoreTalks"
	>
		{{ loadingMore ? '加载中...' : '加载更多' }}
	</button>

	<div class="talk-footer">
		<p>已显示 {{ visibleTalks.length }} 条记录</p>
	</div>
</div>

<div ref="comment-anchor" class="comment-anchor">
	<LazyPostComment v-if="showComments" />
	<button
		v-else
		class="comment-loader"
		type="button"
		@click="showComments = true"
	>
		加载评论
	</button>
</div>
</template>

<style lang="scss" scoped>
.talk-list {
	margin: 1rem;
	animation: float-in 0.2s backwards;
}

.talk-empty,
.talk-footer {
	margin: 2rem 0;
	font-size: 1rem;
	text-align: center;
	color: var(--c-text-3);
}

.load-more,
.comment-loader {
	display: block;
	margin: 1.5rem auto;
	padding: 0.55rem 1rem;
	border-radius: 999px;
	background-color: var(--c-bg-2);
	font-size: 0.9rem;
	color: var(--c-text-2);
	transition: background-color 0.2s, color 0.2s;

	&:hover {
		background-color: var(--c-primary-soft);
		color: var(--c-primary);
	}

	&:disabled {
		opacity: 0.6;
		cursor: progress;
	}
}

.comment-anchor {
	min-height: 6rem;
}
</style>
