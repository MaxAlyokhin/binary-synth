<script setup>
import { ref, onMounted } from 'vue'
import { useFileStore, useStatusStore } from '@/stores/global.js'

// Принимает файл
// Пишет в стор представления файла и информацию о нём
const reader = new FileReader()
const file = useFileStore()
const status = useStatusStore()
const isDropping = ref(false)
const isLoading = ref(false)

function readFile(rawFile) {
    status.playing = false // Останавливаем композицию перед загрузкой следующего файла
    status.currentCommandsBlock.value = [0, 499]

    reader.readAsArrayBuffer(rawFile) // Прочитали файл, здесь двоичный код

    reader.addEventListener('progress', (event) => {
        isLoading.value = true
    })

    reader.addEventListener('load', async (event) => {
        isLoading.value = false
        file.$patch({
            name: rawFile.name,
            size: rawFile.size,
            type: rawFile.type,
            binary8: new Uint8Array(event.target.result),
            // binary16: new Uint16Array(event.target.result),
            loaded: true,
        })
    })

    reader.addEventListener('error', (event) => {
        throw new Error(event.target.error)
    })
}

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
    </Teleport>
</template>

<style lang="scss" scoped>
.file {
    label {
        cursor: pointer;
        display: block;
        height: 40px;
        width: 200px;
        text-align: center;
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
    backdrop-filter: blur(5px);

    p {
        font-weight: 900;
        font-size: 7vw;
        pointer-events: none;
    }
}
</style>
