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
    <div class="oscillator module">
        <span class="oscillator-span">Oscillator</span>

        <div class="oscillator__wrapper">
            <div class="oscillator__container">
                <span class="filter-freq key">Gain</span>
                <input v-model="gain" step="0.01" type="number" min="0" name="gain" />
            </div>

            <div class="oscillator__container">
                <span>Wave type</span>
                <select name="wave" class="wave" v-model="settings.waveType">
                    <option value="sine">sine</option>
                    <option value="square">square</option>
                    <option value="sawtooth">sawtooth</option>
                    <option value="triangle">triangle</option>
                </select>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.oscillator {
    grid-column: 1/-1;

    &-span {
        text-align: center;
        display: block;
        margin-bottom: 5px;
    }

    span {
        display: block;
        text-align: center;
        margin-bottom: 5px;
    }

    &__wrapper {
        display: flex;
        justify-content: space-between;
        gap: 10px;
    }

    &__container {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
}
</style>
