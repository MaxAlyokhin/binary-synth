import { notes } from './notes.js'
import { toFixedNumber } from './helpers.js'

/**
 * The function searches for the nearest lower and nearest higher number to a given number
 * @param {Number} number - the number around which we need to find the nearest values
 * @param {Array} array - an array of numbers from which we select the nearest values
 * @return {Array} Returns an array of two numbers: a smaller and a larger one
 */

let nearbyLess = null
let nearbyOver = null
function getNearbyValues(number, array) {
    nearbyLess = Math.max(...array.filter((value) => value < number))
    isFinite(nearbyLess) ? nearbyLess : (nearbyLess = 0)
    nearbyOver = Math.min(...array.filter((value) => value > number))

    return [nearbyLess, nearbyOver]
}

// Calculates an array of: note number and, in continuous mode, pitch value
let frequency = null
let nearbyValues = null
let percent = null
let pitchValue = null

export function getMIDINote(byte, bitness, mode, coefficients, minimumFrequency, minimumNote) {
    // Note number + pitch is returned
    // 1. Calculate frequency
    // 2. Find the nearest lower note in the array to this frequency
    // 3. Calculate the difference between this note and the original frequency
    // 4. Convert this difference into a pitch value
    if (mode === 'continuous') {
        // 1.
        if (byte === 0) frequency = minimumFrequency
        if (bitness === '8') frequency = coefficients.continouos8 * byte + minimumFrequency
        if (bitness === '16') frequency = coefficients.continouos16 * byte + minimumFrequency

        // 2.
        nearbyValues = getNearbyValues(frequency, notes)

        // 3.
        percent = toFixedNumber(((frequency - nearbyValues[0]) / (nearbyValues[1] - nearbyValues[0])) * 100, 1)

        // 4.
        // The pitch value in MIDI is from 0 to 16383, 8191 is the normal state (middle)
        // 8192 divisions are two semitones, so one semitone is 4096 divisions
        // We want to make a smooth transition between halftones, so we need to define a shift up to 4096
        pitchValue = Math.floor((percent / 100) * 4096) + 8191

        if (notes.indexOf(nearbyValues[0]) < 0) {
            return [0, pitchValue]
        } else {
            return [notes.indexOf(nearbyValues[0]), pitchValue]
        }
    }

    // The note number returned
    if (mode === 'tempered') {
        if (bitness === '8') return [Math.floor(coefficients.tempered8 * byte) + minimumNote]
        if (bitness === '16') return [Math.floor(coefficients.tempered16 * byte) + minimumNote]
    }
}
