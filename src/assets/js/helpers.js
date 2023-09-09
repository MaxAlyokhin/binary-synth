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
 * Преобразовывает строки 'true' || 'false' в соответствующее булево значение
 * @param {String} value - строка для преобразования
 * @return {Boolean} Возвращает булево значение
 */
export function getBooleanFromString(value) {
    // prettier-ignore
    return value === 'true'
        ? true
        : false
}
