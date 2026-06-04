/**
 * Real-time head-tilt eye tracking (MediaPipe Face Landmarker).
 *
 * @module     quizaccess_quizproctoring/eye_tracking
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(['jquery'], function($) {
    const EYE_TRACKING_WARNING_GAP_MS = 3000;
    const HEAD_TILT_HOLD_MS = 2000;
    const HEAD_TILT_THRESHOLD = 0.30;
    const EYE_TRACKING_CALIBRATION_SAMPLES = 15;
    const EYE_TRACKING_PROCESS_INTERVAL_MS = 100;
    const EYE_FOCUS_WARN_WINDOW_MS = 30000;
    const EYE_FOCUS_WARN_MAX_COUNT = 5;
    const MEDIAPIPE_VISION_VERSION = '0.10.14';

    let enabled = false;
    let active = false;
    let landmarker = null;
    let modelPromise = null;
    let rafId = null;
    let runtime = null;
    let inFlight = false;
    let lastAlertAt = 0;
    let lastProcessAt = 0;
    let baselineOffset = null;
    let calibrationSamples = [];
    let tiltDirection = null;
    let tiltStartedAt = null;
    let focusWarningTimestamps = [];
    let autoDisableRequested = false;
    let teacherPollId = null;
    const TEACHER_STATE_POLL_MS = 5000;

    let config = {
        onTiltAlert: null,
        captureFrame: null,
        isTerminationInProgress: function() {
            return false;
        },
        shouldSkipFrame: function() {
            return false;
        },
    };

    /**
     * Clear rolling focus-warning counters (new attempt or teacher re-enable).
     */
    function resetFocusWarningCounters() {
        focusWarningTimestamps = [];
        autoDisableRequested = false;
    }

    /**
     * Stop polling Moodle for teacher eye on/off changes.
     */
    function stopTeacherStatePoll() {
        if (teacherPollId) {
            clearInterval(teacherPollId);
            teacherPollId = null;
        }
    }

    /**
     * Poll attempt eye state so review-page teacher toggles reach the student (every 5s).
     */
    function startTeacherStatePoll() {
        stopTeacherStatePoll();
        if (!enabled) {
            return;
        }
        teacherPollId = setInterval(function() {
            if (!runtime || !enabled) {
                return;
            }
            $.ajax({
                url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_realtime.php',
                method: 'POST',
                dataType: 'json',
                data: {
                    cmid: runtime.cmid,
                    attemptid: runtime.attemptid,
                    mainimage: false,
                    validate: 'eyecheckstatus',
                },
                success: function(response) {
                    if (!response) {
                        return;
                    }
                    if (response.iseyecheck === 0 && active) {
                        deactivateEyeTrackingLocally(false);
                    } else if (response.iseyecheck === 1 && !active && enabled) {
                        resetFocusWarningCounters();
                        active = true;
                        $(document).trigger('eye-tracking-enabled');
                    }
                },
            });
        }, TEACHER_STATE_POLL_MS);
    }

    /**
     * Immediately stop client eye tracking (teacher off or proctorlink message).
     *
     * @param {boolean} markautodisable treat as permanent auto-off for this session
     */
    /**
     * Stop RAF loop; optionally keep runtime for teacher re-enable.
     *
     * @param {boolean} preserveRuntime keep video/cmid context
     */
    function stopTrackingLoop(preserveRuntime) {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (!preserveRuntime) {
            runtime = null;
            stopTeacherStatePoll();
        }
        resetTiltState();
    }

    function deactivateEyeTrackingLocally(markautodisable) {
        active = false;
        if (markautodisable) {
            autoDisableRequested = true;
        }
        stopTrackingLoop(true);
        $(document).trigger('eye-tracking-disabled');
    }

    /**
     * Turn off eye tracking on the server after too many focus warnings.
     *
     * @param {number} cmid course module id
     * @param {number} attemptid attempt id
     */
    function requestAutoDisable(cmid, attemptid) {
        if (autoDisableRequested) {
            return;
        }
        autoDisableRequested = true;
        active = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        resetTiltState();

        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_realtime.php',
            method: 'POST',
            data: {
                cmid: cmid,
                attemptid: attemptid,
                mainimage: false,
                validate: 'eyecheckoff',
            },
            success: function(response) {
                if (response && response.status === 'eyecheckoff') {
                    $(document).trigger('eye-tracking-disabled');
                } else {
                    autoDisableRequested = false;
                }
            },
            error: function() {
                $(document).trigger('eye-tracking-disabled');
            },
        });
    }

    /**
     * Reset per-session head-tilt tracking state (baseline, hold timer).
     */
    function resetTiltState() {
        baselineOffset = null;
        calibrationSamples = [];
        tiltDirection = null;
        tiltStartedAt = null;
    }

    /**
     * Estimate normalized horizontal head yaw from face landmarks (nose vs eye line).
     *
     * @param {Array<{x: number, y: number}>} landmarks face landmark list
     * @return {number|null} offset ratio or null when unreliable
     */
    function estimateHeadYawOffset(landmarks) {
        if (!landmarks || landmarks.length < 264) {
            return null;
        }
        const leftOuter = landmarks[33];
        const leftInner = landmarks[133];
        const rightOuter = landmarks[263];
        const rightInner = landmarks[362];
        const nose = landmarks[1];
        if (!leftOuter || !leftInner || !rightOuter || !rightInner || !nose) {
            return null;
        }
        const leftX = (leftOuter.x + leftInner.x) / 2;
        const rightX = (rightOuter.x + rightInner.x) / 2;
        const leftY = (leftOuter.y + leftInner.y) / 2;
        const rightY = (rightOuter.y + rightInner.y) / 2;
        const eyeMidX = (leftX + rightX) / 2;
        const eyeDistance = Math.hypot(rightX - leftX, rightY - leftY);
        if (eyeDistance < 0.02) {
            return null;
        }
        return (nose.x - eyeMidX) / eyeDistance;
    }

    /**
     * Update tilt hold state and fire alert after sustained left/right turn.
     *
     * @param {number} deviation offset minus personal baseline
     * @param {number} now current timestamp (ms)
     * @param {Object} ctx runtime context
     */
    function processHeadTiltDeviation(deviation, now, ctx) {
        let direction = null;
        if (deviation > HEAD_TILT_THRESHOLD) {
            direction = 'right';
        } else if (deviation < -HEAD_TILT_THRESHOLD) {
            direction = 'left';
        }

        if (!direction) {
            tiltDirection = null;
            tiltStartedAt = null;
            return;
        }

        if (tiltDirection !== direction) {
            tiltDirection = direction;
            tiltStartedAt = now;
            return;
        }

        if (!tiltStartedAt || (now - tiltStartedAt) < HEAD_TILT_HOLD_MS) {
            return;
        }
        if ((now - lastAlertAt) < EYE_TRACKING_WARNING_GAP_MS) {
            return;
        }
        if (typeof config.captureFrame !== 'function' || typeof config.onTiltAlert !== 'function') {
            return;
        }

        const imageData = config.captureFrame(ctx.videoEl, ctx.canvasEl);
        if (!imageData) {
            return;
        }

        lastAlertAt = now;
        tiltDirection = null;
        tiltStartedAt = null;
        config.onTiltAlert(ctx.cmid, ctx.attemptid, ctx.mainimage, imageData);
    }

    /**
     * Process one video frame for head-tilt eye tracking.
     *
     * @param {Object} ctx runtime context
     * @param {number} timestamp monotonic video timestamp for MediaPipe
     */
    function processFrame(ctx, timestamp) {
        if (!active || !landmarker || inFlight) {
            return;
        }
        if (ctx.videoEl.readyState < 2) {
            return;
        }

        inFlight = true;
        try {
            const results = landmarker.detectForVideo(ctx.videoEl, timestamp);
            const landmarks = results.faceLandmarks && results.faceLandmarks[0];
            if (!landmarks) {
                tiltDirection = null;
                tiltStartedAt = null;
                return;
            }

            const offset = estimateHeadYawOffset(landmarks);
            if (offset === null) {
                return;
            }

            const now = Date.now();
            if (baselineOffset === null) {
                calibrationSamples.push(offset);
                if (calibrationSamples.length < EYE_TRACKING_CALIBRATION_SAMPLES) {
                    return;
                }
                baselineOffset = calibrationSamples.reduce(function(sum, value) {
                    return sum + value;
                }, 0) / calibrationSamples.length;
                calibrationSamples = [];
            }

            processHeadTiltDeviation(offset - baselineOffset, now, ctx);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[QuizProctoring][EyeTracking] Frame processing failed:', error);
        } finally {
            inFlight = false;
        }
    }

    /**
     * Load MediaPipe tasks-vision ESM without RequireJS interception.
     *
     * @param {string} moduleurl jsDelivr ESM URL
     * @return {Promise<Object>}
     */
    function loadMediapipeModule(moduleurl) {
        if (window.__quizproctoringMediapipeTasksVision) {
            return Promise.resolve(window.__quizproctoringMediapipeTasksVision);
        }
        if (window.__quizproctoringMediapipeTasksVisionPromise) {
            return window.__quizproctoringMediapipeTasksVisionPromise;
        }

        const uid = 'qpmp_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
        const eventname = 'quizproctoring-mediapipe-ready-' + uid;
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent =
            'import * as mediapipe from "' + moduleurl + '";' +
            'window.__quizproctoringMediapipeTasksVision = mediapipe;' +
            'window.dispatchEvent(new CustomEvent("' + eventname + '"));';

        window.__quizproctoringMediapipeTasksVisionPromise = new Promise(function(resolve, reject) {
            const onready = function() {
                window.removeEventListener(eventname, onready);
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                if (window.__quizproctoringMediapipeTasksVision) {
                    resolve(window.__quizproctoringMediapipeTasksVision);
                } else {
                    reject(new Error('MediaPipe ESM loaded but exports were unavailable'));
                }
            };

            window.addEventListener(eventname, onready, {once: true});
            script.onerror = function() {
                window.removeEventListener(eventname, onready);
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                reject(new Error('Failed to load MediaPipe ESM module'));
            };
            document.head.appendChild(script);
        });

        return window.__quizproctoringMediapipeTasksVisionPromise;
    }

    /**
     * Preload MediaPipe Face Landmarker.
     *
     * @return {Promise<Object|null>}
     */
    function preloadModel() {
        if (!enabled) {
            return Promise.resolve(null);
        }
        if (landmarker) {
            return Promise.resolve(landmarker);
        }
        if (modelPromise) {
            return modelPromise;
        }

        const wasmBase = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' +
            MEDIAPIPE_VISION_VERSION + '/wasm';
        const moduleUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' +
            MEDIAPIPE_VISION_VERSION + '/+esm';
        const modelUrl = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/' +
            'face_landmarker.task';

        modelPromise = loadMediapipeModule(moduleUrl)
            .then(function(mediapipe) {
                const FilesetResolver = mediapipe.FilesetResolver;
                const FaceLandmarker = mediapipe.FaceLandmarker;
                if (!FilesetResolver || !FaceLandmarker) {
                    throw new Error('MediaPipe Face Landmarker library missing');
                }
                return FilesetResolver.forVisionTasks(wasmBase).then(function(vision) {
                    return FaceLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: modelUrl,
                            delegate: 'GPU',
                        },
                        runningMode: 'VIDEO',
                        numFaces: 1,
                        outputFaceBlendshapes: false,
                        outputFacialTransformationMatrixes: false,
                    });
                });
            })
            .then(function(instance) {
                landmarker = instance;
                // eslint-disable-next-line no-console
                console.info('[QuizProctoring][EyeTracking] Face Landmarker ready');
                return instance;
            })
            .catch(function(error) {
                modelPromise = null;
                // eslint-disable-next-line no-console
                console.error('[QuizProctoring][EyeTracking] Model preload failed:', error);
                return null;
            });

        return modelPromise;
    }

    /**
     * @alias module:quizaccess_quizproctoring/eye_tracking
     */
    return {
        /**
         * Inject callbacks from the camera/proctoring module.
         *
         * @param {Object} options configuration
         */
        configure: function(options) {
            config = Object.assign({}, config, options);
        },

        /**
         * Apply quiz eye-tracking settings.
         *
         * @param {number} enableeyecheckreal quiz setting (0/1)
         * @param {number|null|string} detectionval per-attempt eye check flag
         */
        initFromQuizSettings: function(enableeyecheckreal, detectionval) {
            enabled = Number(enableeyecheckreal) === 1;
            active = enabled &&
                (detectionval === null || detectionval === '' || Number(detectionval) !== 0);
        },

        /**
         * @return {boolean} whether eye tracking is enabled for this quiz
         */
        isEnabled: function() {
            return enabled;
        },

        /**
         * @return {boolean} whether tracking is currently active
         */
        isActive: function() {
            return active;
        },

        /**
         * Enable or disable tracking without losing runtime (teacher toggle).
         *
         * @param {boolean} isactive active state
         */
        setActive: function(isactive) {
            active = Boolean(isactive);
        },

        /**
         * @return {Object|null} last runtime context (for teacher re-enable)
         */
        getRuntime: function() {
            return runtime;
        },

        /**
         * Preload model after page load.
         */
        schedulePreload: function() {
            const start = function() {
                preloadModel();
            };
            if (document.readyState === 'complete') {
                start();
            } else {
                window.addEventListener('load', start, {once: true});
            }
        },

        /**
         * Bind eye-tracking disabled/enabled document events.
         */
        bindDocumentEvents: function() {
            $(document).off('eye-tracking-disabled.quizproctoring')
                .on('eye-tracking-disabled.quizproctoring', function() {
                    active = false;
                    stopTrackingLoop(true);
                }.bind(this));
            $(document).off('eye-tracking-enabled.quizproctoring')
                .on('eye-tracking-enabled.quizproctoring', function() {
                    if (!enabled) {
                        return;
                    }
                    resetFocusWarningCounters();
                    active = true;
                    const ctx = runtime;
                    if (ctx) {
                        this.start(ctx.cmid, ctx.attemptid, ctx.mainimage, ctx.videoEl, ctx.canvasEl);
                    }
                }.bind(this));
        },

        /**
         * Start continuous head-tilt tracking on a webcam stream.
         *
         * @param {number} cmid course module id
         * @param {number} attemptid attempt id
         * @param {boolean} mainimage main image mode
         * @param {HTMLVideoElement} videoEl video element
         * @param {HTMLCanvasElement} canvasEl canvas element
         */
        start: function(cmid, attemptid, mainimage, videoEl, canvasEl) {
            if (!active || !attemptid || mainimage || !videoEl || !canvasEl) {
                return;
            }
            stopTrackingLoop(false);
            resetFocusWarningCounters();
            lastProcessAt = 0;
            runtime = {
                cmid: cmid,
                attemptid: attemptid,
                mainimage: mainimage,
                videoEl: videoEl,
                canvasEl: canvasEl,
            };

            const tick = function() {
                if (!active || config.isTerminationInProgress() || !runtime) {
                    stopTrackingLoop(false);
                    return;
                }
                if (config.shouldSkipFrame()) {
                    rafId = requestAnimationFrame(tick);
                    return;
                }

                const now = performance.now();
                if ((now - lastProcessAt) >= EYE_TRACKING_PROCESS_INTERVAL_MS && landmarker) {
                    lastProcessAt = now;
                    processFrame(runtime, now);
                }
                rafId = requestAnimationFrame(tick);
            }.bind(this);

            preloadModel().then(function(instance) {
                if (instance && runtime) {
                    rafId = requestAnimationFrame(tick);
                    startTeacherStatePoll();
                }
            });
        },

        /**
         * Stop tracking immediately when teacher disables eye check (live proctoring).
         *
         * @param {boolean} markautodisable block restart until teacher re-enables
         */
        applyRemoteDisable: function(markautodisable) {
            deactivateEyeTrackingLocally(markautodisable);
        },

        /**
         * Record a successful "eyes not focused" warning (rolling 30 s window).
         *
         * @param {number} cmid course module id
         * @param {number} attemptid attempt id
         */
        recordFocusWarning: function(cmid, attemptid) {
            if (!enabled || autoDisableRequested) {
                return;
            }

            const now = Date.now();
            focusWarningTimestamps = focusWarningTimestamps.filter(function(timestamp) {
                return (now - timestamp) <= EYE_FOCUS_WARN_WINDOW_MS;
            });
            focusWarningTimestamps.push(now);

            if (focusWarningTimestamps.length >= EYE_FOCUS_WARN_MAX_COUNT) {
                requestAutoDisable(cmid, attemptid);
            }
        },

        /**
         * Stop the tracking loop.
         *
         * @param {boolean} preserveRuntime keep context for teacher re-enable
         */
        stop: function(preserveRuntime) {
            stopTrackingLoop(preserveRuntime);
        },
    };
});
