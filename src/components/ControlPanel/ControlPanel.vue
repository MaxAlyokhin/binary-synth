<script setup>
// Это важнейший компонент системы
// Он генерирует частоты и ноты, планирует их исполнение
// Здесь создаётся audioContext и коннектится граф

// Файл - это весь файл в принципе
// Фрагмент - это весь или часть файла, определяемая Commands range
// Бинарный элемент - это байт или два байта в зависимости от Bitness
// Лист - это 500 или 250 бинарных элементов из фрагмента
// Мы делим файл на "листы" по 500 или 250 команд для 8 и 16-бит соответственно
// и проигрываем их по очереди

// Play вызывает функцию nextList, которая:
// 1 интерпретирует бинарные слова в команды в массив commands[]
// 2 выделяет из фрагмента лист
// 3 планирует работу осциллятора или планирует миди-сообщения по листу
// 4 планирует запуск следующего листа

import { watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { clearTimeout, setTimeout } from 'worker-timers'
import { useFileStore, useSettingsStore, useStatusStore } from '@/stores/globalStore.js'
import { toFixedNumber, getRandomNumber } from '@/assets/js/helpers.js'
import { getFrequency } from '@/assets/js/getFrequency.js'
import fourierCoefficients from '@/assets/js/fourierCoefficients.js'
import SettingsExchange from '@/components/ControlPanel/SettingsExchange.vue'
import Filter from '@/components/ControlPanel/Filter.vue'
import LFO from '@/components/ControlPanel/LFO.vue'
import Oscillator from '@/components/ControlPanel/Oscillator.vue'
import Global from '@/components/ControlPanel/Global.vue'
import Midi from '@/components/ControlPanel/Midi.vue'
import sendMIDIMessage from '@/assets/js/midiMessages.js'
import { getMIDINote } from '@/assets/js/getMIDINote.js'
import { checkFrequenciesWithNewSampleRate, checkSampleRate } from '../../assets/js/helpers'

const file = useFileStore()
const settings = useSettingsStore()
const status = useStatusStore()

const listSize = computed(() => (settings.bitness === '8' ? 500 : 250)) // Composition planning is divided into iterations by listSize.value steps
const timeToNextList = computed(() =>
    toFixedNumber((status.startAndEndOfList[1] - status.startAndEndOfList[0] + 1) * settings.readingSpeed * 1000)
)
const bynaryInSelectedBitness = computed(() => (settings.bitness === '8' ? file.binary8 : file.binary16))

// Creating audio elements
let audioContext = null
let oscillator = null
let gain = null
let filter = null
let lfoDepth = null
let lfoOsc = null
let masterGain = null
let panner = null
let squareWave = null
let sawtoothWave = null

function createAudioGraph(sampleRate) {
    if (sampleRate) {
        audioContext = new AudioContext({ sampleRate })
    } else {
        audioContext = new AudioContext()
        settings.sampleRate = audioContext.sampleRate
    }

    gain = audioContext.createGain()
    filter = audioContext.createBiquadFilter()
    lfoDepth = audioContext.createGain()
    lfoOsc = audioContext.createOscillator()
    masterGain = audioContext.createGain()
    panner = audioContext.createStereoPanner()

    // Setup
    filter.type = 'lowpass'
    filter.frequency.value = settings.biquadFilterFrequency
    filter.Q.value = settings.biquadFilterQ
    lfoDepth.gain.value = settings.LFO.depth
    gain.gain.value = settings.gain
    masterGain.gain.value = 1
    panner.pan.value = settings.panner

    // Connection
    filter.connect(gain).connect(masterGain).connect(panner).connect(audioContext.destination)
    lfoDepth.connect(masterGain.gain)

    // Set specific waves
    squareWave = audioContext.createPeriodicWave(
        Float32Array.from(fourierCoefficients.square.real),
        Float32Array.from(fourierCoefficients.square.imag)
    )
    sawtoothWave = audioContext.createPeriodicWave(
        Float32Array.from(fourierCoefficients.sawtooth.real),
        Float32Array.from(fourierCoefficients.sawtooth.imag)
    )
}

function deleteAudioGraph() {
    audioContext = null
    oscillator = null
    gain = null
    filter = null
    lfoDepth = null
    lfoOsc = null
    masterGain = null
    panner = null
    squareWave = null
    sawtoothWave = null
}

// Функция-хелпер для установки типа волны для LFO,
// т.к. кастомные волны устанавливаются через setPeriodicWave
function setLFOType() {
    if (settings.LFO.type === 'square2') {
        lfoOsc.setPeriodicWave(squareWave)
    } else if (settings.LFO.type === 'sawtooth2') {
        lfoOsc.setPeriodicWave(sawtoothWave)
    } else {
        lfoOsc.type = settings.LFO.type
    }
}

// At each play, create a new oscillator and connect it
// Changing its frequency will be planned in nextList()
function setOscillators() {
    oscillator = audioContext.createOscillator()

    if (settings.waveType === 'square2') {
        oscillator.setPeriodicWave(squareWave)
    } else if (settings.waveType === 'sawtooth2') {
        oscillator.setPeriodicWave(sawtoothWave)
    } else {
        oscillator.type = settings.waveType
    }

    oscillator.connect(filter)

    lfoOsc = audioContext.createOscillator()

    setLFOType()

    lfoOsc.frequency.value = settings.LFO.rate
    lfoOsc.connect(lfoDepth)
}

function recreateAudioGraph(sampleRate) {
    deleteAudioGraph()
    createAudioGraph(sampleRate)
    setOscillators()
}

watch(
    () => settings.sampleRate,
    (newValue, oldValue) => {
        settings.sampleRate = checkSampleRate(settings.sampleRateRange.minimum, settings.sampleRateRange.maximum, settings.sampleRate)

        settings.frequenciesRange.to = checkFrequenciesWithNewSampleRate(settings.sampleRate, settings.frequenciesRange.to)
        settings.biquadFilterFrequency = checkFrequenciesWithNewSampleRate(settings.sampleRate, settings.biquadFilterFrequency)
        settings.LFO.rate = checkFrequenciesWithNewSampleRate(settings.sampleRate, settings.LFO.rate)

        recreateAudioGraph(settings.sampleRate)
    }
)

// Случайная величина отклонения от settings.readingSpeed
const getRandomTimeGap = () => (settings.isRandomTimeGap ? getRandomNumber(0, settings.readingSpeed) : 0)

// To reduce CPU overhead, we divide composition planning into iterations
let nextListTimeoutID = null
let midiTimeoutIDs = []
let commands = []

// При изменении диапазона частот/нот в MIDI-режиме нужно пересчитать все значения команд,
// доиграв текущую команду, но чтобы её отключить, нужно знать номер миди-ноты
let commandForNoteOff = null

/**
 * Для MIDI-режима отключает предыдущую ноту и включает следующую, учитывая все условия из настроек
 * @param {Number} index - номер команды из массива commands
 */
function playNote(index) {
    // NoteOff is not sent in solidMode (only allSoundOff at the end of reading)
    // If there are identical commands in a row, noteOn and pitch are not played
    // The identical commands in continuous mode are compared by note and its pitch
    // In tempered mode only by note

    if (!settings.midi.solidMode) {
        if (index !== 0) {
            sendMIDIMessage.noteOff(commands[index - 1][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)
        }

        // Если изменили диапазон частот/нот, то отключаем предыдущую ноту
        if (commandForNoteOff) {
            sendMIDIMessage.noteOff(commandForNoteOff[0], settings.midi.velocity, settings.midi.port, settings.midi.channel)
            commandForNoteOff = null
        }

        sendMIDIMessage.noteOn(commands[index][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)

        if (settings.frequencyMode === 'continuous') {
            sendMIDIMessage.pitch(commands[index][1], settings.midi.port, settings.midi.channel)
        }
    } else {
        let isEqualNote = null
        if (index !== 0) {
            if (settings.midi.solidMode) {
                if (settings.frequencyMode === 'continuous') {
                    isEqualNote = commands[index - 1][0] === commands[index][0] && commands[index - 1][1] === commands[index][1]
                } else {
                    isEqualNote = commands[index - 1][0] === commands[index][0]
                }
            }
        }

        if (!isEqualNote) {
            sendMIDIMessage.noteOn(commands[index][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)

            if (settings.frequencyMode === 'continuous') {
                sendMIDIMessage.pitch(commands[index][1], settings.midi.port, settings.midi.channel)
            }
        }
    }

    if (settings.isRandomTimeGap && index !== 0) status.currentCommand++
}

/**
 * Переводит двоичный код в команды, планирует работу осциллятора или миди и планирует перелистывание
 * @param {Number} listID - номер листа, если их несколько. При одном листе всегда будет 0
 * @param {Number} startOfList - номер байта в файле, с которого начинается лист
 */

function nextList(listID, startOfList) {
    // If we pressed stop, we exit the recursion
    if (!status.playing) {
        stop()
        return
    }

    // If we have reached the end of the fragment
    if (startOfList >= settings.fragment.to) {
        // В миди-режиме гасим последнюю ноту
        if (settings.midiMode) {
            sendMIDIMessage.noteOff(
                commands[status.startAndEndOfList[1] - status.startAndEndOfList[0]][0],
                settings.midi.velocity,
                settings.midi.port,
                settings.midi.channel
            )
        }

        if (settings.loop) {
            nextList(0, settings.fragment.from)
            return
        } else {
            stop()
            return
        }
    }

    // Define block of commands (500 pieces)
    // Если конец листа упирается в конец фрагмента, то ставим settings.fragment.to
    // prettier-ignore
    const endOfList = startOfList + listSize.value <= settings.fragment.to
        ? startOfList + listSize.value - 1
        : settings.fragment.to

    status.startAndEndOfList = [startOfList, endOfList]
    status.listID = listID

    // Planning the list and calculate commands

    // binaryID - serial number of the binary element (8 or 16-bit) in the whole file
    // index - serial number of the binary element in the list context

    // For normal mode use setValueAtTime/linearRampToValueAtTime/exponentialRampToValueAtTime for planning
    if (!settings.midiMode) {
        let command = null

        // В зависимости от transitionType планируем работу осциллятора по листу
        switch (settings.transitionType) {
            case 'immediately':
                for (let binaryID = startOfList, index = 0; binaryID <= endOfList; binaryID++, index++) {
                    command = getFrequency(
                        bynaryInSelectedBitness.value[binaryID],
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
                for (let binaryID = startOfList, index = 0; binaryID <= endOfList; binaryID++, index++) {
                    command = getFrequency(
                        bynaryInSelectedBitness.value[binaryID],
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
                for (let binaryID = startOfList, index = 0; binaryID <= endOfList; binaryID++, index++) {
                    command = getFrequency(
                        bynaryInSelectedBitness.value[binaryID],
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

    // For MIDI-mode use worker-timers library for planning
    else {
        midiTimeoutIDs.forEach((id) => {
            clearTimeout(id)
        })

        for (let binaryID = startOfList, index = 0; binaryID <= endOfList; binaryID++, index++) {
            commands[index] = getMIDINote(
                bynaryInSelectedBitness.value[binaryID],
                settings.bitness,
                settings.frequencyMode,
                frequencyCoefficients.value,
                settings.frequenciesRange.from,
                settings.notesRange.from
            )

            // Для каждой команды создаём функцию, сыграющую определённую ноту в определённое время
            const timeoutedNote = playNote.bind(null, index)
            midiTimeoutIDs[index] = setTimeout(timeoutedNote, (index * settings.readingSpeed + getRandomTimeGap()) * 1000)
        }
    }

    // Считаем nextListTimeoutID - начало следующего листа (или чтение текущего заново)
    // Если лист только один
    if (listSize.value >= settings.fragment.to - settings.fragment.from) {
        if (!settings.loop) {
            nextListTimeoutID = setTimeout(() => {
                // So that the last note doesn't take too long
                if (settings.midiMode) {
                    sendMIDIMessage.noteOff(
                        commands[settings.fragment.to - settings.fragment.from][0],
                        settings.midi.velocity,
                        settings.midi.port,
                        settings.midi.channel
                    )
                }

                stop()
            }, (settings.fragment.to - settings.fragment.from + 1) * settings.readingSpeed * 1000)
        }

        // В зацикленном режиме на одном листе
        else {
            nextListTimeoutID = setTimeout(() => {
                // So that the last note doesn't take too long
                if (settings.midiMode && !settings.midi.solidMode && !settings.midi.lastNoteOn) {
                    sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)
                }

                nextList(0, settings.fragment.from)
                // + 1 include zero command
            }, (settings.fragment.to - settings.fragment.from + 1) * settings.readingSpeed * 1000)
        }
    }

    // Если несколько листов, то планируем перелистывание
    else {
        nextListTimeoutID = setTimeout(() => {
            // So that the last note doesn't take too long
            if (settings.midiMode) {
                sendMIDIMessage.noteOff(commands[commands.length - 1][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)
            }
            nextList(++listID, (startOfList += listSize.value))
        }, timeToNextList.value)
    }
}

function play() {
    if (file.loaded && !status.playing) {
        gain.gain.setTargetAtTime(settings.gain, audioContext.currentTime, 0.005)

        if (!settings.midiMode) {
            oscillator.start()
            if (settings.LFO.enabled) {
                lfoOsc.start()
            }
        }

        status.playing = true
        nextList(0, settings.fragment.from)
    }
}

function stop() {
    if (status.playing) {
        clearTimeout(nextListTimeoutID)

        if (!settings.midiMode) {
            gain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.005)
            oscillator.stop(audioContext.currentTime + 0.1)
            if (settings.LFO.enabled) lfoOsc.stop(audioContext.currentTime + 0.1)
            oscillator.frequency.cancelScheduledValues(audioContext.currentTime + 0.1)

            setOscillators()
        } else {
            midiTimeoutIDs.forEach((id) => {
                clearTimeout(id)
            })
            sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)
        }

        status.playing = false
    }
}

function changePlaying(event) {
    if (event.code === 'Space') {
        status.playing ? stop() : play()
    }
}

function preventScrollOnSpacePress(event) {
    if (event.code === 'Space') event.preventDefault()
}

onMounted(() => {
    window.addEventListener('keydown', preventScrollOnSpacePress)
    window.addEventListener('keyup', changePlaying)

    // Если настроек sampleRate нет
    if (settings.sampleRate === null) {
        createAudioGraph()
        setOscillators()
    }
})

onUnmounted(() => {
    window.removeEventListener('keydown', preventScrollOnSpacePress)
    window.removeEventListener('keyup', changePlaying)
})

watch(
    () => settings.biquadFilterFrequency,
    (newValue) => {
        if (isNaN(newValue)) {
            return
        } else if (newValue <= 0) {
            filter.frequency.value = 0
        } else if (newValue > settings.sampleRate / 2) {
            filter.frequency.value = settings.sampleRate / 2
        } else {
            filter.frequency.value = newValue
        }
    }
)
watch(
    () => settings.biquadFilterQ,
    (newValue) => {
        if (isNaN(newValue)) {
            return
        } else if (newValue <= 0) {
            filter.Q.value = 0.0001
        } else if (newValue > 1000) {
            filter.Q.value = 1000
        } else {
            filter.Q.value = newValue
        }
    }
)
watch(
    () => settings.LFO.enabled,
    (newValue) => {
        if (newValue) {
            if (status.playing) {
                lfoOsc.start()
            }
        } else {
            if (status.playing) {
                lfoOsc.stop(audioContext.currentTime + 0.1)
                lfoOsc = audioContext.createOscillator()
                setLFOType()
                lfoOsc.frequency.value = settings.LFO.rate
                lfoOsc.connect(lfoDepth)
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
        if (isNaN(newValue) || newValue < 0) {
            lfoOsc.frequency.value = 0
        } else if (newValue > settings.sampleRate / 2) {
            lfoOsc.frequency.value = settings.sampleRate / 2
        } else {
            lfoOsc.frequency.value = newValue
        }
    }
)
watch(
    () => settings.LFO.depth,
    (newValue) => {
        if (isNaN(newValue)) {
            return
        } else if (newValue < 0) {
            lfoDepth.gain.setTargetAtTime(0, audioContext.currentTime, 0.005)
        } else if (newValue > 1) {
            lfoDepth.gain.setTargetAtTime(1, audioContext.currentTime, 0.005)
        } else {
            lfoDepth.gain.setTargetAtTime(newValue, audioContext.currentTime, 0.005)
        }
    }
)
watch(
    () => settings.gain,
    (newValue) => {
        if (isNaN(newValue)) {
            return
        } else if (newValue <= 0) {
            gain.gain.setTargetAtTime(0, audioContext.currentTime, 0.005)
        } else {
            gain.gain.setTargetAtTime(newValue, audioContext.currentTime, 0.005)
        }
    }
)
watch(
    () => settings.panner,
    (newValue) => {
        if (isNaN(newValue)) {
            return
        } else if (newValue <= -1) {
            panner.pan.setTargetAtTime(-1, audioContext.currentTime, 0.005)
        } else if (newValue >= 1) {
            panner.pan.setTargetAtTime(1, audioContext.currentTime, 0.005)
        } else {
            panner.pan.setTargetAtTime(newValue, audioContext.currentTime, 0.005)
        }
    }
)
// When we change the wave type in the UI, we immediately pass it to the oscillator
watch(
    () => settings.waveType,
    (newValue) => {
        if (newValue === 'square2') {
            oscillator.setPeriodicWave(squareWave)
        } else if (newValue === 'sawtooth2') {
            oscillator.setPeriodicWave(sawtoothWave)
        } else {
            oscillator.type = newValue
        }
    }
)
// At the end of the composition, re-create the binder
watch(
    () => status.playing,
    (newValue) => {
        if (newValue === false) {
            stop()
        }
    }
)

const frequencyCoefficients = computed(() => {
    return {
        continouos8: (settings.frequenciesRange.to - settings.frequenciesRange.from) / 256,
        continouos16: (settings.frequenciesRange.to - settings.frequenciesRange.from) / 65536,
        tempered8: (settings.notesRange.to - settings.notesRange.from) / 256,
        tempered16: (settings.notesRange.to - settings.notesRange.from) / 65536,
    }
})

// If these parameters are changed, completely recalculate the scheduling again
watch([() => settings.readingSpeed, () => settings.transitionType, () => settings.isRandomTimeGap], () => {
    if (status.playing) {
        // Если несколько листов, то отменяем рекурсию
        clearTimeout(nextListTimeoutID)

        let command = null

        if (!settings.midiMode) {
            // Cancel already planned for the oscillator
            oscillator.frequency.cancelScheduledValues(audioContext.currentTime)

            // Reschedule the changes in the oscillator, starting from the last command where we left off
            switch (settings.transitionType) {
                case 'immediately':
                    for (
                        let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                        binaryID <= status.startAndEndOfList[1];
                        binaryID++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[binaryID],
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
                        let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                        binaryID <= status.startAndEndOfList[1];
                        binaryID++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[binaryID],
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
                        let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                        binaryID <= status.startAndEndOfList[1];
                        binaryID++, index++
                    ) {
                        command = getFrequency(
                            bynaryInSelectedBitness.value[binaryID],
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
                let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                binaryID <= status.startAndEndOfList[1];
                binaryID++, index++
            ) {
                commands[index] = getMIDINote(
                    bynaryInSelectedBitness.value[binaryID],
                    settings.bitness,
                    settings.frequencyMode,
                    frequencyCoefficients.value,
                    settings.frequenciesRange.from,
                    settings.notesRange.from
                )

                const timeoutedNote = playNote.bind(null, index)
                midiTimeoutIDs[index] = setTimeout(timeoutedNote, ((index + 1) * settings.readingSpeed + getRandomTimeGap()) * 1000)
            }
        }

        // Reschedule the recursion
        // The time of the next recursion is the number of commands remaining in the iteration * settings.readingSpeed
        // Если лист один
        if (listSize.value >= settings.fragment.to - settings.fragment.from) {
            if (!settings.loop) {
                nextListTimeoutID = setTimeout(() => {
                    // So that the last note doesn't take too long
                    if (settings.midiMode) {
                        sendMIDIMessage.noteOff(
                            commands[settings.fragment.to - settings.fragment.from][0],
                            settings.midi.velocity,
                            settings.midi.port,
                            settings.midi.channel
                        )
                    }
                    stop()
                }, (settings.fragment.to - settings.fragment.from - status.currentCommand) * settings.readingSpeed * 1000)
            }
            // На одном листе с зацикливанием
            else {
                nextListTimeoutID = setTimeout(() => {
                    // So that the last note doesn't take too long
                    if (settings.midiMode) {
                        sendMIDIMessage.noteOff(
                            commands[settings.fragment.to - settings.fragment.from][0],
                            settings.midi.velocity,
                            settings.midi.port,
                            settings.midi.channel
                        )
                    }
                    nextList(0, settings.fragment.from)
                }, (settings.fragment.to - settings.fragment.from - status.currentCommand) * settings.readingSpeed * 1000)
            }
        }
        // Если листов несколько
        else {
            let listID = status.listID
            let startOfList = status.startAndEndOfList[0]

            nextListTimeoutID = setTimeout(() => {
                if (settings.midiMode) {
                    sendMIDIMessage.noteOff(
                        commands[commands.length - 1][0],
                        settings.midi.velocity,
                        settings.midi.port,
                        settings.midi.channel
                    )
                }

                nextList(++listID, (startOfList += listSize.value))
            }, (status.startAndEndOfList[1] - (status.startAndEndOfList[0] + status.currentCommand)) * settings.readingSpeed * 1000)
        }
    }
})

// When changing these parameters, only the frequencies are recalculated
watch(
    [() => settings.frequenciesRange, () => settings.notesRange, () => settings.frequencyMode],
    () => {
        if (status.playing) {
            let command = null

            if (!settings.midiMode) {
                // Cancel already planned for the oscillator
                oscillator.frequency.cancelScheduledValues(audioContext.currentTime)

                // Reschedule the changes in the oscillator, starting from the last command where we left off
                switch (settings.transitionType) {
                    case 'immediately':
                        for (
                            let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                            binaryID <= status.startAndEndOfList[1];
                            binaryID++, index++
                        ) {
                            command = getFrequency(
                                bynaryInSelectedBitness.value[binaryID],
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
                            let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                            binaryID <= status.startAndEndOfList[1];
                            binaryID++, index++
                        ) {
                            command = getFrequency(
                                bynaryInSelectedBitness.value[binaryID],
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
                            let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                            binaryID <= status.startAndEndOfList[1];
                            binaryID++, index++
                        ) {
                            command = getFrequency(
                                bynaryInSelectedBitness.value[binaryID],
                                settings.bitness,
                                settings.frequencyMode,
                                frequencyCoefficients.value,
                                settings.frequenciesRange.from,
                                settings.notesRange.from
                            )
                            if (!isFinite(command)) command = 0.01 // There are glitches on large readingSpeeds
                            oscillator.frequency.exponentialRampToValueAtTime(
                                command,
                                audioContext.currentTime + index * settings.readingSpeed
                            )
                        }
                        break
                }
            } else {
                // Запоминаем текущую ноту, чтобы следующий playNote() её закончил
                if (!commandForNoteOff) commandForNoteOff = commands[status.currentCommand]

                for (let binaryID = status.startAndEndOfList[0], index = 0; binaryID <= status.startAndEndOfList[1]; binaryID++, index++) {
                    commands[index] = getMIDINote(
                        bynaryInSelectedBitness.value[binaryID],
                        settings.bitness,
                        settings.frequencyMode,
                        frequencyCoefficients.value,
                        settings.frequenciesRange.from,
                        settings.notesRange.from
                    )
                }
            }
        }
    },
    { deep: true }
)

// If you change these parameters, start again
watch(
    [() => settings.bitness, () => settings.fragment],
    () => {
        const endOfList =
            settings.fragment.from + listSize.value < settings.fragment.to
                ? settings.fragment.from + listSize.value - 1
                : settings.fragment.to

        status.startAndEndOfList = [settings.fragment.from, endOfList]
    },
    { deep: true }
)

// TODO: Решить вопрос с изменением readingSpeed
// watch([() => settings.fragment.from, () => settings.fragment.to], (newValue, oldValue) => {
//     // Отображаем изменения в UI
//     const endOfList =
//         settings.fragment.from + listSize.value <= settings.fragment.to ? settings.fragment.from + listSize.value - 1 : settings.fragment.to

//     status.startAndEndOfList = [settings.fragment.from, endOfList]

//     const newFragment = newValue[1] - newValue[0]
//     const oldFragment = oldValue[1] - oldValue[0]
//     const isIncreased = newFragment > oldFragment

//     // если больше одного листа то при перелистывании всё пересчитает nextList
//     // это влияет только если остался один лист
//     // если status.currentCommand >= status.startAndEndOfList[1] то считывающая головка упёрлась в конец листа

//     // Во время игры остался один лист
//     if (status.playing && listSize.value >= newFragment) {
//         const newEndOfFragment = (newFragment - status.currentCommand) * settings.readingSpeed
//         const oldEndOfFragment = (oldFragment - status.currentCommand) * settings.readingSpeed

//         // Переносим конечную точку фрагмента
//         clearTimeout(nextListTimeoutID) // Cancel the scheduled recursion

//         if (!settings.loop) {
//             nextListTimeoutID = setTimeout(() => {
//                 // So that the last note doesn't take too long
//                 if (settings.midiMode) {
//                     sendMIDIMessage.noteOff(
//                         commands[settings.fragment.to - settings.fragment.from][0],
//                         settings.midi.velocity,
//                         settings.midi.port,
//                         settings.midi.channel
//                     )
//                 }

//                 stop()
//             }, newEndOfFragment * 1000)
//         } else {
//             nextListTimeoutID = setTimeout(() => {
//                 // So that the last note doesn't take too long
//                 if (settings.midiMode && !settings.midi.solidMode && !settings.midi.lastNoteOn) {
//                     sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)
//                 }

//                 nextList(0, settings.fragment.from)
//                 // + 1 include zero command
//             }, newEndOfFragment * 1000)
//         }

//         // если меняем начало фрагмента то можно забить тк концовка та же и nextList пересчитает
//         // Уменьшаем фрагмент
//         if (!isIncreased) {
//             // cancel clear
//             // Отменяем команды
//             // let command = null
//             if (!settings.midiMode) {
//                 // Оменяем то что после новой метки конца листа
//                 // Отменить всё что по времени начинается
//                 // newFragment - status.currentCommand сколько команд до конца
//                 oscillator.frequency.cancelScheduledValues(audioContext.currentTime + newEndOfFragment)
//             } else {
//                 // Запоминаем текущую ноту, чтобы следующий playNote() её закончил
//                 // if (!commandForNoteOff) commandForNoteOff = commands[status.currentCommand]

//                 // От текущей команды до конца старого фрагмента
//                 for (let index = newFragment - 1; index < oldFragment; index++) {
//                     clearTimeout(midiTimeoutIDs[index])
//                 }
//             }
//         }

//         // Увеличиваем фрагмент
//         else {
//             let command = null

//             if (!settings.midiMode) {
//                 // Reschedule the changes in the oscillator, starting from the last command where we left off
//                 switch (settings.transitionType) {
//                     case 'immediately':
//                         for (let binaryID = oldValue[1], index = 0; binaryID <= newValue[1]; binaryID++, index++) {
//                             command = getFrequency(
//                                 bynaryInSelectedBitness.value[binaryID],
//                                 settings.bitness,
//                                 settings.frequencyMode,
//                                 frequencyCoefficients.value,
//                                 settings.frequenciesRange.from,
//                                 settings.notesRange.from
//                             )
//                             if (!isFinite(command)) command = 0 // There are glitches on large readingSpeeds
//                             oscillator.frequency.setValueAtTime(
//                                 command,
//                                 audioContext.currentTime + oldEndOfFragment + index * settings.readingSpeed + getRandomTimeGap()
//                             )
//                         }
//                         break

//                     case 'linear':
//                         for (
//                             let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
//                             binaryID <= status.startAndEndOfList[1];
//                             binaryID++, index++
//                         ) {
//                             command = getFrequency(
//                                 bynaryInSelectedBitness.value[binaryID],
//                                 settings.bitness,
//                                 settings.frequencyMode,
//                                 frequencyCoefficients.value,
//                                 settings.frequenciesRange.from,
//                                 settings.notesRange.from
//                             )
//                             if (!isFinite(command)) command = 0 // There are glitches on large readingSpeeds
//                             oscillator.frequency.linearRampToValueAtTime(
//                                 command,
//                                 audioContext.currentTime + oldEndOfFragment + index * settings.readingSpeed + getRandomTimeGap()
//                             )
//                         }
//                         break

//                     case 'exponential':
//                         for (
//                             let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
//                             binaryID <= status.startAndEndOfList[1];
//                             binaryID++, index++
//                         ) {
//                             command = getFrequency(
//                                 bynaryInSelectedBitness.value[binaryID],
//                                 settings.bitness,
//                                 settings.frequencyMode,
//                                 frequencyCoefficients.value,
//                                 settings.frequenciesRange.from,
//                                 settings.notesRange.from
//                             )
//                             if (!isFinite(command)) command = 0.01 // There are glitches on large readingSpeeds
//                             oscillator.frequency.exponentialRampToValueAtTime(
//                                 command,
//                                 audioContext.currentTime + oldEndOfFragment + index * settings.readingSpeed + getRandomTimeGap()
//                             )
//                         }
//                         break
//                 }
//             } else {
//                 // Запоминаем текущую ноту, чтобы следующий playNote() её закончил
//                 if (!commandForNoteOff) commandForNoteOff = commands[status.currentCommand]

//                 for (
//                     let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
//                     binaryID <= status.startAndEndOfList[1];
//                     binaryID++, index++
//                 ) {
//                     commands.push(getMIDINote(
//                         bynaryInSelectedBitness.value[binaryID],
//                         settings.bitness,
//                         settings.frequencyMode,
//                         frequencyCoefficients.value,
//                         settings.frequenciesRange.from,
//                         settings.notesRange.from
//                     ))

//                     // Для каждой команды создаём функцию, сыграющую определённую ноту в определённое время
//                     const timeoutedNote = playNote.bind(null, commands.length - 1)
//                     midiTimeoutIDs.push(setTimeout(timeoutedNote, (oldEndOfFragment + index * settings.readingSpeed + getRandomTimeGap()) * 1000))
//                 }
//             }
//         }
//     }

//     // Если изменили фрагмент во время игры, то надо пересчитать
//     // if (status.playing) {
//     //     // Если фрагмент стал меньше
//     //     // Если листов много, то изменения не повлияют на текущий лист,
//     //     // поэтому пересчитываем только если у нас один лист
//     //     if (!isIncreased && listSize.value >= newFragment) {
//     //         // Переносим конечную точку фрагмента
//     //         clearTimeout(nextListTimeoutID) // Cancel the scheduled recursion

//     //         if (!settings.loop) {
//     //             nextListTimeoutID = setTimeout(() => {
//     //                 // So that the last note doesn't take too long
//     //                 if (settings.midiMode) {
//     //                     sendMIDIMessage.noteOff(
//     //                         commands[settings.fragment.to - settings.fragment.from][0],
//     //                         settings.midi.velocity,
//     //                         settings.midi.port,
//     //                         settings.midi.channel
//     //                     )
//     //                 }

//     //                 stop()
//     //             }, (settings.fragment.to - settings.fragment.from + 1) * settings.readingSpeed * 1000)
//     //         }

//     //         // В зацикленном режиме на одном листе
//     //         else {
//     //             nextListTimeoutID = setTimeout(() => {
//     //                 // So that the last note doesn't take too long
//     //                 if (settings.midiMode && !settings.midi.solidMode && !settings.midi.lastNoteOn) {
//     //                     sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)
//     //                 }

//     //                 nextList(0, settings.fragment.from)
//     //                 // + 1 include zero command
//     //             }, (settings.fragment.to - settings.fragment.from + 1) * settings.readingSpeed * 1000)
//     //         }

//     //         // Отменяем команды
//     //         let command = null
//     //         if (!settings.midiMode) {
//     //             // Оменяем то что после новой метки конца листа
//     //             oscillator.frequency.cancelScheduledValues(audioContext.currentTime + timeToNextList / 1000)
//     //             }
//     //         } else {
//     //             // Запоминаем текущую ноту, чтобы следующий playNote() её закончил
//     //             if (!commandForNoteOff) commandForNoteOff = commands[status.currentCommand]

//     //             // От текущей команды до конца старого фрагмента
//     //             for (let index = status.currentCommand; index < oldFragment.length; index++) {

//     //             }

//     //             midiTimeoutIDs.forEach((id) => {
//     //                 clearTimeout(id)
//     //             })
//     //         }
//     //     }

//     //     if (isIncreased) {
//     //         // Если один лист, то просто добавляем планы
//     //         if (listSize.value >= newFragment) {
//     //         }
//     //         // Если СТАЛО много листов, то один раз считаем
//     //         // Дальнейшие увеличения не влияют
//     //         else if (oldFragment <= listSize.value) {
//     //         }
//     //     }
//     // }
// })

watch(
    () => file.loaded,
    () => {
        stop()
    }
)

watch(
    () => settings.midiMode,
    (newValue) => {
        if (!newValue) {
            setOscillators()
        }

        // If the user has switched to MIDI mode, cancel the oscillator
        if (status.playing) {
            let command = null

            // If MIDI is on
            if (newValue === true) {
                oscillator.stop(audioContext.currentTime)
                if (settings.LFO.enabled) lfoOsc.stop(audioContext.currentTime)
                oscillator.frequency.cancelScheduledValues(audioContext.currentTime)
                clearTimeout(nextListTimeoutID) // Cancel the scheduled recursion

                for (
                    let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                    binaryID <= status.startAndEndOfList[1];
                    binaryID++, index++
                ) {
                    commands[index] = getMIDINote(
                        bynaryInSelectedBitness.value[binaryID],
                        settings.bitness,
                        settings.frequencyMode,
                        frequencyCoefficients.value,
                        settings.frequenciesRange.from,
                        settings.notesRange.from
                    )

                    const timeoutedNote = playNote.bind(null, index)
                    midiTimeoutIDs[index] = setTimeout(timeoutedNote, index * settings.readingSpeed * 1000)
                }
            }
            // If MIDI is off
            else {
                midiTimeoutIDs.forEach((id) => {
                    clearTimeout(id)
                })
                sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)

                clearTimeout(nextListTimeoutID) // Cancel the scheduled recursion

                oscillator.start()
                if (settings.LFO.enabled) lfoOsc.start()

                // Reschedule the changes in the oscillator, starting from the last command where we left off
                switch (settings.transitionType) {
                    case 'immediately':
                        for (
                            let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                            binaryID <= status.startAndEndOfList[1];
                            binaryID++, index++
                        ) {
                            command = getFrequency(
                                bynaryInSelectedBitness.value[binaryID],
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
                            let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                            binaryID <= status.startAndEndOfList[1];
                            binaryID++, index++
                        ) {
                            command = getFrequency(
                                bynaryInSelectedBitness.value[binaryID],
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
                            let binaryID = status.startAndEndOfList[0] + status.currentCommand, index = 0;
                            binaryID <= status.startAndEndOfList[1];
                            binaryID++, index++
                        ) {
                            command = getFrequency(
                                bynaryInSelectedBitness.value[binaryID],
                                settings.bitness,
                                settings.frequencyMode,
                                frequencyCoefficients.value,
                                settings.frequenciesRange.from,
                                settings.notesRange.from
                            )

                            if (!isFinite(command)) command = 0.01 // There are glitches on large readingSpeeds
                            oscillator.frequency.exponentialRampToValueAtTime(
                                command,
                                audioContext.currentTime + index * settings.readingSpeed
                            )
                        }
                        break
                }
            }

            // Reschedule the recursion
            // The time of the next recursion is the number of commands remaining in the iteration * settings.readingSpeed
            if (listSize.value >= settings.fragment.to) {
                if (!settings.loop) {
                    nextListTimeoutID = setTimeout(() => {
                        stop()
                    }, (settings.fragment.to - status.currentCommand) * settings.readingSpeed * 1000)
                } else {
                    nextListTimeoutID = setTimeout(() => {
                        nextList(0, settings.fragment.from)
                    }, (settings.fragment.to - status.currentCommand) * settings.readingSpeed * 1000)
                }
            } else {
                let listID = status.listID
                let startOfList = status.startAndEndOfList[0]

                nextListTimeoutID = setTimeout(() => {
                    nextList(++listID, (startOfList += listSize.value))
                }, (status.startAndEndOfList[1] - (status.startAndEndOfList[0] + status.currentCommand)) * settings.readingSpeed * 1000)
            }
        }
    }
)
</script>

<template>
    <Transition name="opacity" mode="out-in" appear>
        <div class="control" :class="{ deactive: !file.loaded }">
            <SettingsExchange />

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
@import '@/assets/styles/vars.scss';

.control {
    transition: all 200ms ease-in;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    width: 100%;
    max-width: 320px;
    margin: 0 auto;

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
        column-gap: 10px;
        width: 100%;
    }
}
</style>
