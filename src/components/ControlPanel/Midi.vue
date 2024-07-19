<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/globalStore.js'
import sendMIDIMessage from '../../assets/js/midiMessages.js'
import { getBooleanFromString } from '../../assets/js/helpers';

const settings = useSettingsStore()

let midi = null // MIDI object
const outputs = ref([])

function onMIDISuccess(midiAccess) {
    midi = midiAccess

    // Find all the ports, collect their IDs and write them in <option>
    for (const entry of midi.outputs) {
        outputs.value.push(entry[1])
    }

    // Connect to the first port on the list
    if (outputs.value[0]) {
        settings.midi.noMIDIPortsFound = false
        settings.midi.port = midi.outputs.get(outputs.value[0].id)
        port.value = outputs.value[0].id
        sendMIDIMessage.modulation(settings.midi.modulation, settings.midi.port, settings.midi.channel)
    } else {
        settings.midi.noMIDIPortsFound = true
    }

    setTimeout(() => {
        document.querySelector('select[name=port]').selectedIndex = 0
    })
}

function onMIDIFailure(error) {
    throw new Error(`Failed to get MIDI access: ${error}`)
}

onMounted(() => {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure)
    } else {
        alert(`MIDI is not supported on this browser.`)
    }
})

const velocity = computed(() => settings.midi.velocity)
watch(velocity, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.midi.velocity = 0
    } else if (newValue >= 127) {
        settings.midi.velocity = 127
    } else {
        settings.midi.velocity = newValue
    }
})

const modulationValue = computed(() => settings.midi.modulation)
watch(modulationValue, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.midi.modulation = 0
    } else if (newValue >= 127) {
        settings.midi.modulation = 127
    } else {
        settings.midi.modulation = newValue
    }

    sendMIDIMessage.modulation(settings.midi.modulation, settings.midi.port, settings.midi.channel)
})

const port = ref(null)
watch(port, (newValue) => {
    settings.midi.port = midi.outputs.get(newValue)
})

const channel = computed(() => settings.midi.channel)
watch([port, channel], () => {
    sendMIDIMessage.modulation(settings.midi.modulation, settings.midi.port, settings.midi.channel)
})

const solidMode = computed({
    get() {
        return settings.midi.solidMode
    },
    set(value) {
        settings.midi.solidMode = getBooleanFromString(value)
    }
})

const lastNoteOn = computed({
    get() {
        return settings.midi.lastNoteOn
    },
    set(value) {
        settings.midi.lastNoteOn = getBooleanFromString(value)
    }
})
// watch(solidMode, (newValue) => (settings.midi.solidMode = getBooleanFromString(newValue)))
</script>

<template>
    <div class="module">
        <span class="module-span">MIDI</span>

        <div class="module__wrapper">
            <div class="module__container">
                <span>Port</span>
                <select v-model="port" name="port">
                    <option v-for="output in outputs" :value="output.id">
                        {{
                            `ID: ${output.id} | Manufacturer: ${output.manufacturer ? output.manufacturer : 'No name'} | Name: ${
                                output.name
                            }`
                        }}
                    </option>
                </select>
            </div>
            <div class="module__container">
                <span>Channel</span>
                <select v-model="settings.midi.channel">
                    <option value="0">1</option>
                    <option value="1">2</option>
                    <option value="2">3</option>
                    <option value="3">4</option>
                    <option value="4">5</option>
                    <option value="5">6</option>
                    <option value="6">7</option>
                    <option value="7">8</option>
                    <option value="8">9</option>
                    <option value="9">10</option>
                    <option value="10">11</option>
                    <option value="11">12</option>
                    <option value="12">13</option>
                    <option value="13">14</option>
                    <option value="14">15</option>
                    <option value="15">16</option>
                </select>
            </div>
        </div>

        <div class="module__wrapper">
            <div class="module__container">
                <span>Velocity</span>
                <div class="notes-range__inputs">
                    <input type="number" step="1" v-model="settings.midi.velocity" />
                </div>
            </div>
            <div class="module__container">
                <span>Modulation</span>
                <div class="notes-range__inputs">
                    <input type="number" step="1" v-model="settings.midi.modulation" />
                </div>
            </div>
        </div>

        <div class="module__container module__container--block-row">
            <span>Solid mode</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="solidMode" id="solidMode-yes" value="true" checked v-model="solidMode" />
                    <label for="solidMode-yes">Yes</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="solidMode" id="solidMode-no" value="false" v-model="solidMode" />
                    <label for="solidMode-no">No</label>
                </div>
            </div>
        </div>

        <div class="module__container module__container--block-row" :class="{ 'module__container--deactive': settings.midi.solidMode }">
            <span>Last noteOn mode</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="lastNoteOn" id="lastNoteOn-yes" value="true" checked v-model="lastNoteOn" />
                    <label for="lastNoteOn-yes">Yes</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="lastNoteOn" id="lastNoteOn-no" value="false" v-model="lastNoteOn" />
                    <label for="lastNoteOn-no">No</label>
                </div>
            </div>
        </div>
    </div>
</template>
