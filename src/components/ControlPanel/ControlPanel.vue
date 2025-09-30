<script setup>
// Это важнейший компонент системы
// Он генерирует частоты и ноты, планирует их исполнение
// Здесь создаётся audioContext и коннектится граф

// Файл - это весь файл в принципе
// Фрагмент - это весь или часть файла, определяемая Commands range
// Команда - это байт или два байта в зависимости от Bitness
// Лист - это 500 или 250 команд из фрагмента
// Мы делим файл на "листы" по 500 или 250 команд для 8 и 16-бит соответственно
// и проигрываем их по очереди

// Play вызывает функцию nextList, которая:
// 1 интерпретирует бинарные слова в команды в массив commands[]
// 2 выделяет из фрагмента лист
// 3 планирует работу осциллятора или планирует миди-сообщения по листу
// 4 планирует запуск следующего листа

import { computed, onMounted } from 'vue'
import { useFileStore, useSettingsStore, useStatusStore } from '@/stores/globalStore.js'
import SettingsExchange from '@/components/ControlPanel/SettingsExchange.vue'
import Filter from '@/components/ControlPanel/Filter.vue'
import LFO from '@/components/ControlPanel/LFO.vue'
import Oscillator from '@/components/ControlPanel/Oscillator.vue'
import Global from '@/components/ControlPanel/Global.vue'
import Midi from '@/components/ControlPanel/Midi.vue'

// Composables
import { useAudioGraph } from '@/composables/useAudioGraph.js'
import { useOscillatorScheduler } from '@/composables/useOscillatorScheduler.js'
import { useMidiScheduler } from '@/composables/useMidiScheduler.js'
import { usePlaybackControl } from '@/composables/usePlaybackControl.js'
import { useKeyboardControl } from '@/composables/useKeyboardControl.js'

const file = useFileStore()
const settings = useSettingsStore()
const status = useStatusStore()

const bynaryInSelectedBitness = computed(() => (settings.bitness === '8' ? file.binary8 : file.binary16))

const frequencyCoefficients = computed(() => {
    return {
        continouos8: (settings.frequenciesRange.to - settings.frequenciesRange.from) / 256,
        continouos16: (settings.frequenciesRange.to - settings.frequenciesRange.from) / 65536,
        tempered8: (settings.notesRange.to - settings.notesRange.from) / 256,
        tempered16: (settings.notesRange.to - settings.notesRange.from) / 65536,
    }
})

// Initialize audio graph
const audioGraph = useAudioGraph(settings)

// Initialize oscillator scheduler
const oscillatorScheduler = useOscillatorScheduler(
    settings,
    audioGraph.audioContext,
    audioGraph.oscillator,
    bynaryInSelectedBitness,
    frequencyCoefficients
)

// Initialize MIDI scheduler
const midiScheduler = useMidiScheduler(settings, status, bynaryInSelectedBitness, frequencyCoefficients)

// Initialize playback control
const playbackControl = usePlaybackControl(file, settings, status, audioGraph, oscillatorScheduler, midiScheduler)

// Initialize keyboard control
useKeyboardControl(status, playbackControl.play, playbackControl.stop)

// Setup watchers
audioGraph.setupAudioWatchers(status)
playbackControl.setupPlaybackWatchers(bynaryInSelectedBitness)

onMounted(() => {
    // Если настроек sampleRate нет
    if (settings.sampleRate === null) {
        audioGraph.createAudioGraph()
        audioGraph.setOscillators()
    }
})
</script>

<template>
    <Transition name="opacity" mode="out-in" appear>
        <div class="control" :class="{ deactive: !file.loaded }">
            <SettingsExchange />

            <div class="control__playing">
                <button class="control__play button" :class="{ active: status.playing }" @click="playbackControl.play">Play</button>
                <button class="control__play button" :class="{ deactive: !status.playing && file.loaded }" @click="playbackControl.stop">
                    Stop
                </button>
            </div>

            <div class="control__inputs">
                <Global />
                <Oscillator v-if="!settings.midiMode" />
                <Filter v-if="!settings.midiMode" />
                <LFO v-if="!settings.midiMode" />
                <Midi v-if="settings.midiMode" />
            </div>
        </div>
    </Transition>
</template>

<style lang="scss" scoped>
@import '@/assets/styles/vars.scss';

.control {
    transition: all 200ms ease-in;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    width: 100%;
    max-width: 320px;
    margin: 0 auto;

    &__inputs {
        display: grid;
        grid-row-gap: 10px;
    }

    .input {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
    }

    &__playing {
        display: flex;
        justify-content: center;
        column-gap: 10px;
        width: 100%;
    }
}
</style>
