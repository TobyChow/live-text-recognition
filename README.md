# live-text-recognition

# Installation
- clone repository
- npm i
## 
Install app 
- Connect phone to USB, and enable debugging mode
- npx react-native run-android
## 
Start local server
- Start metro: npx react-native start
- Start tunnel: adb -s <device_id> reverse tcp:8081 tcp:8081
8081

# Limitations
- Assumes text of interest is in a single line
- Camera must be in potrait orientation (upright)
- Android only, tested with A71 Samsung Phone