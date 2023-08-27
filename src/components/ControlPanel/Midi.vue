<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/global.js'
import sendMIDIMessage from '../../assets/js/midi.js'

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
        throw new Error(`MIDI is not supported on this browser.`)
    }
})

const velocity = ref(settings.midi.velocity)
watch(velocity, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        velocity.value = 0
        settings.midi.velocity = velocity
    } else if (newValue >= 127) {
        velocity.value = 127
        settings.midi.velocity = velocity
    } else {
        velocity.value = newValue
        settings.midi.velocity = velocity
    }
})

const modulationValue = ref(settings.midi.modulation)
watch(modulationValue, (newValue) => {
    if (isNaN(newValue)) {
        return
    } else if (newValue <= 0) {
        modulationValue.value = 0
        settings.midi.modulation = modulationValue
    } else if (newValue >= 127) {
        modulationValue.value = 127
        settings.midi.modulation = modulationValue
    } else {
        modulationValue.value = newValue
        settings.midi.modulation = modulationValue
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
                    <input type="number" step="1" v-model="velocity" />
                </div>
            </div>
            <div class="module__container">
                <span>Modulation</span>
                <div class="notes-range__inputs">
                    <input type="number" step="1" v-model="modulationValue" />
                </div>
            </div>
        </div>
    </div>
</template>
