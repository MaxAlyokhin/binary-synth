<script setup>
import { ref, watch, computed } from 'vue'
import { useFileStore, useStatusStore, useSettingsStore } from '@/stores/global.js'
import { toFixedNumber } from '../assets/js/helpers.js'

const file = useFileStore()
const settings = useSettingsStore()
const status = useStatusStore()

const playing = computed(() => status.playing)
const readingSpeed = computed(() => settings.readingSpeed)
const time = ref(0)
const bynaryInSelectedBitness = computed(() => (settings.bitness === '8' ? file.binary8 : file.binary16))
const durationTime = computed(() =>
    secondsToFormatTime(toFixedNumber(bynaryInSelectedBitness.value?.length * settings.readingSpeed * 1000))
)

let timerInterval = null

function timer() {
    return setInterval(() => {
        time.value++
    }, 1000)
}

// Подсветка текущей команды в UI
let commandIteratorInterval = null
let currentIteration = 0

// По каждому play создаём новый итератор
function commandIterator() {
    return setInterval(() => {
        // Если у нас один лист
        if (bynaryInSelectedBitness.value.length <= 499) {
            if (status.currentCommand === bynaryInSelectedBitness.value.length - 1) {
                status.currentCommand = 0
            } else {
                status.currentCommand++
            }
        }
        // Если несколько листов
        // Мы можем определить переход на следующую порцию команд при изменении status.iterationNumber
        else {
            if (currentIteration !== status.iterationNumber) {
                currentIteration = status.iterationNumber
                status.currentCommand = 0
            } else {
                status.currentCommand++
            }
        }
    }, readingSpeed.value * 1000)
}

function secondsToFormatTime(ms) {
    const years = Math.floor(ms / (365 * 24 * 60 * 60 * 1000))
    const yearsms = ms % (365 * 24 * 60 * 60 * 1000)

    const days = Math.floor(yearsms / (24 * 60 * 60 * 1000))
    const daysms = ms % (24 * 60 * 60 * 1000)

    const hours = Math.floor(daysms / (60 * 60 * 1000))
    const hoursms = ms % (60 * 60 * 1000)

    const minutes = Math.floor(hoursms / (60 * 1000))
    const minutesms = ms % (60 * 1000)

    const seconds = Math.floor(minutesms / 1000)

    const milliseconds = toFixedNumber(ms % 1000, 2)

    const yDisplay = years > 0 ? years + (years === 1 ? ' year ' : ' years ') : ''
    const dDisplay = days > 0 ? days + (days === 1 ? ' day ' : ' days ') : ''
    const hDisplay = hours > 0 ? hours + (hours === 1 ? ' hour ' : ' hours ') : ''
    const mDisplay = minutes > 0 ? minutes + (minutes === 1 ? ' minute ' : ' minutes ') : ''
    const sDisplay = seconds > 0 ? seconds + (seconds === 1 ? ' second ' : ' seconds ') : ''
    const msDisplay = milliseconds > 0 ? milliseconds + (milliseconds === 1 ? ' millisecond ' : ' milliseconds ') : ''

    return yDisplay + dDisplay + hDisplay + mDisplay + sDisplay + msDisplay
}

function format(number) {
    let string = String(number)
    const s = string.length
    const chars = string.split('')
    const strWithSpaces = chars.reduceRight((acc, char, i) => {
        const spaceOrNothing = (s - i) % 3 === 0 ? ' ' : ''
        return spaceOrNothing + char + acc
    }, '')

    return strWithSpaces[0] === ' ' ? strWithSpaces.slice(1) : strWithSpaces
}

watch(playing, (newValue) => {
    if (newValue) {
        timerInterval = timer()
        commandIteratorInterval = commandIterator()
    } else {
        clearInterval(timerInterval)
        clearInterval(commandIteratorInterval)
        time.value = 0
        status.currentCommand = 0
    }
})

// При изменении в настройках скорости чтения заново определяем интервалы
watch(readingSpeed, () => {
    if (playing.value) {
        clearInterval(timerInterval)
        clearInterval(commandIteratorInterval)

        timerInterval = timer()
        commandIteratorInterval = commandIterator()
    }
})

watch(bynaryInSelectedBitness, (newValue) => {
    if (newValue.length <= 499) {
        status.currentCommandsBlock[1] = newValue.length
    } else {
        status.currentCommandsBlock = [0, 499]
    }
})
</script>

<template>
    <div class="status" :class="{ deactive: !file.loaded }">
        <div class="status__common">
            <div class="status__playing">
                Playing: <span :class="{ playing: status.playing }">{{ status.playing }}</span>
            </div>
            <div class="status__playing-time">
                Playing time (s): <span>{{ time }}</span>
            </div>
            <div class="status__type">
                File type: <span>{{ file.type }}</span>
            </div>
            <div class="status__name">
                File name: <span>{{ file.name }}</span>
            </div>
            <div class="status__size">
                File size (bytes): <span>{{ format(file.size) }}</span>
            </div>
            <div class="status__composition-duration">
                Composition duration (s): <span>{{ durationTime }}</span>
            </div>
        </div>
        <div class="status__title">Commands from {{ status.currentCommandsBlock[0] }} to {{ status.currentCommandsBlock[1] }}</div>
        <div class="status__commands" v-if="file.loaded" :class="{ 'status__commands--16': settings.bitness === '16' }">
            <div
                class="status__command"
                v-for="(command, index) in bynaryInSelectedBitness.slice(
                    status.currentCommandsBlock[0],
                    status.currentCommandsBlock[1] + 1
                )"
                :id="index"
                :class="{ active: index === status.currentCommand }"
            >
                {{
                    settings.bitness === '8'
                        ? '00000000'.slice(String(command.toString(2)).length) + command.toString(2)
                        : '0000000000000000'.slice(String(command.toString(2)).length) + command.toString(2)
                }}
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import '../assets/styles/vars.scss';

.status {
    transition: all 70ms ease-in;

    .active {
        color: $orange;
    }

    div {
        color: $blue;

        span {
            color: $orange;
        }
    }

    div.status__playing {
        span {
            color: $red;
        }

        span.playing {
            color: $green;
        }
    }

    &__title {
        margin-top: 20px;
        font-weight: 800;
    }

    &__name {
        max-width: 1000px;
    }

    &__commands {
        display: grid;
        grid-template-columns: repeat(25, 1fr);
        margin-top: 20px;
        max-width: fit-content;

        @media (max-width: 1800px) {
            grid-template-columns: repeat(20, 1fr);
        }

        @media (max-width: 1510px) {
            grid-template-columns: repeat(10, 1fr);
        }

        @media (max-width: 960px) {
            grid-template-columns: repeat(5, 1fr);
            margin-left: auto;
            margin-right: auto;
        }

        &--16 {
            grid-template-columns: repeat(12, 1fr);

            @media (max-width: 1800px) {
                grid-template-columns: repeat(9, 1fr);
            }

            @media (max-width: 1510px) {
                grid-template-columns: repeat(5, 1fr);
            }

            @media (max-width: 960px) {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    }

    &__command {
        display: flex;
        justify-content: center;
    }

    &__common {
        max-width: 1435px;
        overflow: auto;
        overflow-y: hidden;

        @media (max-width: 1550px) {
            max-width: 1155px;
        }

        @media (max-width: 1250px) {
            max-width: 450px;
        }
    }
}

.status.deactive {
    filter: brightness(0.5);
}
</style>
