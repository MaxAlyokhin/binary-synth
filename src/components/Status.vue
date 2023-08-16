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

let timerInterval = null

function timer() {
    return setInterval(() => {
        time.value++
    }, 1000)
}

let commandIteratorInterval = null
let currentCommand = ref(0)

function commandIterator() {
    return setInterval(() => {
        if (currentCommand.value === 499) currentCommand.value = 0
        else currentCommand.value++
    }, readingSpeed.value * 1000)
}

watch(playing, (newValue) => {
    if (newValue) {
        timerInterval = timer()
        commandIteratorInterval = commandIterator()
    } else {
        clearInterval(timerInterval)
        clearInterval(commandIteratorInterval)
        time.value = 0
        currentCommand.value = 0
    }
})

// При  изменении в настройках скорости чтения заново определяем интервалы
watch(readingSpeed, () => {
    if (playing.value) {
        clearInterval(timerInterval)
        clearInterval(commandIteratorInterval)

        timerInterval = timer()
        commandIteratorInterval = commandIterator()
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
                File size (bytes): <span>{{ file.size }}</span>
            </div>
            <div class="status__composition-duration">
                Composition duration (s): <span>{{ toFixedNumber((file.binary8?.length - 1) * settings.readingSpeed) }}</span>
            </div>
        </div>
        <div class="status__title">Commands from {{ status.currentCommandsBlock[0] }} to {{ status.currentCommandsBlock[1] }}</div>
        <div class="status__commands" v-if="file.binary8">
            <div
                class="status__command"
                v-for="(command, index) in file.binary8.slice(status.currentCommandsBlock[0], status.currentCommandsBlock[1] + 1)"
                :id="index"
                :class="{ active: index === currentCommand }"
            >
                {{ '00000000'.slice(String(command.toString(2)).length) + command.toString(2) }}
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import '../assets/styles/vars.scss';

.status {
    transition: all 70ms ease-in;
    display: flex;
    flex-direction: column;
    align-items: center;

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
        margin-top: 40px;
        font-weight: 800;
    }

    &__commands {
        display: grid;
        grid-template-columns: repeat(25, 1fr);
        margin-top: 40px;
        margin-bottom: 40px;

        @media (max-width: 1550px) {
            grid-template-columns: repeat(20, 1fr);
        }

        @media (max-width: 1250px) {
            grid-template-columns: repeat(10, 1fr);
        }

        @media (max-width: 650px) {
            grid-template-columns: repeat(5, 1fr);
        }
    }

    &__command {
        display: inline;
    }
}

.status.deactive {
    filter: brightness(0.5);
}
</style>
