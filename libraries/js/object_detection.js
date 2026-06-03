/**
 * Object detection helper for quiz proctoring.
 *
 * @package    quizaccess_quizproctoring
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
(function(window) {
    const DEFAULT_CLASSES = ['cell phone', 'book'];
    const DEFAULT_WARNING_GAP_MS = 3000;

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
        const outputWidth = 280;
        const outputHeight = 240;
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
        let rafId = null;
        let runtime = null;
        const classes = (config && config.classes) || DEFAULT_CLASSES;
        const warningGapMs = (config && config.warningGapMs) || DEFAULT_WARNING_GAP_MS;

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
                    loadedModel.detect(img).then((predictions) => {
                        console.info('[QuizProctoring][coco] detections:', predictions.map((prediction) => ({
                            class: prediction.class,
                            score: Number(prediction.score || 0).toFixed(3),
                        })));

                        const matched = predictions.filter((prediction) => {
                            const label = (prediction.class || '').toLowerCase();
                            return classes.indexOf(label) !== -1 && prediction.score >= 0.4;
                        });
                        if (!matched.length) {
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
