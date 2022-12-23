/* eslint-disable prettier/prettier */
import { useState, useEffect, useMemo } from 'react';
import {
    Camera,
    useCameraDevices,
    useFrameProcessor,
} from 'react-native-vision-camera';
import { View, Text, StyleSheet, Animated, SafeAreaView, LogBox, Dimensions, useWindowDimensions, StatusBar } from 'react-native';
import { scanOCR } from 'vision-camera-ocr';
import {
    useSharedValue,
    useAnimatedStyle,
    runOnJS,
} from 'react-native-reanimated';

export default function App() {
    const {height:screenH, width:screenW} = useWindowDimensions();
    const [hasPermission, setHasPermission] = useState(false);
    const [scannedOcrResult, setScannedOcrResult] = useState();
    const [matchedFrame, setMatchedFrame] = useState();
    const bounds = useSharedValue({top:0, left:0, width:0, height:0});

    //const { width: screenW, height: screenH } = Dimensions.get('screen');


    const devices = useCameraDevices();
    const device = devices.back;

    useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'authorized');
        })();
    }, []);

    const frameProcessor = useFrameProcessor(frame => {
        'worklet';
        const scannedOcr = scanOCR(frame);

        if (scannedOcr) {
            if (scannedOcr.result.text === 'adidas') {
                console.log(`frame: ${frame.width}, ${frame.height}`);
                const capturedFrame = scannedOcr.result.blocks[0].frame;
                console.log(JSON.stringify(capturedFrame));
                bounds.value = {
                    top: capturedFrame.y,
                    left: capturedFrame.x,
                    width: capturedFrame.width,
                    height: capturedFrame.height,
                };
                runOnJS(setMatchedFrame)(capturedFrame);
            }
        }
        if (scannedOcr.result?.text) {
            runOnJS(setScannedOcrResult)(scannedOcr.result.text);
        }
    }, []);

    const format = useMemo(() => {
        const desiredWidth = 1280;
        const desiredHeight = 720;
        if (device) {
          for (let index = 0; index < device.formats.length; index++) {
            const format = device.formats[index];
            if (format) {
              if (format.videoWidth == desiredWidth && format.videoHeight == desiredHeight){
                return format;
              }
            }
          };
        }
        return undefined;
      }, [device?.formats]);



    const {wRatio, hRatio} = screenToFrameRatio(screenW, screenH, 720,1280);
    /*
    const f = {
        "boundingCenterY": 683,
        "x": 384.5,
        "width": 437,
        "y": 683,
        "boundingCenterX": 384,
        "height": 108
    }
    */

    // uses 'catBounds' to position the red rectangle on screen.
    // smoothly updates on UuseAnimatedStyle(() => ({

    let boxOverlayStyle = {
        position: 'absolute',
        borderWidth: 3,
        borderColor: 'red',
        top:0,
        left:0,
        width:50,
        height:50,
    };

    let matchedOverlayStyle = {};
    if (Object.keys(bounds?.value).length != 0) {
        const padding = 0;
        const topPos = bounds.value.top / hRatio;
        const leftPos = bounds.value.left / wRatio;
        const boxHeight = bounds.value.height / hRatio;
        const boxWidth = bounds.value.width / wRatio;
        /*
        matchedOverlayStyle = {
            top: topPos - (boxHeight * 0.5) - padding,
            left: leftPos - (boxWidth * 0.5) - padding,
            width: boxWidth + padding,
            height: boxHeight + padding,
        };
        */
        matchedOverlayStyle = {
            left: leftPos - (boxWidth * 0.5), 
            top:  topPos - (boxHeight * 0.5),
            height: boxHeight + padding,
            width: boxWidth + padding,
        };


        boxOverlayStyle = Object.assign(boxOverlayStyle, matchedOverlayStyle);
    }

    let midStyle = {
        position: 'absolute',
        backgroundColor: 'blue',
        top: 449 * 1 ,
        left: 205 * 1 ,
        width:10,
        height:10,
    };

    const captureZone = {
        position:'absolute',
        top: screenH * 0.5,
        left: 0,
        width: screenW,
        height: screenH * 0.1,
        borderColor: 'green',
        borderWidth: 3,
    } 

    console.log(captureZone);

    return (
        device != null &&
        hasPermission && (
            <>
                <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={true} 
                    // format={format}
                    frameProcessor={frameProcessor}
                    frameProcessorFps={30} 
                />
                <StatusBar hidden={true} translucent={true}/>
                {matchedFrame  &&
                <View style={boxOverlayStyle}>
                    <Text></Text>
                </View>
                }
                <View style={midStyle}>
                    <Text></Text>
                </View>
                <View style={captureZone}>
                </View>
                <View style={styles.infoContainer}>
                    <Text>{scannedOcrResult}</Text>
                    <Text>{`dim: ${screenW}, ${screenH}`}</Text>
                    <Text>{JSON.stringify(bounds.value)}</Text>
                    <Text>{JSON.stringify(boxOverlayStyle)}</Text>
                </View>
            </>
        )
    );
};


function screenToFrameRatio(screenW, screenH, frameW, frameH) {
    return {
        wRatio: frameW / screenW,
        hRatio: frameH / screenH,
    };
}

const styles = {
    infoContainer: {
        position:'absolute',
    }
}