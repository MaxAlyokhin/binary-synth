<script setup>
import FileInput from './components/FileInput.vue'
import ControlPanel from './components/ControlPanel.vue'
import Status from './components/Status.vue'
</script>

<template>
    <div class="bs">
        <FileInput />
        <ControlPanel />
        <Status />
    </div>
</template>

<style lang="scss" scoped>
.bs {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    flex-direction: column;
    row-gap: 25px;
    padding: 40px;
}
</style>
