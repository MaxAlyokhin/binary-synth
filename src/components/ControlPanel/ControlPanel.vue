<script setup>
// This is an essential component of the system
// It generates frequencies and notes, and plans their execution
// An AudioContext is created here and a audiograph is connected

// Terminology:
// A file - is the whole file
// A fragment - is the whole or part of a file defined by Fragment
// A binary word - is a byte or two bytes, depending on Bitness
// A binary ID - this is the ordinal number of the binary word
// A command is a binary word converted to a frequency in Hz or a MIDI-message
// A list is 500 or 250 commands from a fragment
// We divide the fragment of file into "lists" of 500 or 250 commands for 8 and 16-bit, respectively
// and we play them one at a time

// play() calls the nextList() function, which:
// 1 selects a list from a fragment
// 2 interprets binary words on list into commands in an array commands[]
// 3 schedules the operation of the oscillator or schedules midi messages on the list
// 4 plans to launch the next list with nextList() function

import { computed, onMounted } from 'vue'
import { useFileStore, useSettingsStore, useStatusStore } from '../../stores/globalStore.js'

// Components
import SettingsExchange from './SettingsExchange.vue'
import Filter from './Filter.vue'
import LFO from './LFO.vue'
import Oscillator from './Oscillator.vue'
import Global from './Global.vue'
import Midi from './Midi.vue'

// Composables
import { useAudioGraph } from '../../composables/useAudioGraph.js'
import { useOscillatorScheduler } from '../../composables/useOscillatorScheduler.js'
import { useMidiScheduler } from '../../composables/useMidiScheduler.js'
import { usePlaybackControl } from '../../composables/usePlaybackControl.js'
import { useKeyboardControl } from '../../composables/useKeyboardControl.js'

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
    // If sampleRate settings not exist
    if (settings.sampleRate === null || audioGraph.audioContext.value === null) {
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
