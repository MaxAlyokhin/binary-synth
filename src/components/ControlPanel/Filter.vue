<script setup>
import { ref, watch, computed } from 'vue'
import { useSettingsStore } from '@/stores/globalStore.js'
import InteractiveInput from './InteractiveInput.vue'

const settings = useSettingsStore()

const biquadFilterFrequency = computed(() => settings.biquadFilterFrequency)
const biquadFilterQ = computed(() => settings.biquadFilterQ)

watch(biquadFilterFrequency, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.biquadFilterFrequency = 0
    } else if (newValue > 24000) {
        settings.biquadFilterFrequency = 24000
    } else {
        settings.biquadFilterFrequency = newValue
    }
})

watch(biquadFilterQ, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.biquadFilterQ = 0.0001
    } else if (newValue > 1000) {
        settings.biquadFilterQ = 1000
    } else {
        settings.biquadFilterQ = newValue
    }
})
</script>

<template>
    <div class="module">
        <span class="module-span">Filter</span>
        <div class="module__wrapper">
            <div class="module__container">
                <span>Frequency</span>
                <InteractiveInput
                    :validValue="settings.biquadFilterFrequency"
                    @valueFromInput="settings.biquadFilterFrequency = $event"
                    step="0.1"
                    keyCode="KeyZ"
                    letter="Z"
                />
            </div>
            <div class="module__container">
                <span>Q-factor</span>
                <InteractiveInput
                    :validValue="settings.biquadFilterQ"
                    @valueFromInput="settings.biquadFilterQ = $event"
                    step="0.1"
                    keyCode="KeyX"
                    letter="X"
                />
            </div>
        </div>
    </div>
</template>
