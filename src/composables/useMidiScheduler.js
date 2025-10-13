import { ref } from 'vue'
import { clearTimeout, setTimeout } from 'worker-timers'
import sendMIDIMessage from '../assets/js/midiMessages.js'
import { getMIDINote } from '../assets/js/getMIDINote.js'
import { getRandomTimeGap } from '../assets/js/helpers.js'

export function useMidiScheduler(settings, status, bynaryInSelectedBitness, frequencyCoefficients) {
    const midiTimeoutIDs = ref([])
    const commands = ref([])
    const commandForNoteOff = ref(null)

    function clearMidiTimeouts() {
        midiTimeoutIDs.value.forEach((id) => clearTimeout(id))
    }

    function playNote(index) {
        // NoteOff is not sent in solidMode (only allSoundOff at the end of reading)
        // If there are identical commands in a row, noteOn and pitch are not played
        // The identical commands in continuous mode are compared by note and its pitch
        // In tempered mode only by note

        if (!settings.midi.solidMode) {
            if (index !== 0) {
                sendMIDIMessage.noteOff(commands.value[index - 1][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)
            }

            // If we have changed the frequency/note range, then turn off the previous note
            if (commandForNoteOff.value) {
                sendMIDIMessage.noteOff(commandForNoteOff.value[0], settings.midi.velocity, settings.midi.port, settings.midi.channel)
                commandForNoteOff.value = null
            }

            sendMIDIMessage.noteOn(commands.value[index][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)

            if (settings.frequencyMode === 'continuous') {
                sendMIDIMessage.pitch(commands.value[index][1], settings.midi.port, settings.midi.channel)
            }
        } else {
            let isEqualNote = null
            if (index !== 0) {
                if (settings.midi.solidMode) {
                    if (settings.frequencyMode === 'continuous') {
                        isEqualNote = commands.value[index - 1][0] === commands.value[index][0] && commands.value[index - 1][1] === commands.value[index][1]
                    } else {
                        isEqualNote = commands.value[index - 1][0] === commands.value[index][0]
                    }
                }
            }

            if (!isEqualNote) {
                sendMIDIMessage.noteOn(commands.value[index][0], settings.midi.velocity, settings.midi.port, settings.midi.channel)

                if (settings.frequencyMode === 'continuous') {
                    sendMIDIMessage.pitch(commands.value[index][1], settings.midi.port, settings.midi.channel)
                }
            }
        }

        if (settings.isRandomTimeGap && index !== 0) status.currentCommand++
    }

    function planMidiList(startOfList, endOfList, indexOffset = 0) {
        clearMidiTimeouts()
        for (let binaryID = startOfList, index = 0; binaryID <= endOfList; binaryID++, index++) {
            commands.value[index] = getMIDINote(
                bynaryInSelectedBitness.value[binaryID],
                settings.bitness,
                settings.frequencyMode,
                frequencyCoefficients.value,
                settings.frequenciesRange.from,
                settings.notesRange.from
            )
            const timeoutedNote = playNote.bind(null, index)
            const delay = ((index + indexOffset) * settings.readingSpeed + getRandomTimeGap(settings.isRandomTimeGap, settings.readingSpeed))
            midiTimeoutIDs.value[index] = setTimeout(timeoutedNote, delay * 1000)
        }
    }

    function recalculateCommands(startOfList, endOfList) {
        for (let binaryID = startOfList, index = 0; binaryID <= endOfList; binaryID++, index++) {
            commands.value[index] = getMIDINote(
                bynaryInSelectedBitness.value[binaryID],
                settings.bitness,
                settings.frequencyMode,
                frequencyCoefficients.value,
                settings.frequenciesRange.from,
                settings.notesRange.from
            )
        }
    }

    return {
        midiTimeoutIDs,
        commands,
        commandForNoteOff,
        clearMidiTimeouts,
        playNote,
        planMidiList,
        recalculateCommands,
    }
}
