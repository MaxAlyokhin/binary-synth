<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/global.js'

const settings = useSettingsStore()

const mode = ref(settings.LFO.enabled)
const depth = ref(settings.LFO.depth)
const rate = ref(settings.LFO.rate)

watch(mode, (newValue) => {
    // prettier-ignore
    newValue === 'true'
        ? settings.LFO.enabled = true
        : settings.LFO.enabled = false
})

watch(depth, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue < 0) {
        depth.value = 0
        settings.LFO.depth = depth.value
    } else if (newValue > 1) {
        depth.value = 1
        settings.LFO.depth = depth.value
    } else {
        depth.value = newValue
        settings.LFO.depth = depth.value
    }
})

watch(rate, (newValue) => {
    if (isNaN(newValue) || newValue < 0) {
        rate.value = 0
        settings.LFO.rate = rate.value
    } else if (newValue > 24000) {
        rate.value = 24000
        settings.LFO.rate = rate.value
    } else {
        rate.value = newValue
        settings.LFO.rate = rate.value
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
                <span>Type of wave</span>
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
                <input type="number" step="0.1" name="rate" class="rate" v-model="rate" />
            </div>
            <div class="module__container">
                <span>Depth</span>
                <input type="number" step="0.01" name="depth" class="depth" v-model="depth" />
            </div>
        </div>
    </div>
</template>
