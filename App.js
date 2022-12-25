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

// todo can get this info from frame.width / frame.height instead of hardcoding
const FRAME_WIDTH = 720;
const FRAME_HEIGHT = 1280;

export default function App() {
    const {height:screenH, width:screenW} = useWindowDimensions();
    const bounds = useSharedValue({top:0, left:0, width:0, height:0});
    const {wRatio, hRatio} = screenToFrameRatio(screenW, screenH, FRAME_WIDTH, FRAME_HEIGHT);

    const [hasPermission, setHasPermission] = useState(false);
    const [scannedOcrResult, setScannedOcrResult] = useState();
    const [matchedFrame, setMatchedFrame] = useState();

    const devices = useCameraDevices();
    const device = devices.back;

    // dimensions relative to camera
    const captureZone = {
        position:'absolute',
        top: screenH * 0.5,
        left: 0,
        width: screenW,
        height: screenH * 0.1,
        borderColor: 'green',
        borderWidth: 3,
    };

    // dimensions relative to frame
    const frameCaptureZone = {
        position:'absolute',
        top: screenH * 0.5 * hRatio,
        left: 0 * wRatio,
        width: screenW * wRatio,
        height: screenH * 0.1 * hRatio,
    };

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
            const textWithinCaptureArea = getTextInCaptureArea(scannedOcr.result.blocks);
            if (textWithinCaptureArea.length !== 0) {
                const capturedFrame = textWithinCaptureArea[0].frame;
                bounds.value = {
                    top: capturedFrame.y,
                    left: capturedFrame.x,
                    width: capturedFrame.width,
                    height: capturedFrame.height,
                };
                runOnJS(setScannedOcrResult)(textWithinCaptureArea[0].text);
                runOnJS(setMatchedFrame)(textWithinCaptureArea[0].frame); //todo assume only 1 line for now
            }
        }

        function getTextInCaptureArea(blocks) {
            const result = [];
            blocks.map(block => {
                // skip current block if its not within capture zone
                // determine by checking if center of block is within capture zone
                if (isRectWithinCaptureZone(block)) {
                    block.lines.forEach(line => {
                        if (isRectWithinCaptureZone(line)) {
                            result.push(line);
                        }
                    });
                }
            });
            return result;
        }
        
        /**
         * True if rect1 is within rect2
         *
         * @param {Rect} rect1
         * @param {Rect} rect2
         */
        function isRectWithinCaptureZone(rect) {
            const rectCenterX = rect.frame.boundingCenterX;
            const rectCenterY = rect.frame.boundingCenterY;
            const captureCoordinates = {
                left: frameCaptureZone.left,
                top: frameCaptureZone.top,
                right: frameCaptureZone.left + frameCaptureZone.width,
                bottom: frameCaptureZone.top + frameCaptureZone.height
            };

            return rectCenterX >= captureCoordinates.left && rectCenterX <= captureCoordinates.right && rectCenterY >= captureCoordinates.top && rectCenterY <= captureCoordinates.bottom;
        }
    }, []);


    let boxOverlayStyle = {
        position: 'absolute',
        borderWidth: 3,
        borderColor: 'red',
        top:0,
        left:0,
        width:0,
        height:0,
    };

    let matchedOverlayStyle = {};
    if (Object.keys(bounds?.value).length != 0) {
        const padding = 0;
        const topPos = bounds.value.top / hRatio;
        const leftPos = bounds.value.left / wRatio;
        const boxHeight = bounds.value.height / hRatio;
        const boxWidth = bounds.value.width / wRatio;

        matchedOverlayStyle = {
            left: leftPos - (boxWidth * 0.5),
            top:  topPos - (boxHeight * 0.5),
            height: boxHeight + padding,
            width: boxWidth + padding,
        };


        boxOverlayStyle = Object.assign(boxOverlayStyle, matchedOverlayStyle);
    }

    return (
        device != null &&
        hasPermission && (
            <>
                <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={true} 
                    frameProcessor={frameProcessor}
                    frameProcessorFps={1} 
                    enableZoomGesture={true}
                />
                <StatusBar hidden={true} translucent={true}/>
                {matchedFrame  &&
                <View style={boxOverlayStyle}>
                    <Text></Text>
                </View>
                }
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
    },
    camera: {
        height:'50%',
    }
}