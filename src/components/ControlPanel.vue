<script setup>
import { watch, computed } from 'vue'
import { useFileStore, useSettingsStore, useStatusStore } from '@/stores/global.js'
import { toFixedNumber, getRandomNumber } from '../assets/js/helpers.js'
import { getFrequency } from '../assets/js/getFrequency.js'
import fourierCoefficients from '../assets/js/fourierCoefficients.js'
import Filter from './ControlPanel/Filter.vue'
import LFO from './ControlPanel/LFO.vue'
import Oscillator from './ControlPanel/Oscillator.vue'
import Global from './ControlPanel/Global.vue'
import Midi from './ControlPanel/Midi.vue'
import sendMIDIMessage from '../assets/js/midi.js'
import { getMIDINote } from '../assets/js/getMIDINote.js'

const file = useFileStore()
const settings = useSettingsStore()
const status = useStatusStore()

const fileReadingLimit = computed(() => (settings.bitness === '8' ? 500 : 250)) // Планирование композиции делим на итерации по fileReadingLimit.value шагов
const iterationTime = computed(() =>
    toFixedNumber((status.currentCommandsBlock[1] - status.currentCommandsBlock[0] + 1) * settings.readingSpeed * 1000)
)
const bynaryInSelectedBitness = computed(() => (settings.bitness === '8' ? file.binary8 : file.binary16))

// Creating
let audioContext = new AudioContext()
let oscillator = null
let gain = audioContext.createGain()
let filter = audioContext.createBiquadFilter()
let lfoDepth = audioContext.createGain()
let lfoOsc = audioContext.createOscillator()
let masterGain = audioContext.createGain()

// Setup
filter.type = 'lowpass'
filter.frequency.value = settings.biquadFilterFrequency
filter.Q.value = settings.biquadFilterQ
lfoOsc.type = settings.LFO.type
lfoOsc.frequency.value = settings.LFO.rate
lfoOsc.start()
lfoDepth.gain.value = settings.LFO.depth
gain.gain.value = settings.gain
masterGain.gain.value = 1

// Connection
filter.connect(gain)
lfoDepth.connect(masterGain.gain)
gain.connect(masterGain)
masterGain.connect(audioContext.destination)

const squareWave = audioContext.createPeriodicWave(
    Float32Array.from(fourierCoefficients.square.real),
    Float32Array.from(fourierCoefficients.square.imag)
)
const sawtoothWave = audioContext.createPeriodicWave(
    Float32Array.from(fourierCoefficients.sawtooth.real),
    Float32Array.from(fourierCoefficients.sawtooth.imag)
)

// At each play, create a new oscillator and connect it
// Changing its frequency will be planned in nextIteration()
function audioInit() {
    oscillator = audioContext.createOscillator()
    oscillator.type = settings.waveType
    oscillator.connect(filter)
}

audioInit()

const getRandomTimeGap = () => (settings.isRandomTimeGap ? getRandomNumber(0, settings.readingSpeed) : 0)

// To reduce CPU overhead, we divide composition planning into iterations
let nextIterationTimeoutID = null
let midiTimeoutIDs = []
let commands = []
function nextIteration(iterationNumber, scheduledCommands) {
    // If we have reached the end of the commands or pressed stop, we exit the recursion
    if (!status.playing) {
        stop()
        return
    }

    if (scheduledCommands >= settings.commandsRange.to) {
        if (settings.midiMode) {
            sendMIDIMessage.noteOff(
                commands[status.currentCommandsBlock[1] - status.currentCommandsBlock[0]][0],
                settings.midi.velocity,
                settings.midi.port,
                settings.midi.channel
            )
        }

        if (settings.loop) {
            nextIteration(0, settings.commandsRange.from)
            return
        } else {
            stop()
            return
        }
    }

    // Define block of commands (500 pieces)
    // prettier-ignore
    const end = scheduledCommands + fileReadingLimit.value < settings.commandsRange.to
        ? scheduledCommands + fileReadingLimit.value - 1
        : settings.commandsRange.to

    status.currentCommandsBlock = [scheduledCommands, end]
    status.iterationNumber = iterationNumber

    // Planning the composition
    let command = null

    // noteIndex - serial number of the element in the whole command array
    // index - sequence number of the element in the iteration context

    // For normal mode

    if (!settings.midiMode) {
        switch (settings.transitionType) {
            case 'immediately':
                for (let noteIndex = scheduledCommands, index = 0; noteIndex <= end; noteIndex++, index++) {
                    command = getFrequency(
                        bynaryInSelectedBitness.value[noteIndex],
                        settings.bitness,
                        settings.frequencyMode,
                        frequencyCoefficients.value,
                        settings.frequenciesRange.from,
                        settings.notesRange.from
                    )
                    if (!isFinite(command)) command = 0 // There are glitches on large readingSpeeds

                    oscillator.frequency.setValueAtTime(
                        command,
                        audioContext.currentTime + (index * settings.readingSpeed + getRandomTimeGap())
                    )
                }
                break

            case 'linear':
                for (let noteIndex = scheduledCommands, index = 0; noteIndex <= end; noteIndex++, index++) {
                    command = getFrequency(
                        bynaryInSelectedBitness.value[noteIndex],
                        settings.bitness,
                        settings.frequencyMode,
                        frequencyCoefficients.value,
                        settings.frequenciesRange.from,
                        settings.notesRange.from
                    )
                    if (!isFinite(command)) command = 0 // There are glitches on large readingSpeeds
                    oscillator.frequency.linearRampToValueAtTime(
                        command,
                        audioContext.currentTime + (index * settings.readingSpeed + getRandomTimeGap())
                    )
                }
                break

            case 'exponential':
                for (let noteIndex = scheduledCommands, index = 0; noteIndex <= end; noteIndex++, index++) {
                    command = getFrequency(
                        bynaryInSelectedBitness.value[noteIndex],
                        settings.bitness,
                        settings.frequencyMode,
                        frequencyCoefficients.value,
                        settings.frequenciesRange.from,
                        settings.notesRange.from
                    )
                    if (!isFinite(command)) command = 0.01 // There are glitches on large readingSpeeds
                    oscillator.frequency.exponentialRampToValueAtTime(
                        command,
                        audioContext.currentTime + (index * settings.readingSpeed + getRandomTimeGap())
                    )
                }
                break
        }
    }
    // For MIDI-mode
    else {
        midiTimeoutIDs.forEach((id) => {
            clearTimeout(id)
        })

        for (let noteIndex = scheduledCommands, index = 0; noteIndex <= end; noteIndex++, index++) {
            commands[index] = getMIDINote(
                bynaryInSelectedBitness.value[noteIndex],
                settings.bitness,
                settings.frequencyMode,
                frequencyCoefficients.value,
                settings.frequenciesRange.from,
                settings.notesRange.from
            )

            midiTimeoutIDs[index] = setTimeout(
                (index) => {
                    if (commands[index - 1]) {
                        sendMIDIMessage.noteOff(commands[index - 1][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)
                    }

                    sendMIDIMessage.noteOn(commands[index][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)

                    if (settings.frequencyMode === 'continuous') {
                        sendMIDIMessage.pitch(commands[index][1], settings.midi.port, settings.midi.channel)
                    }
                },
                (index * settings.readingSpeed + getRandomTimeGap()) * 1000,
                index
            )
        }
    }

    // If there are fewer bytes in the file than fileReadingLimit.value, recursion is canceled
    if (fileReadingLimit.value >= settings.commandsRange.to - settings.commandsRange.from) {
        if (!settings.loop) {
            nextIterationTimeoutID = setTimeout(() => {
                // So that the last note doesn't take too long
                if (settings.midiMode) {
                    sendMIDIMessage.noteOff(
                        commands[settings.commandsRange.to - settings.commandsRange.from][0],
                        settings.midi.velocity,
                        settings.midi.port,
                        settings.midi.channel
                    )
                }
                stop()
            }, (settings.commandsRange.to - settings.commandsRange.from + 1) * settings.readingSpeed * 1000)
        } else {
            nextIterationTimeoutID = setTimeout(() => {
                // So that the last note doesn't take too long
                if (settings.midiMode) {
                    sendMIDIMessage.noteOff(
                        commands[settings.commandsRange.to - settings.commandsRange.from][0],
                        settings.midi.velocity,
                        settings.midi.port,
                        settings.midi.channel
                    )
                }
                nextIteration(0, settings.commandsRange.from)
            }, (settings.commandsRange.to - settings.commandsRange.from) * settings.readingSpeed * 1000)
        }
    } else {
        nextIterationTimeoutID = setTimeout(() => {
            // So that the last note doesn't take too long
            if (settings.midiMode) {
                sendMIDIMessage.noteOff(commands[commands.length - 1][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)
            }
            nextIteration(++iterationNumber, (scheduledCommands += fileReadingLimit.value))
        }, iterationTime.value)
    }
}

function play() {
    if (file.loaded && !status.playing) {
        gain.gain.value = settings.gain

        if (!settings.midiMode) oscillator.start()

        status.playing = true
        nextIteration(0, settings.commandsRange.from)
    }
}

function stop() {
    if (status.playing) {
        clearTimeout(nextIterationTimeoutID)

        if (!settings.midiMode) {
            gain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.005)
            oscillator.stop(audioContext.currentTime + 0.1)
            oscillator.frequency.cancelScheduledValues(audioContext.currentTime + 0.1)

            audioInit()
        } else {
            midiTimeoutIDs.forEach((id) => {
                clearTimeout(id)
            })
            sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)
        }

        status.playing = false
    }
}

const filterFrequency = computed(() => settings.biquadFilterFrequency)
watch(filterFrequency, (newValue) => {
    filter.frequency.value = newValue
})
const filterQ = computed(() => settings.biquadFilterQ)
watch(filterQ, (newValue) => {
    filter.Q.value = newValue
})
const lfoEnabled = computed(() => settings.LFO.enabled)
watch(lfoEnabled, (newValue) => {
    newValue ? lfoOsc.connect(lfoDepth) : lfoOsc.disconnect(lfoDepth)
})
const lfoType = computed(() => settings.LFO.type)
watch(lfoType, (newValue) => {
    if (newValue === 'square2') {
        lfoOsc.setPeriodicWave(squareWave)
    } else if (newValue === 'sawtooth2') {
        lfoOsc.setPeriodicWave(sawtoothWave)
    } else {
        lfoOsc.type = newValue
    }
})
const lfoRate = computed(() => settings.LFO.rate)
watch(lfoRate, (newValue) => {
    lfoOsc.frequency.value = newValue
})
const lfoDepthValue = computed(() => settings.LFO.depth)
watch(lfoDepthValue, (newValue) => {
    lfoDepth.gain.value = newValue
})
const gainValue = computed(() => settings.gain)
watch(gainValue, (newValue) => {
    gain.gain.value = newValue
})
// When we change the wave type in the UI, we immediately pass it to the oscillator
const wave = computed(() => settings.waveType)
watch(wave, (newValue) => {
    if (newValue === 'square2') {
        oscillator.setPeriodicWave(squareWave)
    } else if (newValue === 'sawtooth2') {
        oscillator.setPeriodicWave(sawtoothWave)
    } else {
        oscillator.type = newValue
    }
})
// At the end of the composition, re-create the binder
const playing = computed(() => status.playing)
watch(playing, (newValue) => {
    if (newValue === false) {
        stop()
    }
})

const frequencyCoefficients = computed(() => {
    return {
        continouos8: (settings.frequenciesRange.to - settings.frequenciesRange.from) / 256,
        continouos16: (settings.frequenciesRange.to - settings.frequenciesRange.from) / 65536,
        tempered8: (settings.notesRange.to - settings.notesRange.from) / 256,
        tempered16: (settings.notesRange.to - settings.notesRange.from) / 65536,
    }
})

// If these parameters are changed, completely recalculate the scheduling again
const readingSpeed = computed(() => settings.readingSpeed)
const transitionType = computed(() => settings.transitionType)
const isRandomTimeGap = computed(() => settings.isRandomTimeGap)
watch([readingSpeed, transitionType, isRandomTimeGap], () => {
    if (status.playing) {
        let command = null

        clearTimeout(nextIterationTimeoutID) // Cancel the recursion

        if (!settings.midiMode) {
            // Cancel already planned for the oscillator
            oscillator.frequency.cancelScheduledValues(audioContext.currentTime)

            // Reschedule the changes in the oscillator, starting from the last command where we left off
            switch (settings.transitionType) {
                case 'immediately':
                    for (
                        let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                        noteIndex <= status.currentCommandsBlock[1];
                        noteIndex++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[noteIndex],
                            settings.bitness,
                            settings.frequencyMode,
                            frequencyCoefficients.value,
                            settings.frequenciesRange.from,
                            settings.notesRange.from
                        )

                        if (!isFinite(command)) command = 0 // There are glitches on large readingSpeeds

                        oscillator.frequency.setValueAtTime(
                            command,
                            audioContext.currentTime + (index * settings.readingSpeed + getRandomTimeGap())
                        )
                    }
                    break

                case 'linear':
                    for (
                        let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                        noteIndex <= status.currentCommandsBlock[1];
                        noteIndex++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[noteIndex],
                            settings.bitness,
                            settings.frequencyMode,
                            frequencyCoefficients.value,
                            settings.frequenciesRange.from,
                            settings.notesRange.from
                        )

                        if (!isFinite(command)) command = 0 // There are glitches on large readingSpeeds
                        oscillator.frequency.linearRampToValueAtTime(
                            command,
                            audioContext.currentTime + (index * settings.readingSpeed + getRandomTimeGap())
                        )
                    }
                    break

                case 'exponential':
                    for (
                        let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                        noteIndex <= status.currentCommandsBlock[1];
                        noteIndex++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[noteIndex],
                            settings.bitness,
                            settings.frequencyMode,
                            frequencyCoefficients.value,
                            settings.frequenciesRange.from,
                            settings.notesRange.from
                        )

                        if (!isFinite(command)) command = 0.01 // There are glitches on large readingSpeeds
                        oscillator.frequency.exponentialRampToValueAtTime(
                            command,
                            audioContext.currentTime + (index * settings.readingSpeed + getRandomTimeGap())
                        )
                    }
                    break
            }
        } else {
            midiTimeoutIDs.forEach((id) => {
                clearTimeout(id)
            })
            sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)

            for (
                let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                noteIndex <= status.currentCommandsBlock[1];
                noteIndex++, index++
            ) {
                commands[index] = getMIDINote(
                    bynaryInSelectedBitness.value[noteIndex],
                    settings.bitness,
                    settings.frequencyMode,
                    frequencyCoefficients.value,
                    settings.frequenciesRange.from,
                    settings.notesRange.from
                )

                midiTimeoutIDs[index] = setTimeout(
                    (index) => {
                        if (commands[index - 1]) {
                            sendMIDIMessage.noteOff(
                                commands[index - 1][0],
                                settings.midi.velocity,
                                settings.midi.port,
                                settings.midi.channel
                            )
                        }

                        sendMIDIMessage.noteOn(commands[index][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)

                        if (settings.frequencyMode === 'continuous') {
                            sendMIDIMessage.pitch(commands[index][1], settings.midi.port, settings.midi.channel)
                        }
                    },
                    (index * settings.readingSpeed + getRandomTimeGap() + 1) * 1000,
                    index
                )
            }
        }

        // Reschedule the recursion
        // The time of the next recursion is the number of commands remaining in the iteration * settings.readingSpeed
        if (fileReadingLimit.value >= settings.commandsRange.to - settings.commandsRange.from) {
            if (!settings.loop) {
                nextIterationTimeoutID = setTimeout(() => {
                    // So that the last note doesn't take too long
                    if (settings.midiMode) {
                        sendMIDIMessage.noteOff(
                            commands[settings.commandsRange.to - settings.commandsRange.from][0],
                            settings.midi.velocity,
                            settings.midi.port,
                            settings.midi.channel
                        )
                    }
                    stop()
                }, (settings.commandsRange.to - settings.commandsRange.from - status.currentCommand) * settings.readingSpeed * 1000)
            } else {
                nextIterationTimeoutID = setTimeout(() => {
                    // So that the last note doesn't take too long
                    if (settings.midiMode) {
                        sendMIDIMessage.noteOff(
                            commands[settings.commandsRange.to - settings.commandsRange.from][0],
                            settings.midi.velocity,
                            settings.midi.port,
                            settings.midi.channel
                        )
                    }
                    nextIteration(0, settings.commandsRange.from)
                }, (settings.commandsRange.to - settings.commandsRange.from - status.currentCommand) * settings.readingSpeed * 1000)
            }
        } else {
            let iterationNumber = status.iterationNumber
            let scheduledCommands = status.currentCommandsBlock[0]

            nextIterationTimeoutID = setTimeout(() => {
                if (settings.midiMode) {
                    sendMIDIMessage.noteOff(
                        commands[commands.length - 1][0],
                        settings.midi.velocity,
                        settings.midi.port,
                        settings.midi.channel
                    )
                }

                nextIteration(++iterationNumber, (scheduledCommands += fileReadingLimit.value))
            }, (status.currentCommandsBlock[1] - (status.currentCommandsBlock[0] + status.currentCommand)) * settings.readingSpeed * 1000)
        }
    }
})

// When changing these parameters, only the frequencies are recalculated
const frequenciesRange = computed(() => settings.frequenciesRange)
const notesRange = computed(() => settings.notesRange)
const frequencyMode = computed(() => settings.frequencyMode)
watch([frequenciesRange.value, notesRange.value, frequencyMode], () => {
    if (status.playing) {
        let command = null

        if (!settings.midiMode) {
            // Cancel already planned for the oscillator
            oscillator.frequency.cancelScheduledValues(audioContext.currentTime)

            // Reschedule the changes in the oscillator, starting from the last command where we left off
            switch (settings.transitionType) {
                case 'immediately':
                    for (
                        let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                        noteIndex <= status.currentCommandsBlock[1];
                        noteIndex++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[noteIndex],
                            settings.bitness,
                            settings.frequencyMode,
                            frequencyCoefficients.value,
                            settings.frequenciesRange.from,
                            settings.notesRange.from
                        )
                        if (!isFinite(command)) command = 0 // There are glitches on large readingSpeeds
                        oscillator.frequency.setValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
                    }
                    break

                case 'linear':
                    for (
                        let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                        noteIndex <= status.currentCommandsBlock[1];
                        noteIndex++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[noteIndex],
                            settings.bitness,
                            settings.frequencyMode,
                            frequencyCoefficients.value,
                            settings.frequenciesRange.from,
                            settings.notesRange.from
                        )
                        if (!isFinite(command)) command = 0 // There are glitches on large readingSpeeds
                        oscillator.frequency.linearRampToValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
                    }
                    break

                case 'exponential':
                    for (
                        let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                        noteIndex <= status.currentCommandsBlock[1];
                        noteIndex++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[noteIndex],
                            settings.bitness,
                            settings.frequencyMode,
                            frequencyCoefficients.value,
                            settings.frequenciesRange.from,
                            settings.notesRange.from
                        )
                        if (!isFinite(command)) command = 0.01 // There are glitches on large readingSpeeds
                        oscillator.frequency.exponentialRampToValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
                    }
                    break
            }
        } else {
            midiTimeoutIDs.forEach((id) => {
                clearTimeout(id)
            })
            sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)

            for (
                let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                noteIndex <= status.currentCommandsBlock[1];
                noteIndex++, index++
            ) {
                commands[index] = getMIDINote(
                    bynaryInSelectedBitness.value[noteIndex],
                    settings.bitness,
                    settings.frequencyMode,
                    frequencyCoefficients.value,
                    settings.frequenciesRange.from,
                    settings.notesRange.from
                )

                midiTimeoutIDs[index] = setTimeout(
                    (index) => {
                        if (commands[index - 1]) {
                            sendMIDIMessage.noteOff(
                                commands[index - 1][0],
                                settings.midi.velocity,
                                settings.midi.port,
                                settings.midi.channel
                            )
                        }

                        sendMIDIMessage.noteOn(commands[index][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)

                        if (settings.frequencyMode === 'continuous') {
                            sendMIDIMessage.pitch(commands[index][1], settings.midi.port, settings.midi.channel)
                        }
                    },
                    index * settings.readingSpeed * 1000,
                    index
                )
            }
        }
    }
})

// If you change these parameters, start the game over again
const bitness = computed(() => settings.bitness)
const commandsRange = computed(() => settings.commandsRange)
watch([bitness, commandsRange.value], () => {
    if (playing.value) {
        stop()
        setTimeout(play)
    }
})

const loaded = computed(() => file.loaded)
watch(loaded, () => {
    stop()
})

const midiMode = computed(() => settings.midiMode)
watch(midiMode, (newValue) => {
    if (!newValue) {
        audioInit()
    }

    // If the user has switched to MIDI mode, cancel the oscillator
    if (playing.value) {
        let command = null

        // If MIDI is on
        if (newValue === true) {
            oscillator.stop(audioContext.currentTime)
            oscillator.frequency.cancelScheduledValues(audioContext.currentTime)
            clearTimeout(nextIterationTimeoutID) // Cancel the scheduled recursion

            for (
                let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                noteIndex <= status.currentCommandsBlock[1];
                noteIndex++, index++
            ) {
                commands[index] = getMIDINote(
                    bynaryInSelectedBitness.value[noteIndex],
                    settings.bitness,
                    settings.frequencyMode,
                    frequencyCoefficients.value,
                    settings.frequenciesRange.from,
                    settings.notesRange.from
                )

                midiTimeoutIDs[index] = setTimeout(
                    (index) => {
                        if (commands[index - 1]) {
                            sendMIDIMessage.noteOff(
                                commands[index - 1][0],
                                settings.midi.velocity,
                                settings.midi.port,
                                settings.midi.channel
                            )
                        }

                        sendMIDIMessage.noteOn(commands[index][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)

                        if (settings.frequencyMode === 'continuous') {
                            sendMIDIMessage.pitch(commands[index][1], settings.midi.port, settings.midi.channel)
                        }
                    },
                    index * settings.readingSpeed * 1000,
                    index
                )
            }
        }
        // If MIDI is off
        else {
            midiTimeoutIDs.forEach((id) => {
                clearTimeout(id)
            })
            sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)

            clearTimeout(nextIterationTimeoutID) // Cancel the scheduled recursion

            oscillator.start()

            // Reschedule the changes in the oscillator, starting from the last command where we left off
            switch (settings.transitionType) {
                case 'immediately':
                    for (
                        let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                        noteIndex <= status.currentCommandsBlock[1];
                        noteIndex++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[noteIndex],
                            settings.bitness,
                            settings.frequencyMode,
                            frequencyCoefficients.value,
                            settings.frequenciesRange.from,
                            settings.notesRange.from
                        )

                        if (!isFinite(command)) command = 0 // There are glitches on large readingSpeeds
                        oscillator.frequency.setValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
                    }
                    break

                case 'linear':
                    for (
                        let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                        noteIndex <= status.currentCommandsBlock[1];
                        noteIndex++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[noteIndex],
                            settings.bitness,
                            settings.frequencyMode,
                            frequencyCoefficients.value,
                            settings.frequenciesRange.from,
                            settings.notesRange.from
                        )

                        if (!isFinite(command)) command = 0 // There are glitches on large readingSpeeds
                        oscillator.frequency.linearRampToValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
                    }
                    break

                case 'exponential':
                    for (
                        let noteIndex = status.currentCommandsBlock[0] + status.currentCommand, index = 0;
                        noteIndex <= status.currentCommandsBlock[1];
                        noteIndex++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[noteIndex],
                            settings.bitness,
                            settings.frequencyMode,
                            frequencyCoefficients.value,
                            settings.frequenciesRange.from,
                            settings.notesRange.from
                        )

                        if (!isFinite(command)) command = 0.01 // There are glitches on large readingSpeeds
                        oscillator.frequency.exponentialRampToValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
                    }
                    break
            }
        }

        // Reschedule the recursion
        // The time of the next recursion is the number of commands remaining in the iteration * settings.readingSpeed
        if (fileReadingLimit.value >= settings.commandsRange.to) {
            if (!settings.loop) {
                nextIterationTimeoutID = setTimeout(() => {
                    stop()
                }, (settings.commandsRange.to - status.currentCommand) * settings.readingSpeed * 1000)
            } else {
                nextIterationTimeoutID = setTimeout(() => {
                    nextIteration(0, settings.commandsRange.from)
                }, (settings.commandsRange.to - status.currentCommand) * settings.readingSpeed * 1000)
            }
        } else {
            let iterationNumber = status.iterationNumber
            let scheduledCommands = status.currentCommandsBlock[0]

            nextIterationTimeoutID = setTimeout(() => {
                nextIteration(++iterationNumber, (scheduledCommands += fileReadingLimit.value))
            }, (status.currentCommandsBlock[1] - (status.currentCommandsBlock[0] + status.currentCommand)) * settings.readingSpeed * 1000)
        }
    }
})
</script>

<template>
    <Transition name="opacity" mode="out-in" appear>
        <div class="control" :class="{ deactive: !file.loaded }">
            <div class="control__playing">
                <button class="control__play button" :class="{ active: status.playing }" @click="play">Play</button>
                <button class="control__play button" :class="{ deactive: !status.playing && file.loaded }" @click="stop">Stop</button>
            </div>

            <div class="control__inputs">
                <Global />
                <Oscillator v-if="!settings.midiMode" />
                <Filter v-if="!settings.midiMode" />
                <LFO v-if="!settings.midiMode" />
                <Midi v-if="settings.midiMode" />
            </div>
        </div>
    </Transition>
</template>

<style lang="scss" scoped>
@import '../assets/styles/vars.scss';

.control {
    transition: all 200ms ease-in;
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: center;

    &__inputs {
        display: grid;
        grid-row-gap: 10px;
    }

    .input {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
    }

    &__playing {
        display: flex;
        justify-content: center;
        column-gap: 15px;
        width: 100%;
    }

    &__play {
        color: $white;
        padding: 9px 20px;
    }
}
</style>
