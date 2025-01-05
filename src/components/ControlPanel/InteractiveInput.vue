<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { decimalPlaces, toFixedNumber } from '../../assets/js/helpers.js'

const emits = defineEmits(['valueFromInput'])
const props = defineProps(['step', 'validValue', 'keyCode', 'letter'])

const inputValue = ref(props.validValue)
const input = ref(null)

let isInteractiveMode = ref(false)
let initialClientY = null
let currentX = null
let currentY = null
let initialInputValue = null
let inputValueFactor = ref(1)
let isMoved = false

onMounted(() => {
    window.addEventListener('keydown', activateInteractiveMode)
    window.addEventListener('keyup', deactivateInteractiveMode)
})

onUnmounted(() => {
    window.removeEventListener('keydown', activateInteractiveMode)
    window.removeEventListener('keyup', deactivateInteractiveMode)
})

function activateInteractiveMode(event) {
    if (!isInteractiveMode.value && event.code === props.keyCode && !event.ctrlKey) {
        input.value.focus()
        document.addEventListener('mousemove', mousemoveHandler)
    }
}

function deactivateInteractiveMode(event) {
    if (event.code === props.keyCode) {
        isInteractiveMode.value = false
        isMoved = false
        initialClientY = null
        currentX = 0
        initialInputValue = null
        inputValueFactor.value = 1
        document.removeEventListener('mousemove', mousemoveHandler)
    }
}

async function mousemoveHandler(event) {
    if (!isMoved) {
        if (!document.pointerLockElement) {
            await input.value.requestPointerLock({
                unadjustedMovement: true,
            })
        }

        isInteractiveMode.value = true
        initialClientY = event.clientY
        currentY = event.clientY
        initialInputValue = inputValue.value
        isMoved = true
    }

    currentX += event.movementX
    currentY += event.movementY

    inputValueFactor.value = getInputValueFactor(currentY - initialClientY)

    emits(
        'valueFromInput',
        toFixedNumber(
            initialInputValue + currentX * inputValueFactor.value * Number(props.step),
            decimalPlaces(Number(props.step)) + decimalPlaces(inputValueFactor.value)
        )
    )
}

// Every 2500 pixels a power step
function getInputValueFactor(verticalDifference) {
    if (verticalDifference > 0) {
        if (verticalDifference > 7500) return 0.001
        if (verticalDifference > 5000) return 0.01
        if (verticalDifference > 2500) return 0.1
        else return 1
    } else {
        if (verticalDifference < -7500) return 1000
        if (verticalDifference < -5000) return 100
        if (verticalDifference < -2500) return 10
        else return 1
    }
}

const valid = computed(() => props.validValue)
watch(valid, (newValue) => {
    if (newValue !== inputValue.value) {
        inputValue.value = props.validValue
    }
})

let oldValidValue = props.validValue.value
async function check(event) {
    await nextTick()
    if (oldValidValue !== undefined && !Number.isInteger(oldValidValue) && Number.isInteger(props.validValue)) {
        const value = props.validValue
        input.value.value = ''
        input.value.value = value
        oldValidValue = props.validValue
    } else if (!event.data || event.data === '.') {
        return
    } else if (event.data === ',' || Number(event.target.value) === props.validValue) {
        oldValidValue = props.validValue
    } else if (oldValidValue === props.validValue) {
        input.value.value = props.validValue
    } else {
        oldValidValue = props.validValue
    }
}

function checkComma(event) {
    if (event.data === '.' || event.target.value === '') {
        input.value.value = props.validValue
        return props.validValue
    } else {
        return Number(event.target.value)
    }
}
</script>

<template>
    <div>
        <div class="interactive-input">
            <input
                :class="{ 'interactive-input--active': isInteractiveMode }"
                ref="input"
                :value="inputValue"
                @input="[emits('valueFromInput', checkComma($event)), check($event)]"
                :step="step"
                type="number"
            />
            <div class="letter">{{ props.letter }}</div>
        </div>

        <div v-show="isInteractiveMode" class="scales">
            <div class="factor">x{{ inputValueFactor }}</div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import '@/assets/styles/vars.scss';

.interactive-input {
    position: relative;

    .letter {
        position: absolute;
        color: #3e4656;
        top: 5px;
        right: 6px;
        z-index: 0;
        font-weight: 700;
        font-size: 10px;
    }

    &--active {
        z-index: 2;
    }
}

input {
    position: relative;
    z-index: 0;

    &::before {
        content: 'Q';
    }
}

input:focus {
    border: 2px solid rgb(201, 209, 204);
    background: #090c0f;
}

.center {
    position: fixed;
    top: 0;
    left: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid $white;
}

.scales {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1;
}

.factor {
    position: fixed;
    top: 0;
    right: 15px;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: end;
    align-items: end;
    font-size: 80px;
    color: $white;
}
</style>
