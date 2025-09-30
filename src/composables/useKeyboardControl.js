import { onMounted, onUnmounted } from 'vue'

export function useKeyboardControl(status, play, stop) {
    function changePlaying(event) {
        if (event.code === 'Space') {
            status.playing ? stop() : play()
        }
    }

    function preventScrollOnSpacePress(event) {
        if (event.code === 'Space') event.preventDefault()
    }

    onMounted(() => {
        window.addEventListener('keydown', preventScrollOnSpacePress)
        window.addEventListener('keyup', changePlaying)
    })

    onUnmounted(() => {
        window.removeEventListener('keydown', preventScrollOnSpacePress)
        window.removeEventListener('keyup', changePlaying)
    })

    return {
        changePlaying,
        preventScrollOnSpacePress,
    }
}
