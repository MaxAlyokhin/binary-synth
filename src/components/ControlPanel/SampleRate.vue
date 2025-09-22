<script setup>
import { useSettingsStore, useStatusStore } from '@/stores/globalStore.js'
import { watch } from 'vue'
import { checkSampleRate, checkFrequenciesWithNewSampleRate } from '../../assets/js/helpers'

const settings = useSettingsStore()
const status = useStatusStore()

// API для получения диапазона возможных sample rate видимо нет
// Мы используем хак, намеренно создавая ошибку (sampleRate = 1 не может быть),
// отлавливая её и перехватывая текст ошибки,
// из которого можно узнать диапазон
// Возвращает объект { minimumSampleRate, maximumSampleRate }
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

watch(
    () => settings.sampleRate,
    (newValue) => {
        settings.sampleRate = checkSampleRate(settings.sampleRateRange.minimum, settings.sampleRateRange.maximum, settings.sampleRate)

        settings.frequenciesRange.to = checkFrequenciesWithNewSampleRate(settings.sampleRate, settings.frequenciesRange.to)
        settings.biquadFilterFrequency = checkFrequenciesWithNewSampleRate(settings.sampleRate, settings.biquadFilterFrequency)
        settings.LFO.rate = checkFrequenciesWithNewSampleRate(settings.sampleRate, settings.LFO.rate)
    }
)
</script>

<template>
    <div
        class="module__wrapper module__container module__container--block-row"
        :class="{ 'module__container--deactive': settings.midiMode }"
    >
        <span>Sample rate</span>
        <input type="number" name="sample-rate" :disabled="status.playing" v-model="settings.sampleRate" />
    </div>
</template>

<style lang="scss" scoped>
input {
    &:disabled {
        cursor: not-allowed;
    }
}
</style>
