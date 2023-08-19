<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/global.js'

const settings = useSettingsStore()

const gain = ref(settings.gain)

watch(gain, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        gain.value = 0
        settings.gain = gain.value
    } else {
        gain.value = newValue
        settings.gain = gain.value
    }
})
</script>

<template>
    <div class="module">
        <span class="module-span">Oscillator</span>

        <div class="module__wrapper">
            <div class="module__container">
                <span>Gain</span>
                <input v-model="gain" step="0.01" type="number" min="0" name="gain" />
            </div>

            <div class="module__container">
                <span>Wave type</span>
                <select name="wave" class="wave" v-model="settings.waveType">
                    <option value="sine">sine</option>
                    <option value="square">square</option>
                    <option value="square2">square2</option>
                    <option value="sawtooth">sawtooth</option>
                    <option value="sawtooth2">sawtooth2</option>
                    <option value="triangle">triangle</option>
                </select>
            </div>
        </div>
    </div>
</template>
