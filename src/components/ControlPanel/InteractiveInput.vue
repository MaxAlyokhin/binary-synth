<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { decimalPlaces, toFixedNumber } from '../../assets/js/helpers.js'

const emits = defineEmits(['valueFromInput'])
const props = defineProps(['step', 'validValue', 'keyCode', 'letter'])

const inputValue = ref(props.validValue)
const input = ref(null)

let isInteractiveMode = ref(false)
let initialClientX = null
let initialClientY = null
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
        window.addEventListener('mousemove', mousemoveHandler)
    }
}

function deactivateInteractiveMode(event) {
    if (event.code === props.keyCode) {
        isInteractiveMode.value = false
        isMoved = false
        initialClientX = null
        initialClientY = null
        initialInputValue = null
        inputValueFactor.value = 1
        window.removeEventListener('mousemove', mousemoveHandler)
    }
}

function mousemoveHandler(event) {
    if (!isMoved) {
        isInteractiveMode.value = true
        initialClientX = event.clientX
        initialClientY = event.clientY
        initialInputValue = inputValue.value
        isMoved = true
    }

    inputValueFactor.value = getInputValueFactor(event.clientY - initialClientY)
    inputValue.value = toFixedNumber(
        initialInputValue + (event.clientX - initialClientX) * props.step * inputValueFactor.value,
        decimalPlaces(props.step) + decimalPlaces(inputValueFactor.value)
    )
}

// Через каждые 100 пикселей шаг мощности
function getInputValueFactor(verticalDifference) {
    if (verticalDifference > 0) {
        if (verticalDifference > 300) return 0.001
        if (verticalDifference > 200) return 0.01
        if (verticalDifference > 100) return 0.1
        else return 1
    } else {
        if (verticalDifference < -300) return 1000
        if (verticalDifference < -200) return 100
        if (verticalDifference < -100) return 10
        else return 1
    }
}

function changeInput(value) {
    emits('valueFromInput', Number(value))
}

watch(inputValue, (newValue) => {
    if (newValue) changeInput(newValue)
})

const valid = computed(() => props.validValue)
watch(valid, (newValue) => {
    if (newValue !== inputValue.value) {
        inputValue.value = props.validValue
    }
})
</script>

<template>
    <div>
        <div class="interactive-input">
            <input
                :class="{ 'interactive-input--active': isInteractiveMode }"
                ref="input"
                v-model="inputValue"
                :step="step"
                type="number"
            />
            <div class="letter">{{ props.letter }}</div>
        </div>

        <div v-show="isInteractiveMode" class="scales">
            <div class="factor">x{{ inputValueFactor }}</div>

            <div class="gorizontal" :style="{ left: `${initialClientX}px`, borderWidth: `3px` }">{{ initialInputValue }}</div>

            <div class="vertical" :style="{ top: `${initialClientY}px`, borderWidth: `3px` }">x1</div>
            <div class="vertical" :style="{ top: `${initialClientY + 100}px` }">x0.1</div>
            <div class="vertical" :style="{ top: `${initialClientY + 200}px` }">x0.01</div>
            <div class="vertical" :style="{ top: `${initialClientY + 300}px` }">x0.001</div>
            <div class="vertical" :style="{ top: `${initialClientY - 100}px` }">x10</div>
            <div class="vertical" :style="{ top: `${initialClientY - 200}px` }">x100</div>
            <div class="vertical" :style="{ top: `${initialClientY - 300}px` }">x1000</div>
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
        z-index: 10;
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
.gorizontal,
.vertical {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 10;
    padding: 5px;
    color: $white;
}

.gorizontal {
    height: 100vh;
    width: 1px;
    border-left: 1px solid $white;
}

.vertical {
    width: 100vw;
    height: 1px;
    border-top: 1px solid $white;
}

.factor {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 80px;
    background: #000000a3;
    color: $white;
}
</style>
