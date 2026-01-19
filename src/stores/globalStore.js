import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useFileStore = defineStore('file', () => {
    const binary8 = ref(null)
    const binary16 = ref([])
    const name = ref('')
    const size = ref(0)
    const type = ref('')
    const loaded = ref(false)

    return { binary8, binary16, name, size, type, loaded }
})

export const useSettingsStore = defineStore('settings', () => {
    const readingSpeed = ref(0.01)
    const waveType = ref('sine')
    const gain = ref(1)
    const settingsFileName = ref('')
    const transitionType = ref('immediately')
    const frequencyMode = ref('continuous')
    const frequenciesRange = ref({
        from: 50,
        to: 256,
    })
    const notesRange = ref({
        from: 36,
        to: 48,
    })
    const fragment = ref({
        from: 0,
        to: 499,
    })
    const biquadFilterFrequency = ref(10000.0)
    const biquadFilterQ = ref(1)
    const LFO = ref({
        enabled: false,
        type: 'sine',
        rate: 1,
        depth: 1,
    })
    const bitness = ref('8')
    const panner = ref(0)
    const loop = ref(true)
    const isRandomTimeGap = ref(true)
    const midiMode = ref(false)
    const inertia = ref(0.95)
    const midi = ref({
        port: null,
        channel: 0,
        pitch: 8192,
        modulation: 50,
        noMIDIPortsFound: true,
        velocity: 120,
        solidMode: false,
        lastNoteOnMode: true
    })
    const sampleRate = ref(null)
    const sampleRateRange = ref({
      maximum: null,
      minimum: null
    })

    return {
        readingSpeed,
        waveType,
        gain,
        settingsFileName,
        transitionType,
        frequencyMode,
        frequenciesRange,
        notesRange,
        fragment,
        midiMode,
        biquadFilterFrequency,
        biquadFilterQ,
        LFO,
        bitness,
        panner,
        loop,
        isRandomTimeGap,
        midi,
        inertia,
        sampleRate,
        sampleRateRange,
    }
})

export const useStatusStore = defineStore('status', () => {
    const playing = ref(false)
    const timer = ref(0)
    const startAndEndOfList = ref([0, 499])
    const currentCommand = ref(0)
    const listID = ref(0)
    const currentIteration = ref(0)
    const isSettingsFileActual = ref(false)

    return { playing, timer, startAndEndOfList, currentCommand, listID, currentIteration, isSettingsFileActual }
})
