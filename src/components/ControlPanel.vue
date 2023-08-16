<script setup>
import { onMounted, watch, computed } from 'vue'
import { useFileStore, useSettingsStore, useStatusStore } from '@/stores/global.js'
import { toFixedNumber } from '../assets/js/helpers'

const file = useFileStore()
const settings = useSettingsStore()
const status = useStatusStore()

let audioContext = null
let oscillator = null
let gain = null

const wave = computed(() => settings.waveType)
const playing = computed(() => status.playing)
const gainValue = computed(() => settings.gain)
const iterationTime = computed(() => fileReadingLimit * settings.readingSpeed * 1000)

const fileReadingLimit = 500 // Планирование композиции делим на итерации по fileReadingLimit шагов

function audioInit() {
    // Создание
    oscillator = audioContext.createOscillator()
    gain = audioContext.createGain()

    // Настройка
    gain.gain.value = gainValue.value
    oscillator.type = wave.value

    // Соединение
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
}

// Чтобы снизить нагрузку на процессор, мы делим планирование композиции на итерации
// Но тогда как на каждой команде менять настройки воспроизведения?
// То есть мы запланировали звук на 500 команд вперёд и он readonly
// И только на следующей итерации мы можем его поменять
function nextIteration(iterationNumber, scheduledCommands) {
    // Если дошли до конца команд или нажали stop, то выходим из рекурсии
    if (scheduledCommands >= file.binary8.length - 1 || !status.playing) {
        status.playing = false
        return
    }

    // prettier-ignore
    const end = scheduledCommands + fileReadingLimit < file.binary8.length - 1
        ? scheduledCommands + fileReadingLimit - 1
        : file.binary8.length - 1

    status.currentCommandsBlock = [scheduledCommands, end]

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
    if (fileReadingLimit >= file.binary8.length - 1) {
        setTimeout(() => {
            status.playing = false
        }, (file.binary8.length - 1) * settings.readingSpeed * 1000)
    } else {
        setTimeout(() => {
            nextIteration(++iterationNumber, (scheduledCommands += fileReadingLimit))
        }, iterationTime.value)
    }
}

onMounted(() => {
    audioContext = new AudioContext()
    audioInit()
})

function play() {
    if (file.loaded && !status.playing) {
        oscillator.start()
        status.playing = true
        // TODO: из-за этого на ходу менять скорость нельзя
        setTimeout(stop, toFixedNumber((file.binary8.length - 1) * settings.readingSpeed * 1000))
        nextIteration(0, 0)
    }
}

function stop() {
    if (status.playing) {
        oscillator.stop(audioContext.currentTime)
        status.playing = false
    }
}

watch(gainValue, (newValue) => {
    gain.gain.value = newValue
})

// При изменении типа волны в UI сразу передаём его в осциллятор
watch(wave, (newValue) => {
    oscillator.type = newValue
})

// По окончании композиции заново создаём связку
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
                <div class="control__gain input">
                    <span>Gain</span>
                    <input v-model="settings.gain" step="0.01" type="number" min="0" name="gain" />
                </div>

                <div class="control__reading input">
                    <span>Reading speed</span>
                    <input v-model="settings.readingSpeed" step="0.01" type="number" min="0" name="gain" />
                </div>

                <div class="control__wave input">
                    <span>Wave type</span>
                    <select name="wave" class="wave" v-model="settings.waveType">
                        <option value="sine">sine</option>
                        <option value="square">square</option>
                        <option value="sawtooth">sawtooth</option>
                        <option value="triangle">triangle</option>
                    </select>
                </div>

                <div class="control__wave input">
                    <span>Transition type</span>
                    <select name="transition" class="transition" v-model="settings.transitionType">
                        <option value="immediately">immediately</option>
                        <option value="linear">linear</option>
                        <option value="exponential">exponential</option>
                    </select>
                </div>
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
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, 1fr);
        grid-column-gap: 20px;
        grid-row-gap: 20px;
    }

    .input {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;

        select,
        input {
            background: $black;
            color: $white;
            border: 1px solid $white;
            border-radius: 5px;
            padding: 0px 5px;
            width: 150px;
            max-width: 400px;
            height: 20px;

            &:hover {
                background: #090c0f;
            }
        }
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
