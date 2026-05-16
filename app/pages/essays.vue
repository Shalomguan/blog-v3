<script setup lang="ts">
import type { TalkContentItem } from '~/types/talk'

const layoutStore = useLayoutStore()
layoutStore.setAside(['blog-stats', 'blog-tech', 'blog-log', 'comm-group'])

const title = '说说'
useSeoMeta({
	title,
	ogTitle: title,
})

const { data: talkData } = await useAsyncData('talks', () =>
	queryCollection('talks')
		.order('date', 'DESC')
		.limit(30)
		.all(),
)

const recentTalks = computed(() => (talkData.value ?? []) as TalkContentItem[])

function replyTalk(content: string): void {
	const input = document.querySelector('#twikoo .tk-input textarea')
	if (!(input instanceof HTMLTextAreaElement)) return

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
		v-for="talk in recentTalks"
		:key="talk.path"
		:talk="talk"
		@reply="replyTalk"
	/>

	<p v-if="!recentTalks.length" class="talk-empty">
		暂无说说
	</p>

	<div class="talk-footer">
		<p>仅显示最近 30 条记录</p>
	</div>
</div>

<PostComment />
</template>

<style lang="scss" scoped>
.talk-list {
	margin: 1rem;
	animation: float-in 0.2s backwards;
}

.talk-empty,
.talk-footer {
	margin: 2rem 0;
	color: var(--c-text-3);
	font-size: 1rem;
	text-align: center;
}
</style>
