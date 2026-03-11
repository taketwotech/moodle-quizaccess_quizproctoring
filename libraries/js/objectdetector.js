import {
  ObjectDetector,
  FilesetResolver
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2';

let objectDetector;
let isInitializing = false;
let initializationPromise = null;
const runningMode = "VIDEO";

export async function initializeObjectDetector() {
  // Return existing detector if already initialized
  if (objectDetector) {
    return objectDetector;
  }

  // If already initializing, wait for that promise
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  isInitializing = true;
  initializationPromise = (async () => {
    try {
      // Save current Module state if it exists (face mesh might have modified it)
      const originalModule = typeof Module !== 'undefined' ? { ...Module } : null;
      
      // Use a unique WASM path to avoid conflicts with face mesh
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm'
      );

      objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/1/efficientdet_lite2.tflite',
          delegate: 'GPU',
        },
        scoreThreshold: 0.3,
        runningMode: runningMode,
      });
      window.__objectDetector = objectDetector;
      isInitializing = false;
      return objectDetector;
    } catch (error) {
      isInitializing = false;
      initializationPromise = null;
      console.error('Failed to initialize object detector:', error);
      
      // If error is related to Module.arguments, wait longer and retry
      if (error.message && error.message.includes('Module.arguments')) {
        console.log('WASM conflict detected, waiting longer before retry...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Retry initialization
        isInitializing = true;
        try {
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm'
          );

          objectDetector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/1/efficientdet_lite2.tflite',
              delegate: 'GPU',
            },
            scoreThreshold: 0.3,
            runningMode: runningMode,
          });
          window.__objectDetector = objectDetector;
          isInitializing = false;
          return objectDetector;
        } catch (retryError) {
          isInitializing = false;
          initializationPromise = null;
          console.error('Failed to initialize object detector after retry:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  })();

  return initializationPromise;
}

export function detectObjects(video, callback, overlayCanvas) {
  const ctx = overlayCanvas ? overlayCanvas.getContext('2d') : null;
  const FPS = 2;
  const interval = 1000 / FPS;

  // Set size only once
  if (overlayCanvas) {
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;
  }

  async function detectFrame() {
    if (!objectDetector) return;

    const detections = await objectDetector.detectForVideo(video, performance.now());
    callback(detections);
    setTimeout(detectFrame, interval);
  }

  detectFrame();
}

export function captureImage(video) {
  const outputWidth = 280;
  const outputHeight = 240;
  const captureCanvas = document.createElement('canvas');
  captureCanvas.width = outputWidth;
  captureCanvas.height = outputHeight;
  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  return captureCanvas.toDataURL('image/png');
}