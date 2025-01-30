(function($, str) {
    let gazeDirection = null;
    let gazeTimer = null;
    const GAZE_THRESHOLD = 1000;
    let eyeStatus = "Open";
    let eyeTimer = null;
    const EYE_THRESHOLD = 4000;
    let lastDetectionTime = Date.now();

function processFrame(videoElement, canvasElement, cmid, attemptid,
    mainimage, enablestrictcheck, callback) {
    if (!videoElement || videoElement.readyState < 2) {
        setTimeout(() => processFrame(videoElement, canvasElement,
            cmid, attemptid, mainimage, enablestrictcheck, callback), 1000);
        return;
    }
    setupFaceMesh(videoElement, canvasElement, cmid,
        attemptid, mainimage, enablestrictcheck, callback);
    setTimeout(() => processFrame(videoElement, canvasElement,
        cmid, attemptid, mainimage, enablestrictcheck, callback), 500);
}

function setupFaceMesh(videoElement, canvasElement, cmid, attemptid, mainimage, enablestrictcheck, callback) {
    const canvasCtx = canvasElement.getContext('2d');
    const faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `${M.cfg.wwwroot}/mod/quiz/accessrule/quizproctoring/libraries/facemesh/${file}`;
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
        var data = canvasElement.toDataURL('image/png');
        const currentTime = Date.now();
        let returnData = {status: '', data: data};
        if (currentTime - lastDetectionTime >= 5000) {
            if (typeof results.multiFaceLandmarks === 'undefined') {
                returnData.status = 'noface';
            } else {
                if (results.multiFaceLandmarks.length > 1) {
                    returnData.status = 'multiface';
                }
            }
            lastDetectionTime = currentTime;
        }

        if (enablestrictcheck === 1 && typeof results.multiFaceLandmarks != 'undefined'
            && results.multiFaceLandmarks.length === 1) {
            results.multiFaceLandmarks.forEach(landmarks => {
                detectGazeDirection(landmarks, cmid, attemptid, mainimage, data, callback);
                detectEyeStatus(landmarks, cmid, attemptid, mainimage, data, callback);
            });
        }
        canvasCtx.restore();
        callback(returnData);
    });

    faceMesh.send({image: videoElement});
}

function detectGazeDirection(landmarks, cmid, attemptid, mainimage, data, callback) {
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const nose = landmarks[1];
    const eyeMidpointX = (leftEye.x + rightEye.x) / 2;
    const noseX = nose.x;

    let currentDirection = "Center";
    let returnData = { status: '', data: data };
    if (noseX < eyeMidpointX - 0.02) {
        currentDirection = "Right";
    } else if (noseX > eyeMidpointX + 0.02) {
        currentDirection = "Left";
    }

    if (currentDirection !== gazeDirection) {
        gazeDirection = currentDirection;

        if (gazeTimer) {
            clearTimeout(gazeTimer);
            gazeTimer = null;
        }
    }

    if (gazeDirection !== "Center") {
        if (!gazeTimer) {
            gazeTimer = setTimeout(() => {
                returnData.status = '' + gazeDirection + '';
                callback(returnData);
            }, GAZE_THRESHOLD);
        }
    } else {
        if (gazeTimer) {
            clearTimeout(gazeTimer);
            gazeTimer = null;
        }
    }
}

function detectEyeStatus(landmarks, cmid, attemptid, mainimage, data, callback) {
    const leftEyeUpper = landmarks[159];
    const leftEyeLower = landmarks[145];
    const rightEyeUpper = landmarks[386];
    const rightEyeLower = landmarks[374];

    const leftEyeOpen = Math.abs(leftEyeUpper.y - leftEyeLower.y);
    const rightEyeOpen = Math.abs(rightEyeUpper.y - rightEyeLower.y);

    const EYE_OPEN_THRESHOLD = 0.018;

    let currentEyeStatus = (leftEyeOpen > EYE_OPEN_THRESHOLD &&
        rightEyeOpen > EYE_OPEN_THRESHOLD) ? "Open" : "Closed";
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
window.facemesh = {
        processFrame: processFrame,
    };
})(jQuery, M.util.get_string);