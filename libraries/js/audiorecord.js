(function () {
    /**
     * Proctoring audio recorder (readable source — not minified).
     *
     * Flow:
     * 1) useraudiorecord(stream, attemptid) — start mic monitoring
     * 2) isSpeechFrame() — decide if current audio is speech (4.2 standard logic)
     * 3) startRecording() / stopRecording() — MediaRecorder for speech segments only
     * 4) saveToIndexedDB() — store complete WebM blobs
     * 5) checkAndUploadChunks() / uploadMultipleBlobs() — POST to upload_audio.php
     * 6) submit/click handlers — flush upload before Next / Finish / navigation
     *
     * File loaded as: libraries/js/audiorecord.js (see lib.php $PAGE->requires->js)
     */
    let mediaRecorder;
    let audioChunks = [];
    let audioContext, analyser, source;
    let recordingStarted = false;
    let recordingStartedAt = 0;
    let silenceTimer = null;
    let recordingMaxTimer = null;
    let recordingSaved = false;
    let isUploading = false;
    let isHandlingUpload = false;
    let speechFrameCount = 0;
    let nonSpeechFrameCount = 0;
    let noiseFloor = 0.006;
    let speechConfidence = 0;
    let isCalibrating = true;
    let calibrationFrames = 0;
    let transientSuppressFrames = 0;
    let activityMonitorId = null;
    let currentAttemptId = null;
    let audioUnlockBound = false;
    let monitorStream = null;

    // Tunables copied from the standard Moodle 4.2 speech detector.
    const SPEECH = {
        frameIntervalMs: 100,
        minSpeechFramesToStart: 3,
        nonSpeechFramesToStop: 20,
        calibrationFrameCount: 3,
        energyThresholdRatio: 1.75,
        minRmsEnergy: 0.01,
        minStartRmsEnergy: 0.01,
        speechBandMinHz: 85,
        speechBandMaxHz: 3800,
        speechBandRatioThreshold: 0.35,
        minZeroCrossingRate: 0.006,
        maxZeroCrossingRate: 0.24,
        noiseFloorSmoothing: 0.96,
        speechConfidenceStartThreshold: 0.52,
        speechConfidenceKeepThreshold: 0.42,
        confidenceRise: 0.2,
        confidenceFall: 0.12,
        pitchMinHz: 85,
        pitchMaxHz: 300,
        voicedCorrelationThreshold: 0.34,
        unvoicedSpeechBandBoost: 0.1,
        transientEnergySpikeRatio: 2.6,
        transientMaxSpeechBandRatio: 0.32,
        transientMinZeroCrossingRate: 0.07,
        transientSuppressionFrames: 6,
        transientMinCrestFactor: 16,
        highPitchDetectMinHz: 400,
        highPitchDetectMaxHz: 4000,
        highPitchCorrelationThreshold: 0.28,
        unvoicedLowBandMinHz: 80,
        unvoicedLowBandMaxHz: 1200,
        minLowBandRatioForUnvoiced: 0.14,
        highFreqCutoffHz: 2200,
        maxHighFreqEnergyRatioForUnvoiced: 0.45,
        maxCrestFactorForUnvoiced: 21,
        maxSpeechBandPeakinessForUnvoiced: 14
    };

    const MIN_UPLOAD_DURATION_MS = 1000;
    const MIN_UPLOAD_BYTES = 1024;
    const dbName = 'audioRecordingsDB';
    const storeName = 'audioChunks';
    const ownerStorageKey = 'quizproctoring_audio_indexeddb_owner';
    const attemptStorageKey = 'audioAttemptId';
    let db;

    function getAttemptIdFromPage() {
        const fromInput = document.querySelector('input[name="attempt"]')?.value;
        if (fromInput) {
            return String(fromInput);
        }
        try {
            const fromProctor = localStorage.getItem('proctorlink_attemptid');
            if (fromProctor) {
                try {
                    return String(JSON.parse(fromProctor));
                } catch (e) {
                    return String(fromProctor);
                }
            }
        } catch (e) {
            // Ignore.
        }
        const fromStorage = localStorage.getItem(attemptStorageKey);
        return fromStorage ? String(fromStorage) : '';
    }

    function getQuizId() {
        const raw = localStorage.getItem('quizid');
        if (raw !== null && raw !== '') {
            try {
                const parsed = JSON.parse(raw);
                if (parsed != null && String(parsed) !== '') {
                    return String(parsed);
                }
            } catch (e) {
                const cleaned = String(raw).replace(/^"|"$/g, '');
                if (cleaned) {
                    return cleaned;
                }
            }
        }
        try {
            if (window.__proctorlinkQuizId) {
                return String(window.__proctorlinkQuizId);
            }
        } catch (e) {
            // Ignore.
        }
        return '';
    }

    function resolveAttemptId(attemptid) {
        if (attemptid) {
            return String(attemptid);
        }
        if (currentAttemptId) {
            return String(currentAttemptId);
        }
        const fromPage = getAttemptIdFromPage();
        if (fromPage) {
            return fromPage;
        }
        try {
            if (window.__proctorlinkAttemptId) {
                return String(window.__proctorlinkAttemptId);
            }
        } catch (e) {
            // Ignore.
        }
        return '';
    }

    /**
     * Apply attempt/quiz ids from the attempt shell before a final flush.
     *
     * @param {{attemptid?: string|number, quizid?: string|number}|null} meta
     * @return {void}
     */
    function applyFlushMeta(meta) {
        if (!meta || typeof meta !== 'object') {
            return;
        }
        if (meta.attemptid) {
            currentAttemptId = String(meta.attemptid);
            try {
                localStorage.setItem(attemptStorageKey, currentAttemptId);
                localStorage.setItem('proctorlink_attemptid', currentAttemptId);
            } catch (e) {
                // Ignore.
            }
        }
        if (meta.quizid) {
            try {
                localStorage.setItem('quizid', JSON.stringify(meta.quizid));
                window.__proctorlinkQuizId = String(meta.quizid);
            } catch (e) {
                // Ignore.
            }
        }
        if (meta.attemptid) {
            window.__proctorlinkAttemptId = String(meta.attemptid);
        }
    }

    /**
     * Owner key scopes IndexedDB rows to quiz+attempt (standard 4.2 behaviour).
     * @return {string|null}
     */
    function getOwnerKey() {
        const quizid = getQuizId();
        const attemptid = resolveAttemptId();
        return attemptid ? (quizid + '|' + attemptid) : null;
    }

    function openDB() {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = function (e) {
            db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { autoIncrement: true });
            }
        };
        request.onsuccess = function (e) {
            db = e.target.result;
            console.log('IndexedDB initialized');
            clearIndexedDbIfOwnerChanged();
            if (window.location.href.includes('/review.php') ||
                    window.location.href.includes('/summary.php')) {
                currentAttemptId = getAttemptIdFromPage();
                checkAndUploadChunks(true);
            }
        };
        request.onerror = function (e) {
            console.error('IndexedDB error:', e.target.errorCode);
        };
    }
    openDB();

    function clearIndexedDbIfOwnerChanged() {
        if (!db) {
            return;
        }
        const ownerKey = getOwnerKey();
        if (ownerKey === null) {
            return;
        }
        const previous = localStorage.getItem(ownerStorageKey);
        if (previous === ownerKey) {
            return;
        }
        if (previous === null || previous === '') {
            localStorage.setItem(ownerStorageKey, ownerKey);
            return;
        }
        const transaction = db.transaction([storeName], 'readwrite');
        transaction.objectStore(storeName).clear();
        transaction.oncomplete = function () {
            localStorage.setItem(ownerStorageKey, ownerKey);
            console.log('IndexedDB cleared — quiz attempt changed');
        };
    }

    function flushIndexedDB() {
        return new Promise((resolve) => {
            if (!db) {
                resolve();
                return;
            }
            const transaction = db.transaction([storeName], 'readwrite');
            transaction.objectStore(storeName).clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
        });
    }

    function flushIfNewAttempt(attemptid) {
        const nextAttemptId = String(attemptid || '');
        currentAttemptId = nextAttemptId;
        if (nextAttemptId) {
            localStorage.setItem(attemptStorageKey, nextAttemptId);
            try {
                localStorage.setItem('proctorlink_attemptid', nextAttemptId);
            } catch (e) {
                // Ignore.
            }
        }
        clearIndexedDbIfOwnerChanged();
        return Promise.resolve();
    }

    /**
     * True on Safari (Mac/iOS). Chrome/Edge/Firefox must not match.
     *
     * @return {boolean}
     */
    function isSafariBrowser() {
        const ua = navigator.userAgent || '';
        return /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox|CriOS|FxiOS/i.test(ua);
    }

    /**
     * Safari, iOS Chrome, and iPadOS (including desktop-mode iPad).
     *
     * @return {boolean}
     */
    function isAppleWebKit() {
        const ua = navigator.userAgent || '';
        if (/iPhone|iPad|iPod/i.test(ua) || /FxiOS/i.test(ua) || /CriOS/i.test(ua)) {
            return true;
        }
        if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
            return true;
        }
        return isSafariBrowser();
    }

    /**
     * Desktop Mac (Safari, Chrome, Firefox). Not iPhone/iPad.
     *
     * @return {boolean}
     */
    function isMacDesktop() {
        const ua = navigator.userAgent || '';
        if (/iPhone|iPad|iPod/i.test(ua)) {
            return false;
        }
        if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
            return false;
        }
        return /Macintosh|Mac OS X/i.test(ua);
    }

    /**
     * @return {boolean}
     */
    function isMobileBrowser() {
        const ua = navigator.userAgent || '';
        return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    /**
     * Browsers keep AudioContext "suspended" until resume() — analyser then sees
     * silence and MediaRecorder never starts. Also unlock from the quiz iframe.
     *
     * @return {void}
     */
    function bindSafariAudioUnlock() {
        if (audioUnlockBound) {
            return;
        }
        audioUnlockBound = true;
        const unlock = function() {
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().catch(function() {
                    return null;
                });
            }
        };
        ['click', 'pointerdown', 'touchstart', 'touchend', 'keydown'].forEach(function(evt) {
            document.addEventListener(evt, unlock, {passive: true, capture: true});
            window.addEventListener(evt, unlock, {passive: true, capture: true});
        });
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                unlock();
            }
        });
        const bindIframeUnlock = function() {
            try {
                const iframe = document.querySelector('iframe[name="proctorlink-quiz-in-if"]') ||
                    document.getElementById('proctorlink-quiz-in-if');
                if (!iframe || !iframe.contentDocument || iframe.dataset.proctorlinkAudioUnlock === '1') {
                    return;
                }
                ['click', 'pointerdown', 'touchstart', 'touchend', 'keydown'].forEach(function(evt) {
                    iframe.contentDocument.addEventListener(evt, unlock, true);
                });
                iframe.dataset.proctorlinkAudioUnlock = '1';
            } catch (e) {
                // Cross-origin or not ready.
            }
        };
        bindIframeUnlock();
        window.setInterval(bindIframeUnlock, 2000);
    }

    /**
     * @return {AudioContext}
     */
    function ensureLiveAudioContext() {
        if (!audioContext || audioContext.state === 'closed') {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(function() {
                return null;
            });
        }
        return audioContext;
    }

    /**
     * @param {MediaStream|null} stream
     * @return {boolean}
     */
    function streamHasLiveAudio(stream) {
        if (!stream || typeof stream.getAudioTracks !== 'function') {
            return false;
        }
        return stream.getAudioTracks().some(function(track) {
            return track && track.readyState !== 'ended';
        });
    }

    /**
     * Clone the mic stream for Web Audio so Safari/Chrome MediaRecorder is not silenced.
     * Firefox clones often have no live audio tracks — use the original there.
     *
     * @param {MediaStream} stream
     * @return {MediaStream}
     */
    function cloneStreamForMonitor(stream) {
        const ua = navigator.userAgent || '';
        if (/Firefox|FxiOS/i.test(ua) || !stream || typeof stream.clone !== 'function') {
            return stream;
        }
        try {
            const cloned = stream.clone();
            if (streamHasLiveAudio(cloned)) {
                return cloned;
            }
            cloned.getTracks().forEach(function(track) {
                try {
                    track.stop();
                } catch (e) {
                    // Ignore.
                }
            });
        } catch (e) {
            // Ignore.
        }
        return stream;
    }

    function rmsEnergy(samples) {
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
        }
        return Math.sqrt(sum / samples.length);
    }

    function zeroCrossingRate(samples) {
        let crossings = 0;
        for (let i = 1; i < samples.length; i++) {
            if ((samples[i - 1] >= 0 && samples[i] < 0) ||
                    (samples[i - 1] < 0 && samples[i] >= 0)) {
                crossings++;
            }
        }
        return crossings / samples.length;
    }

    function bandRatio(freqData, sampleRate, minHz, maxHz) {
        const binHz = sampleRate / 2 / freqData.length;
        let band = 0;
        let total = 0;
        for (let i = 0; i < freqData.length; i++) {
            const hz = i * binHz;
            const value = freqData[i];
            total += value;
            if (hz >= minHz && hz <= maxHz) {
                band += value;
            }
        }
        return total === 0 ? 0 : band / total;
    }

    function highFreqEnergyRatio(freqData, sampleRate, cutoffHz) {
        const binHz = sampleRate / 2 / freqData.length;
        let high = 0;
        let total = 0;
        for (let i = 0; i < freqData.length; i++) {
            const hz = i * binHz;
            const value = freqData[i];
            total += value;
            if (hz >= cutoffHz) {
                high += value;
            }
        }
        return total > 0 ? high / total : 0;
    }

    function speechBandPeakiness(freqData, sampleRate) {
        const binHz = sampleRate / 2 / freqData.length;
        let peak = 0;
        let sum = 0;
        let count = 0;
        for (let i = 0; i < freqData.length; i++) {
            const hz = i * binHz;
            if (hz >= SPEECH.speechBandMinHz && hz <= SPEECH.speechBandMaxHz) {
                const value = freqData[i];
                if (value > peak) {
                    peak = value;
                }
                sum += value;
                count++;
            }
        }
        if (!count) {
            return 0;
        }
        const avg = sum / count;
        return avg > 0 ? peak / avg : 0;
    }

    function crestFactor(samples) {
        let peak = 0;
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            const abs = Math.abs(samples[i]);
            if (abs > peak) {
                peak = abs;
            }
            sum += samples[i] * samples[i];
        }
        const rms = Math.sqrt(sum / samples.length);
        return rms > 1e-9 ? peak / rms : 0;
    }

    function detectVoicedPitch(samples, sampleRate) {
        const minLag = Math.floor(sampleRate / SPEECH.pitchMaxHz);
        const maxLag = Math.floor(sampleRate / SPEECH.pitchMinHz);
        let bestLag = -1;
        let bestCorr = 0;
        for (let lag = minLag; lag <= maxLag; lag++) {
            let dot = 0;
            let energyA = 0;
            let energyB = 0;
            const limit = samples.length - lag;
            for (let i = 0; i < limit; i++) {
                const a = samples[i];
                const b = samples[i + lag];
                dot += a * b;
                energyA += a * a;
                energyB += b * b;
            }
            const denom = Math.sqrt(energyA * energyB);
            if (denom > 0) {
                const corr = dot / denom;
                if (corr > bestCorr) {
                    bestCorr = corr;
                    bestLag = lag;
                }
            }
        }
        if (bestLag <= 0) {
            return {isVoiced: false};
        }
        const pitch = sampleRate / bestLag;
        return {
            isVoiced: bestCorr >= SPEECH.voicedCorrelationThreshold &&
                pitch >= SPEECH.pitchMinHz && pitch <= SPEECH.pitchMaxHz
        };
    }

    function detectHighPitch(samples, sampleRate) {
        const minLag = Math.max(2, Math.floor(sampleRate / SPEECH.highPitchDetectMaxHz));
        const maxLag = Math.floor(sampleRate / SPEECH.highPitchDetectMinHz);
        let bestCorr = 0;
        for (let lag = minLag; lag <= maxLag; lag++) {
            let dot = 0;
            let energyA = 0;
            let energyB = 0;
            const limit = samples.length - lag;
            for (let i = 0; i < limit; i++) {
                const a = samples[i];
                const b = samples[i + lag];
                dot += a * b;
                energyA += a * a;
                energyB += b * b;
            }
            const denom = Math.sqrt(energyA * energyB);
            if (denom > 0) {
                const corr = dot / denom;
                if (corr > bestCorr) {
                    bestCorr = corr;
                }
            }
        }
        return bestCorr >= SPEECH.highPitchCorrelationThreshold;
    }

    /**
     * Return true when the current audio frame should count as speech.
     * @param {Float32Array} timeData
     * @param {Uint8Array} freqData
     * @return {boolean}
     */
    function isSpeechFrame(timeData, freqData) {
        const energy = rmsEnergy(timeData);
        const zcr = zeroCrossingRate(timeData);
        const speechRatio = bandRatio(
            freqData, audioContext.sampleRate, SPEECH.speechBandMinHz, SPEECH.speechBandMaxHz
        );
        const lowBandRatio = bandRatio(
            freqData, audioContext.sampleRate, SPEECH.unvoicedLowBandMinHz, SPEECH.unvoicedLowBandMaxHz
        );
        const voiced = detectVoicedPitch(timeData, audioContext.sampleRate);
        const highPitch = detectHighPitch(timeData, audioContext.sampleRate);
        const crest = crestFactor(timeData);
        const highFreqRatio = highFreqEnergyRatio(
            freqData, audioContext.sampleRate, SPEECH.highFreqCutoffHz
        );
        const peakiness = speechBandPeakiness(freqData, audioContext.sampleRate);
        const dynamicFloor = Math.max(SPEECH.minRmsEnergy, noiseFloor * SPEECH.energyThresholdRatio);

        if (isCalibrating) {
            noiseFloor = noiseFloor * SPEECH.noiseFloorSmoothing +
                energy * (1 - SPEECH.noiseFloorSmoothing);
            calibrationFrames++;
            if (calibrationFrames >= SPEECH.calibrationFrameCount) {
                isCalibrating = false;
                console.log('Audio baseline calibrated');
            }
            return false;
        }

        const energyScore = Math.max(0, Math.min(1, energy / (1.8 * dynamicFloor)));
        const bandScore = Math.max(0, Math.min(1, speechRatio / SPEECH.speechBandRatioThreshold));
        const zcrOk = zcr >= SPEECH.minZeroCrossingRate && zcr <= SPEECH.maxZeroCrossingRate;
        let confidence = (0.35 * energyScore) +
            (0.3 * bandScore) +
            (0.1 * (zcrOk ? 1 : 0.35)) +
            (0.25 * (voiced.isVoiced ? 1 : 0.2));

        const startEnergyOk = energy >= Math.max(SPEECH.minStartRmsEnergy, 1.15 * dynamicFloor);
        const unvoicedSpeech = !highPitch &&
            speechRatio >= (SPEECH.speechBandRatioThreshold + SPEECH.unvoicedSpeechBandBoost) &&
            zcrOk &&
            energyScore >= 0.58 &&
            lowBandRatio >= SPEECH.minLowBandRatioForUnvoiced &&
            crest <= SPEECH.maxCrestFactorForUnvoiced &&
            highFreqRatio <= SPEECH.maxHighFreqEnergyRatioForUnvoiced &&
            peakiness <= SPEECH.maxSpeechBandPeakinessForUnvoiced;
        const safariSpeech = isAppleWebKit() &&
            energy >= Math.max(0.008, 1.2 * dynamicFloor) &&
            speechRatio >= 0.25 &&
            zcr <= SPEECH.maxZeroCrossingRate;
        const macSpeech = isMacDesktop() &&
            energy >= Math.max(0.008, 1.2 * dynamicFloor) &&
            speechRatio >= 0.22 &&
            zcr <= SPEECH.maxZeroCrossingRate;
        const mobileSpeech = isMobileBrowser() &&
            energy >= Math.max(0.006, 1.1 * dynamicFloor) &&
            speechRatio >= 0.2 &&
            zcr <= SPEECH.maxZeroCrossingRate;
        const speechLike = voiced.isVoiced || unvoicedSpeech || safariSpeech || macSpeech || mobileSpeech;

        const transientLike = !recordingStarted && !voiced.isVoiced &&
            crest >= SPEECH.transientMinCrestFactor &&
            energy >= (1.25 * dynamicFloor);
        const transientSpike = !recordingStarted && !voiced.isVoiced &&
            (transientLike ||
                (energy >= dynamicFloor * SPEECH.transientEnergySpikeRatio &&
                    speechRatio <= SPEECH.transientMaxSpeechBandRatio &&
                    zcr >= SPEECH.transientMinZeroCrossingRate));

        if (transientSpike) {
            transientSuppressFrames = SPEECH.transientSuppressionFrames;
            speechConfidence = Math.max(0, speechConfidence - (2 * SPEECH.confidenceFall));
            noiseFloor = noiseFloor * SPEECH.noiseFloorSmoothing +
                energy * (1 - SPEECH.noiseFloorSmoothing);
            return false;
        }

        if (!recordingStarted && transientSuppressFrames > 0) {
            transientSuppressFrames--;
            speechConfidence = Math.max(0, speechConfidence - SPEECH.confidenceFall);
            return false;
        }

        if (confidence >= SPEECH.speechConfidenceKeepThreshold && speechLike) {
            speechConfidence = Math.min(1, speechConfidence + SPEECH.confidenceRise);
        } else {
            speechConfidence = Math.max(0, speechConfidence - SPEECH.confidenceFall);
        }

        const isSpeech = recordingStarted
            ? speechConfidence >= SPEECH.speechConfidenceKeepThreshold
            : (speechConfidence >= SPEECH.speechConfidenceStartThreshold && startEnergyOk && speechLike);

        if (!isSpeech) {
            noiseFloor = noiseFloor * SPEECH.noiseFloorSmoothing +
                energy * (1 - SPEECH.noiseFloorSmoothing);
        }
        return isSpeech;
    }

    function useraudiorecord(stream, attemptid) {
        if (stream && typeof stream.getAudioTracks === 'function') {
            stream.getAudioTracks().forEach(function(track) {
                if (track) {
                    track.enabled = true;
                }
            });
        }
        if (!streamHasLiveAudio(stream)) {
            console.warn('No live audio tracks — skipping audio monitoring');
            return false;
        }
        console.log('Audio monitoring started');
        const resolvedAttemptId = resolveAttemptId(attemptid);
        bindSafariAudioUnlock();

        const startMonitoring = function () {
            if (!streamHasLiveAudio(stream)) {
                console.warn('No live audio tracks — skipping audio monitoring');
                return;
            }
            if (activityMonitorId) {
                clearInterval(activityMonitorId);
                activityMonitorId = null;
            }

            // Reset detector state for this attempt.
            speechFrameCount = 0;
            nonSpeechFrameCount = 0;
            noiseFloor = 0.006;
            speechConfidence = 0;
            isCalibrating = true;
            calibrationFrames = 0;
            transientSuppressFrames = 0;

            if (source) {
                try {
                    source.disconnect();
                } catch (e) {
                    // Ignore.
                }
            }
            if (monitorStream && monitorStream !== stream) {
                try {
                    monitorStream.getTracks().forEach(function(track) {
                        track.stop();
                    });
                } catch (e) {
                    // Ignore.
                }
            }

            ensureLiveAudioContext();
            analyser = audioContext.createAnalyser();
            monitorStream = cloneStreamForMonitor(stream);
            if (!streamHasLiveAudio(monitorStream)) {
                monitorStream = stream;
            }
            try {
                source = audioContext.createMediaStreamSource(monitorStream);
            } catch (err) {
                console.warn('Audio monitoring not started:', err);
                return;
            }
            source.connect(analyser);
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;

            const freqData = new Uint8Array(analyser.frequencyBinCount);
            const timeData = new Float32Array(analyser.fftSize);
            const timeBytes = new Uint8Array(analyser.fftSize);
            let suspendedSilentFrames = 0;

            activityMonitorId = setInterval(function () {
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume().catch(function() {
                        return null;
                    });
                    suspendedSilentFrames += 1;
                    // First Mac attempt often has no user gesture yet, so the
                    // analyser stays silent. MediaRecorder can still capture the mic.
                    if (!recordingStarted && suspendedSilentFrames >= 10 &&
                            streamHasLiveAudio(stream)) {
                        startRecording(stream);
                    }
                    return;
                }
                suspendedSilentFrames = 0;

                if (typeof analyser.getFloatTimeDomainData === 'function') {
                    analyser.getFloatTimeDomainData(timeData);
                } else {
                    analyser.getByteTimeDomainData(timeBytes);
                    for (let i = 0; i < timeBytes.length; i++) {
                        timeData[i] = (timeBytes[i] - 128) / 128;
                    }
                }
                analyser.getByteFrequencyData(freqData);

                if (isSpeechFrame(timeData, freqData)) {
                    speechFrameCount++;
                    nonSpeechFrameCount = 0;
                    if (!recordingStarted && speechFrameCount >= SPEECH.minSpeechFramesToStart) {
                        console.log('Speech detected — starting recording');
                        startRecording(stream);
                    }
                    if (recordingStarted && silenceTimer) {
                        clearTimeout(silenceTimer);
                        silenceTimer = null;
                    }
                } else {
                    nonSpeechFrameCount++;
                    speechFrameCount = 0;
                    if (recordingStarted &&
                            nonSpeechFrameCount >= SPEECH.nonSpeechFramesToStop &&
                            !silenceTimer) {
                        silenceTimer = setTimeout(function () {
                            console.log('No speech detected — stopping recording');
                            stopRecording();
                        }, 0);
                    }
                }
            }, SPEECH.frameIntervalMs);
        };

        // Open the analyser immediately so Safari resume() is closer to camera grant.
        try {
            ensureLiveAudioContext();
        } catch (e) {
            // Ignore — startMonitoring will retry.
        }

        const ready = db ? Promise.resolve() : new Promise((resolve) => {
            const wait = setInterval(() => {
                if (db) {
                    clearInterval(wait);
                    resolve();
                }
            }, 50);
        });

        ready.then(() => flushIfNewAttempt(resolvedAttemptId)).then(startMonitoring).catch(function(err) {
            console.warn('Audio monitoring failed:', err);
        });
        return true;
    }

    // Safari/iOS need mp4; Android Chrome/Firefox need webm.
    const APPLE_MIME_TYPES = [
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/aac',
        'audio/webm;codecs=opus',
        'audio/webm'
    ];
    const OTHER_MIME_TYPES = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/aac'
    ];

    /**
     * @return {string}
     */
    function getRecordingMime() {
        if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
            return '';
        }
        const list = isAppleWebKit() ? APPLE_MIME_TYPES : OTHER_MIME_TYPES;
        const found = list.find(function(type) {
            try {
                return MediaRecorder.isTypeSupported(type);
            } catch (e) {
                return false;
            }
        });
        return found || '';
    }

    /**
     * @param {string} mime
     * @return {string}
     */
    function getRecordingExt(mime) {
        const t = mime || '';
        if (t.indexOf('mp4') !== -1 || t.indexOf('aac') !== -1 || t.indexOf('m4a') !== -1) {
            return '.m4a';
        }
        if (isAppleWebKit() && t.indexOf('webm') === -1) {
            return '.m4a';
        }
        return '.webm';
    }

    const RECORDING_MIME = getRecordingMime();
    const RECORDING_EXT = getRecordingExt(RECORDING_MIME);

    /**
     * Build an audio-only stream Safari MediaRecorder can actually encode.
     *
     * @param {MediaStream} stream
     * @return {MediaStream|null}
     */
    function getAudioOnlyStream(stream) {
        if (!stream) {
            return null;
        }
        const audioTracks = stream.getAudioTracks().filter(function(track) {
            return track && track.readyState === 'live';
        });
        if (!audioTracks.length) {
            return null;
        }
        try {
            return new MediaStream(audioTracks.map(function(track) {
                return typeof track.clone === 'function' ? track.clone() : track;
            }));
        } catch (e) {
            try {
                return new MediaStream(audioTracks);
            } catch (err) {
                return stream;
            }
        }
    }

    /**
     * @param {MediaStream} audioStream
     * @return {MediaRecorder|null}
     */
    function createAudioRecorder(audioStream) {
        const mime = getRecordingMime();
        const attempts = [];
        if (mime) {
            attempts.push({mimeType: mime});
        }
        attempts.push({});
        for (let i = 0; i < attempts.length; i++) {
            try {
                return new MediaRecorder(audioStream, attempts[i]);
            } catch (err) {
                // Try next option.
            }
        }
        return null;
    }

    function startRecording(stream) {
        const audioStream = getAudioOnlyStream(stream);
        if (!audioStream || !audioStream.getAudioTracks().length) {
            console.warn('No audio tracks available for recording');
            return;
        }
        if (typeof MediaRecorder === 'undefined') {
            console.error('MediaRecorder is not supported in this browser');
            return;
        }
        try {
            mediaRecorder = createAudioRecorder(audioStream);
        } catch (err) {
            console.error('MediaRecorder init failed:', err);
            return;
        }
        if (!mediaRecorder) {
            console.error('MediaRecorder init failed: no supported encoder');
            return;
        }

        audioChunks = [];
        recordingSaved = false;
        recordingStarted = true;
        recordingStartedAt = 0;

        // No timeslice — one complete WebM (EBML header) per speech segment (standard behaviour).
        mediaRecorder.ondataavailable = function (e) {
            if (e.data && e.data.size > 0) {
                audioChunks.push({
                    blob: e.data,
                    timestamp: Math.floor(Date.now() / 1000),
                    attemptid: resolveAttemptId(),
                    ownerKey: getOwnerKey() || '',
                    durationMs: getRecordingDurationMs()
                });
            }
        };

        mediaRecorder.onstop = function () {
            const persist = function() {
                if (!recordingSaved) {
                    persistRecordedChunks(audioChunks);
                    recordingSaved = true;
                    audioChunks = [];
                }
                recordingStarted = false;
                recordingStartedAt = 0;
                silenceTimer = null;
                clearTimeout(recordingMaxTimer);
            };
            // Safari/Mac often fire onstop before the final dataavailable blob.
            setTimeout(persist, (isAppleWebKit() || isMacDesktop()) ? 300 : 0);
        };

        mediaRecorder.onerror = function (e) {
            console.error('MediaRecorder error:', e.error || e);
            recordingStarted = false;
        };

        try {
            mediaRecorder.start();
            recordingStartedAt = Date.now();
        } catch (err) {
            console.error('MediaRecorder start failed:', err);
            recordingStarted = false;
            mediaRecorder = null;
            return;
        }
        recordingMaxTimer = setTimeout(function () {
            console.log('Max duration reached — stopping recording');
            stopRecording();
        }, 60000);
    }

    /**
     * Wall-clock length of the current MediaRecorder segment.
     *
     * @return {number}
     */
    function getRecordingDurationMs() {
        if (!recordingStartedAt) {
            return 0;
        }
        return Date.now() - recordingStartedAt;
    }

    /**
     * Join MediaRecorder blobs from one speech segment into a single playable file.
     * Continuation clusters without an EBML/ftyp header cannot play on their own.
     *
     * @param {Array} chunks
     * @return {Blob|null}
     */
    function mergeRecordingBlobs(chunks) {
        const blobs = [];
        (chunks || []).forEach(function(chunk) {
            if (chunk && chunk.blob && chunk.blob.size > 0) {
                blobs.push(chunk.blob);
            }
        });
        if (!blobs.length) {
            return null;
        }
        if (blobs.length === 1) {
            return blobs[0];
        }
        const type = blobs[0].type || RECORDING_MIME || 'audio/webm';
        return new Blob(blobs, {type: type});
    }

    /**
     * True when the blob starts with WebM EBML, Ogg, or MP4 ftyp.
     *
     * @param {Blob} blob
     * @return {Promise<boolean>}
     */
    function blobHasPlayableHeader(blob) {
        if (!blob || blob.size < 8) {
            return Promise.resolve(false);
        }
        return blob.slice(0, 8).arrayBuffer().then(function(buf) {
            const bytes = new Uint8Array(buf);
            if (bytes.length >= 4 &&
                    bytes[0] === 0x1A && bytes[1] === 0x45 &&
                    bytes[2] === 0xDF && bytes[3] === 0xA3) {
                return true;
            }
            if (bytes.length >= 4 &&
                    bytes[0] === 0x4F && bytes[1] === 0x67 &&
                    bytes[2] === 0x67 && bytes[3] === 0x53) {
                return true;
            }
            return bytes.length >= 8 &&
                bytes[4] === 0x66 && bytes[5] === 0x74 &&
                bytes[6] === 0x79 && bytes[7] === 0x70;
        }).catch(function() {
            return false;
        });
    }

    /**
     * Save one complete speech segment of at least 1 second. Fragments are dropped.
     *
     * @param {Array} chunks
     * @return {Promise}
     */
    function persistRecordedChunks(chunks) {
        const durationMs = getRecordingDurationMs();
        if (durationMs < MIN_UPLOAD_DURATION_MS) {
            return Promise.resolve();
        }
        const merged = mergeRecordingBlobs(chunks);
        if (!merged || merged.size < MIN_UPLOAD_BYTES) {
            return Promise.resolve();
        }
        const first = (chunks || []).find(function(chunk) {
            return chunk && chunk.blob;
        }) || {};
        return blobHasPlayableHeader(merged).then(function(playable) {
            if (!playable) {
                return null;
            }
            return saveToIndexedDB(
                merged,
                first.timestamp || Math.floor(Date.now() / 1000),
                first.attemptid,
                first.ownerKey
            );
        });
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    }

    /**
     * Convert a MediaRecorder Blob into a structured-cloneable ArrayBuffer.
     * Safari throws DataCloneError ("BlobURLs are not yet supported") if the
     * live recorder Blob is stored in IndexedDB directly.
     *
     * @param {Blob} blob
     * @return {Promise<ArrayBuffer|null>}
     */
    function blobToArrayBuffer(blob) {
        if (!blob || !blob.size) {
            return Promise.resolve(null);
        }
        if (typeof blob.arrayBuffer === 'function') {
            return blob.arrayBuffer().catch(function() {
                return readBlobViaFileReader(blob);
            });
        }
        return readBlobViaFileReader(blob);
    }

    /**
     * @param {Blob} blob
     * @return {Promise<ArrayBuffer>}
     */
    function readBlobViaFileReader(blob) {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onload = function() {
                resolve(reader.result);
            };
            reader.onerror = function() {
                reject(reader.error || new Error('Failed to read audio blob'));
            };
            reader.readAsArrayBuffer(blob);
        });
    }

    /**
     * Rebuild an uploadable Blob from an IndexedDB row.
     *
     * @param {Object} chunk
     * @return {Blob|null}
     */
    function chunkToUploadBlob(chunk) {
        if (!chunk) {
            return null;
        }
        if (chunk.blob instanceof Blob && chunk.blob.size > 0) {
            return chunk.blob;
        }
        const buffer = chunk.buffer;
        if (buffer instanceof ArrayBuffer && buffer.byteLength > 0) {
            return new Blob([buffer], {type: chunk.mimeType || RECORDING_MIME || 'audio/mp4'});
        }
        if (buffer && buffer.buffer instanceof ArrayBuffer && buffer.byteLength > 0) {
            return new Blob([buffer], {type: chunk.mimeType || RECORDING_MIME || 'audio/mp4'});
        }
        return null;
    }

    function saveToIndexedDB(blob, timestamp, attemptid, ownerKey) {
        const fallbackUpload = function() {
            return uploadMultipleBlobs([{
                blob: blob,
                mimeType: (blob && blob.type) ? blob.type : (RECORDING_MIME || ''),
                timestamp: timestamp,
                attemptid: resolveAttemptId(attemptid),
                ownerKey: ownerKey || getOwnerKey() || ''
            }], false);
        };
        return blobToArrayBuffer(blob).then(function(buffer) {
            if (!db || !buffer) {
                return fallbackUpload();
            }
            clearIndexedDbIfOwnerChanged();
            return new Promise(function(resolve) {
                const transaction = db.transaction([storeName], 'readwrite');
                const request = transaction.objectStore(storeName).add({
                    buffer: buffer,
                    mimeType: (blob && blob.type) ? blob.type : (RECORDING_MIME || ''),
                    timestamp: timestamp,
                    attemptid: resolveAttemptId(attemptid),
                    ownerKey: ownerKey || getOwnerKey() || ''
                });
                request.onerror = function(e) {
                    console.error('IndexedDB error:', e.target.error);
                    fallbackUpload().then(function() {
                        resolve();
                    }).catch(function() {
                        resolve();
                    });
                };
                transaction.oncomplete = function() {
                    console.log('Audio chunk with timestamp saved to IndexedDB');
                    checkAndUploadChunks(false);
                    resolve();
                };
                transaction.onerror = function(e) {
                    console.error('IndexedDB error:', e.target.error);
                    fallbackUpload().then(function() {
                        resolve();
                    }).catch(function() {
                        resolve();
                    });
                };
            });
        }).catch(function(err) {
            console.error('IndexedDB error:', err);
            return fallbackUpload();
        });
    }

    function filterChunksForCurrentOwner(allChunks) {
        const ownerKey = getOwnerKey();
        if (!ownerKey) {
            return allChunks || [];
        }
        return (allChunks || []).filter(function (chunk) {
            if (!chunk) {
                return false;
            }
            if (chunk.ownerKey) {
                return String(chunk.ownerKey) === String(ownerKey);
            }
            // Legacy rows keyed only by attemptid.
            return chunk.attemptid && String(chunk.attemptid) === String(resolveAttemptId());
        });
    }

    /**
     * Upload IndexedDB chunks (moodle5 logic): batch at 5+, or all on force flush.
     * Scoped to current quiz|attempt ownerKey.
     *
     * @param {boolean} [forceUpload]
     * @param {boolean} [keepAlive]
     * @return {Promise}
     */
    function checkAndUploadChunks(forceUpload = false, keepAlive = false) {
        if (!db) {
            return Promise.resolve();
        }
        if (isUploading) {
            return new Promise(function(resolve) {
                var waited = 0;
                var timer = setInterval(function() {
                    waited += 50;
                    if (!isUploading || waited >= 8000) {
                        clearInterval(timer);
                        if (isUploading) {
                            resolve();
                            return;
                        }
                        checkAndUploadChunks(forceUpload, keepAlive).then(resolve).catch(function() {
                            resolve();
                        });
                    }
                }, 50);
            });
        }
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const request = transaction.objectStore(storeName).getAll();

            request.onsuccess = function () {
                const chunks = filterChunksForCurrentOwner(request.result);
                if (chunks.length >= 5 || (forceUpload && chunks.length > 0)) {
                    console.log('Uploading ' + chunks.length + ' chunks from IndexedDB');
                    uploadMultipleBlobs(chunks, keepAlive)
                        .then(resolve)
                        .catch(function() {
                            // moodle5: upload errors must not block shell / submit.
                            resolve();
                        });
                } else {
                    resolve();
                }
            };
            request.onerror = function () {
                reject(new Error('Failed to read from IndexedDB'));
            };
        });
    }

    /**
     * POST chunks to upload_audio.php (aligned with moodle5 audiorecord).
     * keepalive is skipped when body > ~60KB (Chromium hard limit).
     *
     * @param {Array} chunks
     * @param {boolean} [keepAlive]
     * @return {Promise}
     */
    function uploadMultipleBlobs(chunks, keepAlive = false) {
        if (isUploading || chunks.length === 0) {
            return Promise.resolve();
        }
        isUploading = true;

        const formData = new FormData();
        let resolvedAttemptId = resolveAttemptId();
        let quizid = getQuizId();
        const timestamps = [];

        // Recover ids from chunk ownerKey (quizid|attemptid) when storage is empty.
        if ((!resolvedAttemptId || !quizid) && chunks[0] && chunks[0].ownerKey) {
            const parts = String(chunks[0].ownerKey).split('|');
            if (parts.length === 2) {
                if (!quizid && parts[0]) {
                    quizid = parts[0];
                }
                if (!resolvedAttemptId && parts[1]) {
                    resolvedAttemptId = parts[1];
                }
            }
        }
        if (!resolvedAttemptId && chunks[0] && chunks[0].attemptid) {
            resolvedAttemptId = String(chunks[0].attemptid);
        }

        if (!resolvedAttemptId || !quizid) {
            console.warn('Missing attemptid/quizid — keeping IndexedDB chunks for a later flush');
            isUploading = false;
            return Promise.resolve(null);
        }

        let uploadIndex = 0;
        chunks.forEach((chunk) => {
            const audioBlob = chunkToUploadBlob(chunk);
            if (!audioBlob || audioBlob.size < MIN_UPLOAD_BYTES) {
                return;
            }
            const chunkExt = getRecordingExt(audioBlob.type || (chunk.mimeType || RECORDING_MIME));
            formData.append('audio' + uploadIndex, audioBlob, 'audio' + uploadIndex + chunkExt);
            timestamps.push(chunk.timestamp);
            uploadIndex += 1;
        });

        if (!timestamps.length) {
            isUploading = false;
            return Promise.resolve(null);
        }

        formData.append('attemptid', resolvedAttemptId);
        formData.append('quizid', quizid);
        formData.append('timestamps', JSON.stringify(timestamps));
        formData.append('sesskey', M.cfg.sesskey);

        const uploadUrl = M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/upload_audio.php';

        // Same as moodle5: keepalive fetch is capped ~64KB in Chromium.
        var useKeepAlive = !!keepAlive;
        try {
            var bodyBytes = 0;
            formData.forEach(function(value) {
                if (value && typeof value.size === 'number') {
                    bodyBytes += value.size;
                }
            });
            if (bodyBytes > 60000) {
                useKeepAlive = false;
            }
        } catch (e) {
            useKeepAlive = false;
        }

        return fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            keepalive: useKeepAlive
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(result) {
            console.log('Uploaded chunks:', result);
            if (result && result.status === 'error') {
                isUploading = false;
                console.error('Audio upload failed:', result.message || result);
                return null;
            }
            return flushIndexedDB().then(function() {
                console.log('IndexedDB cleared after upload');
                isUploading = false;
                return result;
            });
        })
        .catch(function(error) {
            console.error('Upload error:', error);
            isUploading = false;
            return null;
        });
    }

    function stopAndPersistCurrentRecording() {
        return new Promise((resolve) => {
            const persistPendingChunks = function() {
                const savePromise = (!recordingSaved && audioChunks.length) ?
                    persistRecordedChunks(audioChunks) : Promise.resolve();
                recordingSaved = true;
                audioChunks = [];
                recordingStarted = false;
                recordingStartedAt = 0;
                silenceTimer = null;
                clearTimeout(recordingMaxTimer);
                savePromise.then(() => setTimeout(resolve, 150)).catch(() => resolve());
            };

            if (!mediaRecorder || mediaRecorder.state !== 'recording') {
                persistPendingChunks();
                return;
            }

            let settled = false;
            const finish = function() {
                if (settled) {
                    return;
                }
                settled = true;
                persistPendingChunks();
            };

            mediaRecorder.ondataavailable = function(e) {
                if (e.data && e.data.size > 0) {
                    audioChunks.push({
                        blob: e.data,
                        timestamp: Math.floor(Date.now() / 1000),
                        attemptid: resolveAttemptId(),
                        ownerKey: getOwnerKey() || '',
                        durationMs: getRecordingDurationMs()
                    });
                }
            };
            mediaRecorder.onstop = function() {
                // Safari/Mac: dataavailable often arrives after onstop.
                setTimeout(finish, (isAppleWebKit() || isMacDesktop()) ? 300 : 0);
            };
            try {
                if (typeof mediaRecorder.requestData === 'function') {
                    try {
                        mediaRecorder.requestData();
                    } catch (reqErr) {
                        // Ignore.
                    }
                }
                mediaRecorder.stop();
            } catch (e) {
                finish();
            }
        });
    }

    /**
     * Stop speech monitoring so no new segments start during final flush/submit.
     *
     * @return {void}
     */
    function stopActivityMonitor() {
        if (activityMonitorId) {
            clearInterval(activityMonitorId);
            activityMonitorId = null;
        }
        if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
        }
        if (recordingMaxTimer) {
            clearTimeout(recordingMaxTimer);
            recordingMaxTimer = null;
        }
    }

    function handleImmediateUpload(keepAlive = false, meta = null) {
        if (isHandlingUpload) {
            // Wait for the in-progress flush rather than skipping (critical on submit).
            return new Promise(function(resolve) {
                var waited = 0;
                var timer = setInterval(function() {
                    waited += 50;
                    if (!isHandlingUpload || waited >= 8000) {
                        clearInterval(timer);
                        if (isHandlingUpload) {
                            resolve();
                            return;
                        }
                        handleImmediateUpload(keepAlive, meta).then(resolve).catch(function() {
                            resolve();
                        });
                    }
                }, 50);
            });
        }
        applyFlushMeta(meta);
        isHandlingUpload = true;
        stopActivityMonitor();
        console.log('Navigation action detected — checking for chunks to upload');

        return stopAndPersistCurrentRecording()
            .then(() => checkAndUploadChunks(true, !!keepAlive))
            .catch((err) => {
                console.warn('Audio flush on navigation failed:', err);
            })
            .finally(() => {
                isHandlingUpload = false;
            });
    }

    /**
     * Stop recording and save any in-memory chunks to IndexedDB without uploading.
     * Used on summary/view so chunks survive Back → attempt and upload on Submit.
     *
     * @param {{attemptid?: string|number, quizid?: string|number}|null} [meta]
     * @return {Promise}
     */
    function persistAudioLocallyOnly(meta) {
        applyFlushMeta(meta || null);
        stopActivityMonitor();
        console.log('Persisting audio chunks to IndexedDB (no upload yet)');
        return stopAndPersistCurrentRecording().catch(function(err) {
            console.warn('Local audio persist failed:', err);
        });
    }

    window.useraudiorecord = useraudiorecord;
    window.proctorlinkUnlockAudio = function() {
        bindSafariAudioUnlock();
        ensureLiveAudioContext();
    };
    window.proctorlinkAudioMonitorActive = function() {
        return Boolean(activityMonitorId);
    };

    /**
     * Attempt shell keeps mic alive on the parent across Next/Previous.
     * Skip nav flush hooks in that mode — flush via proctorlinkFlushAudioUpload instead.
     *
     * @return {boolean}
     */
    function proctorlinkIsLiveAudioShell() {
        try {
            if (window.proctorlinkLiveAudioParent) {
                return true;
            }
            if (document.body && document.body.classList.contains('proctorlink-attempt-shell')) {
                return true;
            }
            if (window.name === 'proctorlink-quiz-in-if') {
                return true;
            }
            if (window.parent && window.parent !== window && window.parent.proctorlinkLiveAudioParent) {
                return true;
            }
        } catch (e) {
            // Ignore.
        }
        return false;
    }

    /**
     * Explicit flush used by the attempt shell (summary finish / leave).
     *
     * @param {boolean} [keepalive]
     * @param {{attemptid?: string|number, quizid?: string|number}} [meta]
     * @return {Promise}
     */
    window.proctorlinkFlushAudioUpload = function(keepalive, meta) {
        return handleImmediateUpload(!!keepalive, meta || null).catch(function() {
            return null;
        });
    };

    /**
     * Park audio in IndexedDB only (summary/view). Do not upload until submit.
     *
     * @param {{attemptid?: string|number, quizid?: string|number}} [meta]
     * @return {Promise}
     */
    window.proctorlinkPersistAudioLocally = function(meta) {
        return persistAudioLocallyOnly(meta || null).catch(function() {
            return null;
        });
    };

    let clickedSubmitButton = null;
    const NAV_BUTTON_NAMES = ['next', 'previous', 'back', 'finishattempt'];

    function isNavButton(el) {
        if (!el) {
            return false;
        }
        const name = (el.name || '').toLowerCase();
        return NAV_BUTTON_NAMES.indexOf(name) !== -1;
    }

    function isQuizResponseForm(form) {
        if (!form || form.tagName !== 'FORM') {
            return false;
        }
        return form.id === 'responseform' ||
            form.classList.contains('quizform') ||
            !!form.querySelector('input[name="next"], input[name="previous"], input[name="back"], input[name="finishattempt"]') ||
            !!form.querySelector('button[name="next"], button[name="previous"], button[name="back"], button[name="finishattempt"]');
    }

    document.addEventListener('click', function (e) {
        if (proctorlinkIsLiveAudioShell()) {
            return;
        }
        const target = e.target.closest('input[type="submit"], button');
        if (!target) {
            // Clear stale nav reference so autosave / other submits are not treated as Next.
            if (!e.target.closest || !e.target.closest('form')) {
                clickedSubmitButton = null;
            }
            return;
        }
        const form = target.closest('form');
        if (form && isQuizResponseForm(form)) {
            clickedSubmitButton = isNavButton(target) ? target : null;
        }
    }, true);

    document.addEventListener('submit', function (e) {
        if (proctorlinkIsLiveAudioShell()) {
            return;
        }
        const form = e.target;
        if (isHandlingUpload || form.dataset.programmaticSubmit === 'true') {
            return;
        }
        if (!isQuizResponseForm(form)) {
            clickedSubmitButton = null;
            return;
        }

        const triggeredBy = clickedSubmitButton || e.submitter;

        // Only intercept real page navigation — never autosave / clear-choice / other submits.
        // Intercepting those causes Moodle "submission out of sequence".
        if (!isNavButton(triggeredBy)) {
            clickedSubmitButton = null;
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const submitButton = triggeredBy;
        clickedSubmitButton = null;

        if (submitButton) {
            submitButton.disabled = true;
        }

        const continueSubmit = function () {
            if (submitButton) {
                submitButton.disabled = false;
            }
            // Let the next submit event through untouched.
            form.dataset.programmaticSubmit = 'true';

            setTimeout(function () {
                try {
                    // Prefer requestSubmit so Moodle receives the real submitter (next/previous/...).
                    if (submitButton && typeof form.requestSubmit === 'function') {
                        form.requestSubmit(submitButton);
                        return;
                    }
                } catch (err) {
                    // Fall through to native submit + hidden field.
                }

                const buttonName = submitButton ? submitButton.name : '';
                const buttonValue = submitButton ? submitButton.value : '';
                if (buttonName) {
                    const existing = form.querySelector('input[type="hidden"][name="' + buttonName + '"]');
                    if (existing) {
                        existing.remove();
                    }
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = buttonName;
                    if (buttonValue) {
                        hiddenInput.value = buttonValue;
                    }
                    form.appendChild(hiddenInput);
                }
                HTMLFormElement.prototype.submit.call(form);
            }, 50);
        };

        handleImmediateUpload().then(continueSubmit).catch(continueSubmit);
    }, true);

    // Non-submit controls / links only (avoid re-click loops on type=submit).
    document.addEventListener('click', function (e) {
        if (proctorlinkIsLiveAudioShell()) {
            return;
        }
        if (isHandlingUpload) {
            return;
        }

        const target = e.target.closest('a[href], button, input');
        if (!target) {
            return;
        }

        let shouldIntercept = false;
        if (target.tagName === 'A') {
            const href = target.getAttribute('href') || '';
            if (href !== '#' &&
                    !(target.closest && target.closest('.qtype_multichoice_clearchoice')) &&
                    (target.href.includes('attempt.php') ||
                        target.href.includes('summary.php') ||
                        target.href.includes('review.php'))) {
                shouldIntercept = true;
            }
        } else if ((target.tagName === 'BUTTON' && target.type !== 'submit') ||
                (target.tagName === 'INPUT' && target.type !== 'submit')) {
            if (isNavButton(target)) {
                shouldIntercept = true;
            }
        }

        if (!shouldIntercept) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
            target.disabled = true;
        }

        handleImmediateUpload().then(function () {
            if (target.tagName === 'A') {
                window.location.href = target.href;
            } else {
                target.disabled = false;
                setTimeout(function () {
                    target.click();
                }, 50);
            }
        }).catch(function () {
            if (target.tagName === 'A') {
                window.location.href = target.href;
            } else {
                target.disabled = false;
                setTimeout(function () {
                    target.click();
                }, 50);
            }
        });
    }, true);

    window.addEventListener('beforeunload', function () {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            console.log('Page is refreshing — stopping current recording and saving...');
            mediaRecorder.onstop = function () {
                if (!recordingSaved) {
                    persistRecordedChunks(audioChunks);
                    recordingSaved = true;
                    audioChunks = [];
                }
                recordingStarted = false;
                recordingStartedAt = 0;
                setTimeout(function () {
                    checkAndUploadChunks(true, true);
                }, 100);
            };
            mediaRecorder.stop();
        } else {
            checkAndUploadChunks(true, true);
        }
    });
})();
