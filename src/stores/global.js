import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
    const count = ref(10)
    const doubleCount = computed(() => count.value * 2)
    function increment() {
        count.value++
    }

    return { count, doubleCount, increment }
})

export const useFileStore = defineStore('file', () => {
    const binary8 = ref(null)
    const binary16 = ref([])
    const name = ref('')
    const size = ref(0)
    const type = ref('')
    const loaded = ref(false)

    return { binary8, binary16, name, size, type, loaded }
})

export const useSettingsStore = defineStore('settings', () => {
    const readingSpeed = ref(0.01)
    const waveType = ref('sine')
    const gain = ref(1)
    const transitionType = ref('immediately')

    return { readingSpeed, waveType, gain, transitionType }
})

export const useStatusStore = defineStore('status', () => {
    const playing = ref(false)
    const timer = ref(0)
    const currentCommandsBlock = ref([0, 499])

    return { playing, timer, currentCommandsBlock }
})
