<script setup>
import FileInput from './components/FileInput.vue'
import ControlPanel from './components/ControlPanel.vue'
import Status from './components/Status.vue'

import { useFileStore } from '@/stores/global.js'

const file = useFileStore()
</script>

<template>
    <div class="bs" :class="{ 'bs--stub': !file.loaded }">
        <div>
            <FileInput />
            <ControlPanel />
        </div>
        <Status />
    </div>
</template>

<style lang="scss" scoped>
.bs {
    height: 100%;
    width: 100%;
    display: flex;
    gap: 25px;
    padding: 40px;
    justify-content: center;

    @media (max-width: 960px) {
        flex-direction: column;
        justify-content: unset;
        width: auto;
        padding: 20px 0;
    }

    &--stub {
        opacity: 0;
        position: fixed;
    }
}
</style>
