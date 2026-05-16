<script setup lang="ts">
import { toDate } from 'date-fns-tz'
import type { TalkContentItem } from '~/types/talk'

const props = defineProps<{
	talk: TalkContentItem
}>()

const emit = defineEmits<{
	reply: [content: string]
}>()

const appConfig = useAppConfig()
const { author } = appConfig

const formattedDate = computed(() => toDate(props.talk.date, { timeZone: appConfig.timezone })
	.toLocaleString(undefined, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	})
	.replace(/\//g, '-'))

const replyContent = computed(() => props.talk.description || props.talk.title || '')
</script>

<template>
<article class="talk-item">
	<div class="talk-meta">
		<NuxtImg class="avatar" :src="author.avatar" :alt="author.name" />
		<div class="info">
			<div class="nick">
				{{ author.name }}
				<Icon class="verified" name="ph:seal-check-fill" />
			</div>
			<time class="date" :datetime="talk.date">
				{{ formattedDate }}
			</time>
		</div>
	</div>

	<div class="talk-content">
		<ContentRenderer class="talk-markdown" :value="talk" />

		<div v-if="talk.images?.length" class="images">
			<Pic
				v-for="image in talk.images"
				:key="image"
				class="image"
				:src="image"
			/>
		</div>

		<VideoEmbed
			v-if="talk.video"
			class="video"
			v-bind="talk.video"
			height=""
		/>
	</div>

	<div class="talk-bottom">
		<div class="tags">
			<span v-for="tag in talk.tags" :key="tag" class="tag">
				<Icon name="ph:tag-bold" />
				<span>{{ tag }}</span>
			</span>

			<ZRawLink
				v-if="talk.location"
				class="location"
				v-tip="`搜索: ${talk.location}`"
				:to="`https://bing.com/maps?q=${encodeURIComponent(talk.location)}`"
			>
				<Icon name="ph:map-pin-bold" />
				<span>{{ talk.location }}</span>
			</ZRawLink>
		</div>

		<button
			class="comment-btn"
			type="button"
			v-tip="'评论'"
			@click="emit('reply', replyContent)"
		>
			<Icon name="ph:chats-bold" />
		</button>
	</div>
</article>
</template>

<style lang="scss" scoped>
.talk-item {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	margin-bottom: 1rem;
	padding: 1rem;
	border-radius: 8px;
	box-shadow: 0 0 0 1px var(--c-bg-soft);
	animation: float-in 0.3s backwards;
}

.talk-meta {
	display: flex;
	align-items: center;
	gap: 10px;
}

.avatar {
	width: 3em;
	border-radius: 2em;
	box-shadow: 2px 4px 1rem var(--ld-shadow);
}

.nick {
	display: flex;
	align-items: center;
	gap: 5px;
}

.date {
	color: var(--c-text-3);
	font-family: var(--font-monospace);
	font-size: 0.8rem;
}

.verified {
	color: var(--c-primary);
	font-size: 16px;
}

.talk-content {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	color: var(--c-text-2);
	line-height: 1.6;
}

.talk-markdown {
	:deep(> :first-child) {
		margin-top: 0;
	}

	:deep(> :last-child) {
		margin-bottom: 0;
	}

	:deep(p),
	:deep(ul),
	:deep(ol),
	:deep(blockquote),
	:deep(pre) {
		margin: 0.5rem 0;
	}

	:deep(ul),
	:deep(ol) {
		padding-inline-start: 1.4rem;
	}

	:deep(blockquote) {
		padding: 0.2rem 0.8rem;
		border-inline-start: 4px solid var(--c-border);
		border-radius: 4px;
		background-color: var(--c-bg-2);
		font-size: 0.9rem;
	}

	:deep(code:not(pre code)) {
		padding: 0.1em 0.3em;
		border-radius: 4px;
		background-color: var(--c-bg-2);
		font-size: 0.9em;
	}

	:deep(a[href]) {
		margin: -0.1em -0.2em;
		padding: 0.1em 0.2em;
		background: linear-gradient(var(--c-primary-soft), var(--c-primary-soft)) no-repeat center bottom / 100% 0.1em;
		color: var(--c-primary);
		transition: all 0.2s;

		&:hover {
			border-radius: 0.3em;
			background-size: 100% 100%;
		}
	}

	:deep(img) {
		max-width: 100%;
		border-radius: 8px;
	}
}

.images {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 8px;
}

.image {
	position: relative;
	overflow: hidden;
	padding-bottom: 100%;
	border-radius: 8px;

	:deep(img) {
		position: absolute;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s;

		&:hover {
			transform: scale(1.05);
		}
	}
}

.video {
	margin: 0;
	border-radius: 8px;
}

.talk-bottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	color: var(--c-text-3);
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	font-size: 0.7rem;
}

.tag,
.location {
	display: flex;
	align-items: center;
	padding: 2px 4px;
	border-radius: 4px;
	background-color: var(--c-bg-2);
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		opacity: 0.8;
	}
}

.tag .i-ph\:tag-bold + * {
	margin-left: 0.15em;
}

.location {
	color: var(--c-primary);
}

.comment-btn {
	display: grid;
	place-items: center;
	width: 2rem;
	height: 2rem;
	border-radius: 50%;
	color: var(--c-text-3);
	transition: all 0.2s;

	&:hover {
		background-color: var(--c-bg-soft);
		color: var(--c-text);
	}
}
</style>
