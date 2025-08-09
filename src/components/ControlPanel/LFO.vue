<script setup>
import { ref, watch, computed } from 'vue'
import { useSettingsStore } from '@/stores/globalStore.js'
import InteractiveInput from './InteractiveInput.vue'

const settings = useSettingsStore()

const mode = computed({
    get() {
        return settings.LFO.enabled
    },
    set(value) {
        // prettier-ignore
        value === 'true'
            ? settings.LFO.enabled = true
            : settings.LFO.enabled = false
        }
})

const depth = ref(null)
watch(depth, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue < 0) {
        settings.LFO.depth = 0
    } else if (newValue > 1) {
        settings.LFO.depth = 1
    } else {
        settings.LFO.depth = newValue
    }
})

const rate = ref(null)
watch(rate, (newValue) => {
    if (isNaN(newValue) || newValue < 0) {
        settings.LFO.rate = 0
    } else if (newValue > 24000) {
        settings.LFO.rate = 24000
    } else {
        settings.LFO.rate = newValue
    }
})
</script>

<template>
    <div class="module">
        <span>LFO</span>
        <div class="module__container module__container--block">
            <span>Connect</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="lfo" id="lfo-on" value="true" checked v-model="mode" />
                    <label class="lfo-on" for="lfo-on">On</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="lfo" id="lfo-off" value="false" v-model="mode" />
                    <label class="lfo-off" for="lfo-off">Off</label>
                </div>
            </div>
        </div>

        <div class="module__wrapper module__wrapper--three">
            <div class="module__container">
                <span>Wave type</span>
                <select name="lfo-wave" class="lfo-wave" v-model="settings.LFO.type">
                    <option value="sine">sine</option>
                    <option value="square">square</option>
                    <option value="square2">square2</option>
                    <option value="sawtooth">sawtooth</option>
                    <option value="sawtooth2">sawtooth2</option>
                    <option value="triangle">triangle</option>
                </select>
            </div>
            <div class="module__container">
                <span>Rate</span>
                <InteractiveInput
                    :validValue="settings.LFO.rate"
                    @valueFromInput="rate = $event"
                    @restore="rate = settings.LFO.rate"
                    step="0.01"
                    keyCode="KeyC"
                    letter="C"
                />
            </div>
            <div class="module__container">
                <span>Depth</span>
                <InteractiveInput
                    :validValue="settings.LFO.depth"
                    @valueFromInput="depth = $event"
                    @restore="depth = settings.LFO.depth"
                    step="0.0001"
                    keyCode="KeyV"
                    letter="V"
                />
            </div>
        </div>
    </div>
</template>
