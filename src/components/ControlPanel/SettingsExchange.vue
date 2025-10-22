<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useSettingsStore, useStatusStore } from '../../stores/globalStore.js'
import { getDate } from '../../assets/js/helpers.js'

const settings = useSettingsStore()
const status = useStatusStore()

function setSettings(settingsObject) {
    delete settingsObject.midi.port // MIDI port doesn`t import in JSON
    delete settingsObject.sampleRateRange // sampleRateRange different on some devices

    settings.$patch(settingsObject)
    status.isSettingsFileActual = true
}

// Settings saving
function save() {
    const link = document.createElement('a')

    link.href = URL.createObjectURL(
        new Blob([JSON.stringify(settings.$state, null, 2)], {
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
let fromFile = {}
const isHaveSettingsFile = ref(false)
function load(settingsInJSON) {
    if (settingsInJSON.type !== 'application/json') throw new Error('JSON file is required')

    reader.readAsText(settingsInJSON)

    reader.addEventListener('load', (event) => {
        fromFile = JSON.parse(event.target.result)
        fromFile.settingsFileName = settingsInJSON.name

        // For backward compatibility after renaming the commandRange on a fragment
        if (!fromFile.fragment) fromFile.fragment = fromFile.commandsRange

        setSettings(fromFile)

        if (!isHaveSettingsFile.value) isHaveSettingsFile.value = true
    })

    reader.addEventListener('error', (event) => {
        throw new Error(event.target.error)
    })
}

function setSettingsInURL() {
    const stateCopy = JSON.parse(JSON.stringify(settings.$state))

    delete stateCopy.midi.port
    delete stateCopy.sampleRateRange

    window.location.hash = JSON.stringify(stateCopy)
}

function getSettingsFromURL() {
    if (window.location.hash) {
        const fromURL = JSON.parse(decodeURI(window.location.hash.slice(1)))
        setSettings(fromURL)
    }
}

function restore() {
    setSettings(fromFile)
    settings.restore()
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
            {{ isHaveSettingsFile ? "Load" : "Load settings" }}
        </label>
        <button class="control__play button" @click="save">{{ isHaveSettingsFile ? "Save" : "Save settings" }}</button>

        <button v-if="isHaveSettingsFile" :class="{ 'deactive': status.isSettingsFileActual }" class="control__play button" @click="restore">Restore</button>
    </div>
</template>
