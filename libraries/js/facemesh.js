(function () {
    let gazeDirection = null;
    let gazeTimer = null;
    let prevNoseX = null;
    let gazeConfidence = { Left: 0, Right: 0, Center: 0 };
    const CONFIDENCE_THRESHOLD = 3;
    const SMOOTHING_FACTOR = 0.1;

    let eyeTimer = null;
    const GAZE_THRESHOLD = 1000;
    const EYE_THRESHOLD = 3000;

    let lastWarningTime = 0;
    const WARNING_COOLDOWN = 3000;

    function canTriggerWarning() {
        const now = Date.now();
        return (now - lastWarningTime) > WARNING_COOLDOWN;
    }

    function triggerWarning(status, data, callback) {
        if (!canTriggerWarning()) return;

        lastWarningTime = Date.now();
        callback({ status, data });
    }

    async function setupFaceMesh(callback) {
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

            if (results.multiFaceLandmarks?.length === 1) {
                results.multiFaceLandmarks.forEach(landmarks => {
                    detectEyeStatus(landmarks, data, callback);
                    detectGazeDirection(landmarks, data, callback);
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

        const ADAPTIVE_THRESHOLD = eyeDistance * 0.25;
        const HARD_THRESHOLD = eyeDistance * 0.4;

        let currentDirection = "Center";
        if (smoothedNoseX < eyeMidpointX - HARD_THRESHOLD) {
            currentDirection = "Right";
        } else if (smoothedNoseX > eyeMidpointX + HARD_THRESHOLD) {
            currentDirection = "Left";
        } else if (smoothedNoseX < eyeMidpointX - ADAPTIVE_THRESHOLD ||
                   smoothedNoseX > eyeMidpointX + ADAPTIVE_THRESHOLD) {
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
                        triggerWarning(gazeDirection, data, callback);
                        gazeTimer = null;
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
        const isClosed = leftEyeOpen < EYE_OPEN_THRESHOLD && rightEyeOpen < EYE_OPEN_THRESHOLD;

        if (isClosed && !eyeTimer) {
            eyeTimer = setTimeout(() => {
                triggerWarning('eyesnotopen', data, callback);
                eyeTimer = null;
            }, EYE_THRESHOLD);
        } else if (!isClosed && eyeTimer) {
            clearTimeout(eyeTimer);
            eyeTimer = null;
        }
    }

    window.setupFaceMesh = setupFaceMesh;
})();
