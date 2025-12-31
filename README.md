# Binary synth

_Audio synthesis from binary code of any file_

[![Uptime Robot status](https://img.shields.io/uptimerobot/status/m795264551-bb4c959b31b6ff94b02f9545)](https://bs.stranno.su) [![Uptime Robot status](https://img.shields.io/uptimerobot/ratio/m795264551-bb4c959b31b6ff94b02f9545)](https://bs.stranno.su) [![DOI](https://store.stranno.su/bs/doi.svg)](https://elibrary.ru/item.asp?id=83039347)

**Demo**: https://bs.stranno.su

**Video demo**: [Youtube](https://youtu.be/5LMYiLwfvRg?si=D9GdKJF3hmjvw4fg&t=654)

**Performance and lecture**: [Youtube](https://youtu.be/Vj476GVtHZU?si=y4QY3JSnzjmhn5ur)

**Article**: [Drone-ambient-noise synthesizer in Javascript: when instability is a feature, not a bug](https://bs.stranno.su/drone-ambient-noise-synthesizer) ([Dev.to](https://dev.to/max_alyokhin/drone-ambient-noise-synthesizer-in-javascript-when-instability-is-a-feature-not-a-bug-34i8) | [Habr](https://habr.com/ru/articles/970404))

![](https://store.stranno.su/bs/fuji2.png)

_<a href="README_RU.md">Эта страница есть также на русском</a>_

A web-synthesizer that generates sound from the binary code of any files (databending-instrument). It can synthesize sound directly in the browser, or be a generator of MIDI messages to external devices or DAWs, turning any file into a score. All the application code is written in Javascript and along with everything you need is packed into a single `.html`-file of about 450kb. The synthesizer doesn't need internet, it can be downloaded and run locally on any device with a browser.

The application reads the file sequentially, and due to the high speed of reading and random deviation of reading duration, we can get quite unpredictable generation of timbre nuances, and at certain settings we can switch to granular synthesis.

## Quick start guide

- open one of these links: [IDM](https://bs.stranno.su/#{%22readingSpeed%22:0.0001,%22waveType%22:%22sine%22,%22gain%22:2.04,%22transitionType%22:%22immediately%22,%22frequencyMode%22:%22continuous%22,%22frequenciesRange%22:{%22from%22:0,%22to%22:8},%22notesRange%22:{%22from%22:48,%22to%22:60},%22fragment%22:{%22from%22:0,%22to%22:5000},%22midiMode%22:false,%22biquadFilterFrequency%22:33.1,%22biquadFilterQ%22:112.4,%22LFO%22:{%22enabled%22:true,%22type%22:%22triangle%22,%22rate%22:34.5,%22depth%22:1},%22bitness%22:%2216%22,%22panner%22:-0.67,%22loop%22:true,%22isRandomTimeGap%22:true,%22midi%22:{%22port%22:null,%22channel%22:0,%22pitch%22:8192,%22modulation%22:50,%22noMIDIPortsFound%22:true,%22velocity%22:120,%22solidMode%22:false,%22lastNoteOnMode%22:true}}) | [Ambient](https://bs.stranno.su/#{%22readingSpeed%22:0.0001,%22waveType%22:%22triangle%22,%22gain%22:0.41,%22transitionType%22:%22immediately%22,%22frequencyMode%22:%22continuous%22,%22frequenciesRange%22:{%22from%22:0,%22to%22:1},%22notesRange%22:{%22from%22:48,%22to%22:104},%22fragment%22:{%22from%22:0,%22to%22:624},%22midiMode%22:false,%22biquadFilterFrequency%22:39.3,%22biquadFilterQ%22:121.3,%22LFO%22:{%22enabled%22:true,%22type%22:%22sine%22,%22rate%22:99,%22depth%22:0.395},%22bitness%22:%228%22,%22panner%22:0,%22loop%22:true,%22isRandomTimeGap%22:true,%22midi%22:{%22port%22:null,%22channel%22:0,%22pitch%22:8192,%22modulation%22:66,%22noMIDIPortsFound%22:true,%22velocity%22:66,%22solidMode%22:true,%22lastNoteOnMode%22:true}}) | [Harsh noise](https://bs.stranno.su/#{%22readingSpeed%22:0.0001,%22waveType%22:%22sine%22,%22gain%22:2.56,%22transitionType%22:%22immediately%22,%22frequencyMode%22:%22continuous%22,%22frequenciesRange%22:{%22from%22:41,%22to%22:90},%22notesRange%22:{%22from%22:48,%22to%22:104},%22fragment%22:{%22from%22:0,%22to%22:100720},%22midiMode%22:false,%22biquadFilterFrequency%22:418.5,%22biquadFilterQ%22:66.6,%22LFO%22:{%22enabled%22:true,%22type%22:%22sine%22,%22rate%22:91,%22depth%22:0.546},%22bitness%22:%228%22,%22panner%22:0.15,%22loop%22:true,%22isRandomTimeGap%22:true,%22midi%22:{%22port%22:null,%22channel%22:0,%22pitch%22:8192,%22modulation%22:66,%22noMIDIPortsFound%22:true,%22velocity%22:66,%22solidMode%22:true,%22lastNoteOnMode%22:true}})
- tap anywhere on the screen and upload any file (files are not sent anywhere, everything is computed on your device)
- press the spacebar or the Play button
- press and hold the <kbd>S</kbd> key and move the mouse. You can move the mouse indefinitely. Pressing <kbd>Esc</kbd> will return the cursor
- with the <kbd>S</kbd> key held down, press <kbd>Shift</kbd> to “strengthen” or <kbd>Ctrl</kbd> to “weaken” the input
- do similar actions with other settings by pressing the keys <kbd>Q</kbd>, <kbd>W</kbd>, <kbd>A</kbd>, <kbd>Z</kbd>, <kbd>X</kbd>, <kbd>C</kbd>, <kbd>V</kbd>, etc. (input fields have the corresponding key on the right side)
- open several more tabs with the instrument in parallel and launch
- move between tabs using <kbd>Ctrl</kbd> + <kbd>tab number</kbd> (9 max) or <kbd>Ctrl</kbd> + <kbd>Tab</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Tab</kbd>
- process the sound on-the-fly by connecting effects pedals, or by using Ableton or other DAWs and [Virtual audio cable](https://vac.muzychenko.net/en/)
- switch to MIDI mode and control a virtual or external synthesizer using the [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html)
- save settings just by copying the URL or via Save settings button
- copy the instrument to play without internet by right-clicking - Save As, or download from here from the folder `/dist`

## Contents

- [Application principle](#principle)
- [Switching to granular mode](#granular)
- [Recommendations for optimal performance](#recommendation)
- [MIDI](#midi)
- [Interface features](#interface)
- [Saving settings](#settings)
- [Run locally and build the project](#run)

## Application principle
<a id="principle"></a>

All data on any computer or smartphone is in the form of files (which are, in essence, texts). The contents of these files are ultimately just zeros and ones. And these zeros and ones are basically all the same, so we need an interpreter to extract meaning from these texts. Basically, the file format (.mp3, .docx, etc.) is just a pointer to which interpreter we need to pass the text in order to extract meaning from it.

But what if the file format and the interpreter don't match?

In the case of musical experimentation, there have been earlier attempts, for example, to "play" a file through an audio editor.

We could go further and write our own interpreter that would look at the files without regard to format, use its own "manner of reading" the original zeros and ones, and on that basis provide a complete system for controlled synthesis of sounds.

1. We can interpret files as an array of numbers. That is, we divide continuous machine code into _words_ of some information capacity (bitness):

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
<a id="granular"></a>

> **Note**: Here and below the instrument interface terms are used. For their description, see below in the Interface features section

Granular synthesis operates on small pieces of sounds — acoustic pixels. It is generally accepted that granular synthesis "starts" when operating with sounds <50ms. At values `fragment` * `reading speed` = <50 we begin to operate with acoustic pixels.

In this case, each command from `fragment` can be considered a "subpixel", which, with `random time gap` enabled, is unique each time, and the pixel, respectively, is unique in multiples of the number of subpixels. As a result, we get a mutable timbre.

In classical granular synthesis, pixels play simultaneously and in parallel, and their number can change over time. In BS, on the other hand, the pixels form a thread along which we move.

*That is, in conventional granular synthesis, a truck with sand is thrown on the listener, where each grain of sand is an acoustic pixel, but here this sand is poured out through a funnel with the diameter of one grain of sand, and this thin stream is what we observe.*

The image below shows the formation of an acoustic pixel from two commands (`fragment: from = 0, to = 1`), at a reading speed of 0.005 s. We need to consider that each frequency has a period *T*, equal to the ratio of a unit of time (1 second = 1000 milliseconds) to the frequency. This means that we can think of sound not only in terms of frequency, but also in terms of the time it takes for the wave to make one complete oscillation. If the wave does not have time to make a complete oscillation, such an object is called a "wavelet".

![](https://store.stranno.su/bs/granular.jpg)

## Recommendations for optimal performance
<a id="recommendation"></a>

- Use incognito mode with extensions disabled
- Close the non-incognito browser
- Leave only BS tabs in incognito mode
- Use a separate browser [ungoogled-chromium](https://github.com/ungoogled-software/ungoogled-chromium), which uses a little less CPU and a lot less RAM.

BS under workload requires on average up to 7.1% CPU, in incognito mode 6%, Firefox 4.2%, but runs less stable. Also the browser's open console/DevTools increases CPU consumption per tab by 10%. It is recommended to use BS in incognito mode without any other open tabs except BS tabs for maximum efficiency.

More interesting sound is obtained with several independent instances of BS in different tabs. Theoretically, it would be possible to implement several BS threads in one tab, but this is less optimal, because browsers limit the maximum CPU usage per tab (in Chrome it is 10% of CPU). Also, each tab has its own [event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop). You can use <kbd>Ctrl</kbd> + <kbd>tab number</kbd> to quickly switch between tabs.

## MIDI
<a id="midi"></a>

When the MIDI mode is enabled, the first available port and its first channel are automatically selected. Next, a `noteOn` signal is sent sequentially when reading, and a `noteOff` signal is sent after the `reading speed` time. In `continuous` mode, a `Pitch` signal is sent after each noteOn to hit the desired frequency.

MIDI messages can be sent:

-   to neighboring tabs and browser windows if they are listening to MIDI (e.g., in the web analog [DX7](http://mmontag.github.io/dx7-synth-js))
-   in DAW and other applications with virtual synthesizers (i.e. BS can control, for example, synthesizer in Ableton).
-   to MIDI-compatible external devices connected to a computer

To send MIDI messages to a DAW on Windows devices, you can use [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html).

> **Note**: After any manipulations with MIDI ports (connection/disconnection/re-connection) it is necessary to completely restart the browser, closing all browser windows if there are several of them

> **Note**: MIDI messages are generated on the desktop only

## Interface features
<a id="interface"></a>

-   `Reading speed` — interpretation speed; at high speeds over 0.001 the application may become unstable

-   `Bitness` — we can divide the binary code into words of 8 or 16 bits, which changes the number of available frequencies (256 or 65536)

-   `Panner` — pan between left (-1) and right (1) channels

-   `Frequency generation mode`

    -   `continuous` — continuous frequency distribution
    -   `tempered` — distribution by 12-step equal-tempered scale. There are notes from C-2 to B8

-   `Transition type` — transition between frequencies

    -   `immediate` — instantaneous, rough transition
    -   `linear` — linearly to the next frequency
    -   `exponential` — exponentially to the next frequency

-   `Random time gap` — adds a random amount of time to the next tone within the `reading speed` parameter. Makes the sound less "robotic", as the distance to each tone is slightly different and it adds more "liveliness" to the playing

-   `Fragment` — allows to play not the whole file, but a certain part of it

-   `Sample rate` — sampling frequency. In most cases it has little effect on the sound, but it is very important when playing at ultra-low frequencies like frequencies range 0 - 1

-   `Solid mode` — the "solid press" mode, does not send `noteOff` commands; if the commands are the same in a row (and as a consequence notes), even noteOn is not sent. `allSoundOff` is sent at the end. On some synthesizers it allows smooth transitions between notes

- `Last noteOn mode` — leaves the last command in the loop pressed. Allows to make smoother transitions between repeats of patterns

- Some input fields have a keyboard shortcut: pressing the corresponding key automatically moves the focus to the item. By pressing a key and moving the mouse at the same time, the values can be changed smoothly. Pressing <kbd>Shift</kbd> will increase (10x, 100x, 1000x) the "power" of the value change, pressing <kbd>Ctrl</kbd> will decrease (0.1x, 0.01x, 0.001x). The cursor disappears in order to be able to change values indefinitely. To return the cursor, press <kbd>Esc</kbd>.

## Saving settings
<a id="settings"></a>

You can save your settings in two ways:

- via a URL link. When you click in the address bar of your browser, the application automatically generates a link to which the settings are written. You can copy it and when you open the link, the settings will be applied immediately, all you have to do is download a file for sound synthesis.
- through a file. The interface includes Save / Load / Restore settings buttons, which allow you to save or load a settings file to or from your computer and also restore initial settings.

## Run locally and build the project
<a id="run"></a>

### Just copy the app

Everything you need for the system is contained in a single `.html` file, which you can download in the `/dist` folder, or simply go to https://bs.ѕtranno.su and right-click and select Save As in the menu.

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
