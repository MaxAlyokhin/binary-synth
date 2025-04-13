<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useSettingsStore, useStatusStore } from '@/stores/globalStore.js'
import { getDate } from '@/assets/js/helpers.js'

const settings = useSettingsStore()
const status = useStatusStore()

function setSettings(settingsObject) {
    settings.$patch({
        readingSpeed: settingsObject.readingSpeed,
        waveType: settingsObject.waveType,
        gain: settingsObject.gain,
        settingsFileName: settingsObject.name,
        transitionType: settingsObject.transitionType,
        frequencyMode: settingsObject.frequencyMode,
        frequenciesRange: {
            from: settingsObject.frequenciesRange.from,
            to: settingsObject.frequenciesRange.to,
        },
        notesRange: {
            from: settingsObject.notesRange.from,
            to: settingsObject.notesRange.to,
        },
        commandsRange: {
            from: settingsObject.commandsRange.from,
            to: settingsObject.commandsRange.to,
        },
        biquadFilterFrequency: settingsObject.biquadFilterFrequency,
        biquadFilterQ: settingsObject.biquadFilterQ,
        LFO: {
            enabled: settingsObject.LFO.enabled,
            type: settingsObject.LFO.type,
            rate: settingsObject.LFO.rate,
            depth: settingsObject.LFO.depth,
        },
        bitness: settingsObject.bitness,
        panner: settingsObject.panner,
        loop: settingsObject.loop,
        isRandomTimeGap: settingsObject.isRandomTimeGap,
        midiMode: settingsObject.midiMode,
        midi: {
            pitch: settingsObject.midi.pitch,
            modulation: settingsObject.midi.modulation,
            velocity: settingsObject.midi.velocity,
            solidMode: settingsObject.midi.solidMode,
        },
    })
}

// Settings saving
function save() {
    const settingsObject = {
        readingSpeed: settings.readingSpeed,
        waveType: settings.waveType,
        gain: settings.gain,
        transitionType: settings.transitionType,
        frequencyMode: settings.frequencyMode,
        frequenciesRange: {
            from: settings.frequenciesRange.from,
            to: settings.frequenciesRange.to,
        },
        notesRange: {
            from: settings.notesRange.from,
            to: settings.notesRange.to,
        },
        commandsRange: {
            from: settings.commandsRange.from,
            to: settings.commandsRange.to,
        },
        biquadFilterFrequency: settings.biquadFilterFrequency,
        biquadFilterQ: settings.biquadFilterQ,
        LFO: {
            enabled: settings.LFO.enabled,
            type: settings.LFO.type,
            rate: settings.LFO.rate,
            depth: settings.LFO.depth,
        },
        bitness: settings.bitness,
        panner: settings.panner,
        loop: settings.loop,
        isRandomTimeGap: settings.isRandomTimeGap,
        midiMode: settings.midiMode,
        midi: {
            pitch: settings.midi.pitch,
            modulation: settings.midi.modulation,
            velocity: settings.midi.velocity,
            solidMode: settings.midi.solidMode,
        },
    }

    const link = document.createElement('a')

    link.href = URL.createObjectURL(
        new Blob([JSON.stringify(settingsObject, null, 2)], {
            type: 'application/json',
        })
    )

    link.setAttribute('download', `bs-${getDate()}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// Settings loading
const reader = new FileReader()
function load(settingsInJSON) {
    if (settingsInJSON.type !== 'application/json') throw new Error('JSON file is required')

    reader.readAsText(settingsInJSON)

    reader.addEventListener('load', (event) => {
        const fromFile = JSON.parse(event.target.result)
        fromFile.name = settingsInJSON.name
        setSettings(fromFile)
        status.isSettingsFileActual = true
    })

    reader.addEventListener('error', (event) => {
        throw new Error(event.target.error)
    })
}

function setSettingsInURL() {
    window.location.hash = JSON.stringify(settings.$state)
}

function getSettingsFromURL() {
    if (window.location.hash) {
        const fromURL = JSON.parse(decodeURI(window.location.hash.slice(1)))
        setSettings(fromURL)
    }
}

settings.$subscribe((mutation, state) => {
  if (status.isSettingsFileActual) status.isSettingsFileActual = false
})

onMounted(() => {
    getSettingsFromURL()
    window.addEventListener('blur', setSettingsInURL)
})

onUnmounted(() => {
    window.removeEventListener('blur', setSettingsInURL)
})
</script>

<template>
    <div class="control__playing">
        <label class="control__play button" @change="(event) => (event.target.files.length ? load(event.target.files[0]) : false)">
            <input type="file" />
            Load settings
        </label>
        <button class="control__play button" @click="save">Save settings</button>
    </div>
</template>
