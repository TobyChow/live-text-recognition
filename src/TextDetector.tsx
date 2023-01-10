/* eslint-disable prettier/prettier */
import React, { useState, useEffect } from 'react';
import {
    Camera,
    useCameraDevices,
    useFrameProcessor,
} from 'react-native-vision-camera';
import { View, StyleSheet, useWindowDimensions, Button } from 'react-native';
import { scanOCR, TextLine, TextBlock } from 'vision-camera-ocr';
import {
    useSharedValue,
    runOnJS,
} from 'react-native-reanimated';
import TextDisplay from './TextDisplay';

// todo can get this info from frame.width / frame.height instead of hard coding
const FRAME_WIDTH = 480; // 720 if height is 100%
const FRAME_HEIGHT = 640; // 1280 if height is 100%
const CAMERA_CONTAINER_HEIGHT = 50; // percentage of total camera height. note frame dimensions are different at 100%
const SHOW_DETECTION_BOX = false; // use to debug position of scanned text

type DetectionBoxBounds = {
    [prop: string]: any,
    top: number,
    left: number,
    width: number,
    height: number
}

type Bounds = {
    value: DetectionBoxBounds
}

export default function TextDetector() {
    let {height:screenH, width:screenW} = useWindowDimensions();
    screenH *= CAMERA_CONTAINER_HEIGHT / 100;
    const bounds: Bounds = useSharedValue({top:0, left:0, width:0, height:0});
    const {wRatio, hRatio} = screenToFrameRatio(screenW, screenH, FRAME_WIDTH, FRAME_HEIGHT);

    const [hasPermission, setHasPermission] = useState(false);
    const [scannedText, setscannedText] = useState<string>();
    const [textToQuery, setTextToQuery] = useState('');

    const devices = useCameraDevices();
    const device = devices.back;

    // dimensions relative to camera
    const captureZone: DetectionBoxBounds = {
        top: screenH * 0.5,
        left: 0,
        width: screenW,
        height: screenH * 0.15,
        position:'absolute',
        borderColor: 'green',
        borderWidth: 3,
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
                const capturedFrame = textWithinCaptureArea[0].frame; // Assumes at most only 1 text line. If there are more, then just use the first
                bounds.value = {
                    top: capturedFrame.y,
                    left: capturedFrame.x,
                    width: capturedFrame.width,
                    height: capturedFrame.height,
                };
                runOnJS(setscannedText)(textWithinCaptureArea[0].text);
            }
        }

        /**
         * Remove OCR results not within capture frame
         * @param {TextBlock} blocks of text. Think of it like a paragraph
         * @returns
         */
        function getTextInCaptureArea(blocks: TextBlock[]) {
            const result: TextLine[] = [];
            blocks.map((block: TextBlock) => {
                // skip current block if it's not within capture zone
                // determine by checking if center of block is within capture zone
                if (isRectWithinCaptureZone(block)) {
                    block.lines.forEach((line: TextLine) => {
                        if (isRectWithinCaptureZone(line)) {
                            result.push(line);
                        }
                    });
                }
            });
            return result;
        }

        /**
         * True if rect's center point is within capture zone
         * @param {TextBlock | TextLine} rect1
         */
        function isRectWithinCaptureZone(rect:TextBlock | TextLine) {
            const rectCenterX = rect.frame.boundingCenterX;
            const rectCenterY = rect.frame.boundingCenterY;

            // dimensions relative to frame
            const frameCaptureZone: DetectionBoxBounds = {
                top: captureZone.top * hRatio,
                left: captureZone.left * wRatio,
                width: captureZone.width * wRatio,
                height: captureZone.height * hRatio,
            };

            const captureCoordinates = {
                left: frameCaptureZone.left,
                top: frameCaptureZone.top,
                right: frameCaptureZone.left + frameCaptureZone.width,
                bottom: frameCaptureZone.top + frameCaptureZone.height,
            };

            return rectCenterX >= captureCoordinates.left && rectCenterX <= captureCoordinates.right && rectCenterY >= captureCoordinates.top && rectCenterY <= captureCoordinates.bottom;
        }
    }, []);

    function createDetectionBox(): DetectionBoxBounds {
        let detectionBoxPosition = {};
        if (Object.keys(bounds?.value).length !== 0) {
            const padding = 0;
            const topPos = bounds.value.top / hRatio;
            const leftPos = bounds.value.left / wRatio;
            const boxHeight = bounds.value.height / hRatio;
            const boxWidth = bounds.value.width / wRatio;

            detectionBoxPosition = {
                left: leftPos - (boxWidth * 0.5),
                top:  topPos - (boxHeight * 0.5),
                height: boxHeight + padding,
                width: boxWidth + padding,
            };
        }
        return {...styles.detectionBox, ...detectionBoxPosition};
    }
    const detectionBox = createDetectionBox();

    function handleSendQuery():void {
        if (scannedText) {
            setTextToQuery(scannedText.toLowerCase());
        }
    }

    return (
        device != null &&
        hasPermission && (
            <>
                <View style={styles.cameraContainer}>
                    <Camera
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={true}
                        frameProcessor={frameProcessor}
                        frameProcessorFps={1}
                        enableZoomGesture={true}
                    />
                    {SHOW_DETECTION_BOX  &&
                    <View style={detectionBox} />
                    }
                    <View style={captureZone} />
                </View>
                <Button
                    onPress={handleSendQuery}
                    title={scannedText || 'Scan Text'}
                />
                <TextDisplay
                    query={textToQuery}
                />
            </>
        )
    );
}

function screenToFrameRatio(screenW: number, screenH: number, frameW: number, frameH: number) {
    return {
        wRatio: frameW / screenW,
        hRatio: frameH / screenH,
    };
}

const styles = StyleSheet.create({
    cameraContainer: {
        position: 'relative',
        height:`${CAMERA_CONTAINER_HEIGHT}%`,
    },
    detectionBox: {
        position: 'absolute',
        borderWidth: 3,
        borderColor: 'red',
        top:0,
        left:0,
        width:0,
        height:0,
    },
    captureZoneImage: {
        width:'100%',
        height:'100%',
    },
});
