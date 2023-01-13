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

const CAMERA_CONTAINER_HEIGHT = 50; // percentage of total camera height
const SHOW_DETECTION_BOX = false; // true to debug position of scanned text

type DetectionBoxBounds = Bounds & {
    [key in keyof React.CSSProperties] : any
}

type Bounds = {
    top: number,
    left: number,
    width: number,
    height: number
}

export default function TextDetector() {
    let {height:screenH, width:screenW} = useWindowDimensions();
    screenH *= CAMERA_CONTAINER_HEIGHT / 100;
    const bounds = useSharedValue<Bounds>({top:0, left:0, width:0, height:0});

    // frame dimension will be obtained in the processor
    // set initial value to any number above 0 to avoid errors
    const frameDimension = useSharedValue<{width:number, height:number}>({width:1, height:1});

    const {wRatio, hRatio} = screenToFrameRatio(screenW, screenH, frameDimension.value.width, frameDimension.value.height);

    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [scannedText, setScannedText] = useState<string>('');
    const [textToQuery, setTextToQuery] = useState<string>('');

    const devices = useCameraDevices();
    const device = devices.back;

    // dimensions of capture zone relative to camera
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

        frameDimension.value = {
            width: frame.width,
            height: frame.height,
        };

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
                runOnJS(setScannedText)(textWithinCaptureArea[0].text);
            }
        }

        /**
         * Remove OCR results not within capture frame
         * @param {TextBlock} blocks of text. Think of it like a paragraph
         * @returns {TextLine[] | []} Textlines within bounds of capture area
         */
        function getTextInCaptureArea(blocks: TextBlock[]): TextLine[] | [] {
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
         * Check if center point of a rect is within the capture zone
         * @param {TextBlock | TextLine} rect
         * @return {boolean} True if rect's center point is within capture zone
         */
        function isRectWithinCaptureZone(rect:TextBlock | TextLine): boolean {
            const rectCenterX = rect.frame.boundingCenterX;
            const rectCenterY = rect.frame.boundingCenterY;

            // dimensions of capture zone relative to frame
            const frameCaptureZone: Bounds = {
                top: captureZone.top * hRatio,
                left: captureZone.left * wRatio,
                width: captureZone.width * wRatio,
                height: captureZone.height * hRatio,
            };

            // position of all 4 corners of the capture zone relative to frame
            const captureCoordinates = {
                left: frameCaptureZone.left,
                top: frameCaptureZone.top,
                right: frameCaptureZone.left + frameCaptureZone.width,
                bottom: frameCaptureZone.top + frameCaptureZone.height,
            };

            return rectCenterX >= captureCoordinates.left && rectCenterX <= captureCoordinates.right && rectCenterY >= captureCoordinates.top && rectCenterY <= captureCoordinates.bottom;
        }
    }, []);

    /**
     * Merge detection box styling and positioning into one object
     * @returns {DetectionBoxBounds}
     */
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

/**
 * Screen refers to the phone screen.
 * Note that for Android, the width and height are flipped.
 * The frame's dimensions are based on the default orientation (landscape left) of the phone
 * So when the phone is in portrait mode, the dimensions should be flipped.
 */
function screenToFrameRatio(screenW: number, screenH: number, frameW: number, frameH: number) {

    // flip dimensions to account for orientation
    [frameW, frameH] = [frameH, frameW];

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
