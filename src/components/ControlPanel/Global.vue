<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useFileStore, useSettingsStore } from '@/stores/globalStore.js'
import Frequency from './Frequency.vue'
import InteractiveInput from './InteractiveInput.vue'
import { getBooleanFromString } from '../../assets/js/helpers.js'

const settings = useSettingsStore()
const file = useFileStore()

const loop = computed({
    get() {
        return settings.loop
    },
    set(value) {
        settings.loop = getBooleanFromString(value)
    }
})

const midi = computed({
    get() {
        return settings.midiMode
    },
    set(value) {
        settings.midiMode = getBooleanFromString(value)
    }
})
watch(midi, (newValue) => {
    if (settings.midiMode && settings.readingSpeed <= 0.005) {
        settings.readingSpeed = 0.005
    }
})

const gap = computed({
    get() {
        return settings.isRandomTimeGap
    },
    set(value) {
        settings.isRandomTimeGap = getBooleanFromString(value)
    }
})

const readingSpeed = computed(() => settings.readingSpeed)
watch(readingSpeed, (newValue) => {
    if (settings.midiMode && newValue <= 0.005) {
         settings.readingSpeed = 0.005
    } else {
        if (newValue < 0) settings.readingSpeed = 0
        else settings.readingSpeed = newValue
    }
})

const commandsFrom = computed(() => settings.commandsRange.from)
watch(commandsFrom, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.commandsRange.from = 0
    } else if (newValue >= settings.commandsRange.to) {
        settings.commandsRange.from = settings.commandsRange.to - 1
    } else {
        settings.commandsRange.from = newValue
    }
})

// Так как в 16-bit команд в два раза меньше, нужно контролировать, чтобы при переходе из 8-bit на 16-bit не выйти за диапазон
const commandsCount = computed(() => {
    if (file.loaded) return settings.bitness === '8' ? file.binary8.length - 1 : file.binary16.length - 1
})
watch(commandsCount, (newValue) => {
    if (settings.commandsRange.to >= newValue || settings.commandsRange.to === 0) settings.commandsRange.to = newValue
})

const commandsTo = computed(() => settings.commandsRange.to)
watch(commandsTo, (newValue) => {
    nextTick(() => {
        if (isNaN(newValue)) {
            return
        } else if (newValue <= 0) {
            settings.commandsRange.to = 1
        } else if (newValue > commandsCount.value) {
            settings.commandsRange.to = commandsCount.value
        } else if (newValue <= settings.commandsRange.from) {
            settings.commandsRange.to = settings.commandsRange.from + 1
        } else {
            settings.commandsRange.to = newValue
        }
    })
})
</script>

<template>
    <div class="module">
        <span class="module-span">Global</span>

        <div class="module__wrapper">
            <div class="module__container">
                <span class="filter-freq key">Reading speed (s)</span>
                <InteractiveInput
                    :validValue="settings.readingSpeed"
                    @valueFromInput="settings.readingSpeed = $event"
                    step="0.001"
                    keyCode="KeyQ"
                    letter="Q"
                />
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
                    <InteractiveInput
                        :validValue="settings.commandsRange.from"
                        @valueFromInput="settings.commandsRange.from = $event"
                        step="1"
                        keyCode="KeyD"
                        letter="D"
                    />
                </div>
                <div class="module__container">
                    <span>To</span>
                    <InteractiveInput
                        :validValue="settings.commandsRange.to"
                        @valueFromInput="settings.commandsRange.to = $event"
                        step="1"
                        keyCode="KeyF"
                        letter="F"
                    />
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
