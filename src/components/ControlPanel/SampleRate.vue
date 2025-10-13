<script setup>
import { useSettingsStore, useStatusStore } from '@/stores/globalStore.js'
import { checkSampleRate, checkFrequenciesWithNewSampleRate } from '../../assets/js/helpers.js'
import { ref } from 'vue'

const settings = useSettingsStore()
const status = useStatusStore()

const inputElement = ref(null)

// There is probably no API for getting a range of possible sample rates.
// We are using a hack, intentionally creating an error (sampleRate = 1 cannot be),
// catching it and intercepting the error text,
// from which you can find out the range
// Returns the { minimumSampleRate, maximumSampleRate } object
function getSampleRateRange() {
    let sampleRateRange = null

    try {
        new AudioContext({ sampleRate: 1 })
    } catch (nativeError) {
        const error = String(nativeError)

        sampleRateRange = error
            .slice(error.indexOf('[') + 1, error.indexOf(']'))
            .split(', ')
            .map((rate) => Number(rate))
    }

    return { minimum: sampleRateRange[0], maximum: sampleRateRange[1] }
}

const sampleRateRange = getSampleRateRange()
settings.sampleRateRange.minimum = sampleRateRange.minimum
settings.sampleRateRange.maximum = sampleRateRange.maximum

let validSampleRate = null
function validateSampleRate(newValue) {
    validSampleRate = checkSampleRate(settings.sampleRateRange.minimum, settings.sampleRateRange.maximum, Number(newValue.target.value))

    // Oscillators frequencies maybe inside sample rate range
    settings.frequenciesRange.to = checkFrequenciesWithNewSampleRate(validSampleRate, settings.frequenciesRange.to)
    settings.biquadFilterFrequency = checkFrequenciesWithNewSampleRate(validSampleRate, settings.biquadFilterFrequency)
    settings.LFO.rate = checkFrequenciesWithNewSampleRate(validSampleRate, settings.LFO.rate)

    settings.sampleRate = validSampleRate
    inputElement.value.value = validSampleRate
}
</script>

<template>
    <div
        class="module__wrapper module__container module__container--block-row"
        :class="{ 'module__container--deactive': settings.midiMode }"
    >
        <span>Sample rate</span>
        <input type="number" name="sample-rate" ref="inputElement" :disabled="status.playing" :value="settings.sampleRate" @input="validateSampleRate($event)" />
    </div>
</template>

<style lang="scss" scoped>
input {
    &:disabled {
        cursor: not-allowed;
    }
}
</style>
