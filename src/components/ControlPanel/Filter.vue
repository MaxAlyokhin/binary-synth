<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/global.js'

const settings = useSettingsStore()

const biquadFilterFrequency = ref(settings.biquadFilterFrequency)
const biquadFilterQ = ref(settings.biquadFilterQ)

watch(biquadFilterFrequency, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        biquadFilterFrequency.value = 0
        settings.biquadFilterFrequency = biquadFilterFrequency.value
    } else if (newValue > 24000) {
        biquadFilterFrequency.value = 24000
        settings.biquadFilterFrequency = biquadFilterFrequency.value
    } else {
        biquadFilterFrequency.value = newValue
        settings.biquadFilterFrequency = biquadFilterFrequency.value
    }
})

watch(biquadFilterQ, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        biquadFilterQ.value = 0.0001
        settings.biquadFilterQ = biquadFilterQ.value
    } else if (newValue > 1000) {
        biquadFilterQ.value = 1000
        settings.biquadFilterQ = biquadFilterQ.value
    } else {
        biquadFilterQ.value = newValue
        settings.biquadFilterQ = biquadFilterQ.value
    }
})
</script>

<template>
    <div class="module">
        <span class="module-span">Filter</span>
        <div class="module__wrapper">
            <div class="module__container">
                <span>Frequency</span>
                <input type="number" step="0.1" name="filter" class="filter" v-model="biquadFilterFrequency" />
            </div>
            <div class="module__container">
                <span>Q-factor</span>
                <input type="number" step="0.1" name="factor" class="factor" v-model="biquadFilterQ" />
            </div>
        </div>
    </div>
</template>
