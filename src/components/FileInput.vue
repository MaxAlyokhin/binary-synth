<script setup>
import { ref, onMounted, onBeforeMount } from 'vue'
import { useFileStore, useStatusStore } from '@/stores/global.js'

// Принимает файл
// Пишет в стор представления файла и информацию о нём
const reader = new FileReader()
const file = useFileStore()
const status = useStatusStore()
const isDropping = ref(false)
const isLoading = ref(false)

reader.addEventListener('progress', (event) => {
    isLoading.value = true
})

reader.addEventListener('loadstart', async (event) => {
    isLoading.value = true
    file.loaded = false
})

reader.addEventListener('loadend', async (event) => {
    isLoading.value = false

    if (event.target.result.byteLength <= 499) {
        status.currentCommandsBlock[1] = event.target.result.byteLength - 1
    } else {
        status.currentCommandsBlock = [0, 499]
    }

    // Для файлов с нечётным количеством байт нельзя создать Uint16Array
    // Поэтому мы можем заполнить недостающее нулями
    let binary8 = new Uint8Array(event.target.result)
    let binary16 = null

    if (event.target.result.byteLength % 2) {
        let transferedBuffer = ArrayBuffer.transfer(event.target.result, event.target.result.byteLength + 1)
        binary16 = new Uint16Array(transferedBuffer)
    } else {
        binary16 = new Uint16Array(event.target.result)
    }

    file.$patch({
        binary8: binary8,
        binary16: binary16,
        loaded: true,
    })
})

reader.addEventListener('error', (event) => {
    throw new Error(event.target.error)
})

function readFile(rawFile) {
    status.playing = false // Останавливаем композицию перед загрузкой следующего файла

    file.$patch({
        name: rawFile.name,
        size: rawFile.size,
        type: rawFile.type,
    })

    reader.readAsArrayBuffer(rawFile) // Прочитали файл, здесь двоичный код
}

onBeforeMount(() => {
    // Polyfill for ArrayBuffer.transfer
    if (!ArrayBuffer.transfer) {
        ArrayBuffer.transfer = function (source, length) {
            if (!(source instanceof ArrayBuffer)) throw new TypeError('Source must be an instance of ArrayBuffer')
            if (length <= source.byteLength) return source.slice(0, length)
            let sourceView = new Uint8Array(source)
            let destView = new Uint8Array(new ArrayBuffer(length))
            destView.set(sourceView)
            return destView.buffer
        }
    }
})

onMounted(() => {
    const bodyElement = document.querySelector('body')

    bodyElement.addEventListener('dragenter', (event) => {
        event.preventDefault()
        isDropping.value = true
    })

    bodyElement.addEventListener('dragleave', (event) => {
        event.preventDefault()
        if (event.target.className === 'modal') isDropping.value = false
    })

    bodyElement.addEventListener('drop', (event) => {
        event.preventDefault()
        isDropping.value = false
        readFile(event.dataTransfer.files[0])
    })

    bodyElement.addEventListener('dragover', (event) => {
        event.preventDefault()
    })
})
</script>

<template>
    <div class="file">
        <label class="file__upload button" @change="(event) => (event.target.files.length ? readFile(event.target.files[0]) : false)">
            <input type="file" />
            {{ file.loaded ? `Upload new file` : `Upload file` }}
        </label>
    </div>

    <Teleport to="body">
        <Transition name="opacity" mode="out-in" appear>
            <div v-show="isDropping" class="modal">
                <p>DROP FILE</p>
            </div>
        </Transition>

        <Transition name="opacity" mode="out-in" appear>
            <div v-show="isLoading" class="modal">
                <p>LOADING</p>
            </div>
        </Transition>

        <Transition name="opacity" mode="out-in" appear>
            <div v-show="!file.loaded && !isDropping && !isLoading" class="modal hero">
                <div class="file">
                    <label class="file__upload" @change="(event) => (event.target.files.length ? readFile(event.target.files[0]) : false)">
                        <input type="file" />
                        <div class="title">BINARY SYNTH</div>
                        <div class="description">Binary file interpreter for audio generation</div>
                        <div class="cta">CLICK FOR UPLOAD FILE<br />OR DROP FILE HERE</div>
                    </label>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style lang="scss" scoped>
.file {
    label {
        cursor: pointer;
        display: block;
        height: 40px;
        width: 100%;
        text-align: center;
        margin: 0 auto;
        margin-bottom: 20px;
    }

    input[type='file'] {
        display: none;
    }
}

.modal {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(15px);

    p {
        font-weight: 900;
        font-size: 7vw;
        pointer-events: none;
    }
}

.hero {
    background-color: rgb(13, 17, 23);

    .file {
        width: 100%;
        height: 100%;

        label {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: 900;
            flex-direction: column;
        }
    }

    .title {
        font-size: 6vw;
    }

    .description {
        text-transform: uppercase;
        font-size: 2vw;
        font-style: italic;
    }

    .cta {
        font-size: 2vw;
        margin-top: 50px;
    }
}
</style>
