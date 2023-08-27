<script setup>
import { watch, computed } from 'vue'
import { useFileStore, useSettingsStore, useStatusStore } from '@/stores/global.js'
import { toFixedNumber } from '../assets/js/helpers.js'
import { getFrequency } from '../assets/js/getFrequency.js'
import fourierCoefficients from '../assets/js/fourierCoefficients.js'
import Frequency from './ControlPanel/Frequency.vue'
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

const fileReadingLimit = 500 // Планирование композиции делим на итерации по fileReadingLimit шагов
const iterationTime = computed(() =>
    toFixedNumber((status.currentCommandsBlock[1] - status.currentCommandsBlock[0] + 1) * settings.readingSpeed * 1000)
)
const bynaryInSelectedBitness = computed(() => (settings.bitness === '8' ? file.binary8 : file.binary16))

// Создание
let audioContext = new AudioContext()
let oscillator = null
let gain = audioContext.createGain()
let filter = audioContext.createBiquadFilter()
let lfoDepth = audioContext.createGain()
let lfoOsc = audioContext.createOscillator()
let masterGain = audioContext.createGain()

// Настройка
filter.type = 'lowpass'
filter.frequency.value = settings.biquadFilterFrequency
filter.Q.value = settings.biquadFilterQ
lfoOsc.type = settings.LFO.type
lfoOsc.frequency.value = settings.LFO.rate
lfoOsc.start()
lfoDepth.gain.value = settings.LFO.depth
gain.gain.value = settings.gain
masterGain.gain.value = 1

// Соединение
filter.connect(gain)
lfoDepth.connect(masterGain.gain)
gain.connect(masterGain)
masterGain.connect(audioContext.destination)

audioInit()

const squareWave = audioContext.createPeriodicWave(
    Float32Array.from(fourierCoefficients.square.real),
    Float32Array.from(fourierCoefficients.square.imag)
)
const sawtoothWave = audioContext.createPeriodicWave(
    Float32Array.from(fourierCoefficients.sawtooth.real),
    Float32Array.from(fourierCoefficients.sawtooth.imag)
)

// При каждом play создаём новый осциллятор и подключаем его
// Изменение его частоты будет планироваться в nextIteration()
function audioInit() {
    oscillator = audioContext.createOscillator()
    oscillator.type = settings.waveType
    oscillator.connect(filter)
}

// Чтобы снизить нагрузку на процессор, мы делим планирование композиции на итерации
let nextIterationTimeoutID = null
let midiTimeoutIDs = []
let commands = []
function nextIteration(iterationNumber, scheduledCommands) {
    // Если дошли до конца команд или нажали stop, то выходим из рекурсии
    if (!status.playing) {
        status.playing = false
        return
    }

    if (scheduledCommands >= bynaryInSelectedBitness.value.length - 1) {
        if (settings.loop) {
            nextIteration(0, 0)
            return
        } else {
            status.playing = false
            return
        }
    }

    // Определяем блок команд (500 штук)
    // prettier-ignore
    const end = scheduledCommands + fileReadingLimit < bynaryInSelectedBitness.value.length - 1
        ? scheduledCommands + fileReadingLimit - 1
        : bynaryInSelectedBitness.value.length - 1

    status.currentCommandsBlock = [scheduledCommands, end]
    status.iterationNumber = iterationNumber

    // Планируем композицию
    let command = null

    // noteIndex - порядковый номер элемента во всём массиве команд
    // index - порядковый номер элемента в контексте итерации

    // Для обычного режима

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
                    if (!isFinite(command)) command = 0 // На больших readingSpeed бывают глюки
                    oscillator.frequency.setValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
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
                    if (!isFinite(command)) command = 0 // На больших readingSpeed бывают глюки
                    oscillator.frequency.linearRampToValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
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
                    if (!isFinite(command)) command = 0.01 // На больших readingSpeed бывают глюки
                    oscillator.frequency.exponentialRampToValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
                }
                break
        }
    }
    // Для MIDI-режима
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
                index * settings.readingSpeed * 1000,
                index
            )
        }
    }

    // Если в файле байтов меньше, чем fileReadingLimit, то рекурсия отменяется
    if (fileReadingLimit >= bynaryInSelectedBitness.value.length) {
        if (!settings.loop) {
            nextIterationTimeoutID = setTimeout(() => {
                status.playing = false
            }, bynaryInSelectedBitness.value.length * settings.readingSpeed * 1000)
        } else {
            nextIterationTimeoutID = setTimeout(() => {
                nextIteration(0, 0)
            }, bynaryInSelectedBitness.value.length * settings.readingSpeed * 1000)
        }
    } else {
        nextIterationTimeoutID = setTimeout(() => {
            nextIteration(++iterationNumber, (scheduledCommands += fileReadingLimit))
        }, iterationTime.value)
    }
}

function play() {
    if (file.loaded && !status.playing) {
        if (!settings.midiMode) oscillator.start()

        status.playing = true
        nextIteration(0, 0)
    }
}

function stop() {
    if (status.playing) {
        if (!settings.midiMode) {
            oscillator.stop(audioContext.currentTime)
            oscillator.frequency.cancelScheduledValues(audioContext.currentTime)
            clearTimeout(nextIterationTimeoutID) // Отменяем запланированную рекурсию
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
// При изменении типа волны в UI сразу передаём его в осциллятор
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
// По окончании композиции заново создаём связку
const playing = computed(() => status.playing)
watch(playing, (newValue) => {
    if (newValue === false) {
        if (!settings.midiMode) {
            oscillator.stop(audioContext.currentTime)
            audioInit()
        } else {
            sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)
        }
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

const readingSpeed = computed(() => settings.readingSpeed)
const transitionType = computed(() => settings.transitionType)
watch([readingSpeed, transitionType], () => {
    if (status.playing) {
        let command = null

        clearTimeout(nextIterationTimeoutID) // Отменяем рекурсию

        if (!settings.midiMode) {
            // Отменяем уже запланированное для осциллятора
            oscillator.frequency.cancelScheduledValues(audioContext.currentTime)

            // Перепланируем изменения в осцилляторе, начиная с последней команды на которой остановились
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

                        if (!isFinite(command)) command = 0 // На больших readingSpeed бывают глюки
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

                        if (!isFinite(command)) command = 0 // На больших readingSpeed бывают глюки
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

                        if (!isFinite(command)) command = 0.01 // На больших readingSpeed бывают глюки
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

        // Заново планируем рекурсию
        // Время следующей рекурсии это количество оставшихся в итерации команд * settings.readingSpeed
        if (fileReadingLimit >= bynaryInSelectedBitness.value.length) {
            if (!settings.loop) {
                nextIterationTimeoutID = setTimeout(() => {
                    status.playing = false
                }, (bynaryInSelectedBitness.value.length - status.currentCommand) * settings.readingSpeed * 1000)
            } else {
                nextIterationTimeoutID = setTimeout(() => {
                    nextIteration(0, 0)
                }, (bynaryInSelectedBitness.value.length - status.currentCommand) * settings.readingSpeed * 1000)
            }
        } else {
            let iterationNumber = status.iterationNumber
            let scheduledCommands = status.currentCommandsBlock[0]

            nextIterationTimeoutID = setTimeout(() => {
                nextIteration(++iterationNumber, (scheduledCommands += fileReadingLimit))
            }, (status.currentCommandsBlock[1] - (status.currentCommandsBlock[0] + status.currentCommand)) * settings.readingSpeed * 1000)
        }
    }
})

const frequenciesRange = computed(() => settings.frequenciesRange)
const notesRange = computed(() => settings.notesRange)
const frequencyMode = computed(() => settings.frequencyMode)
watch([frequenciesRange.value, notesRange.value, frequencyMode], () => {
    if (status.playing) {
        let command = null

        if (!settings.midiMode) {
            // Отменяем уже запланированное для осциллятора
            oscillator.frequency.cancelScheduledValues(audioContext.currentTime)

            // Перепланируем изменения в осцилляторе, начиная с последней команды на которой остановились
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
                        if (!isFinite(command)) command = 0 // На больших readingSpeed бывают глюки
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
                        if (!isFinite(command)) command = 0 // На больших readingSpeed бывают глюки
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
                        if (!isFinite(command)) command = 0.01 // На больших readingSpeed бывают глюки
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

watch(bynaryInSelectedBitness, () => {
    stop()
    setTimeout(play)
})

const loaded = computed(() => file.loaded)
watch(loaded, () => {
    stop()
})

const midiMode = computed(() => settings.midiMode)
watch(midiMode, (newValue) => {
    // Если перешли на MIDI-режим, то гасим осциллятор
    if (playing.value) {
        let command = null

        if (newValue === true) {
            oscillator.stop(audioContext.currentTime)
            oscillator.frequency.cancelScheduledValues(audioContext.currentTime)
            clearTimeout(nextIterationTimeoutID) // Отменяем запланированную рекурсию

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
        } else {
            midiTimeoutIDs.forEach((id) => {
                clearTimeout(id)
            })
            sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)

            clearTimeout(nextIterationTimeoutID) // Отменяем запланированную рекурсию

            audioInit()
            oscillator.start()

            // Перепланируем изменения в осцилляторе, начиная с последней команды на которой остановились
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

                        if (!isFinite(command)) command = 0 // На больших readingSpeed бывают глюки
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

                        if (!isFinite(command)) command = 0 // На больших readingSpeed бывают глюки
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

                        if (!isFinite(command)) command = 0.01 // На больших readingSpeed бывают глюки
                        oscillator.frequency.exponentialRampToValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
                    }
                    break
            }
        }

        // Заново планируем рекурсию
        // Время следующей рекурсии это количество оставшихся в итерации команд * settings.readingSpeed
        if (fileReadingLimit >= bynaryInSelectedBitness.value.length) {
            if (!settings.loop) {
                nextIterationTimeoutID = setTimeout(() => {
                    status.playing = false
                }, (bynaryInSelectedBitness.value.length - status.currentCommand) * settings.readingSpeed * 1000)
            } else {
                nextIterationTimeoutID = setTimeout(() => {
                    nextIteration(0, 0)
                }, (bynaryInSelectedBitness.value.length - status.currentCommand) * settings.readingSpeed * 1000)
            }
        } else {
            let iterationNumber = status.iterationNumber
            let scheduledCommands = status.currentCommandsBlock[0]

            nextIterationTimeoutID = setTimeout(() => {
                nextIteration(++iterationNumber, (scheduledCommands += fileReadingLimit))
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
                <Frequency />
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
