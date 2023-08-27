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
    const transitionType = ref('immediately')
    const frequencyMode = ref('continuous')
    const frequenciesRange = ref({
        from: 0,
        to: 256,
    })
    const notesRange = ref({
        from: 48,
        to: 60,
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
    const loop = ref(true)
    const midiMode = ref(false)
    const midi = ref({
        port: null,
        channel: 0,
        pitch: 8192,
        modulation: 50,
        noMIDIPortsFound: true,
        velocity: 120,
    })

    return {
        readingSpeed,
        waveType,
        gain,
        transitionType,
        frequencyMode,
        frequenciesRange,
        notesRange,
        midiMode,
        biquadFilterFrequency,
        biquadFilterQ,
        LFO,
        bitness,
        loop,
        midi,
    }
})

export const useStatusStore = defineStore('status', () => {
    const playing = ref(false)
    const timer = ref(0)
    const currentCommandsBlock = ref([0, 499])
    const currentCommand = ref(0)
    const iterationNumber = ref(0)

    return { playing, timer, currentCommandsBlock, currentCommand, iterationNumber }
})
