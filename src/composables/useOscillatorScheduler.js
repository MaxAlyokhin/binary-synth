import { getFrequency } from '../assets/js/getFrequency.js'
import { getRandomTimeGap } from '../assets/js/helpers.js'

export function useOscillatorScheduler(settings, audioContext, oscillator, bynaryInSelectedBitness, frequencyCoefficients) {
    function computeFrequency(binaryValue) {
        return getFrequency(
            binaryValue,
            settings.bitness,
            settings.frequencyMode,
            frequencyCoefficients.value,
            settings.frequenciesRange.from,
            settings.notesRange.from
        )
    }

    function scheduleOscillatorValue(command, targetTime) {
        // At high reading speeds, there are unacceptable values
        const isExponential = settings.transitionType === 'exponential'
        const safeValue = isFinite(command) ? command : isExponential ? 0.01 : 0

        switch (settings.transitionType) {
            case 'immediately':
                oscillator.value.frequency.setValueAtTime(safeValue, targetTime)
                break
            case 'linear':
                oscillator.value.frequency.linearRampToValueAtTime(safeValue, targetTime)
                break
            case 'exponential':
                oscillator.value.frequency.exponentialRampToValueAtTime(safeValue, targetTime)
                break
        }
    }

    function planOscillatorList(startOfList, endOfList) {
        for (let binaryID = startOfList, index = 0; binaryID <= endOfList; binaryID++, index++) {
            const command = computeFrequency(bynaryInSelectedBitness.value[binaryID])
            const time = audioContext.value.currentTime + (index * settings.readingSpeed + getRandomTimeGap(settings.isRandomTimeGap, settings.readingSpeed))
            scheduleOscillatorValue(command, time)
        }
    }

    return {
        getRandomTimeGap,
        computeFrequency,
        scheduleOscillatorValue,
        planOscillatorList,
    }
}
