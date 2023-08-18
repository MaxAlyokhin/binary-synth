<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/global.js'

const settings = useSettingsStore()

const frequencyFrom = ref(settings.frequenciesRange.from)
const frequencyTo = ref(settings.frequenciesRange.to)
const notesFrom = ref(settings.notesRange.from)
const notesTo = ref(settings.notesRange.to)

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

watch(frequencyTo, (newValue) => {
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
})

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
</script>

<template>
    <div class="frequencies module">
        <span class="frequencies-span">Frequency</span>

        <div class="frequency-regime">
            <span class="key">Frequency generation mode</span>

            <div class="frequency-regime__container">
                <div class="radio-element">
                    <input v-model="settings.frequencyMode" type="radio" name="frequency" id="continuous" value="continuous" checked />
                    <label class="continuous" for="continuous">Continuous</label>
                </div>

                <div class="radio-element">
                    <input v-model="settings.frequencyMode" type="radio" name="frequency" id="tempered" value="tempered" />
                    <label class="tempered" for="tempered">Tempered</label>
                </div>
            </div>
        </div>

        <div v-show="settings.frequencyMode === 'continuous'" class="frequencies-range">
            <div class="frequencies-range__container slide">
                <span class="freq-from key">From</span>
                <input type="number" step="1" name="frequencies-range-from" class="frequencies-range-from" v-model="frequencyFrom" />
            </div>
            <div class="frequencies-range__container slide">
                <span class="freq-to key">To</span>
                <input type="number" step="1" name="frequencies-range-to" class="frequencies-range-to" v-model="frequencyTo" />
            </div>
        </div>

        <div v-show="settings.frequencyMode === 'tempered'" class="notes-range">
            <div class="notes-range__container slide">
                <span class="notes-range-from-span key">From</span>
                <div class="notes-range__inputs">
                    <input type="number" step="1" name="notes-range-from" class="notes-range-from" v-model="notesFrom" />
                    <span class="notes-range__from-span"></span>
                </div>
            </div>
            <div class="notes-range__container slide">
                <span class="notes-range-to-span key">To</span>
                <div class="notes-range__inputs">
                    <input type="number" step="1" name="notes-range-to" class="notes-range-to" v-model="notesTo" />
                    <span class="notes-range__to-span"></span>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.frequencies {
    grid-column: 1/-1;

    &-span {
        text-align: center;
        display: block;
        margin-bottom: 5px;
    }

    .frequency-regime {
        border: 1px solid rgb(201, 209, 204);
        border-radius: 5px;
        padding: 5px;
        margin-bottom: 10px;

        span {
            display: block;
            text-align: center;
            margin-bottom: 5px;
        }

        &__container {
            display: flex;
            justify-content: space-around;

            input[type='radio'] {
                margin-right: 5px;
            }
        }
    }

    .frequencies-range,
    .notes-range {
        display: flex;
        justify-content: space-between;
        gap: 10px;

        &__container {
            display: flex;
            flex-direction: column;
            align-items: center;

            span {
                margin-bottom: 5px;
            }
        }
    }
}
</style>
