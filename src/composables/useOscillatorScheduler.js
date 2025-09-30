import { getFrequency } from '@/assets/js/getFrequency.js'
import { getRandomNumber } from '@/assets/js/helpers.js'

export function useOscillatorScheduler(settings, audioContext, oscillator, bynaryInSelectedBitness, frequencyCoefficients) {
    const getRandomTimeGap = () => (settings.isRandomTimeGap ? getRandomNumber(0, settings.readingSpeed) : 0)

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
        // На больших скоростях чтения бывают недопустимые значения
        const isExp = settings.transitionType === 'exponential'
        const safe = isFinite(command) ? command : isExp ? 0.01 : 0

        switch (settings.transitionType) {
            case 'immediately':
                oscillator.value.frequency.setValueAtTime(safe, targetTime)
                break
            case 'linear':
                oscillator.value.frequency.linearRampToValueAtTime(safe, targetTime)
                break
            case 'exponential':
                oscillator.value.frequency.exponentialRampToValueAtTime(safe, targetTime)
                break
        }
    }

    function planOscillatorList(startOfList, endOfList) {
        for (let binaryID = startOfList, index = 0; binaryID <= endOfList; binaryID++, index++) {
            const command = computeFrequency(bynaryInSelectedBitness.value[binaryID])
            const time = audioContext.value.currentTime + (index * settings.readingSpeed + getRandomTimeGap())
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
