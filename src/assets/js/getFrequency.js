import { notes } from './notes.js'

export function getFrequency(byte, bitness, mode, coefficients, minimumFrequency, minimumNote) {
    if (mode === 'continuous') {
        if (byte === 0) return 0.01 + minimumFrequency
        if (bitness === '8') return coefficients.continouos8 * byte + minimumFrequency
        if (bitness === '16') return coefficients.continouos16 * byte + minimumFrequency
    }

    if (mode === 'tempered') {
        if (bitness === '8') return notes[Math.floor(coefficients.tempered8 * byte) + minimumNote]
        if (bitness === '16') return notes[Math.floor(coefficients.tempered8 * byte) + minimumNote]
    }
}
