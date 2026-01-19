<script setup>
import { useSettingsStore } from '../../stores/globalStore.js'
import InteractiveInput from './InteractiveInput.vue'

const settings = useSettingsStore()

function validateLFORate(newValue) {
    if (isNaN(newValue) || newValue < 0) {
        settings.LFO.rate = 0
    } else if (newValue > settings.sampleRate / 2) {
        settings.LFO.rate = settings.sampleRate / 2
    } else {
        settings.LFO.rate = newValue
    }
}

function validateLFODepth(newValue) {
    if (isNaN(newValue)) {
        return
    } else if (newValue < 0) {
        settings.LFO.depth = 0
    } else if (newValue > 1) {
        settings.LFO.depth = 1
    } else {
        settings.LFO.depth = newValue
    }
}
</script>

<template>
    <div class="module">
        <span>LFO</span>
        <div class="module__container module__container--block-row">
            <span>Connect</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="lfo" id="lfo-on" :value="true" checked v-model="settings.LFO.enabled" />
                    <label class="lfo-on" for="lfo-on">On</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="lfo" id="lfo-off" :value="false" v-model="settings.LFO.enabled" />
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
                    @valueFromInput="validateLFORate($event)"
                    step="0.01"
                    keyCode="KeyC"
                    letter="C"
                />
            </div>
            <div class="module__container">
                <span>Depth</span>
                <InteractiveInput
                    :validValue="settings.LFO.depth"
                    @valueFromInput="validateLFODepth($event)"
                    step="0.0001"
                    keyCode="KeyV"
                    letter="V"
                />
            </div>
        </div>
    </div>
</template>
