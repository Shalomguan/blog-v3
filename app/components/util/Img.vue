<script setup lang="ts">
import ImageComponent from '#build/mdc-image-component.mjs'
import { joinURL, withLeadingSlash, withTrailingSlash } from 'ufo'

const props = withDefaults(defineProps<{
	src: string
	width?: string | number
	height?: string | number
	alt?: string
	decoding?: 'async' | 'auto' | 'sync'
	fetchpriority?: 'auto' | 'high' | 'low'
	loading?: 'eager' | 'lazy'
	mirror?: ImgService
}>(), {
	alt: '',
	decoding: 'async',
	fetchpriority: 'auto',
	loading: 'lazy',
})

const refinedSrc = computed(() => {
	if (props.src.startsWith('/') && !props.src.startsWith('//')) {
		const _base = withLeadingSlash(withTrailingSlash(useRuntimeConfig().app.baseURL))
		if (_base !== '/' && !props.src.startsWith(_base))
			return joinURL(_base, props.src)
	}
	if (props.mirror)
		return getImgUrl(props.src, props.mirror)
	return props.src
})
</script>

<template>
<component
	:is="ImageComponent"
	:src="refinedSrc"
	:alt="alt"
	:width="width"
	:height="height"
	:decoding="decoding"
	:fetchpriority="fetchpriority"
	:loading="loading"
	:referrerpolicy="mirror ? 'no-referrer' : undefined"
/>
</template>
