<script setup>
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/globalStore.js'
import { getNoteName } from '../../assets/js/notes.js'
import InteractiveInput from './InteractiveInput.vue'

const settings = useSettingsStore()

const frequencyFrom = ref(null)
watch(frequencyFrom, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.frequenciesRange.from = 0
    } else if (newValue > (settings.midiMode ? 12543 : 24000) || newValue >= settings.frequenciesRange.to) {
        settings.frequenciesRange.from = settings.frequenciesRange.to - 1
    } else {
        settings.frequenciesRange.from = newValue
    }
})

const frequencyTo = ref(null)
watch(frequencyTo, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue > (settings.midiMode ? 12543 : 24000)) {
        settings.frequenciesRange.to = settings.midiMode ? 12543 : 24000
    } else if (newValue <= settings.frequenciesRange.from) {
        settings.frequenciesRange.to = settings.frequenciesRange.from + 1
    } else {
        settings.frequenciesRange.to = newValue
    }
})

const noteNameFrom = computed(() => getNoteName(settings.notesRange.from))
const noteNameTo = computed(() => getNoteName(settings.notesRange.to))

const notesFrom = ref(settings.notesRange.from)
watch(notesFrom, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        notesFrom.value = 0
        settings.notesRange.from = notesFrom.value
    } else if (newValue > (settings.midiMode ? 127 : 131) || newValue >= settings.notesRange.to) {
        notesFrom.value = settings.notesRange.to - 1
        settings.notesRange.from = notesFrom.value
    } else {
        notesFrom.value = newValue
        settings.notesRange.from = notesFrom.value
    }
})

const notesTo = ref(settings.notesRange.to)
watch(notesTo, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue >= (settings.midiMode ? 127 : 131)) {
        notesTo.value = settings.midiMode ? 127 : 131
        settings.notesRange.to = notesTo.value
    } else if (newValue <= settings.notesRange.from) {
        notesTo.value = settings.notesRange.from + 1
        settings.notesRange.to = notesTo.value
    } else {
        notesTo.value = newValue
        settings.notesRange.to = notesTo.value
    }
})

const midi = computed(() => settings.midiMode)
watch(midi, () => {
    if (frequencyFrom.value >= 12542) frequencyFrom.value = 12542
    if (frequencyTo.value >= 12543) frequencyTo.value = 12543
    if (notesFrom.value >= 126) notesFrom.value = 126
    if (notesTo.value >= 127) notesTo.value = 127
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

            <div v-show="settings.frequencyMode === 'continuous'" class="module__wrapper">
                <div class="module__container">
                    <span>From</span>
                    <InteractiveInput
                        :validValue="settings.frequenciesRange.from"
                        @valueFromInput="frequencyFrom = $event"
                        step="0.1"
                        keyCode="KeyA"
                        letter="A"
                    />
                </div>
                <div class="module__container">
                    <span class="freq-to key">To</span>
                    <InteractiveInput
                        :validValue="settings.frequenciesRange.to"
                        @valueFromInput="frequencyTo = $event"
                        step="0.1"
                        keyCode="KeyS"
                        letter="S" />
                </div>
            </div>

            <div v-show="settings.frequencyMode === 'tempered'" class="module__wrapper">
                <div class="module__container">
                    <span>From</span>
                    <div class="notes-range__inputs">
                        <input type="number" step="1" name="notes-range-from" class="notes-range-from" v-model="notesFrom" />
                        <span class="notes-range__from-span">{{ noteNameFrom }}</span>
                    </div>
                </div>
                <div class="module__container">
                    <span class="notes-range-to-span key">To</span>
                    <div class="notes-range__inputs">
                        <input type="number" step="1" name="notes-range-to" class="notes-range-to" v-model="notesTo" />
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
            left: 6px;
        }

        input {
            color: transparent;
            appearance: textfield;
        }
    }
}
</style>
