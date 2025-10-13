<script setup>
import pack from '../package.json'
import FileInput from './components/FileInput.vue'
import ControlPanel from './components/ControlPanel/ControlPanel.vue'
import Status from './components/Status.vue'

import { useFileStore } from '@/stores/globalStore.js'

const file = useFileStore()
</script>

<template>
    <div class="bs" :class="{ 'bs--stub': !file.loaded }">
        <div>
            <FileInput />
            <ControlPanel />
            <div class="about">
                <a href="https://github.com/MaxAlyokhin/binary-synth" target="_blank" rel="noopener noreferrer">About and sources ({{ pack.version }})</a>
                <a href="https://dfap.stranno.su" target="_blank" rel="noopener noreferrer">by DFAP</a>
            </div>
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

    @media (max-width: 1023px) {
        justify-content: unset;
        width: auto;
        padding: 20px;
    }

    @media (max-width: 675px) {
        flex-direction: column;
    }

    &--stub {
        opacity: 0;
        position: fixed;
    }

    .about {
        padding-top: 10px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        color: rgb(101, 106, 113);

        a {
            text-decoration: none;
            color: rgb(101, 106, 113);

            &:hover {
                text-decoration: underline;
            }
        }
    }
}
</style>
