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

/**
 * Converts 'true' || 'false' strings to the corresponding boolean value
 * @param {String} value - conversion string
 * @return {Boolean} Returns a boolean value
 */
export function getBooleanFromString(value) {
    // prettier-ignore
    return value === 'true'
        ? true
        : false
}
