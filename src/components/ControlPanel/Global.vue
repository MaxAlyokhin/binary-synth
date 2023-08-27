<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/global.js'

const settings = useSettingsStore()

const loop = ref(settings.loop)
watch(loop, (newValue) => {
    // prettier-ignore
    newValue === 'true'
        ? settings.loop = true
        : settings.loop = false
})

const midi = ref(settings.midiMode)
watch(midi, (newValue) => {
    // prettier-ignore
    newValue === 'true'
        ? settings.midiMode = true
        : settings.midiMode = false
})

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
