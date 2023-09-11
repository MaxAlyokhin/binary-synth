# Binary Synth

_Binary file interpreter for audio synthesis_

[![Uptime Robot status](https://img.shields.io/uptimerobot/status/m795264551-bb4c959b31b6ff94b02f9545)](https://bs.stranno.su) [![Uptime Robot status](https://img.shields.io/uptimerobot/ratio/m795264551-bb4c959b31b6ff94b02f9545)](https://bs.stranno.su)

**Demo**: https://bs.stranno.su

![](https://store.stranno.su/bs/design.png)

_<a href="README_RU.md">Эта страница есть также на русском</a>_

All data on any computer or smartphone is in the form of files. The contents of these files are ultimately just zeros and ones. And these zeros and ones are basically all the same, so we need an interpreter to extract meaning from these texts. Basically, the file format (.mp3, .docx, etc.) is just a pointer to which interpreter we need to pass the text in order to extract meaning from it.

But what if the file format and the interpreter don't match? In the case of musical experimentation, there have been earlier attempts, for example, to "play" a file through an audio editor, which expectedly produced mostly glitch and noise; it might be interesting more from a conceptual than a musical point of view.

We could go further and write our own interpreter that would look at the files without regard to format, use its own "manner of reading" the original zeros and ones, and on that basis provide a complete system for controlled synthesis of sounds.

## Application principle

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

## Interface features

-   Reading speed - interpretation speed; at high speeds over 0.001 the application may become unstable

-   Bitness - we can divide the binary code into words of 8 or 16 bits, which changes the number of available frequencies (256 or 65536).

-   Frequency generation mode

    -   continuous - continuous frequency distribution
    -   tempered - distribution by 12-step equal-tempered scale. Numbers denote the note number from C-1 to H7.

-   Transition type - transition between frequencies

    -   immediate - instantaneous, rough transition
    -   linear - linearly to the next frequency
    -   exponential - exponentially to the next frequency

-   Random time gap - adds a random amount of time to the next tone within the Reading speed parameter. Makes the sound less "robotic", as the distance to each tone is slightly different and it adds more "liveliness" to the game

-   Commands range - allows to play not the whole file, but a certain part of it.
