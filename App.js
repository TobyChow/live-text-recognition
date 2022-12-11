import {useState, useEffect} from 'react';
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {View, Text, StyleSheet} from 'react-native';
import {scanOCR} from 'vision-camera-ocr';
import {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  Animated,
} from 'react-native-reanimated';

export default function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [scannedOcrResult, setScannedOcrResult] = useState();
  
  const devices = useCameraDevices();
  const device = devices.back;

  // represents position of the cat on the screen 🐈
  const catBounds = useSharedValue({top: 0, left: 0, right: 0, bottom: 0});

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
      console.log(JSON.stringify(scannedOcr.result));
    }
    if (scannedOcr.result?.text) {
      runOnJS(setScannedOcrResult)(scannedOcr.result.text);
    }
  }, []);

  // uses 'catBounds' to position the red rectangle on screen.
  // smoothly updates on UuseAnimatedStyle(() => ({
  const boxOverlayStyle = useAnimatedStyle(
    () => ({
      position: 'absolute',
      borderWidth: 1,
      borderColor: 'red',
      ...catBounds.value,
    }),
    [catBounds],
  );

  return (
    device != null &&
    hasPermission && (
      <>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={false}
          frameProcessor={frameProcessor}
        />
        <Animated.View style={boxOverlayStyle} />
        <View>
          <Text>{scannedOcrResult}</Text>
        </View>
      </>
    )
  );
};
