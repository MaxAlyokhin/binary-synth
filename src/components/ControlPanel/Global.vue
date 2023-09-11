<script setup>
import { computed, ref, watch } from 'vue'
import { useFileStore, useSettingsStore } from '@/stores/global.js'
import Frequency from './Frequency.vue'
import { getBooleanFromString } from '../../assets/js/helpers.js'

const settings = useSettingsStore()
const file = useFileStore()

const commandsCount = computed(() => {
    if (file.loaded) return settings.bitness === '8' ? file.binary8.length - 1 : file.binary16.length - 1
})

const loop = ref(settings.loop)
watch(loop, (newValue) => (settings.loop = getBooleanFromString(newValue)))

const midi = ref(settings.midiMode)
watch(midi, (newValue) => {
    settings.midiMode = getBooleanFromString(newValue)

    if (settings.midiMode && settings.readingSpeed <= 0.005) {
        readingSpeed.value = 0.005
        settings.readingSpeed = readingSpeed
    }
})

const gap = ref(settings.isRandomTimeGap)
watch(gap, (newValue) => (settings.isRandomTimeGap = getBooleanFromString(newValue)))

const readingSpeed = ref(settings.readingSpeed)
watch(readingSpeed, (newValue) => {
    if (settings.midiMode && newValue <= 0.005) {
        readingSpeed.value = 0.005
        settings.readingSpeed = readingSpeed
    } else {
        readingSpeed.value = newValue
        settings.readingSpeed = readingSpeed
    }
})

const commandsFrom = ref(settings.commandsRange.from)
watch(commandsFrom, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        commandsFrom.value = 0
        settings.commandsRange.from = commandsFrom.value
    } else if (newValue >= settings.commandsRange.to) {
        commandsFrom.value = settings.commandsRange.to - 1
        settings.commandsRange.from = commandsFrom.value
    } else {
        settings.commandsRange.from = commandsFrom.value
    }
})

const commandsTo = ref(settings.commandsRange.to)
watch(commandsTo, (newValue) => {
    // setTimeout to make this check triggered after frequencyFrom
    setTimeout(() => {
        if (isNaN(newValue)) {
            return
        } else if (newValue <= 0) {
            commandsTo.value = 1
            settings.commandsRange.to = commandsTo.value
        } else if (newValue > commandsCount.value) {
            commandsTo.value = commandsCount.value
            settings.commandsRange.to = commandsTo.value
        } else if (newValue <= settings.commandsRange.from) {
            commandsTo.value = settings.commandsRange.from + 1
            settings.commandsRange.to = commandsTo.value
        } else {
            commandsTo.value = newValue
            settings.commandsRange.to = commandsTo.value
        }
    })
})

watch(commandsCount, (newValue) => {
    commandsTo.value = newValue
})
</script>

<template>
    <div class="module">
        <span class="module-span">Global</span>

        <div class="module__wrapper">
            <div class="module__container">
                <span class="filter-freq key">Reading speed (s)</span>
                <input v-model="readingSpeed" step="0.01" type="number" min="0" name="gain" />
            </div>

            <div class="module__container" :class="{ 'module__container--deactive': settings.midiMode }">
                <span>Transition type</span>
                <select name="transition" class="transition" v-model="settings.transitionType">
                    <option value="immediately">immediately</option>
                    <option value="linear">linear</option>
                    <option value="exponential">exponential</option>
                </select>
            </div>
        </div>

        <Frequency />

        <div class="module__container module__container--block">
            <span>Bitness</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="bitness" id="bitness8" value="8" checked v-model="settings.bitness" />
                    <label for="bitness8">8-bit</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="bitness" id="bitness16" value="16" v-model="settings.bitness" />
                    <label for="bitness16">16-bit</label>
                </div>
            </div>
        </div>

        <div class="module__container module__container--block">
            <span class="key">Commands range</span>

            <div class="module__wrapper">
                <div class="module__container">
                    <span>From</span>
                    <input type="number" step="1" name="commands-range-from" class="commands-range-from" v-model="commandsFrom" />
                </div>
                <div class="module__container">
                    <span>To</span>
                    <input type="number" step="1" name="commands-range-to" class="commands-range-to" v-model="commandsTo" />
                </div>
            </div>
        </div>

        <div class="module__container module__container--block">
            <span>Loop</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="loop" id="loop-yes" value="true" checked v-model="loop" />
                    <label for="loop-yes">Yes</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="loop" id="loop-no" value="false" v-model="loop" />
                    <label for="loop-no">No</label>
                </div>
            </div>
        </div>

        <div class="module__container module__container--block">
            <span>Random time gap</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="gap" id="gap-yes" value="true" checked v-model="gap" />
                    <label for="gap-yes">Yes</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="gap" id="gap-no" value="false" v-model="gap" />
                    <label for="gap-no">No</label>
                </div>
            </div>
        </div>

        <div class="module__container module__container--block">
            <span>MIDI</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="midi" id="midi-yes" value="true" v-model="midi" />
                    <label for="midi-yes">Yes</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="midi" id="midi-no" value="false" checked v-model="midi" />
                    <label for="midi-no">No</label>
                </div>
            </div>
        </div>
    </div>
</template>
