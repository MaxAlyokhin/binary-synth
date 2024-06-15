# Binary Synth

_Audio synthesis from binary code of any file_

[![Uptime Robot status](https://img.shields.io/uptimerobot/status/m795264551-bb4c959b31b6ff94b02f9545)](https://bs.stranno.su) [![Uptime Robot status](https://img.shields.io/uptimerobot/ratio/m795264551-bb4c959b31b6ff94b02f9545)](https://bs.stranno.su)

**Demo**: https://bs.stranno.su

![](https://store.stranno.su/bs/fuji.png)

_<a href="README_RU.md">Эта страница есть также на русском</a>_

A web-synthesizer that generates sound from the binary code of any files. It can synthesize sound directly in the browser, or be a generator of MIDI messages to external devices or DAWs, turning any file into a score. All the application code is written in Javascript and along with everything you need is packed into a single .html file of about 750kb. The synthesizer doesn't need internet, it can be downloaded and run locally on any device with a browser.

The application reads sequentially one or two bytes at a time, and due to the high speed of reading and random deviation of reading duration, we can get quite unpredictable generation of timbre nuances, and at certain settings we can switch to granular synthesis.

## Application principle

All data on any computer or smartphone is in the form of files (which are, in essence, texts). The contents of these files are ultimately just zeros and ones. And these zeros and ones are basically all the same, so we need an interpreter to extract meaning from these texts. Basically, the file format (.mp3, .docx, etc.) is just a pointer to which interpreter we need to pass the text in order to extract meaning from it.

But what if the file format and the interpreter don't match?

In the case of musical experimentation, there have been earlier attempts, for example, to "play" a file through an audio editor.

We could go further and write our own interpreter that would look at the files without regard to format, use its own "manner of reading" the original zeros and ones, and on that basis provide a complete system for controlled synthesis of sounds.

1. We can interpret files as an array of numbers. That is, we divide continuous machine code (ArrayBuffer) into _words_ of some information capacity (bitness):

-   8 bits (numbers from 0 to 255)
-   16 bits (numbers from 0 to 65 535)

2. Then, each word is a command that defines the frequency of the sound

3. At the level of the whole system, we set global parameters:

-   speed of interpretation
-   musical scale (or lack thereof), range of notes/frequencies
-   looping
-   MIDI mode
-   smooth or abrupt transition between commands
-   settings of virtual devices required for synthesis (oscillator, filter, LFO) or MIDI settings

4. To reduce the load on the device, we divide the file into chunks of 500 commands each

5. Recursively schedule the synthesis control by reading 500 instructions per iteration and using global parameters

6. If we have reached the end of the file, stop execution or start again

## Switching to granular mode

> **Note**: Here and below the instrument interface terms are used. For their description, see below in the Interface features section

Granular synthesis operates on small pieces of sounds — acoustic pixels. It is generally accepted that granular synthesis "starts" when operating with sounds <50ms. At values `commands range` * `reading speed` = <50 we begin to operate with acoustic pixels.

In this case, each command from `commands range` can be considered a "subpixel" (wavelet), which, with `random time gap` enabled, is unique each time, and the pixel, respectively, is unique in multiples of the number of subpixels. As a result, we get a mutable timbre.

In classical granular synthesis, pixels play simultaneously and in parallel, and their number can change over time. In BS, on the other hand, the pixels form a thread along which we move.

That is, in conventional granular synthesis, a truck with sand is thrown on the listener, where each grain of sand is an acoustic pixel, but here this sand is poured out through a funnel with the diameter of one grain of sand, and this thin stream is what we observe.

## MIDI

When the MIDI mode is enabled, the first available port and its first channel are automatically selected. Next, a `noteOn` signal is sent sequentially when reading, and a `noteOff` signal is sent after the `reading speed` time. In `continuous` mode, a `Pitch` signal is sent after each noteOn to hit the desired frequency.

MIDI messages can be sent:

-   to neighboring tabs and browser windows if they are listening to MIDI (e.g., in the web analog [DX7](http://mmontag.github.io/dx7-synth-js))
-   in DAW and other applications with virtual synthesizers (i.e. BS can control, for example, synthesizer in Ableton).
-   to MIDI-compatible external devices connected to a computer

To send MIDI messages to a DAW on Windows devices, you can use [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html).

> **Note**: After any manipulations with MIDI ports (connection/disconnection/re-connection) it is necessary to completely restart the browser, closing all browser windows if there are several of them

> **Note**: MIDI messages are generated on the desktop only

## Interface features

-   `Reading speed` — interpretation speed; at high speeds over 0.001 the application may become unstable

-   `Bitness` — we can divide the binary code into words of 8 or 16 bits, which changes the number of available frequencies (256 or 65536).

-   `Frequency generation mode`

    -   `continuous` — continuous frequency distribution
    -   `tempered` — distribution by 12-step equal-tempered scale. There are notes from C-2 to B8

-   `Transition type` — transition between frequencies

    -   `immediate` — instantaneous, rough transition
    -   `linear` — linearly to the next frequency
    -   `exponential` — exponentially to the next frequency

-   `Random time gap` — adds a random amount of time to the next tone within the `reading speed` parameter. Makes the sound less "robotic", as the distance to each tone is slightly different and it adds more "liveliness" to the playing

-   `Commands range` — allows to play not the whole file, but a certain part of it

-   `Solid mode` — the "solid press" mode, does not send `noteOff` commands; if the commands are the same in a row (and as a consequence notes), even noteOn is not sent. `allSoundOff` is sent at the end. On some synthesizers it allows smooth transitions between notes

- Some input fields have a keyboard shortcut: pressing the corresponding key automatically moves the focus to the item. By pressing a key and moving the mouse at the same time, the values can be changed smoothly. The Y axis of the mouse movement determines the "power" of the value change

## Run locally and build the project

### Just copy the app

Everything you need for the system is contained in a single `.html` file, which you can download in the `dist` folder, or simply go to https://bs.ѕtranno.su and right-click and select Save As in the menu.

### Build locally to work with the code

Tech stack: Vue3 + Pinia + Vite.

1. Download and install the LTS version of Node.js
2. Download the code directly from Github, or via `git clone`.
3. In the project folder in the terminal execute:

```bash
npm i
npm run dev # development-build
npm run build # production-build, generate index.html with everything we need
```

For MIDI tests, you can use this resource https://studiocode.dev/midi-monitor/
