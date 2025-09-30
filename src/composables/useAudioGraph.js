import { ref, watch } from 'vue'
import fourierCoefficients from '@/assets/js/fourierCoefficients.js'
import { checkFrequenciesWithNewSampleRate, checkSampleRate } from '@/assets/js/helpers.js'

export function useAudioGraph(settings) {
    // Audio nodes
    const audioContext = ref(null)
    const oscillator = ref(null)
    const gain = ref(null)
    const filter = ref(null)
    const lfoDepth = ref(null)
    const lfoOsc = ref(null)
    const masterGain = ref(null)
    const panner = ref(null)
    const squareWave = ref(null)
    const sawtoothWave = ref(null)

    function createAudioGraph(sampleRate) {
        if (sampleRate) {
            audioContext.value = new AudioContext({ sampleRate })
        } else {
            audioContext.value = new AudioContext()
            settings.sampleRate = audioContext.value.sampleRate
        }

        gain.value = audioContext.value.createGain()
        filter.value = audioContext.value.createBiquadFilter()
        lfoDepth.value = audioContext.value.createGain()
        lfoOsc.value = audioContext.value.createOscillator()
        masterGain.value = audioContext.value.createGain()
        panner.value = audioContext.value.createStereoPanner()

        // Setup
        filter.value.type = 'lowpass'
        filter.value.frequency.value = settings.biquadFilterFrequency
        filter.value.Q.value = settings.biquadFilterQ
        lfoDepth.value.gain.value = settings.LFO.depth
        gain.value.gain.value = settings.gain
        masterGain.value.gain.value = 1
        panner.value.pan.value = settings.panner

        // Connection
        filter.value.connect(gain.value).connect(masterGain.value).connect(panner.value).connect(audioContext.value.destination)
        lfoDepth.value.connect(masterGain.value.gain)

        // Set specific waves
        squareWave.value = audioContext.value.createPeriodicWave(
            Float32Array.from(fourierCoefficients.square.real),
            Float32Array.from(fourierCoefficients.square.imag)
        )
        sawtoothWave.value = audioContext.value.createPeriodicWave(
            Float32Array.from(fourierCoefficients.sawtooth.real),
            Float32Array.from(fourierCoefficients.sawtooth.imag)
        )
    }

    function deleteAudioGraph() {
        audioContext.value = null
        oscillator.value = null
        gain.value = null
        filter.value = null
        lfoDepth.value = null
        lfoOsc.value = null
        masterGain.value = null
        panner.value = null
        squareWave.value = null
        sawtoothWave.value = null
    }

    function setLFOType() {
        if (!lfoOsc.value) return

        if (settings.LFO.type === 'square2') {
            lfoOsc.value.setPeriodicWave(squareWave.value)
        } else if (settings.LFO.type === 'sawtooth2') {
            lfoOsc.value.setPeriodicWave(sawtoothWave.value)
        } else {
            lfoOsc.value.type = settings.LFO.type
        }
    }

    function setOscillators() {
        oscillator.value = audioContext.value.createOscillator()

        if (settings.waveType === 'square2') {
            oscillator.value.setPeriodicWave(squareWave.value)
        } else if (settings.waveType === 'sawtooth2') {
            oscillator.value.setPeriodicWave(sawtoothWave.value)
        } else {
            oscillator.value.type = settings.waveType
        }

        oscillator.value.connect(filter.value)

        lfoOsc.value = audioContext.value.createOscillator()

        setLFOType()

        lfoOsc.value.frequency.value = settings.LFO.rate
        lfoOsc.value.connect(lfoDepth.value)
    }

    function recreateAudioGraph(sampleRate) {
        deleteAudioGraph()
        createAudioGraph(sampleRate)
        setOscillators()
    }

    // Watchers for realtime parameter changes
    function setupAudioWatchers(status) {
        watch(
            () => settings.sampleRate,
            () => {
                settings.sampleRate = checkSampleRate(settings.sampleRateRange.minimum, settings.sampleRateRange.maximum, settings.sampleRate)

                settings.frequenciesRange.to = checkFrequenciesWithNewSampleRate(settings.sampleRate, settings.frequenciesRange.to)
                settings.biquadFilterFrequency = checkFrequenciesWithNewSampleRate(settings.sampleRate, settings.biquadFilterFrequency)
                settings.LFO.rate = checkFrequenciesWithNewSampleRate(settings.sampleRate, settings.LFO.rate)

                recreateAudioGraph(settings.sampleRate)
            }
        )

        watch(
            () => settings.biquadFilterFrequency,
            (newValue) => {
                if (!filter.value) return
                if (isNaN(newValue)) {
                    return
                } else if (newValue <= 0) {
                    filter.value.frequency.value = 0
                } else if (newValue > settings.sampleRate / 2) {
                    filter.value.frequency.value = settings.sampleRate / 2
                } else {
                    filter.value.frequency.value = newValue
                }
            }
        )

        watch(
            () => settings.biquadFilterQ,
            (newValue) => {
                if (!filter.value) return
                if (isNaN(newValue)) {
                    return
                } else if (newValue <= 0) {
                    filter.value.Q.value = 0.0001
                } else if (newValue > 1000) {
                    filter.value.Q.value = 1000
                } else {
                    filter.value.Q.value = newValue
                }
            }
        )

        watch(
            () => settings.LFO.enabled,
            (newValue) => {
                if (!lfoOsc.value) return
                if (newValue) {
                    if (status.playing) {
                        lfoOsc.value.start()
                    }
                } else {
                    if (status.playing) {
                        lfoOsc.value.stop(audioContext.value.currentTime + 0.1)
                        lfoOsc.value = audioContext.value.createOscillator()
                        setLFOType()
                        lfoOsc.value.frequency.value = settings.LFO.rate
                        lfoOsc.value.connect(lfoDepth.value)
                    }
                }
            }
        )

        watch(
            () => settings.LFO.type,
            () => setLFOType()
        )

        watch(
            () => settings.LFO.rate,
            (newValue) => {
                if (!lfoOsc.value) return
                if (isNaN(newValue) || newValue < 0) {
                    lfoOsc.value.frequency.value = 0
                } else if (newValue > settings.sampleRate / 2) {
                    lfoOsc.value.frequency.value = settings.sampleRate / 2
                } else {
                    lfoOsc.value.frequency.value = newValue
                }
            }
        )

        watch(
            () => settings.LFO.depth,
            (newValue) => {
                if (!lfoDepth.value || !audioContext.value) return
                if (isNaN(newValue)) {
                    return
                } else if (newValue < 0) {
                    lfoDepth.value.gain.setTargetAtTime(0, audioContext.value.currentTime, 0.005)
                } else if (newValue > 1) {
                    lfoDepth.value.gain.setTargetAtTime(1, audioContext.value.currentTime, 0.005)
                } else {
                    lfoDepth.value.gain.setTargetAtTime(newValue, audioContext.value.currentTime, 0.005)
                }
            }
        )

        watch(
            () => settings.gain,
            (newValue) => {
                if (!gain.value || !audioContext.value) return
                if (isNaN(newValue)) {
                    return
                } else if (newValue <= 0) {
                    gain.value.gain.setTargetAtTime(0, audioContext.value.currentTime, 0.005)
                } else {
                    gain.value.gain.setTargetAtTime(newValue, audioContext.value.currentTime, 0.005)
                }
            }
        )

        watch(
            () => settings.panner,
            (newValue) => {
                if (!panner.value || !audioContext.value) return
                if (isNaN(newValue)) {
                    return
                } else if (newValue <= -1) {
                    panner.value.pan.setTargetAtTime(-1, audioContext.value.currentTime, 0.005)
                } else if (newValue >= 1) {
                    panner.value.pan.setTargetAtTime(1, audioContext.value.currentTime, 0.005)
                } else {
                    panner.value.pan.setTargetAtTime(newValue, audioContext.value.currentTime, 0.005)
                }
            }
        )

        watch(
            () => settings.waveType,
            (newValue) => {
                if (!oscillator.value) return
                if (newValue === 'square2') {
                    oscillator.value.setPeriodicWave(squareWave.value)
                } else if (newValue === 'sawtooth2') {
                    oscillator.value.setPeriodicWave(sawtoothWave.value)
                } else {
                    oscillator.value.type = newValue
                }
            }
        )
    }

    return {
        audioContext,
        oscillator,
        gain,
        filter,
        lfoDepth,
        lfoOsc,
        masterGain,
        panner,
        squareWave,
        sawtoothWave,
        createAudioGraph,
        deleteAudioGraph,
        setLFOType,
        setOscillators,
        recreateAudioGraph,
        setupAudioWatchers,
    }
}
