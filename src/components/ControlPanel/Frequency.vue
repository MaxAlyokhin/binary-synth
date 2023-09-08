<script setup>
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/global.js'

const settings = useSettingsStore()

const frequencyFrom = ref(settings.frequenciesRange.from)
watch(frequencyFrom, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        frequencyFrom.value = 0
        settings.frequenciesRange.from = frequencyFrom.value
    } else if (newValue > (settings.midiMode ? 12543 : 24000) || newValue >= settings.frequenciesRange.to) {
        frequencyFrom.value = settings.frequenciesRange.to - 1
        settings.frequenciesRange.from = frequencyFrom.value
    } else {
        settings.frequenciesRange.from = frequencyFrom.value
    }
})

const frequencyTo = ref(settings.frequenciesRange.to)
watch(frequencyTo, (newValue) => {
    // setTimeout чтобы эта проверка сработала после frequencyFrom
    setTimeout(() => {
        if (isNaN(newValue)) {
            return
        } else if (newValue <= 0) {
            frequencyTo.value = 0
            settings.frequenciesRange.to = frequencyTo
        } else if (newValue > (settings.midiMode ? 12543 : 24000)) {
            frequencyTo.value = settings.midiMode ? 12543 : 24000
            settings.frequenciesRange.to = frequencyTo
        } else if (newValue <= settings.frequenciesRange.from) {
            frequencyTo.value = settings.frequenciesRange.from + 1
            settings.frequenciesRange.to = frequencyTo.value
        } else {
            frequencyTo.value = newValue
            settings.frequenciesRange.to = frequencyTo.value
        }
    }, 0)
})

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
    } else if (newValue <= 0) {
        notesTo.value = 0
        settings.notesRange.to = notesTo.value
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
                    <input type="number" step="1" name="frequencies-range-from" class="frequencies-range-from" v-model="frequencyFrom" />
                </div>
                <div class="module__container">
                    <span class="freq-to key">To</span>
                    <input type="number" step="1" name="frequencies-range-to" class="frequencies-range-to" v-model="frequencyTo" />
                </div>
            </div>

            <div v-show="settings.frequencyMode === 'tempered'" class="module__wrapper">
                <div class="module__container">
                    <span>From</span>
                    <div class="notes-range__inputs">
                        <input type="number" step="1" name="notes-range-from" class="notes-range-from" v-model="notesFrom" />
                        <span class="notes-range__from-span"></span>
                    </div>
                </div>
                <div class="module__container">
                    <span class="notes-range-to-span key">To</span>
                    <div class="notes-range__inputs">
                        <input type="number" step="1" name="notes-range-to" class="notes-range-to" v-model="notesTo" />
                        <span class="notes-range__to-span"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
