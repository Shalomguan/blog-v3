<script setup lang="ts">
const appConfig = useAppConfig()
const timeEstablished = appConfig.timeEstablished

const blogLog = [
	{ label: '2025-12-05', value: '重启博客，数据丢失了，换用Clarity' },
	{ label: '2025-4-05', value: '服务器到期，经济原因无法继续维护博客' },
	{ label: timeEstablished, value: '建立博客' },
]
</script>

<template>
<BlogWidget card title="更新日志">
	<ZDlGroup size="large" :items="blogLog" />
</BlogWidget>
</template>
