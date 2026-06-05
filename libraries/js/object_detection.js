/**
 * Object detection helper for quiz proctoring.
 *
 * @package    quizaccess_quizproctoring
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
(function(window) {
    const DEFAULT_CLASS_THRESHOLDS = {
        'cell phone': 0.62,
        'book': 0.30,
    };
    const DEFAULT_DETECT_MIN_SCORE = 0.25;
    const DEFAULT_WARNING_GAP_MS = 3000;
    /** Consecutive frames required before a phone alert (reduces remote/tablet false positives). */
    const PHONE_CONFIRM_FRAMES = 3;
    /** Reject phone labels when the box is very wide (typical AC/TV remote shape). */
    const PHONE_MIN_ASPECT = 0.35;
    const PHONE_MAX_ASPECT = 1.05;
    const DETECTION_FRAME_WIDTH = 640;
    const DETECTION_FRAME_HEIGHT = 480;

    function loadExternalScript(src) {
        if (window.__quizproctoringLoadedScripts && window.__quizproctoringLoadedScripts[src]) {
            return Promise.resolve();
        }
        if (!window.__quizproctoringLoadedScripts) {
            window.__quizproctoringLoadedScripts = {};
        }

        return fetch(src, {mode: 'cors', credentials: 'omit'})
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch script: ${src}`);
                }
                return response.text();
            })
            .then((code) => {
                const previousDefine = window.define;
                window.define = undefined;
                try {
                    // eslint-disable-next-line no-eval
                    (0, eval)(code);
                } finally {
                    window.define = previousDefine;
                }
                window.__quizproctoringLoadedScripts[src] = true;
            });
    }

    function captureVideoFrameDataUrl(video, canvas) {
        if (!video || !canvas || video.readyState < 2) {
            return null;
        }
        const outputWidth = DETECTION_FRAME_WIDTH;
        const outputHeight = DETECTION_FRAME_HEIGHT;
        const targetRatio = outputWidth / outputHeight;
        const vw = video.videoWidth || video.clientWidth;
        const vh = video.videoHeight || video.clientHeight;
        if (!vw || !vh) {
            return null;
        }
        const videoRatio = vw / vh;
        let sx = 0;
        let sy = 0;
        let sw = vw;
        let sh = vh;
        if (videoRatio > targetRatio) {
            sh = vh;
            sw = vh * targetRatio;
            sx = (vw - sw) / 2;
        } else {
            sw = vw;
            sh = vw / targetRatio;
            sy = (vh - sh) / 2;
        }
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        canvas.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
        return canvas.toDataURL('image/png');
    }

    function create(config) {
        let enabled = false;
        let model = null;
        let modelPromise = null;
        let inFlight = false;
        let lastObjectDetectedReportAt = 0;
        let phoneConfirmStreak = 0;
        let rafId = null;
        let runtime = null;
        const classThresholds = (config && config.classThresholds) || DEFAULT_CLASS_THRESHOLDS;
        const detectMinScore = (config && config.detectMinScore) || DEFAULT_DETECT_MIN_SCORE;
        const warningGapMs = (config && config.warningGapMs) || DEFAULT_WARNING_GAP_MS;
        const phoneConfirmFrames = (config && config.phoneConfirmFrames) || PHONE_CONFIRM_FRAMES;

        /**
         * @param {Object} prediction COCO-SSD prediction
         * @return {number|null} width/height or null
         */
        function getBboxAspect(prediction) {
            const bbox = prediction.bbox;
            if (!bbox || bbox.length < 4) {
                return null;
            }
            const width = bbox[2];
            const height = bbox[3];
            if (!width || !height) {
                return null;
            }
            return width / height;
        }

        /**
         * @param {Object} prediction COCO-SSD prediction
         * @return {boolean}
         */
        function isBookMatch(prediction) {
            const label = (prediction.class || '').toLowerCase();
            if (label !== 'book') {
                return false;
            }
            const threshold = classThresholds.book;
            return threshold !== undefined && prediction.score >= threshold;
        }

        /**
         * Stricter phone matching: higher score, portrait-ish aspect (filters many remotes).
         *
         * @param {Object} prediction COCO-SSD prediction
         * @return {boolean}
         */
        function isPhoneMatch(prediction) {
            const label = (prediction.class || '').toLowerCase();
            if (label !== 'cell phone' && label !== 'mobile phone') {
                return false;
            }
            const threshold = classThresholds['cell phone'];
            if (threshold === undefined || prediction.score < threshold) {
                return false;
            }
            const aspect = getBboxAspect(prediction);
            if (aspect !== null && (aspect < PHONE_MIN_ASPECT || aspect > PHONE_MAX_ASPECT)) {
                return false;
            }
            return true;
        }

        /**
         * @param {Array<Object>} predictions COCO-SSD predictions
         * @return {{books: Array<Object>, phones: Array<Object>}}
         */
        function classifyMatches(predictions) {
            const books = [];
            const phones = [];
            predictions.forEach((prediction) => {
                if (isBookMatch(prediction)) {
                    books.push(prediction);
                } else if (isPhoneMatch(prediction)) {
                    phones.push(prediction);
                }
            });
            return {books: books, phones: phones};
        }

        function resetPhoneConfirmStreak() {
            phoneConfirmStreak = 0;
        }

        function preloadModel() {
            if (!enabled) {
                return Promise.resolve(null);
            }
            if (model) {
                return Promise.resolve(model);
            }
            if (modelPromise) {
                return modelPromise;
            }

            const preloadStartedAt = Date.now();
            console.info('[QuizProctoring][coco] Model preload started');

            modelPromise = loadExternalScript(
                'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'
            )
                .then(() => {
                    if (!window.tf) {
                        throw new Error('TensorFlow.js failed to load');
                    }
                    return loadExternalScript(
                        'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'
                    );
                })
                .then(() => {
                    const detector = window.cocoSsd || window.cocossd;
                    if (!detector || typeof detector.load !== 'function') {
                        throw new Error('Object detector library missing');
                    }
                    return detector.load({base: 'lite_mobilenet_v2'});
                })
                .then((loadedModel) => {
                    model = loadedModel;
                    const elapsed = Date.now() - preloadStartedAt;
                    if (elapsed > 5000) {
                        console.warn(`[QuizProctoring][coco] Model preloaded in ${elapsed}ms (target < 5000ms)`);
                    } else {
                        console.info(`[QuizProctoring][coco] Model preloaded in ${elapsed}ms`);
                    }
                    return loadedModel;
                })
                .catch((error) => {
                    modelPromise = null;
                    console.error('[QuizProctoring][coco] Model preload failed:', error);
                    return null;
                });

            return modelPromise;
        }

        function queueDetection(cmid, attemptid, mainimage, imageData) {
            if (!enabled || !attemptid || mainimage || !imageData || inFlight) {
                return;
            }
            inFlight = true;

            preloadModel().then((loadedModel) => {
                if (!loadedModel) {
                    inFlight = false;
                    return;
                }
                const img = new Image();
                img.onload = function() {
                    loadedModel.detect(img, 20, detectMinScore).then((predictions) => {
                        console.info('[QuizProctoring][coco] detections:', predictions.map((prediction) => ({
                            class: prediction.class,
                            score: Number(prediction.score || 0).toFixed(3),
                        })));

                        const {books, phones} = classifyMatches(predictions);
                        let shouldAlert = false;
                        let matched = [];

                        if (books.length) {
                            shouldAlert = true;
                            matched = matched.concat(books);
                            resetPhoneConfirmStreak();
                        } else if (phones.length) {
                            phoneConfirmStreak += 1;
                            if (phoneConfirmStreak >= phoneConfirmFrames) {
                                shouldAlert = true;
                                matched = phones;
                                resetPhoneConfirmStreak();
                            }
                        } else {
                            resetPhoneConfirmStreak();
                        }

                        if (!shouldAlert || !matched.length) {
                            return;
                        }
                        if ((Date.now() - lastObjectDetectedReportAt) < warningGapMs) {
                            return;
                        }
                        lastObjectDetectedReportAt = Date.now();
                        console.warn('[QuizProctoring][coco] Suspicious object(s) found:', matched);
                        config.realtimeDetection(cmid, attemptid, mainimage, 'objectsdetected', imageData);
                    }).catch((error) => {
                        console.error('[QuizProctoring][coco] Detection failed:', error);
                    }).finally(() => {
                        inFlight = false;
                    });
                };
                img.onerror = function() {
                    inFlight = false;
                };
                img.src = imageData;
            }).catch(() => {
                inFlight = false;
            });
        }

        function stop() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            runtime = null;
            resetPhoneConfirmStreak();
        }

        function start(cmid, attemptid, mainimage, videoEl, canvasEl) {
            if (!enabled || !attemptid || mainimage || !videoEl || !canvasEl) {
                return;
            }
            stop();
            runtime = {cmid: cmid, attemptid: attemptid, mainimage: mainimage, videoEl: videoEl, canvasEl: canvasEl};

            const tick = function() {
                if (!enabled || config.isQuizTerminating() || !runtime) {
                    stop();
                    return;
                }
                if (!(config.isMobileDevice() && document.visibilityState === 'hidden')) {
                    const imageData = captureVideoFrameDataUrl(runtime.videoEl, runtime.canvasEl);
                    if (imageData && !inFlight) {
                        queueDetection(runtime.cmid, runtime.attemptid, runtime.mainimage, imageData);
                    }
                }
                rafId = requestAnimationFrame(tick);
            };

            preloadModel().then(() => {
                if (runtime) {
                    rafId = requestAnimationFrame(tick);
                }
            });
        }

        function schedulePreload() {
            const begin = function() {
                preloadModel();
            };
            if (document.readyState === 'complete') {
                begin();
            } else {
                window.addEventListener('load', begin, {once: true});
            }
        }

        return {
            setEnabled: function(value) {
                enabled = !!value;
                if (!enabled) {
                    stop();
                }
            },
            start: start,
            stop: stop,
            schedulePreload: schedulePreload,
            preloadModel: preloadModel,
        };
    }

    window.quizproctoringObjectDetection = {
        create: create
    };
})(window);
