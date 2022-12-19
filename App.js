/* eslint-disable prettier/prettier */
import { useState, useEffect, useMemo } from 'react';
import {
    Camera,
    useCameraDevices,
    useFrameProcessor,
} from 'react-native-vision-camera';
import { View, Text, StyleSheet, Animated, SafeAreaView, LogBox, Dimensions } from 'react-native';
import { scanOCR } from 'vision-camera-ocr';
import {
    useSharedValue,
    useAnimatedStyle,
    runOnJS,
} from 'react-native-reanimated';

export default function App() {
    const [hasPermission, setHasPermission] = useState(false);
    const [scannedOcrResult, setScannedOcrResult] = useState();
    const [matchedFrame, setMatchedFrame] = useState();

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


    const { width: screenW, height: screenH } = Dimensions.get('screen');

    const {wRatio, hRatio} = screenToFrameRatio(screenW, screenH, 720, 1280);
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
    if (matchedFrame) {
        const padding = 0;
        const topPos = matchedFrame.y * 1 / hRatio;
        const leftPos = matchedFrame.x * 1 / wRatio;
        const boxHeight = matchedFrame.height * 1 / hRatio;
        const boxWidth = matchedFrame.width * 1 / wRatio;
        /*
        matchedOverlayStyle = {
            top: topPos - (boxHeight * 0.5) - padding,
            left: leftPos - (boxWidth * 0.5) - padding,
            width: boxWidth + padding,
            height: boxHeight + padding,
        };
        */
        matchedOverlayStyle = {
            left: topPos - (boxWidth * 0.5), 
            top:  leftPos - (boxHeight * 0.5),
            height: boxWidth + padding,
            width: boxHeight + padding,
        };


        boxOverlayStyle = Object.assign(boxOverlayStyle, matchedOverlayStyle);
    }

    let midStyle = {
        position: 'absolute',
        backgroundColor: 'blue',
        top: 350 * 1/hRatio,
        left: 500 * 1/wRatio,
        width:10,
        height:10,
    };

    return (
        device != null &&
        hasPermission && (
            <>
                <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={false} 
                    orientation={"landscapeLeft"}
                    // format={format}
                    frameProcessor={frameProcessor}
                    frameProcessorFps={1}
                />
                {matchedFrame  &&
                <View style={boxOverlayStyle}>
                    <Text></Text>
                </View>
                }
                <View style={midStyle}>
                    <Text></Text>
                </View>
                <View>
                    <Text>{scannedOcrResult}</Text>
                    <Text>{`dim: ${screenW}, ${screenH}`}</Text>
                    <Text>{JSON.stringify(matchedFrame)}</Text>
                </View>
            </>
        )
    );
};


function screenToFrameRatio(screenW, screenH, frameW, frameH) {
    return {
        wRatio: frameW / screenW,
        hRatio: frameH / screenH,
        // wRatio: 1,
        // hRatio: 1,
    };
}
