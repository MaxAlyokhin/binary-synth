<script setup>
import { computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/globalStore.js'
import { getNoteName } from '../../assets/js/notes.js'
import InteractiveInput from './InteractiveInput.vue'

const settings = useSettingsStore()

watch(() => settings.frequenciesRange.from, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.frequenciesRange.from = 0
    } else if (newValue > (settings.midiMode ? 12543 : 24000) || newValue >= settings.frequenciesRange.to) {
        settings.frequenciesRange.from = settings.frequenciesRange.to - 1
    }
})

watch(() => settings.frequenciesRange.to, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue > (settings.midiMode ? 12543 : 24000)) {
        settings.frequenciesRange.to = settings.midiMode ? 12543 : 24000
    } else if (newValue <= settings.frequenciesRange.from) {
        settings.frequenciesRange.to = settings.frequenciesRange.from + 1
    }
})

const noteNameFrom = computed(() => getNoteName(Math.floor(settings.notesRange.from)))
const noteNameTo = computed(() => getNoteName(Math.floor(settings.notesRange.to)))

watch(() => settings.notesRange.from, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.notesRange.from = 0
    } else if (newValue > (settings.midiMode ? 127 : 131) || newValue >= settings.notesRange.to) {
        settings.notesRange.from = settings.notesRange.to - 1
    }
})

watch(() => settings.notesRange.to, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue >= (settings.midiMode ? 127 : 131)) {
        settings.notesRange.to = settings.midiMode ? 127 : 131
    } else if (newValue <= settings.notesRange.from) {
        settings.notesRange.to = settings.notesRange.from + 1
    }
})

watch(() => settings.midiMode, () => {
    if (settings.frequenciesRange.from >= 12542) settings.frequenciesRange.from = 12542
    if (settings.frequenciesRange.to >= 12543) settings.frequenciesRange.to = 12543
    if (settings.notesRange.from >= 126) settings.notesRange.from = 126
    if (settings.notesRange.to >= 127) settings.notesRange.to = 127
})
</script>

<template>
    <div class="">
        <div class="module__container module__container--block">
            <span class="key">Frequency generation mode</span>

            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input v-model="settings.frequencyMode" type="radio" name="frequency" id="continuous" value="continuous" checked />
                    <label class="continuous" for="continuous">Continuous</label>
                </div>

                <div class="radio-element">
                    <input v-model="settings.frequencyMode" type="radio" name="frequency" id="tempered" value="tempered" />
                    <label class="tempered" for="tempered">Tempered</label>
                </div>
            </div>

            <span class="key" style="margin-top: 15px">Frequencies range</span>

            <div v-if="settings.frequencyMode === 'continuous'" class="module__wrapper">
                <div class="module__container">
                    <span>From</span>
                    <InteractiveInput
                        :validValue="settings.frequenciesRange.from"
                        @valueFromInput="settings.frequenciesRange.from = $event"
                        step="0.1"
                        keyCode="KeyA"
                        letter="A"
                    />
                </div>
                <div class="module__container">
                    <span class="freq-to key">To</span>
                    <InteractiveInput
                        :validValue="settings.frequenciesRange.to"
                        @valueFromInput="settings.frequenciesRange.to = $event"
                        step="0.1"
                        keyCode="KeyS"
                        letter="S" />
                </div>
            </div>

            <div v-else="settings.frequencyMode === 'tempered'" class="module__wrapper">
                <div class="module__container">
                    <span>From</span>
                    <div class="notes-range__inputs">
                        <InteractiveInput
                            :validValue="settings.notesRange.from"
                            @valueFromInput="settings.notesRange.from = $event"
                            step="0.01"
                            keyCode="KeyA"
                            letter="A"
                        />
                        <span class="notes-range__from-span">{{ noteNameFrom }}</span>
                    </div>
                </div>
                <div class="module__container">
                    <span class="notes-range-to-span key">To</span>
                    <div class="notes-range__inputs">
                        <InteractiveInput
                            :validValue="settings.notesRange.to"
                            @valueFromInput="settings.notesRange.to = $event"
                            step="0.01"
                            keyCode="KeyS"
                            letter="S"
                        />
                        <span class="notes-range__to-span">{{ noteNameTo }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.notes-range {
    &__inputs {
        position: relative;

        span {
            position: absolute;
            top: 4px;
            left: 95px;
            line-height: 13px;
            z-index: 10;
        }

        input {
            color: transparent;
            appearance: textfield;
        }
    }
}
</style>
