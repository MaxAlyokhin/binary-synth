<script setup>
import { computed, ref, watch } from 'vue'
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
    },
})

const midi = computed({
    get() {
        return settings.midiMode
    },
    set(value) {
        settings.midiMode = getBooleanFromString(value)
    },
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
    },
})

const panner = ref(null)
watch(panner, (newValue) => {
    if (newValue <= -1) {
        settings.panner = -1
    } else if (newValue >= 1) {
        settings.panner = 1
    } else {
        settings.panner = newValue
    }
})

const readingSpeed = ref(null)
watch(readingSpeed, (newValue) => {
    if (settings.midiMode && newValue <= 0.005) {
        settings.readingSpeed = 0.005
    } else {
        if (newValue <= 0) settings.readingSpeed = 0.00001
        else settings.readingSpeed = newValue
    }
})

const fragmentFrom = ref(null)
watch(fragmentFrom, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.fragment.from = 0
    } else if (newValue >= settings.fragment.to) {
        settings.fragment.from = settings.fragment.to - 1
    } else {
        settings.fragment.from = newValue
    }
})

// Так как в 16-bit команд в два раза меньше, нужно контролировать, чтобы при переходе из 8-bit на 16-bit не выйти за диапазон
const commandsCount = computed(() => {
    if (file.loaded) return settings.bitness === '8' ? file.binary8.length - 1 : file.binary16.length - 1
})
watch(commandsCount, (newValue) => {
    if (settings.fragment.to >= newValue || settings.fragment.to === 0) settings.fragment.to = newValue
})

const fragmentTo = ref(null)
watch(fragmentTo, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue > commandsCount.value) {
        settings.fragment.to = commandsCount.value
    } else if (newValue <= settings.fragment.from) {
        settings.fragment.to = settings.fragment.from + 1
    } else {
        settings.fragment.to = newValue
    }
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
                    @valueFromInput="readingSpeed = $event"
                    @restore="readingSpeed = settings.readingSpeed"
                    step="0.00001"
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

        <div class="module__container module__container--row">
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

            <div class="module__container module__container--block" :class="{ 'module__container--deactive': settings.midiMode }">
                <span>Panner</span>
                <div class="module__container">
                    <InteractiveInput
                        :validValue="settings.panner"
                        @valueFromInput="panner = $event"
                        @restore="panner = settings.panner"
                        step=".001"
                        keyCode="KeyG"
                        letter="G"
                    />
                </div>
            </div>
        </div>

        <div class="module__container module__container--block">
            <span class="key">Fragment</span>

            <div class="module__wrapper">
                <div class="module__container">
                    <span>From</span>
                    <InteractiveInput
                        :validValue="settings.fragment.from"
                        @valueFromInput="fragmentFrom = $event"
                        @restore="fragmentFrom = settings.fragment.from"
                        step="1"
                        keyCode="KeyD"
                        letter="D"
                    />
                </div>
                <div class="module__container">
                    <span>To</span>
                    <InteractiveInput
                        :validValue="settings.fragment.to"
                        @valueFromInput="fragmentTo = $event"
                        @restore="fragmentTo = settings.fragment.to"
                        step="1"
                        keyCode="KeyF"
                        letter="F"
                    />
                </div>
            </div>
        </div>

        <div class="module__container module__container--block-row">
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

        <div class="module__container module__container--block-row">
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

        <div class="module__container module__container--block-row">
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
