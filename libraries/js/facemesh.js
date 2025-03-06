(function () {
    let gazeDirection = null;
    let gazeTimer = null;
    let prevNoseX = null;
    let gazeConfidence = { Left: 0, Right: 0, Center: 0 };
    const CONFIDENCE_THRESHOLD = 3;
    const SMOOTHING_FACTOR = 0.1; // Adjust between 0.1 (smoother) and 1 (instant)    
    let eyeStatus = "Open";
    let eyeTimer = null;
    const GAZE_THRESHOLD = 1000;
    const EYE_THRESHOLD = 4000;
    let lastDetectionTime = Date.now();
    let prevMouthRatio = 0;

async function setupFaceMesh(enablestrictcheck, callback) {
    const videoElement = document.getElementById('video');
    const canvasElement = document.getElementById('canvas');
    const canvasCtx = canvasElement.getContext('2d');

    const faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.1/${file}`;
        }
    });

    faceMesh.setOptions({
        maxNumFaces: 5,
        refineLandmarks: true,
    });

    faceMesh.onResults((results) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        let data = canvasElement.toDataURL('image/png');
        const currentTime = Date.now();
        let returnData = { status: '', data: data };

        if (currentTime - lastDetectionTime >= 5000) {
            if (!results.multiFaceLandmarks) {
                returnData.status = 'noface';
            } else if (results.multiFaceLandmarks.length > 1) {
                returnData.status = 'multiface';
            }
            lastDetectionTime = currentTime;
        }

        if (results.multiFaceLandmarks?.length === 1) {
            results.multiFaceLandmarks.forEach(landmarks => {
                if (enablestrictcheck === 1) {
                    detectGazeDirection(landmarks, data, callback);
                }
                detectEyeStatus(landmarks, data, callback);
                detectLipSync(landmarks, data, callback);
            });
        }

        canvasCtx.restore();
        callback(returnData);
    });

    async function sendFaceMeshData() {
        await faceMesh.send({ image: videoElement });
        requestAnimationFrame(sendFaceMeshData);
    }
    sendFaceMeshData();

    const model = await loadModel();
    detectObjects(model, videoElement, callback);
    //detectObjects(videoElement, objectModel, callback);
}

function smoothValue(newValue) {
    if (prevNoseX === null) prevNoseX = newValue;
    prevNoseX = prevNoseX * (1 - SMOOTHING_FACTOR) + newValue * SMOOTHING_FACTOR;
    return prevNoseX;
}

function detectGazeDirection(landmarks, data, callback) {
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];
    const eyeMidpointX = (leftEye.x + rightEye.x) / 2;
    const smoothedNoseX = smoothValue(nose.x);
    const eyeDistance = Math.abs(rightEye.x - leftEye.x);

    const ADAPTIVE_THRESHOLD = eyeDistance * 0.25; // Increase for bigger movements
    const HARD_THRESHOLD = eyeDistance * 0.4; // Extreme tilt detection

    let currentDirection = "Center";
    let returnData = { status: "", data: data };

    if (smoothedNoseX < eyeMidpointX - HARD_THRESHOLD) {
        currentDirection = "Right";
    } else if (smoothedNoseX > eyeMidpointX + HARD_THRESHOLD) {
        currentDirection = "Left";
    } else if (smoothedNoseX < eyeMidpointX - ADAPTIVE_THRESHOLD) {
        return;
    } else if (smoothedNoseX > eyeMidpointX + ADAPTIVE_THRESHOLD) {
        return;
    }

    gazeConfidence[currentDirection]++;
    if (gazeConfidence[currentDirection] >= CONFIDENCE_THRESHOLD) {
        if (currentDirection !== gazeDirection) {
            gazeDirection = currentDirection;
            if (gazeTimer) {
                clearTimeout(gazeTimer);
                gazeTimer = null;
            }
            if (gazeDirection !== "Center") {
                gazeTimer = setTimeout(() => {
                    returnData.status = gazeDirection;
                    callback(returnData);
                }, GAZE_THRESHOLD);
            }
        }
        gazeConfidence = { Left: 0, Right: 0, Center: 0 };
    }
}

function detectEyeStatus(landmarks, data, callback) {
    const leftEyeUpper = landmarks[159];
    const leftEyeLower = landmarks[145];
    const rightEyeUpper = landmarks[386];
    const rightEyeLower = landmarks[374];

    const leftEyeOpen = Math.abs(leftEyeUpper.y - leftEyeLower.y);
    const rightEyeOpen = Math.abs(rightEyeUpper.y - rightEyeLower.y);
    const EYE_OPEN_THRESHOLD = 0.015;
    let currentEyeStatus = (leftEyeOpen > EYE_OPEN_THRESHOLD && rightEyeOpen > EYE_OPEN_THRESHOLD)
        ? "Open"
        : "Closed";

    if (currentEyeStatus !== eyeStatus) {
        eyeStatus = currentEyeStatus;
        if (eyeTimer) {
            clearTimeout(eyeTimer);
            eyeTimer = null;
        }
    }

    let returnData = { status: '', data: data };

    if (eyeStatus === "Closed") {
        if (!eyeTimer) {
            eyeTimer = setTimeout(() => {
                returnData.status = 'eyesnotopen';
                callback(returnData);
            }, EYE_THRESHOLD);
        }
    } else {
        if (eyeTimer) {
            clearTimeout(eyeTimer);
            eyeTimer = null;
        }
    }
}

let speakingDuration = 0;
let lastMouthOpenTime = null;
const SPEAKING_GRACE_PERIOD = 300;
let speakingTimestamps = [];
let exceedTimestamps = [];

function detectLipSync(landmarks, data, callback) {
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];

    const lipDistance = Math.abs(upperLip.y - lowerLip.y);
    const MOUTH_OPEN_THRESHOLD = 0.015;

    let mouthRatio = lipDistance;
    let lipSyncStatus = mouthRatio > MOUTH_OPEN_THRESHOLD ? "Speaking" : "Closed";
    let currentTime = Date.now();

    if (lipSyncStatus === "Speaking") {
        if (!lastMouthOpenTime) {
            lastMouthOpenTime = currentTime;
        }

        speakingDuration += currentTime - lastMouthOpenTime;
        lastMouthOpenTime = currentTime;

        speakingTimestamps.push(currentTime);

        // Remove old timestamps (only keep last 60 seconds)
        speakingTimestamps = speakingTimestamps.filter(timestamp => currentTime - timestamp <= 60000);

        if (speakingTimestamps.length > 30) {
            exceedTimestamps.push(currentTime);
            exceedTimestamps = exceedTimestamps.filter(timestamp => currentTime - timestamp <= 60000);

            if (exceedTimestamps.length >= 3) {
                console.warn("User exceeded speaking threshold 3 times in the last minute! Resetting...");
                callback({ status: "Speaking", data: data });
                // Reset everything
                speakingTimestamps = [];
                exceedTimestamps = [];
                speakingDuration = 0;
                lastMouthOpenTime = null;
            }
        }
    } else {
        // If mouth closes but within the grace period, do not reset the timer
        if (lastMouthOpenTime && currentTime - lastMouthOpenTime < SPEAKING_GRACE_PERIOD) {
            // Short pause detected, keep tracking
        } else {
            // Mouth closed too long, reset
            speakingDuration = 0;
            lastMouthOpenTime = null;
        }
    }

    // Update only if there's a significant change
    if (Math.abs(prevMouthRatio - mouthRatio) > 0.002) {
        prevMouthRatio = mouthRatio;
    }
}

async function loadModel() {
    console.log("Loading model...");
    const model = await cocoSsd.load();
    console.log("Model loaded successfully!");
    return model;
}

async function detectObjects(model, videoElement, callback) {
    const TARGET_OBJECTS = ["cell phone", "book", "laptop", "ipad"];

    setInterval(async () => {
        const predictions = await model.detect(videoElement);

        // Extract only object names (labels) with a confidence score > 0.2
        let objectsDetected = predictions
            .filter(prediction => prediction.score > 0.2)
            .map(prediction => prediction.class);

        // Check if any of the target objects are detected
        const detectedTargets = objectsDetected.filter(obj => TARGET_OBJECTS.includes(obj));

        if (detectedTargets.length > 0) {
            console.log("Detected Objects:", JSON.stringify(detectedTargets));
            callback({ status: "objects_detected", objects: detectedTargets });
        }
    }, 3000);
}
    window.setupFaceMesh = setupFaceMesh;
})();
