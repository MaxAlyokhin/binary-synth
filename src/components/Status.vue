<script setup>
import { ref, watch, computed } from 'vue'
import { useFileStore, useStatusStore, useSettingsStore } from '../stores/globalStore.js'
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

const durationTime = computed(() => toFixedNumber((settings.fragment.to - settings.fragment.from) * settings.readingSpeed * 1000))
const durationTimeFormatted = computed(() => secondsToFormatTime(durationTime.value))

let timerInterval = null

const time = ref(0)
function timer() {
    return setInterval(() => {
        time.value++
    }, 1000)
}

function toHHMMSS(seconds) {
    // prettier-ignore
    return [
        Math.trunc(seconds / 3600),
        Math.trunc((seconds % 3600) / 60),
        seconds % 60
    ]
        .map((value) => ('0' + value)
        .slice(-2)).join(':')
}

// Highlighting the current command in the UI
let commandIteratorInterval = null

// Create a new iterator for each play
function commandIterator() {
    // Maximum speed of setInterval 5ms
    if (settings.readingSpeed >= 0.005) {
        return setInterval(() => {
            if (settings.isRandomTimeGap && settings.midiMode) {
                return
            } else {
                status.currentCommand++
            }
        }, settings.readingSpeed * 1000)
    } else {
        // If the speed is high, we display the active command every 5 commands.
        return setInterval(() => {
            if (settings.isRandomTimeGap && settings.midiMode) {
                return
            } else {
                status.currentCommand += 5 * (settings.readingSpeed * 1000)
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

// Resetting the display of the reading head to the beginning
// when nextList() increased status.currentIteration
watch(
    () => status.currentIteration,
    () => {
        status.currentCommand = 0
    }
)

// For changing favicon on play
const defaultIcon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjI2MCIgdmlld0JveD0iMCAwIDI2MCAyNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNjAiIGhlaWdodD0iMjYwIiByeD0iMTMwIiBmaWxsPSIjMEQxMTE3Ii8+CjxwYXRoIGQ9Ik02My4yNSAxNzVWODMuNzVIOTIuNjI1QzEwMS44NzUgODMuNzUgMTA5LjI1IDg1Ljg3NSAxMTQuNzUgOTAuMTI1QzEyMC4yNSA5NC4yOTE3IDEyMyA5OS45NTgzIDEyMyAxMDcuMTI1QzEyMyAxMTEuMTI1IDEyMi4wNDIgMTE0LjYyNSAxMjAuMTI1IDExNy42MjVDMTE4LjI5MiAxMjAuNjI1IDExNS43OTIgMTIyLjk1OCAxMTIuNjI1IDEyNC42MjVDMTA5LjU0MiAxMjYuMjkyIDEwNi4xNjcgMTI3LjEyNSAxMDIuNSAxMjcuMTI1VjEyNy41QzEwNi41ODMgMTI3LjQxNyAxMTAuMjkyIDEyOC4xNjcgMTEzLjYyNSAxMjkuNzVDMTE3LjA0MiAxMzEuMzMzIDExOS43OTIgMTMzLjcwOCAxMjEuODc1IDEzNi44NzVDMTIzLjk1OCAxNDAuMDQyIDEyNSAxNDMuOTU4IDEyNSAxNDguNjI1QzEyNSAxNTMuOTU4IDEyMy43MDggMTU4LjYyNSAxMjEuMTI1IDE2Mi42MjVDMTE4LjYyNSAxNjYuNTQyIDExNS4wNDIgMTY5LjU4MyAxMTAuMzc1IDE3MS43NUMxMDUuNzA4IDE3My45MTcgMTAwLjE2NyAxNzUgOTMuNzUgMTc1SDYzLjI1Wk04MS4zNzUgMTU5Ljg3NUg5M0M5Ny4wODMzIDE1OS44NzUgMTAwLjI5MiAxNTguNzkyIDEwMi42MjUgMTU2LjYyNUMxMDQuOTU4IDE1NC40NTggMTA2LjEyNSAxNTEuNDU4IDEwNi4xMjUgMTQ3LjYyNUMxMDYuMTI1IDE0My43OTIgMTA0Ljk1OCAxNDAuNzkyIDEwMi42MjUgMTM4LjYyNUMxMDAuMjkyIDEzNi4zNzUgOTcuMDgzMyAxMzUuMjUgOTMgMTM1LjI1SDgxLjM3NVYxNTkuODc1Wk04MS4zNzUgMTIwLjVIOTIuMzc1Qzk2LjA0MTcgMTIwLjUgOTguOTE2NyAxMTkuNTQyIDEwMSAxMTcuNjI1QzEwMy4wODMgMTE1LjYyNSAxMDQuMTI1IDExMi45NTggMTA0LjEyNSAxMDkuNjI1QzEwNC4xMjUgMTA2LjIwOCAxMDMuMDgzIDEwMy41ODMgMTAxIDEwMS43NUM5OC45MTY3IDk5LjgzMzMgOTYuMDQxNyA5OC44NzUgOTIuMzc1IDk4Ljg3NUg4MS4zNzVWMTIwLjVaTTE2Ny40NTEgMTc2LjI1QzE2MS4wMzUgMTc2LjI1IDE1NS40NTEgMTc1LjE2NyAxNTAuNzAxIDE3M0MxNDUuOTUxIDE3MC44MzMgMTQyLjI4NSAxNjcuNzkyIDEzOS43MDEgMTYzLjg3NUMxMzcuMTE4IDE1OS45NTggMTM1LjgyNiAxNTUuMzMzIDEzNS44MjYgMTUwSDE1NC41NzZDMTU0LjU3NiAxNTMuMDgzIDE1NS43NDMgMTU1LjU0MiAxNTguMDc2IDE1Ny4zNzVDMTYwLjQ5MyAxNTkuMTI1IDE2My43NDMgMTYwIDE2Ny44MjYgMTYwQzE3MS43NDMgMTYwIDE3NC43ODUgMTU5LjEyNSAxNzYuOTUxIDE1Ny4zNzVDMTc5LjIwMSAxNTUuNjI1IDE4MC4zMjYgMTUzLjIwOCAxODAuMzI2IDE1MC4xMjVDMTgwLjMyNiAxNDcuNDU4IDE3OS40OTMgMTQ1LjE2NyAxNzcuODI2IDE0My4yNUMxNzYuMTYgMTQxLjMzMyAxNzMuODI2IDE0MC4wNDIgMTcwLjgyNiAxMzkuMzc1TDE2MS41NzYgMTM3LjI1QzE1My44MjYgMTM1LjQxNyAxNDcuNzg1IDEzMi4wNDIgMTQzLjQ1MSAxMjcuMTI1QzEzOS4yMDEgMTIyLjEyNSAxMzcuMDc2IDExNi4wNDIgMTM3LjA3NiAxMDguODc1QzEzNy4wNzYgMTAzLjU0MiAxMzguMjg1IDk4LjkxNjcgMTQwLjcwMSA5NUMxNDMuMjAxIDkxIDE0Ni43MDEgODcuOTE2NyAxNTEuMjAxIDg1Ljc1QzE1NS43MDEgODMuNTgzMyAxNjEuMDM1IDgyLjUgMTY3LjIwMSA4Mi41QzE3Ni41MzUgODIuNSAxODMuOTEgODQuODMzMyAxODkuMzI2IDg5LjVDMTk0LjgyNiA5NC4wODMzIDE5Ny41NzYgMTAwLjI5MiAxOTcuNTc2IDEwOC4xMjVIMTc4LjgyNkMxNzguODI2IDEwNS4yMDggMTc3Ljc4NSAxMDIuOTE3IDE3NS43MDEgMTAxLjI1QzE3My43MDEgOTkuNTgzMyAxNzAuNzg1IDk4Ljc1IDE2Ni45NTEgOTguNzVDMTYzLjM2OCA5OC43NSAxNjAuNjE4IDk5LjU4MzMgMTU4LjcwMSAxMDEuMjVDMTU2Ljc4NSAxMDIuODMzIDE1NS44MjYgMTA1LjEyNSAxNTUuODI2IDEwOC4xMjVDMTU1LjgyNiAxMTAuNzkyIDE1Ni41NzYgMTEzLjA4MyAxNTguMDc2IDExNUMxNTkuNjYgMTE2LjgzMyAxNjEuODY4IDExOC4wODMgMTY0LjcwMSAxMTguNzVMMTc0LjQ1MSAxMjFDMTgyLjUzNSAxMjIuODMzIDE4OC42NiAxMjYuMTY3IDE5Mi44MjYgMTMxQzE5Ni45OTMgMTM1Ljc1IDE5OS4wNzYgMTQxLjgzMyAxOTkuMDc2IDE0OS4yNUMxOTkuMDc2IDE1NC41ODMgMTk3Ljc0MyAxNTkuMjkyIDE5NS4wNzYgMTYzLjM3NUMxOTIuNDkzIDE2Ny40NTggMTg4LjgyNiAxNzAuNjI1IDE4NC4wNzYgMTcyLjg3NUMxNzkuNDEgMTc1LjEyNSAxNzMuODY4IDE3Ni4yNSAxNjcuNDUxIDE3Ni4yNVoiIGZpbGw9IiNDOUQxQ0MiLz4KPC9zdmc+Cg=='
const playingIcon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjI2MCIgdmlld0JveD0iMCAwIDI2MCAyNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNjAiIGhlaWdodD0iMjYwIiByeD0iMTMwIiBmaWxsPSIjRkYwMDE2Ii8+CjxwYXRoIGQ9Ik02My4yNSAxNzVWODMuNzVIOTIuNjI1QzEwMS44NzUgODMuNzUgMTA5LjI1IDg1Ljg3NSAxMTQuNzUgOTAuMTI1QzEyMC4yNSA5NC4yOTE3IDEyMyA5OS45NTgzIDEyMyAxMDcuMTI1QzEyMyAxMTEuMTI1IDEyMi4wNDIgMTE0LjYyNSAxMjAuMTI1IDExNy42MjVDMTE4LjI5MiAxMjAuNjI1IDExNS43OTIgMTIyLjk1OCAxMTIuNjI1IDEyNC42MjVDMTA5LjU0MiAxMjYuMjkyIDEwNi4xNjcgMTI3LjEyNSAxMDIuNSAxMjcuMTI1VjEyNy41QzEwNi41ODMgMTI3LjQxNyAxMTAuMjkyIDEyOC4xNjcgMTEzLjYyNSAxMjkuNzVDMTE3LjA0MiAxMzEuMzMzIDExOS43OTIgMTMzLjcwOCAxMjEuODc1IDEzNi44NzVDMTIzLjk1OCAxNDAuMDQyIDEyNSAxNDMuOTU4IDEyNSAxNDguNjI1QzEyNSAxNTMuOTU4IDEyMy43MDggMTU4LjYyNSAxMjEuMTI1IDE2Mi42MjVDMTE4LjYyNSAxNjYuNTQyIDExNS4wNDIgMTY5LjU4MyAxMTAuMzc1IDE3MS43NUMxMDUuNzA4IDE3My45MTcgMTAwLjE2NyAxNzUgOTMuNzUgMTc1SDYzLjI1Wk04MS4zNzUgMTU5Ljg3NUg5M0M5Ny4wODMzIDE1OS44NzUgMTAwLjI5MiAxNTguNzkyIDEwMi42MjUgMTU2LjYyNUMxMDQuOTU4IDE1NC40NTggMTA2LjEyNSAxNTEuNDU4IDEwNi4xMjUgMTQ3LjYyNUMxMDYuMTI1IDE0My43OTIgMTA0Ljk1OCAxNDAuNzkyIDEwMi42MjUgMTM4LjYyNUMxMDAuMjkyIDEzNi4zNzUgOTcuMDgzMyAxMzUuMjUgOTMgMTM1LjI1SDgxLjM3NVYxNTkuODc1Wk04MS4zNzUgMTIwLjVIOTIuMzc1Qzk2LjA0MTcgMTIwLjUgOTguOTE2NyAxMTkuNTQyIDEwMSAxMTcuNjI1QzEwMy4wODMgMTE1LjYyNSAxMDQuMTI1IDExMi45NTggMTA0LjEyNSAxMDkuNjI1QzEwNC4xMjUgMTA2LjIwOCAxMDMuMDgzIDEwMy41ODMgMTAxIDEwMS43NUM5OC45MTY3IDk5LjgzMzMgOTYuMDQxNyA5OC44NzUgOTIuMzc1IDk4Ljg3NUg4MS4zNzVWMTIwLjVaTTE2Ny40NTEgMTc2LjI1QzE2MS4wMzUgMTc2LjI1IDE1NS40NTEgMTc1LjE2NyAxNTAuNzAxIDE3M0MxNDUuOTUxIDE3MC44MzMgMTQyLjI4NSAxNjcuNzkyIDEzOS43MDEgMTYzLjg3NUMxMzcuMTE4IDE1OS45NTggMTM1LjgyNiAxNTUuMzMzIDEzNS44MjYgMTUwSDE1NC41NzZDMTU0LjU3NiAxNTMuMDgzIDE1NS43NDMgMTU1LjU0MiAxNTguMDc2IDE1Ny4zNzVDMTYwLjQ5MyAxNTkuMTI1IDE2My43NDMgMTYwIDE2Ny44MjYgMTYwQzE3MS43NDMgMTYwIDE3NC43ODUgMTU5LjEyNSAxNzYuOTUxIDE1Ny4zNzVDMTc5LjIwMSAxNTUuNjI1IDE4MC4zMjYgMTUzLjIwOCAxODAuMzI2IDE1MC4xMjVDMTgwLjMyNiAxNDcuNDU4IDE3OS40OTMgMTQ1LjE2NyAxNzcuODI2IDE0My4yNUMxNzYuMTYgMTQxLjMzMyAxNzMuODI2IDE0MC4wNDIgMTcwLjgyNiAxMzkuMzc1TDE2MS41NzYgMTM3LjI1QzE1My44MjYgMTM1LjQxNyAxNDcuNzg1IDEzMi4wNDIgMTQzLjQ1MSAxMjcuMTI1QzEzOS4yMDEgMTIyLjEyNSAxMzcuMDc2IDExNi4wNDIgMTM3LjA3NiAxMDguODc1QzEzNy4wNzYgMTAzLjU0MiAxMzguMjg1IDk4LjkxNjcgMTQwLjcwMSA5NUMxNDMuMjAxIDkxIDE0Ni43MDEgODcuOTE2NyAxNTEuMjAxIDg1Ljc1QzE1NS43MDEgODMuNTgzMyAxNjEuMDM1IDgyLjUgMTY3LjIwMSA4Mi41QzE3Ni41MzUgODIuNSAxODMuOTEgODQuODMzMyAxODkuMzI2IDg5LjVDMTk0LjgyNiA5NC4wODMzIDE5Ny41NzYgMTAwLjI5MiAxOTcuNTc2IDEwOC4xMjVIMTc4LjgyNkMxNzguODI2IDEwNS4yMDggMTc3Ljc4NSAxMDIuOTE3IDE3NS43MDEgMTAxLjI1QzE3My43MDEgOTkuNTgzMyAxNzAuNzg1IDk4Ljc1IDE2Ni45NTEgOTguNzVDMTYzLjM2OCA5OC43NSAxNjAuNjE4IDk5LjU4MzMgMTU4LjcwMSAxMDEuMjVDMTU2Ljc4NSAxMDIuODMzIDE1NS44MjYgMTA1LjEyNSAxNTUuODI2IDEwOC4xMjVDMTU1LjgyNiAxMTAuNzkyIDE1Ni41NzYgMTEzLjA4MyAxNTguMDc2IDExNUMxNTkuNjYgMTE2LjgzMyAxNjEuODY4IDExOC4wODMgMTY0LjcwMSAxMTguNzVMMTc0LjQ1MSAxMjFDMTgyLjUzNSAxMjIuODMzIDE4OC42NiAxMjYuMTY3IDE5Mi44MjYgMTMxQzE5Ni45OTMgMTM1Ljc1IDE5OS4wNzYgMTQxLjgzMyAxOTkuMDc2IDE0OS4yNUMxOTkuMDc2IDE1NC41ODMgMTk3Ljc0MyAxNTkuMjkyIDE5NS4wNzYgMTYzLjM3NUMxOTIuNDkzIDE2Ny40NTggMTg4LjgyNiAxNzAuNjI1IDE4NC4wNzYgMTcyLjg3NUMxNzkuNDEgMTc1LjEyNSAxNzMuODY4IDE3Ni4yNSAxNjcuNDUxIDE3Ni4yNVoiIGZpbGw9IiNDOUQxQ0MiLz4KPC9zdmc+Cg=='
const changeFavicon = (icon) => document.querySelector('link[rel="icon"]').href = icon
watch(
    () => status.playing,
    (newValue) => {
        if (newValue) {
            changeFavicon(playingIcon)
            timerInterval = timer()
            commandIteratorInterval = commandIterator()
        } else {
            clearInterval(timerInterval)
            clearInterval(commandIteratorInterval)
            time.value = 0
            status.currentCommand = 0
            changeFavicon(defaultIcon)
        }
    }
)

// When changing the reading speed settings, redefine the intervals
watch(
    () => settings.readingSpeed,
    () => {
        if (status.playing) {
            clearInterval(timerInterval)
            clearInterval(commandIteratorInterval)

            timerInterval = timer()
            commandIteratorInterval = commandIterator()
        }
    }
)

const bynaryInSelectedBitness = computed(() => (settings.bitness === '8' ? file.binary8 : file.binary16))
watch(bynaryInSelectedBitness, (newValue) => {
    if (settings.bitness === '8') {
        if (settings.fragment.to - settings.fragment.from >= 499) {
            status.startAndEndOfList = [settings.fragment.from, settings.fragment.from + 499]
        } else {
            status.startAndEndOfList = [settings.fragment.from, settings.fragment.to]
        }

        if (newValue.length <= 499) status.startAndEndOfList[1] = newValue.length
    }

    if (settings.bitness === '16') {
        if (settings.fragment.to - settings.fragment.from >= 249) {
            status.startAndEndOfList = [settings.fragment.from, settings.fragment.from + 249]
        } else {
            status.startAndEndOfList = [settings.fragment.from, settings.fragment.to]
        }

        if (newValue.length <= 249) status.startAndEndOfList[1] = newValue.length
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
        <div class="status__title">Fragment from {{ status.startAndEndOfList[0] }} to {{ status.startAndEndOfList[1] }}</div>
        <div class="status__commands" v-if="file.loaded" :class="{ 'status__commands--16': settings.bitness === '16' }">
            <div
                class="status__command"
                v-for="(command, index) in bynaryInSelectedBitness.slice(
                    status.startAndEndOfList[0],
                    status.startAndEndOfList[1] + 1
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

        @media (max-width: 1110px) {
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
