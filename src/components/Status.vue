<script setup>
import { ref, watch, computed } from 'vue'
import { useFileStore, useStatusStore, useSettingsStore } from '@/stores/globalStore.js'
import { toFixedNumber } from '../assets/js/helpers.js'

const file = useFileStore()
const settings = useSettingsStore()
const status = useStatusStore()

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

const durationTime = computed(() => toFixedNumber((settings.commandsRange.to - settings.commandsRange.from) * settings.readingSpeed * 1000))
const durationTimeFormatted = computed(() => secondsToFormatTime(durationTime.value))

let timerInterval = null

const time = ref(0)
function timer() {
    return setInterval(() => {
        time.value++
    }, 1000)
}

function toHHMMSS(seconds) {
    return [Math.trunc(seconds / 3600), Math.trunc((seconds % 3600) / 60), seconds % 60]
        .map((value) => ('0' + value)
        .slice(-2)).join(':')
}

// Highlighting the current command in the UI
let commandIteratorInterval = null
let currentIteration = 0
const commandsOnList = computed(() => (settings.bitness === '8' ? 500 : 249))

// Create a new iterator for each play
function commandIterator() {
    // Maximum speed of setInterval 5ms
    if (readingSpeed.value >= 0.005) {
        return setInterval(() => {
            // If we have one sheet
            if (settings.commandsRange.to - settings.commandsRange.from <= commandsOnList.value) {
                if (status.currentCommand >= settings.commandsRange.to - settings.commandsRange.from) {
                    status.currentCommand = 0
                } else {
                    if (settings.isRandomTimeGap && settings.midiMode) {
                        return
                    } else {
                        status.currentCommand++
                    }
                }
            }
            // If multiple sheets
            // We can define the transition to the next instruction portion when status.iterationNumber changes
            else {
                if (currentIteration !== status.iterationNumber) {
                    currentIteration = status.iterationNumber
                    status.currentCommand = 0
                    status.currentCommand++
                } else {
                    if (settings.isRandomTimeGap && settings.midiMode) {
                        return
                    } else {
                        status.currentCommand++
                    }
                }
            }
        }, readingSpeed.value * 1000)
    } else {
        // If the speed is high, we display the active command every 5 commands.
        return setInterval(() => {
            // If we have one sheet
            if (settings.commandsRange.to - settings.commandsRange.from <= commandsOnList.value) {
                if (status.currentCommand >= settings.commandsRange.to - settings.commandsRange.from) {
                    status.currentCommand = 0
                } else {
                    status.currentCommand += 5 * (readingSpeed.value * 1000)
                }
            }
            // If multiple sheets
            // We can define the transition to the next instruction portion when status.iterationNumber changes
            else {
                if (currentIteration !== status.iterationNumber) {
                    currentIteration = status.iterationNumber
                    status.currentCommand = 0
                } else {
                    status.currentCommand += 5 * (readingSpeed.value * 1000)
                }
            }
        }, 5)
    }
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

const playing = computed(() => status.playing)
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

// When changing the reading speed settings, redefine the intervals
const readingSpeed = computed(() => settings.readingSpeed)
watch(readingSpeed, () => {
    if (playing.value) {
        clearInterval(timerInterval)
        clearInterval(commandIteratorInterval)

        timerInterval = timer()
        commandIteratorInterval = commandIterator()
    }
})

const bynaryInSelectedBitness = computed(() => (settings.bitness === '8' ? file.binary8 : file.binary16))
watch(bynaryInSelectedBitness, (newValue) => {
    if (settings.bitness === '8') {
        if (settings.commandsRange.to - settings.commandsRange.from >= 499) {
            status.currentCommandsBlock = [0, 499]
        } else {
            status.currentCommandsBlock[1] = settings.commandsRange.to
        }

        if (newValue.length <= 499) status.currentCommandsBlock[1] = newValue.length
    }

    if (settings.bitness === '16') {
        if (settings.commandsRange.to - settings.commandsRange.from >= 249) {
            status.currentCommandsBlock = [0, 249]
        } else {
            status.currentCommandsBlock[1] = settings.commandsRange.to
        }

        if (newValue.length <= 249) status.currentCommandsBlock[1] = newValue.length
    }
})
</script>

<template>
    <div class="status">
        <div class="status__common">
            <div class="status__playing">
                Playing: <span :class="{ playing: status.playing }">{{ status.playing }}</span>
            </div>
            <div class="status__playing-time">
                Playing time: <span>{{ toHHMMSS(time) }} | {{ time }}</span>
            </div>
            <div class="status__composition-duration">
                Fragment duration:
                <span>{{ durationTimeFormatted }}</span
                ><span v-show="durationTime <= 50">| {{ toFixedNumber(1000 / durationTime) }} Hz</span>
            </div>
            <div class="status__size">
                File size: <span>{{ format(file.size) }}</span>
            </div>
            <div class="status__name">
                File name: <span>{{ file.name }}</span>
            </div>
            <div v-show="settings.settingsFileName" class="status__settings-file-name" :class="{ deactive: !status.isSettingsFileActual }">
                Settings: <span>{{ settings.settingsFileName }}</span>
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
    font-size: 11px;

    .active {
        color: $orange;
    }

    div {
        color: $blue;
        white-space: nowrap;

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
        margin-top: 10px;
        font-weight: 800;
    }

    &__name {
        max-width: 1000px;
    }

    &__commands {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        margin-top: 20px;
        max-width: fit-content;
        position: sticky;
        top: 10px;
        font-size: 15px;

        @media (max-width: 1024px) {
            font-size: 12px;
        }

        @media (max-width: 1023px) {
            grid-template-columns: repeat(5, 1fr);
            margin-left: auto;
            margin-right: auto;
        }

        &--16 {
            grid-template-columns: repeat(5, 1fr);

            @media (max-width: 1023px) {
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
        overflow-x: scroll;
        overflow-y: hidden;

        @media (max-width: 1510px) {
            max-width: 575px;
        }

        @media (max-width: 575px) {
            max-width: 320px;
        }
    }
}

.deactive {
    filter: brightness(0.5);
}
</style>
