/**
 * The function rounds the value to 3 decimal places by default
 * @param {Number} number - number
 * @param {Number} digits - number of decimal places
 * @return {Number} Returns a rounded number
 */

let pow = null
export function toFixedNumber(number, digits = 3) {
    if (number) {
        pow = Math.pow(10, digits)
        return Math.round(number * pow) / pow
    } else {
        return 0
    }
}

export function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min
}

export function getRandomTimeGap(isRandomTimeGap, readingSpeed) {
    return isRandomTimeGap ? getRandomNumber(0, readingSpeed) : 0
}

/**
 * The function performs integer division
 * @param {Number} value - what to divide
 * @param {Number} by - by what
 * @return {Number} Returns the number you are looking for
 */

export const div = (value, by) => (value - (value % by)) / by

/**
 * The function performs a count of digits after comma
 * @param {Number} x - Number
 * @return {Number} Returns the number of digits after comma
 */

export function decimalPlaces(x) {
    return x.toString().includes('.') ? x.toString().split('.').pop().length : 0
}

/**
 * The function returns a string with the time of the call in the format number-month-year-hour-minutes-seconds
 * @return {String}
 */

export function getDate() {
    let date = new Date()
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`
}

/**
 * Check sample rate value
 * @param {Number} minimum - minimum value
 * @param {Number} maximum - maximum value
 * @param {Number} sampleRate - value for check
 * @return {Number} Returns the valid sample rate value
 */

export function checkSampleRate(minimum, maximum, sampleRate) {
    if (sampleRate <= maximum && sampleRate >= minimum) return sampleRate
    else if (sampleRate >= maximum) return maximum
    else if (sampleRate <= minimum) return minimum
}

/**
 * Check setting that is out of range with new sample rate
 * @param {Number} sampleRate - sampleRate
 * @param {Number} setting - setting for check
 * @return {Number} Returns the valid setting value
 */

export function checkFrequenciesWithNewSampleRate(sampleRate, setting) {
    return setting > sampleRate / 2 ? sampleRate / 2 : setting
}
