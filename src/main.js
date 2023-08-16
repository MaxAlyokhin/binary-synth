import './assets/styles/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import BinarySynth from './BinarySynth.vue'

createApp(BinarySynth).use(createPinia()).mount('#app')
