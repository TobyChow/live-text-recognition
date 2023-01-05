# live-text-recognition

Scan text to get an image and a short summary.

![Alt Text](demo.gif)
# Installation
## 
Install app 
- Download text-detector.apk file
## 
Start local server
- clone repository
- npm i
- Start metro: npx react-native start
- Start tunnel: adb -s <device_id> reverse tcp:8081 tcp:8081
8081

# Limitations
- Assumes text of interest is in a single line
- Camera must be in potrait orientation (upright)
- Android only, tested with A71 Samsung Phone