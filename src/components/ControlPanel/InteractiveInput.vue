<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { clearTimeout, clearInterval, setTimeout, setInterval } from 'worker-timers'
import { decimalPlaces, toFixedNumber } from '../../assets/js/helpers.js'

const emits = defineEmits(['valueFromInput'])
const props = defineProps(['step', 'validValue', 'keyCode', 'letter'])

const inputValue = ref(props.validValue)
const input = ref(null)

let isInteractiveMode = ref(false)
let currentX = null
let initialInputValue = null
let inputValueFactor = ref(1)
let isMoved = false
let isPressed = false // If pressed props.keyCode
let velocity = 0
let lastMovementX = 0
let inertiaTimer = null
let mouseMoveTimer = null
const inertiaDecay = 0.995 // Decay for smoother velocity reduction
const minVelocity = 0.1 // Minimum velocity to stop inertia
const mouseMoveTimeout = 30 // ms

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
        isPressed = true
    }

    // Shift increase, Ctrl decrease factor
    if (isPressed) {
        if (event.code === 'ShiftLeft') inputValueFactor.value *= 10
        if (event.code === 'ControlLeft') inputValueFactor.value /= 10
    }
}

function resetToInitialState() {
    currentX = 0
    initialInputValue = inputValue.value
    inputValueFactor.value = 1
}

function deactivateInteractiveMode(event) {
    if (event.code === props.keyCode) {
        isInteractiveMode.value = false
        isMoved = false
        document.removeEventListener('mousemove', mousemoveHandler)
        isPressed = false

        if (!inertiaTimer) {
            resetToInitialState()
        }
    }
}

function calculateValueForEmit() {
    return toFixedNumber(
        initialInputValue + currentX * inputValueFactor.value * Number(props.step),
        decimalPlaces(Number(props.step)) + decimalPlaces(inputValueFactor.value)
    )
}

async function mousemoveHandler(event) {
    if (!isMoved) {
        if (!document.pointerLockElement) {
            await input.value.requestPointerLock({
                unadjustedMovement: true,
            })
        }

        isInteractiveMode.value = true
        if (!inertiaTimer) initialInputValue = inputValue.value
        isMoved = true
    }

    // Update velocity based on movement
    lastMovementX = event.movementX
    velocity = lastMovementX

    currentX += event.movementX

    // Clear existing mouse move timer
    if (mouseMoveTimer) {
        clearTimeout(mouseMoveTimer)
    }

    // Set new timer to detect end of mouse movement
    mouseMoveTimer = setTimeout(() => {
        // Start inertia when mouse movement stops
        if (Math.abs(velocity) > minVelocity) {
            startInertia()
        }
    }, mouseMoveTimeout)

    emits(
        'valueFromInput',
        calculateValueForEmit()
    )
}

let previousInertiaValue = null
function startInertia() {
    if (inertiaTimer) {
        clearInterval(inertiaTimer)
        inertiaTimer = null
    }

    inertiaTimer = setInterval(() => {
        // Stop if the value is invalid (i.e. not changed)
        if (previousInertiaValue === inputValue.value) {
            stopInertia()
            return
        }

        previousInertiaValue = inputValue.value

        // Apply velocity to currentX
        currentX += velocity

        // Emit updated value with inertia
        emits(
            'valueFromInput',
            calculateValueForEmit()
        )

        // Decay velocity with accelerating decay rate
        velocity = velocity * (inertiaDecay - 0.05 * Math.exp(-Math.abs(velocity) * 0.2))

        // Stop inertia when velocity is too small
        if (Math.abs(velocity) < minVelocity) {
            stopInertia()
        }
    }, 16) // ~60fps
}

function stopInertia() {
    if (inertiaTimer) {
        clearInterval(inertiaTimer)
        inertiaTimer = null
        velocity = 0

        if (!isInteractiveMode.value) {
            resetToInitialState()
        }
    }
}

// If inputValueFactor changed, renew initialInputValue
watch(inputValueFactor, (newValue, oldValue) => {
    // Maximum and minimum
    if (decimalPlaces(inputValueFactor.value) >= 6 || inputValueFactor.value > 1_000_000) {
        inputValueFactor.value = oldValue
        return
    }

    initialInputValue = initialInputValue + currentX * oldValue * Number(props.step)
    currentX = 0
})

watch(
    () => props.validValue,
    (newValue) => {
        inputValue.value = props.validValue
    }
)

let oldValidValue = props.validValue.value
async function check(event) {
    await nextTick()
    if (oldValidValue !== undefined && !Number.isInteger(oldValidValue) && Number.isInteger(props.validValue)) {
        const value = props.validValue
        input.value.value = ''
        input.value.value = value
        oldValidValue = props.validValue
    } else if (!event.data || event.data === '.') {
        input.value.value = props.validValue
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
        <div v-show="inputValueFactor !== 1" class="scales">
            <div class="factor">x{{ inputValueFactor }}</div>
        </div>

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
    position: relative;
    bottom: -15px;
    left: -0px;
}

.factor {
    position: absolute;
    font-size: 10px;
    color: $white;
    background-color: $black;
    padding: 0px 5px;
    padding-top: 4px;
    border: 1px solid rgb(201, 209, 204);
    border-radius: 5px;
    border-top-left-radius: 0;
}
</style>
