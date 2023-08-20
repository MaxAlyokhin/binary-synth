<script setup>
import { onMounted, watch, computed } from 'vue'
import { useFileStore, useSettingsStore, useStatusStore } from '@/stores/global.js'
import { toFixedNumber } from '../assets/js/helpers.js'
import fourierCoefficients from '../assets/js/fourierCoefficients.js'
import Frequency from './ControlPanel/Frequency.vue'
import Filter from './ControlPanel/Filter.vue'
import LFO from './ControlPanel/LFO.vue'
import Oscillator from './ControlPanel/Oscillator.vue'
import Global from './ControlPanel/Global.vue'

const file = useFileStore()
const settings = useSettingsStore()
const status = useStatusStore()

const fileReadingLimit = 500 // Планирование композиции делим на итерации по fileReadingLimit шагов
const iterationTime = computed(() =>
    toFixedNumber((status.currentCommandsBlock[1] - status.currentCommandsBlock[0] + 1) * settings.readingSpeed * 1000)
)

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
// Но тогда как на каждой команде менять настройки воспроизведения?
// То есть мы запланировали звук на 500 команд вперёд и он readonly
// И только на следующей итерации мы можем его поменять

let nextIterationTimeoutID = null
function nextIteration(iterationNumber, scheduledCommands) {
    // Если дошли до конца команд или нажали stop, то выходим из рекурсии
    if (!status.playing) {
        status.playing = false
        return
    }

    if (scheduledCommands >= file.binary8.length - 1) {
        if (settings.loop) {
            nextIteration(0, 0)
            return
        } else {
            status.playing = false
            return
        }
    }

    // prettier-ignore
    const end = scheduledCommands + fileReadingLimit < file.binary8.length - 1
        ? scheduledCommands + fileReadingLimit - 1
        : file.binary8.length - 1

    status.currentCommandsBlock = [scheduledCommands, end]

    status.iterationNumber = iterationNumber

    let command = null

    switch (settings.transitionType) {
        case 'immediately':
            for (let noteIndex = scheduledCommands, index = 0; noteIndex <= end; noteIndex++, index++) {
                command = file.binary8[noteIndex] === 0 ? 0.1 : file.binary8[noteIndex]
                oscillator.frequency.setValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
            }
            break

        case 'linear':
            for (let noteIndex = scheduledCommands, index = 0; noteIndex <= end; noteIndex++, index++) {
                command = file.binary8[noteIndex] === 0 ? 0.1 : file.binary8[noteIndex]
                oscillator.frequency.linearRampToValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
            }
            break

        case 'exponential':
            for (let noteIndex = scheduledCommands, index = 0; noteIndex <= end; noteIndex++, index++) {
                command = file.binary8[noteIndex] === 0 ? 0.1 : file.binary8[noteIndex]
                oscillator.frequency.exponentialRampToValueAtTime(command, audioContext.currentTime + index * settings.readingSpeed)
            }
            break
    }

    // Если в файле байтов меньше, чем fileReadingLimit, то рекурсия отменяется
    if (fileReadingLimit >= file.binary8.length) {
        if (!settings.loop) {
            nextIterationTimeoutID = setTimeout(() => {
                status.playing = false
            }, file.binary8.length * settings.readingSpeed * 1000)
        } else {
            nextIterationTimeoutID = setTimeout(() => {
                nextIteration(0, 0)
            }, file.binary8.length * settings.readingSpeed * 1000)
        }
    } else {
        nextIterationTimeoutID = setTimeout(() => {
            nextIteration(++iterationNumber, (scheduledCommands += fileReadingLimit))
        }, iterationTime.value)
    }
}

function play() {
    if (file.loaded && !status.playing) {
        oscillator.start()
        status.playing = true
        nextIteration(0, 0)
    }
}

function stop() {
    if (status.playing) {
        oscillator.stop(audioContext.currentTime)
        clearTimeout(nextIterationTimeoutID) // Отменяем запланированную рекурсию
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
        oscillator.stop(audioContext.currentTime)
        audioInit()
    }
})

// TODO: менять скорость на ходу исполнения
// watch(readingSpeed, () => {
//     if (playing.value) {
//         clearInterval(timerInterval)
//         clearInterval(commandIteratorInterval)

//         timerInterval = timer()
//         commandIteratorInterval = commandIterator()
//     }
// })
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
                <Oscillator />
                <Filter />
                <LFO />
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
