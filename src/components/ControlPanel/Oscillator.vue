<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/globalStore.js'
import InteractiveInput from '@/components/ControlPanel/InteractiveInput.vue'

const settings = useSettingsStore()

const gain = ref(null)
watch(gain, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.gain = 0
    } else {
        settings.gain = newValue
    }
})
</script>

<template>
    <div class="module">
        <span class="module-span">Oscillator</span>

        <div class="module__wrapper">
            <div class="module__container">
                <span>Gain</span>
                <InteractiveInput
                    :validValue="settings.gain"
                    @valueFromInput="gain = $event"
                    @restore="gain = settings.gain"
                    step="0.0001"
                    keyCode="KeyW"
                    letter="W"
                />
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
