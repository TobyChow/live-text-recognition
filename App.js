import {useState, useEffect, useMemo} from 'react';
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {View, Text, StyleSheet, Animated, SafeAreaView, LogBox} from 'react-native';
import {scanOCR} from 'vision-camera-ocr';
import {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';

export default function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [scannedOcrResult, setScannedOcrResult] = useState();
  
  const devices = useCameraDevices();
  const device = devices.back;

  const format = useMemo(() => {
    const desiredWidth = 1280;
    const desiredHeight = 720;
    if (device) {
      for (let index = 0; index < device.formats.length; index++) {
        const format = device.formats[index];
        if (format) {
          console.log("h: "+format.videoHeight);
          console.log("w: "+format.videoWidth);
          if (format.videoWidth == desiredWidth && format.videoHeight == desiredHeight){
            console.log("select format: "+format);
            console.log(JSON.stringify(format));
            return format;
          }
        }
      };
    }
    return undefined;
  }, [device?.formats]);

  // represents position of the cat on the screen 🐈
  const catBounds = useSharedValue({top: 0, left: 0, right: 100, bottom: 100});

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'authorized');
    })();
  }, []);

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    console.log(frame.width, frame.height);
    const scannedOcr = scanOCR(frame);
    if (scannedOcr) {
      //console.log(JSON.stringify(scannedOcr.result));
    }
    if (scannedOcr.result?.text) {
      runOnJS(setScannedOcrResult)(scannedOcr.result.text);
    }
  }, []);

  // uses 'catBounds' to position the red rectangle on screen.
  // smoothly updates on UuseAnimatedStyle(() => ({
  const boxOverlayStyle = {
    position:'absolute',
    top:685,
    left:0,
    width:322,
    height:90,
    borderWidth:3,
    borderColor:'red',
  };

  return (
    device != null &&
    hasPermission && (
      <>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={false}
          // frameProcessor={frameProcessor}
        />
        <View style={boxOverlayStyle}>
          <Text>BOX</Text>
        </View>
        <View>
          <Text>{scannedOcrResult}</Text>
        </View>
      </>
    )
  );
};
