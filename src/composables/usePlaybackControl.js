import { ref, computed, watch } from 'vue'
import { clearTimeout, setTimeout } from 'worker-timers'
import { toFixedNumber } from '@/assets/js/helpers.js'
import sendMIDIMessage from '@/assets/js/midiMessages.js'

export function usePlaybackControl(
    file,
    settings,
    status,
    audioGraph,
    oscillatorScheduler,
    midiScheduler
) {
    const nextListTimeoutID = ref(null)

    const listSize = computed(() => (settings.bitness === '8' ? 500 : 250))
    const timeToNextList = computed(() =>
        toFixedNumber((status.startAndEndOfList[1] - status.startAndEndOfList[0] + 1) * settings.readingSpeed * 1000)
    )

    function endOfListFor(startOfList) {
        return startOfList + listSize.value <= settings.fragment.to
            ? startOfList + listSize.value - 1
            : settings.fragment.to
    }

    function nextList(listID, startOfList) {
        // If we pressed stop, we exit the recursion
        if (!status.playing) {
            stop()
            return
        }

        // If we have reached the end of the fragment
        if (startOfList >= settings.fragment.to) {
            // В миди-режиме гасим последнюю ноту
            if (settings.midiMode) {
                sendMIDIMessage.noteOff(
                    midiScheduler.commands.value[status.startAndEndOfList[1] - status.startAndEndOfList[0]][0],
                    settings.midi.velocity,
                    settings.midi.port,
                    settings.midi.channel
                )
            }

            if (settings.loop) {
                nextList(0, settings.fragment.from)
                return
            } else {
                stop()
                return
            }
        }

        // Define block of commands
        const endOfList = endOfListFor(startOfList)

        status.startAndEndOfList = [startOfList, endOfList]
        status.listID = listID

        // Planning the list and calculate commands
        if (!settings.midiMode) {
            oscillatorScheduler.planOscillatorList(startOfList, endOfList)
        } else {
            midiScheduler.planMidiList(startOfList, endOfList, 0)
        }

        // Планируем следующее перелистывание
        if (listSize.value >= settings.fragment.to - settings.fragment.from) {
            // Если лист только один
            if (!settings.loop) {
                nextListTimeoutID.value = setTimeout(() => {
                    if (settings.midiMode) {
                        sendMIDIMessage.noteOff(
                            midiScheduler.commands.value[settings.fragment.to - settings.fragment.from][0],
                            settings.midi.velocity,
                            settings.midi.port,
                            settings.midi.channel
                        )
                    }
                    stop()
                }, (settings.fragment.to - settings.fragment.from + 1) * settings.readingSpeed * 1000)
            } else {
                // В зацикленном режиме на одном листе
                nextListTimeoutID.value = setTimeout(() => {
                    if (settings.midiMode && !settings.midi.solidMode && !settings.midi.lastNoteOn) {
                        sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)
                    }
                    nextList(0, settings.fragment.from)
                }, (settings.fragment.to - settings.fragment.from + 1) * settings.readingSpeed * 1000)
            }
        } else {
            // Если несколько листов, то планируем перелистывание
            nextListTimeoutID.value = setTimeout(() => {
                if (settings.midiMode) {
                    sendMIDIMessage.noteOff(
                        midiScheduler.commands.value[midiScheduler.commands.value.length - 1][0],
                        settings.midi.velocity,
                        settings.midi.port,
                        settings.midi.channel
                    )
                }
                nextList(++listID, (startOfList += listSize.value))
            }, timeToNextList.value)
        }
    }

    function play() {
        if (file.loaded && !status.playing) {
            audioGraph.gain.value.gain.setTargetAtTime(settings.gain, audioGraph.audioContext.value.currentTime, 0.005)

            if (!settings.midiMode) {
                audioGraph.oscillator.value.start()
                if (settings.LFO.enabled) {
                    audioGraph.lfoOsc.value.start()
                }
            }

            status.playing = true
            nextList(0, settings.fragment.from)
        }
    }

    function stop() {
        if (status.playing) {
            clearTimeout(nextListTimeoutID.value)

            if (!settings.midiMode) {
                audioGraph.gain.value.gain.setTargetAtTime(0.0001, audioGraph.audioContext.value.currentTime, 0.005)
                audioGraph.oscillator.value.stop(audioGraph.audioContext.value.currentTime + 0.1)
                if (settings.LFO.enabled) audioGraph.lfoOsc.value.stop(audioGraph.audioContext.value.currentTime + 0.1)
                audioGraph.oscillator.value.frequency.cancelScheduledValues(audioGraph.audioContext.value.currentTime + 0.1)

                audioGraph.setOscillators()
            } else {
                midiScheduler.clearMidiTimeouts()
                sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)
            }

            status.playing = false
        }
    }

    function setupPlaybackWatchers(bynaryInSelectedBitness) {
        // If these parameters are changed, completely recalculate the scheduling again
        watch([() => settings.readingSpeed, () => settings.transitionType, () => settings.isRandomTimeGap], () => {
            if (status.playing) {
                clearTimeout(nextListTimeoutID.value)

                if (!settings.midiMode) {
                    audioGraph.oscillator.value.frequency.cancelScheduledValues(audioGraph.audioContext.value.currentTime)

                    const start = status.startAndEndOfList[0] + status.currentCommand
                    const end = status.startAndEndOfList[1]
                    oscillatorScheduler.planOscillatorList(start, end)
                } else {
                    midiScheduler.clearMidiTimeouts()
                    sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)

                    const start = status.startAndEndOfList[0] + status.currentCommand
                    const end = status.startAndEndOfList[1]
                    midiScheduler.planMidiList(start, end, 1)
                }

                // Reschedule the recursion
                if (listSize.value >= settings.fragment.to - settings.fragment.from) {
                    if (!settings.loop) {
                        nextListTimeoutID.value = setTimeout(() => {
                            if (settings.midiMode) {
                                sendMIDIMessage.noteOff(
                                    midiScheduler.commands.value[settings.fragment.to - settings.fragment.from][0],
                                    settings.midi.velocity,
                                    settings.midi.port,
                                    settings.midi.channel
                                )
                            }
                            stop()
                        }, (settings.fragment.to - settings.fragment.from - status.currentCommand) * settings.readingSpeed * 1000)
                    } else {
                        nextListTimeoutID.value = setTimeout(() => {
                            if (settings.midiMode) {
                                sendMIDIMessage.noteOff(
                                    midiScheduler.commands.value[settings.fragment.to - settings.fragment.from][0],
                                    settings.midi.velocity,
                                    settings.midi.port,
                                    settings.midi.channel
                                )
                            }
                            nextList(0, settings.fragment.from)
                        }, (settings.fragment.to - settings.fragment.from - status.currentCommand) * settings.readingSpeed * 1000)
                    }
                } else {
                    let listID = status.listID
                    let startOfList = status.startAndEndOfList[0]

                    nextListTimeoutID.value = setTimeout(() => {
                        if (settings.midiMode) {
                            sendMIDIMessage.noteOff(
                                midiScheduler.commands.value[midiScheduler.commands.value.length - 1][0],
                                settings.midi.velocity,
                                settings.midi.port,
                                settings.midi.channel
                            )
                        }

                        nextList(++listID, (startOfList += listSize.value))
                    }, (status.startAndEndOfList[1] - (status.startAndEndOfList[0] + status.currentCommand)) * settings.readingSpeed * 1000)
                }
            }
        })

        // When changing these parameters, only the frequencies are recalculated
        watch(
            [() => settings.frequenciesRange, () => settings.notesRange, () => settings.frequencyMode],
            () => {
                if (status.playing) {
                    if (!settings.midiMode) {
                        audioGraph.oscillator.value.frequency.cancelScheduledValues(audioGraph.audioContext.value.currentTime)

                        const start = status.startAndEndOfList[0] + status.currentCommand
                        const end = status.startAndEndOfList[1]
                        for (let binaryID = start, index = 0; binaryID <= end; binaryID++, index++) {
                            const command = oscillatorScheduler.computeFrequency(bynaryInSelectedBitness.value[binaryID])
                            const time = audioGraph.audioContext.value.currentTime + index * settings.readingSpeed
                            oscillatorScheduler.scheduleOscillatorValue(command, time)
                        }
                    } else {
                        if (!midiScheduler.commandForNoteOff.value) {
                            midiScheduler.commandForNoteOff.value = midiScheduler.commands.value[status.currentCommand]
                        }

                        midiScheduler.recalculateCommands(status.startAndEndOfList[0], status.startAndEndOfList[1])
                    }
                }
            },
            { deep: true }
        )

        // If you change these parameters, start again
        watch(
            [() => settings.bitness, () => settings.fragment],
            () => {
                const endOfList =
                    settings.fragment.from + listSize.value < settings.fragment.to
                        ? settings.fragment.from + listSize.value - 1
                        : settings.fragment.to

                status.startAndEndOfList = [settings.fragment.from, endOfList]
            },
            { deep: true }
        )

        watch(
            () => file.loaded,
            () => {
                stop()
            }
        )

        watch(
            () => settings.midiMode,
            (newValue) => {
                if (!newValue) {
                    audioGraph.setOscillators()
                }

                if (status.playing) {
                    if (newValue === true) {
                        audioGraph.oscillator.value.stop(audioGraph.audioContext.value.currentTime)
                        if (settings.LFO.enabled) audioGraph.lfoOsc.value.stop(audioGraph.audioContext.value.currentTime)
                        audioGraph.oscillator.value.frequency.cancelScheduledValues(audioGraph.audioContext.value.currentTime)
                        clearTimeout(nextListTimeoutID.value)

                        const start = status.startAndEndOfList[0] + status.currentCommand
                        const end = status.startAndEndOfList[1]
                        midiScheduler.planMidiList(start, end, 0)
                    } else {
                        midiScheduler.clearMidiTimeouts()
                        sendMIDIMessage.allSoundOff(settings.midi.port, settings.midi.channel)

                        clearTimeout(nextListTimeoutID.value)

                        audioGraph.oscillator.value.start()
                        if (settings.LFO.enabled) audioGraph.lfoOsc.value.start()

                        const start = status.startAndEndOfList[0] + status.currentCommand
                        const end = status.startAndEndOfList[1]
                        for (let binaryID = start, index = 0; binaryID <= end; binaryID++, index++) {
                            const command = oscillatorScheduler.computeFrequency(bynaryInSelectedBitness.value[binaryID])
                            const t = audioGraph.audioContext.value.currentTime + index * settings.readingSpeed
                            oscillatorScheduler.scheduleOscillatorValue(command, t)
                        }
                    }

                    // Reschedule the recursion
                    if (listSize.value >= settings.fragment.to) {
                        if (!settings.loop) {
                            nextListTimeoutID.value = setTimeout(() => {
                                stop()
                            }, (settings.fragment.to - status.currentCommand) * settings.readingSpeed * 1000)
                        } else {
                            nextListTimeoutID.value = setTimeout(() => {
                                nextList(0, settings.fragment.from)
                            }, (settings.fragment.to - status.currentCommand) * settings.readingSpeed * 1000)
                        }
                    } else {
                        let listID = status.listID
                        let startOfList = status.startAndEndOfList[0]

                        nextListTimeoutID.value = setTimeout(() => {
                            nextList(++listID, (startOfList += listSize.value))
                        }, (status.startAndEndOfList[1] - (status.startAndEndOfList[0] + status.currentCommand)) * settings.readingSpeed * 1000)
                    }
                }
            }
        )

        watch(
            () => status.playing,
            (newValue) => {
                if (newValue === false) {
                    stop()
                }
            }
        )
    }

    return {
        listSize,
        timeToNextList,
        nextList,
        play,
        stop,
        setupPlaybackWatchers,
    }
}
