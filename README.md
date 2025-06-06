# AudioBook Organizer

A tool for organizing and exporting audiobook sections with metadata.

## Features

- Export metadata in JSON/CSV format
- Export audio clips to organized folders
- Create ZIP archives of audio clips
- Merge audio clips into a single WAV file
- Configurable silence gaps between clips

## Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure FFmpeg is installed on your system:
- Windows: Install via [FFmpeg Download](https://ffmpeg.org/download.html)
- Linux: `sudo apt-get install ffmpeg`
- Mac: `brew install ffmpeg`

3. Start the application:
```bash
npm start
```

## Export Options

- Export metadata (.json)
- Copy audio clips to folder
- Create ZIP archive of all clips
- Merge all clips into single .wav file
- Configurable silence between clips (0s, 1s, 2s, 5s) 