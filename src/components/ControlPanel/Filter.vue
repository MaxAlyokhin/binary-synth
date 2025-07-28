<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/globalStore.js'
import InteractiveInput from './InteractiveInput.vue'

const settings = useSettingsStore()

const biquadFilterFrequency = ref(null)
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

const biquadFilterQ = ref(null)
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
                    @valueFromInput="biquadFilterFrequency = $event"
                    @restore="biquadFilterFrequency = settings.biquadFilterFrequency"
                    step="0.1"
                    keyCode="KeyZ"
                    letter="Z"
                />
            </div>
            <div class="module__container">
                <span>Q-factor</span>
                <InteractiveInput
                    :validValue="settings.biquadFilterQ"
                    @valueFromInput="biquadFilterQ = $event"
                    @restore="biquadFilterQ = settings.LFO.biquadFilterQ"
                    step="0.01"
                    keyCode="KeyX"
                    letter="X"
                />
            </div>
        </div>
    </div>
</template>
