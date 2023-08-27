// MIDI messages

export default {
    noteOff(note, velocity, port, channel) {
        port.send([0x80 + channel, note, velocity])
    },

    noteOn(note, velocity, port, channel) {
        port.send([0x90 + channel, note, velocity])
    },

    pitch(value, port, channel) {
        port.send([0xe0 + channel, value & 0x7f, value >> 7])
    },

    allSoundOff(port, channel) {
        port.send([0xb0 + channel, 0x78, 0])
    },

    modulation(value, port, channel) {
        port.send([0xb0 + channel, 0x01, value])
    },
}
