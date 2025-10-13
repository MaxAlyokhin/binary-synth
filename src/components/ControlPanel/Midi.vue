<script setup>
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore, useStatusStore } from '../../stores/globalStore.js'
import sendMIDIMessage from '../../assets/js/midiMessages.js'
import InteractiveInput from './InteractiveInput.vue'

const settings = useSettingsStore()
const status = useStatusStore()

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
        status.isSettingsFileActual = true
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

function validateVelocity(newValue) {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        settings.midi.velocity = 0
    } else if (newValue >= 127) {
        settings.midi.velocity = 127
    } else {
        settings.midi.velocity = newValue
    }
}

function validateModulation(newValue) {
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
}

const port = ref(null)
watch(port, (newValue) => {
    settings.midi.port = midi.outputs.get(newValue)
})

watch([port, () => settings.midi.channel], () => {
    sendMIDIMessage.modulation(settings.midi.modulation, settings.midi.port, settings.midi.channel)
})
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
                    <InteractiveInput
                        :validValue="settings.midi.velocity"
                        @valueFromInput="validateVelocity($event)"
                        step="1"
                        keyCode="KeyE"
                        letter="E"
                    />
                </div>
            </div>
            <div class="module__container">
                <span>Modulation</span>
                <div class="notes-range__inputs">
                    <InteractiveInput
                        :validValue="settings.midi.modulation"
                        @valueFromInput="validateModulation($event)"
                        step="1"
                        keyCode="KeyR"
                        letter="R"
                    />
                </div>
            </div>
        </div>

        <div class="module__container module__container--block-row">
            <span>Solid mode</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="solidMode" id="solidMode-yes" :value="true" checked v-model="settings.midi.solidMode" />
                    <label for="solidMode-yes">Yes</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="solidMode" id="solidMode-no" :value="false" v-model="settings.midi.solidMode" />
                    <label for="solidMode-no">No</label>
                </div>
            </div>
        </div>

        <div class="module__container module__container--block-row" :class="{ 'module__container--deactive': settings.midi.solidMode }">
            <span>Last noteOn mode</span>
            <div class="module__container module__container--radio">
                <div class="radio-element">
                    <input type="radio" name="lastNoteOn" id="lastNoteOn-yes" :value="true" checked v-model="settings.midi.lastNoteOn" />
                    <label for="lastNoteOn-yes">Yes</label>
                </div>
                <div class="radio-element">
                    <input type="radio" name="lastNoteOn" id="lastNoteOn-no" :value="false" v-model="settings.midi.lastNoteOn" />
                    <label for="lastNoteOn-no">No</label>
                </div>
            </div>
        </div>
    </div>
</template>
