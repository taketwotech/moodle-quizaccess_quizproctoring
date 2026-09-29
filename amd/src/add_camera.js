// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Camera and live proctoring helpers for quiz attempts.
 *
 * @module     quizaccess_quizproctoring/add_camera
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
try {
    if (window.self === window.top) {
        window.addEventListener('beforeunload', function(event) {
            if (window.__proctorlinkAllowUnload) {
                return;
            }
            event.stopImmediatePropagation();
            event.returnValue = '';
        });
    } else if (window.name === 'proctorlink-quiz-in-if') {
        document.documentElement.classList.add('proctorlink-quiz-iframe');
        var freezeStyle = document.getElementById('proctorlink-iframe-layout-freeze');
        if (!freezeStyle) {
            freezeStyle = document.createElement('style');
            freezeStyle.id = 'proctorlink-iframe-layout-freeze';
            freezeStyle.textContent =
                'html.proctorlink-quiz-iframe{' +
                'scrollbar-gutter:stable;}' +
                'html.proctorlink-quiz-iframe body{' +
                'scrollbar-gutter:stable;}' +
                'html.proctorlink-quiz-iframe #page.drawers{' +
                'transition:none!important;' +
                'scrollbar-gutter:stable;}' +
                'html.proctorlink-quiz-iframe .que [draggable="true"],' +
                'html.proctorlink-quiz-iframe .que .draghome,' +
                'html.proctorlink-quiz-iframe .que .dropzone,' +
                'html.proctorlink-quiz-iframe .que .droparea,' +
                'html.proctorlink-quiz-iframe .qtype_ordering,' +
                'html.proctorlink-quiz-iframe .qtype_ordering li{' +
                'touch-action:auto;' +
                '-webkit-user-drag:auto;}';
            (document.head || document.documentElement).appendChild(freezeStyle);
        }
        var markIframeBody = function() {
            if (document.body) {
                document.body.classList.add('proctorlink-quiz-iframe');
                var page = document.getElementById('page');
                if (page) {
                    page.style.setProperty('transition', 'none', 'important');
                }
            }
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', markIframeBody);
        } else {
            markIframeBody();
        }
        var disableQuizFormLeavePrompt = function() {
            window.onbeforeunload = null;
            if (typeof require === 'undefined') {
                return;
            }
            try {
                require(['core_form/changechecker'], function(FormChangeChecker) {
                    if (FormChangeChecker.disableAllChecks) {
                        FormChangeChecker.disableAllChecks();
                    }
                    if (FormChangeChecker.resetAllFormDirtyStates) {
                        FormChangeChecker.resetAllFormDirtyStates();
                    }
                });
            } catch (ignoreRequire) {
                // Ignore.
            }
        };
        disableQuizFormLeavePrompt();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', disableQuizFormLeavePrompt);
        }
        window.addEventListener('load', disableQuizFormLeavePrompt);
    }
} catch (e) {
    // Ignore.
}

/**
 * Moodle JS-security Start attempt uses openpopup({windowname: 'quizpopup'}),
 * but core openpopup() reads args.name and defaults to _blank. Reuse one
 * named window so a second Start attempt does not spawn another quiz tab
 * (closing a duplicate tab also drops the teacher's live video).
 */
(function() {
    if (window.__proctorlinkQuizPopupPatched) {
        return;
    }
    window.__proctorlinkQuizPopupPatched = true;

    var quizPopupName = 'quizpopup';
    var launchLockUntil = 0;

    /**
     * @param {string} url
     * @return {boolean}
     */
    function isQuizAttemptPopupUrl(url) {
        if (!url) {
            return false;
        }
        return /\/mod\/quiz\/(?:startattempt|attempt|summary)\.php/i.test(String(url));
    }

    /**
     * @return {boolean}
     */
    function isSecureQuizPopup() {
        try {
            return Boolean(window.opener && !window.opener.closed && window.opener !== window);
        } catch (e) {
            return false;
        }
    }

    /**
     * @return {Window|null}
     */
    function getExistingQuizPopup() {
        try {
            var win = window.__proctorlinkQuizPopupWin;
            if (win && !win.closed && win !== window) {
                return win;
            }
        } catch (e) {
            // Ignore.
        }
        try {
            if (window.opener && !window.opener.closed) {
                var fromOpener = window.opener.__proctorlinkQuizPopupWin;
                if (fromOpener && fromOpener !== window && !fromOpener.closed) {
                    return fromOpener;
                }
            }
        } catch (e2) {
            // Ignore.
        }
        return null;
    }

    /**
     * @param {Window} win
     * @return {void}
     */
    function rememberQuizPopup(win) {
        if (!win || win === window) {
            return;
        }
        try {
            if (win.closed) {
                return;
            }
        } catch (e) {
            return;
        }
        window.__proctorlinkQuizPopupWin = win;
        try {
            if (window.opener && !window.opener.closed) {
                window.opener.__proctorlinkQuizPopupWin = win;
            }
        } catch (e2) {
            // Ignore.
        }
    }

    /**
     * @param {Window} win
     * @return {void}
     */
    function focusQuizPopup(win) {
        if (!win) {
            return;
        }
        try {
            win.focus();
        } catch (e) {
            // Ignore.
        }
    }

    /**
     * @return {void}
     */
    function registerThisAsQuizPopup() {
        if (!isSecureQuizPopup()) {
            return;
        }
        try {
            if (!window.name || window.name === '_blank') {
                window.name = quizPopupName;
            }
        } catch (e) {
            // Ignore.
        }
        try {
            if (window.opener && !window.opener.closed) {
                window.opener.__proctorlinkQuizPopupWin = window;
            }
        } catch (e2) {
            // Ignore.
        }
    }

    var originalOpen = window.open;
    if (typeof originalOpen === 'function') {
        window.open = function(url, name, specs) {
            var urlStr = url ? String(url) : '';
            if (isQuizAttemptPopupUrl(urlStr)) {
                try {
                    if (typeof window.__proctorlinkReleaseCamera === 'function') {
                        window.__proctorlinkReleaseCamera();
                    }
                } catch (releaseErr) {
                    // Ignore.
                }
                var existing = getExistingQuizPopup();
                if (existing) {
                    focusQuizPopup(existing);
                    return existing;
                }
                name = quizPopupName;
            }
            var win = originalOpen.call(this, url, name, specs);
            if (isQuizAttemptPopupUrl(urlStr) && win) {
                rememberQuizPopup(win);
                launchLockUntil = 0;
            }
            return win;
        };
    }

    /**
     * @return {boolean}
     */
    function patchOpenPopup() {
        if (typeof window.openpopup !== 'function' || window.openpopup.__proctorlinkPatched) {
            return typeof window.openpopup === 'function' && window.openpopup.__proctorlinkPatched;
        }
        var originalPopup = window.openpopup;
        var wrappedPopup = function(event, args) {
            var popupUrl = args && args.url ? String(args.url) : '';
            if (isQuizAttemptPopupUrl(popupUrl)) {
                var existingPopup = getExistingQuizPopup();
                if (existingPopup) {
                    if (event) {
                        if (event.preventDefault) {
                            event.preventDefault();
                        }
                        if (event.halt) {
                            event.halt();
                        }
                    }
                    focusQuizPopup(existingPopup);
                    return false;
                }
                if (args) {
                    args.name = quizPopupName;
                    args.windowname = quizPopupName;
                }
            }
            return originalPopup.call(this, event, args);
        };
        wrappedPopup.__proctorlinkPatched = true;
        window.openpopup = wrappedPopup;
        return true;
    }

    if (!patchOpenPopup()) {
        document.addEventListener('DOMContentLoaded', patchOpenPopup);
        var tries = 0;
        var timer = window.setInterval(function() {
            tries += 1;
            if (patchOpenPopup() || tries > 40) {
                window.clearInterval(timer);
            }
        }, 50);
    }

    document.addEventListener('click', function(e) {
        var target = e.target;
        if (!target || !target.closest) {
            return;
        }
        var startInPopup = target.closest('#id_submitbutton');
        var attemptQuizBtn = target.closest('.quizstartbuttondiv [type=submit]');
        if (!startInPopup && !attemptQuizBtn) {
            return;
        }
        if (attemptQuizBtn && !startInPopup) {
            var existingFromView = getExistingQuizPopup();
            if (existingFromView) {
                e.preventDefault();
                e.stopImmediatePropagation();
                focusQuizPopup(existingFromView);
            }
            return;
        }
        var form = startInPopup.form || startInPopup.closest('form');
        var action = '';
        if (form) {
            action = form.getAttribute('action') || form.action || '';
        }
        if (!isQuizAttemptPopupUrl(action)) {
            return;
        }
        if (isSecureQuizPopup()) {
            e.stopImmediatePropagation();
            return;
        }
        var existingSubmit = getExistingQuizPopup();
        if (existingSubmit || Date.now() < launchLockUntil) {
            e.preventDefault();
            e.stopImmediatePropagation();
            focusQuizPopup(existingSubmit);
            return;
        }
        launchLockUntil = Date.now() + 2500;
    }, true);

    registerThisAsQuizPopup();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerThisAsQuizPopup);
    }
    window.addEventListener('load', registerThisAsQuizPopup);
})();

(function() {
    var left = null;
    var top = null;
    try {
        var saved = localStorage.getItem('videoPosition');
        if (saved) {
            var parsed = JSON.parse(saved);
            left = parsed.left;
            top = parsed.top;
        }
    } catch (e) {
        // Ignore.
    }
    if ((left === null || top === null) && typeof document !== 'undefined') {
        var match = document.cookie.match(/(?:^|; )quizproctoring_videopos=([^;]*)/);
        if (match) {
            var parts = decodeURIComponent(match[1]).split(',');
            left = parseInt(parts[0], 10);
            top = parseInt(parts[1], 10);
        }
    }
    if (left === null || top === null || isNaN(left) || isNaN(top)) {
        return;
    }
    var styleEl = document.getElementById('quizproctoring-video-pos-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'quizproctoring-video-pos-style';
        (document.head || document.documentElement).appendChild(styleEl);
    }
    styleEl.textContent = '#page-mod-quiz-attempt .proctorlink-video-wrap,' +
        '#page-mod-quiz-attempt video.quizaccess_quizproctoring-video,' +
        '#page-mod-quiz-attempt .quizaccess_quizproctoring-video,' +
        'body.proctorlink-attempt-shell .proctorlink-video-wrap,' +
        'body.proctorlink-attempt-shell video.quizaccess_quizproctoring-video,' +
        'body.proctorlink-attempt-shell .quizaccess_quizproctoring-video{' +
        'position:fixed !important;' +
        'left:' + left + 'px !important;' +
        'top:' + top + 'px !important;' +
        'bottom:auto !important;' +
        'right:auto !important;}';
})();

(function() {
    var IFRAME_ID = 'proctorlink-quiz-in-if';
    var OVERLAY_ID = 'proctorlink-quiz-loading';

    /**
     * Restore Moodle page chrome hidden by the attempt shell.
     *
     * @return {void}
     */
    function restoreProctorlinkPageChrome() {
        document.querySelectorAll('[data-proctorlink-hidden]').forEach(function(el) {
            el.style.display = '';
            delete el.dataset.proctorlinkHidden;
        });
        document.body.classList.remove('proctorlink-attempt-shell');
        document.body.classList.remove('proctorlink-shell-preparing');
        document.body.classList.remove('proctorlink-on-summary');
        document.body.classList.remove('proctorlink-on-view');
    }

    /**
     * Clear stale shell spinner left by bfcache / SEB exit.
     *
     * @return {void}
     */
    function clearProctorlinkStaleUi() {
        var overlay = document.getElementById(OVERLAY_ID);
        var iframe = document.getElementById(IFRAME_ID);
        if (overlay) {
            overlay.classList.remove('is-visible');
        }
        if (!iframe && document.body.classList.contains('proctorlink-attempt-shell')) {
            restoreProctorlinkPageChrome();
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }
    }

    window.addEventListener('pageshow', function(event) {
        if (event && event.persisted) {
            clearProctorlinkStaleUi();
        }
    });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', clearProctorlinkStaleUi);
    } else {
        clearProctorlinkStaleUi();
    }
})();

define(['jquery', 'core/str', 'quizaccess_quizproctoring/modal', 'quizaccess_quizproctoring/eye_tracking'],
function($, str, ModalFactory, EyeTracking) {
    var ModalEvents = ModalFactory.events;
    applyStoredVideoPositionStyle();

    $('.quizstartbuttondiv [type=submit]').prop("disabled", true);
    var Camera = function(cmid, mainimage = false, attemptid = null, quizid) {
        var docElement = $(document);
        this.video = document.getElementById(this.videoid);
        this.canvas = document.getElementById(this.canvasid);
        this.cmid = cmid;
        this.quizid = quizid;
        this.mainimage = mainimage;
        this.attemptid = attemptid;
        $("#id_submitbutton").prop("disabled", true);
        docElement.off('popup.quizproctoring').on('popup.quizproctoring', this.showpopup.bind(this));
    };

    $('#id_consentcheckbox').on('change', function() {
        if (!$(this).is(':checked')) {
            $("#id_submitbutton").prop("disabled", true);
        } else if ($(this).is(':checked') && $('#userimageset').val() == 0) {
            $("#id_submitbutton").prop("disabled", true);
        } else if ($(this).is(':checked') && $('#userimageset').val() == 1) {
            $("#id_submitbutton").prop("disabled", false);
        }
    });

    /** @type Tag element contain video. */
    Camera.prototype.video = false;
    /** @type String video elemend id. */
    Camera.prototype.videoid = 'video';
    /** @type Tag element contain canvas. */
    Camera.prototype.canvas = false;
    /** @type String video elemend id. */
    Camera.prototype.canvasid = 'canvas';
    /** @type int width of canvas object. */
    Camera.prototype.width = 320;
    /** @type int width of canvas object. */
    Camera.prototype.height = 240;
    /** @type String element contain takepicture button. */
    Camera.prototype.takepictureid = 'takepicture';
    /** @type String element contain retake button. */
    Camera.prototype.retakeid = 'retake';
    /** @type int course module id. */
    Camera.prototype.cmid = false;
    /** @type bool whether a main image or compare against an image. */
    Camera.prototype.mainimage = false;
     /** @type int attempt id. */
    Camera.prototype.attemptid = false;
     /** @type int quiz id. */
    Camera.prototype.quizid = false;

    Camera.prototype.startcamera = function(existingStream) {
        if (quizTerminationInProgress) {
            return Promise.resolve(null);
        }
        this.video = document.getElementById(this.videoid);
        this.canvas = document.getElementById(this.canvasid);
        const takePictureButton = $('#' + this.takepictureid);
        takePictureButton.prop('disabled', true);
        const cameraInstance = this;
        // Ask for the mic during identity capture too so iOS/Android can grant it
        // on the Start tap; the attempt page cannot show that prompt later.
        const wantAudio = ASK_AUDIO;
        const requireAudio = wantAudio && USE_AUDIO && !cameraInstance.mainimage;
        beginMediaAcquire(cameraInstance.cmid, cameraInstance.attemptid, cameraInstance.mainimage, requireAudio);
        const mediaPromise = existingStream ?
            ensureStreamIsFrontCamera(existingStream, wantAudio) :
            preparePopupCameraAccess().then(function() {
                return requestPreferredUserMediaWithRetry(wantAudio, false);
            });
        return mediaPromise
            .then(function(stream) {
                endMediaAcquire();
                if (cameraInstance.preflightCancelled) {
                    try {
                        stream.getTracks().forEach(function(track) {
                            track.stop();
                        });
                    } catch (e) {
                        // Ignore.
                    }
                    return null;
                }
                const videoElement = document.getElementById(cameraInstance.videoid) ||
                    document.getElementById('video');
                cameraInstance.video = videoElement;
                cameraInstance.canvas = document.getElementById(cameraInstance.canvasid) ||
                    document.getElementById('canvas');
                if (videoElement) {
                    attachStreamToVideoElement(videoElement, stream);
                    localMediaStream = stream;
                    startFrontCameraGuard();
                    if (mediaStreamHasLiveAudio(stream)) {
                        mobileAudioPermissionSettled = true;
                        clearMediaDisabledAlertState();
                    } else if (wantAudio) {
                        markMicrophoneSettleGrace(getMicrophoneSettleGraceMs());
                        enableAudioTracks(stream);
                    }
                    if (videoElement.classList &&
                            videoElement.classList.contains('quizaccess_quizproctoring-video') &&
                            !isPreflightCaptureVideo(videoElement)) {
                        applyAttemptVideoVisibility(
                            videoElement,
                            attemptMediaResume ? attemptMediaResume.enableStudentVideo : 1
                        );
                    } else {
                        $(videoElement).show();
                    }

                    videoElement.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                    });

                    if (stream.getVideoTracks()[0]) {
                        stream.getVideoTracks()[0].onended = function() {
                            if (quizTerminationInProgress || shouldSuppressMediaAlerts()) {
                                return;
                            }
                            takePictureButton.prop('disabled', true);
                            reportMissingMediaIfNeeded(
                                cameraInstance.cmid,
                                cameraInstance.attemptid,
                                cameraInstance.mainimage
                            );
                        };
                    }

                    if (USE_AUDIO) {
                        const audioTrack = stream.getAudioTracks()[0];
                        if (audioTrack) {
                            mobileAudioPermissionSettled = true;
                            audioTrack.onended = function() {
                                if (quizTerminationInProgress || shouldSuppressMediaAlerts()) {
                                    return;
                                }
                                reportMissingMediaIfNeeded(
                                    cameraInstance.cmid,
                                    cameraInstance.attemptid,
                                    cameraInstance.mainimage
                                );
                            };
                        }
                    }
                    if (cameraInstance.attemptid &&
                            videoElement.classList.contains('quizaccess_quizproctoring-video') &&
                            !isPreflightCaptureVideo(videoElement)) {
                        bindVideoDrag(videoElement);
                    }
                    takePictureButton.prop('disabled', false);
                } else {
                    localMediaStream = stream;
                    var attachTries = 0;
                    var attachTick = function() {
                        var el = document.getElementById(cameraInstance.videoid) ||
                            document.getElementById('video');
                        if (el) {
                            cameraInstance.video = el;
                            cameraInstance.canvas = document.getElementById(cameraInstance.canvasid) ||
                                document.getElementById('canvas');
                            attachStreamToVideoElement(el, stream);
                            $(el).show();
                            takePictureButton.prop('disabled', false);
                            return;
                        }
                        attachTries += 1;
                        if (attachTries < 30) {
                            window.setTimeout(attachTick, 100);
                        } else {
                            try {
                                stream.getTracks().forEach(function(track) {
                                    track.stop();
                                });
                            } catch (e) {
                                // Ignore.
                            }
                            takePictureButton.prop('disabled', true);
                        }
                    };
                    attachTick();
                }
                return videoElement;
            })
            .catch(function() {
                endMediaAcquire();
                takePictureButton.prop('disabled', true);
                if (!cameraInstance.mainimage && !shouldDeferMediaDisabledAlert()) {
                    reportMissingMediaIfNeeded(
                        cameraInstance.cmid,
                        cameraInstance.attemptid,
                        cameraInstance.mainimage
                    );
                }
            });
    };

    Camera.prototype.takepicture = function() {
        const cameraInstance = this;
        this.video = document.getElementById(this.videoid) || this.video;
        this.canvas = document.getElementById(this.canvasid) || this.canvas;
        const video = this.video;
        const canvas = this.canvas;
        if (!video || !canvas) {
            return;
        }

        const outputWidth = 320;
        const outputHeight = 240;
        const targetRatio = outputWidth / outputHeight;

        const vw = video.videoWidth || video.clientWidth;
        const vh = video.videoHeight || video.clientHeight;
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

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

        const data = canvas.toDataURL('image/png');

        $('#' + this.videoid).hide();
        $('#' + this.takepictureid).hide();
        $('#' + this.canvasid).show();
        $('#' + this.retakeid).show();
        $("#id_submitbutton").prop("disabled", true);

        let requestData = {
            imgBase64: data,
            cmid: this.cmid,
            attemptid: this.attemptid,
            mainimage: this.mainimage
        };
        if (this.mainimage) {
            requestData.deviceinfo = detectDeviceInfo();
        }

        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
            method: 'POST',
            data: requestData,
            success: function(response) {
                if (response && response.errorcode) {
                    $('#userimageset').val(0);
                    showPluginErrorPopup(response);
                    revertPreflightCapture(cameraInstance);
                } else if (response && (response.status === true || response.status === 'true')) {
                    $('#userimageset').val(1);
                    if ($('#id_consentcheckbox').is(':checked')) {
                        $("#id_submitbutton").prop("disabled", false);
                    }
                } else if (requestData.mainimage) {
                    const unavailablemsg = (response && response.message) ? response.message :
                        M.util.get_string('verificationunavailable', 'quizaccess_quizproctoring');
                    $(document).trigger('popup', unavailablemsg);
                    revertPreflightCapture(cameraInstance);
                }
            },
            error: function() {
                if (requestData.mainimage) {
                    $(document).trigger('popup',
                        M.util.get_string('verificationunavailable', 'quizaccess_quizproctoring'));
                    revertPreflightCapture(cameraInstance);
                }
            }
        });
    };

    /**
     * @param {Camera} camera
     * @return {boolean}
     */
    function skipPhoneLiveProctorImage(camera) {
        if (!(liveProctoringParentActive && typeof ismobiledevice === 'function' &&
                ismobiledevice() && document.body.classList.contains('quizproctoring-phone') &&
                !mediaStreamHasLiveVideo(localMediaStream))) {
            return false;
        }
        if (mediaAcquireInProgress || mobileAudioAcquireInFlight ||
                Date.now() < microphoneSettleGraceUntil) {
            return true;
        }
        if (!USE_AUDIO || mobileAudioPermissionSettled) {
            reportMissingMediaIfNeeded(camera.cmid, camera.attemptid, camera.mainimage, {
                assumeVideo: true
            });
        }
        return true;
    }

    /**
     * @param {Camera} camera
     * @return {string}
     */
    function cropVideoFrameToDataUrl(camera) {
        const video = document.getElementById(camera.videoid) ||
            (typeof getAttemptVideoElement === 'function' ? getAttemptVideoElement() : null) ||
            camera.video;
        const canvas = document.getElementById(camera.canvasid) || camera.canvas;
        camera.video = video;
        camera.canvas = canvas;
        if (!video || !canvas) {
            return '';
        }
        const outputWidth = 280;
        const outputHeight = 240;
        const targetRatio = outputWidth / outputHeight;
        const vw = video.videoWidth || video.clientWidth;
        const vh = video.videoHeight || video.clientHeight;
        if (!vw || !vh) {
            return '';
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
        try {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
            return canvas.toDataURL('image/png');
        } catch (e) {
            return '';
        }
    }

    /**
     * @param {Object} requestData
     * @return {void}
     */
    function postProctoringImageRequest(requestData) {
        proctorCaptureInFlight = true;
        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
            method: 'POST',
            dataType: 'json',
            data: requestData,
            success: function(response) {
                response = parseProctoringAjaxResponse(response);
                if (response && response.errorcode) {
                    handleRealtimeWarningResponse(response, response.error || '', requestData.cmid, requestData.attemptid);
                } else if (response && response.redirect && response.url) {
                    redirectAfterProctorAutoSubmit(
                        response.url, response.msg, requestData.attemptid
                    );
                }
            },
            error: function(xhr) {
                handleRealtimeWarningXhrError(xhr, '', requestData.cmid, requestData.attemptid);
            },
            complete: function() {
                proctorCaptureInFlight = false;
            }
        });
    }

    Camera.prototype.proctoringimage = function() {
        if (quizTerminationInProgress || shouldSuppressMediaAlerts() || mediaAcquireInProgress) {
            return;
        }
        if (skipPhoneLiveProctorImage(this)) {
            return;
        }
        reportMissingMediaIfNeeded(this.cmid, this.attemptid, this.mainimage);
        if (!mediaStreamHasLiveVideo(localMediaStream)) {
            scheduleMissingMediaWarnings(this.cmid, this.attemptid, this.mainimage);
            return;
        }
        ensureAttemptVideoPlaying();
        this.video = document.getElementById(this.videoid) || getAttemptVideoElement() || this.video;
        this.canvas = document.getElementById(this.canvasid) || this.canvas;
        var requestData = {
            cmid: this.cmid,
            attemptid: this.attemptid,
            mainimage: this.mainimage
        };
        if (this.canvas) {
            requestData.imgBase64 = cropVideoFrameToDataUrl(this);
        }
        if (!requestData.imgBase64 || proctorCaptureInFlight || shouldSkipProctorIntervalCapture()) {
            return;
        }
        markProctorImageCaptured();
        postProctoringImageRequest(requestData);
    };

    Camera.prototype.resetcamera = function() {
        this.canvas = document.getElementById(this.canvasid) || this.canvas;
        this.video = document.getElementById(this.videoid) || this.video;
        if (this.canvas) {
            var context = this.canvas.getContext('2d');
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        $('#' + this.canvasid).hide();
        $('#' + this.retakeid).hide();
        $('#' + this.videoid).show();
        $('#' + this.takepictureid).show();
        $('#userimageset').val(0);
        $("#id_submitbutton").prop("disabled", true);
    };

    /**
     * Start the preflight webcam after Moodle inserts the dialogue (#video).
     *
     * @param {Camera} camera Camera instance
     * @return {void}
     */
    function startPreflightCameraWhenReady(camera) {
        if (!camera || typeof camera.startcamera !== 'function') {
            return;
        }
        if (camera.preflightStartPending || camera.preflightStarted) {
            return;
        }
        camera.preflightCancelled = false;
        camera.preflightStartPending = true;
        var tries = 0;
        var maxTries = 50;
        var tick = function() {
            if (camera.preflightCancelled) {
                camera.preflightStartPending = false;
                camera.preflightStarted = false;
                return;
            }
            var video = document.getElementById(camera.videoid) || document.getElementById('video');
            if (video) {
                camera.video = video;
                camera.canvas = document.getElementById(camera.canvasid) ||
                    document.getElementById('canvas');
                camera.preflightStarted = true;
                camera.preflightStartPending = false;
                whenSecurePopupLayoutReady().then(function() {
                    if (!camera.preflightCancelled) {
                        camera.startcamera();
                    }
                    return null;
                }).catch(function() {
                    return null;
                });
                bindSecurePopupCameraGesture(function() {
                    if (camera.preflightCancelled || mediaStreamHasLiveVideo(localMediaStream)) {
                        return;
                    }
                    camera.startcamera();
                });
                return;
            }
            tries += 1;
            if (tries < maxTries) {
                window.setTimeout(tick, 100);
            } else {
                camera.preflightStartPending = false;
            }
        };
        tick();
    }

    /**
     * Re-enable the quiz start button after a failed preflight check.
     *
     * @return {void}
     */
    function enableQuizStartButton() {
        $('.quizstartbuttondiv [type=submit]').prop('disabled', false);
    }

    /**
     * Revert all preflight capture state when main image server validation fails.
     *
     * @param {Camera} cameraInstance Camera instance
     * @return {void}
     */
    function revertPreflightCapture(cameraInstance) {
        if (cameraInstance && typeof cameraInstance.resetcamera === 'function') {
            cameraInstance.resetcamera();
        }
        $('#id_consentcheckbox').prop('checked', false);
        $('#userimageset').val(0);
        $('#id_submitbutton').prop('disabled', true);
    }

    /**
     * Remove leftover Bootstrap modal backdrop after closing dialogs.
     *
     * @return {void}
     */
    function cleanupModalBackdrop() {
        $('body').removeClass('modal-open');
        document.body.style.paddingRight = '';
        $('.modal-backdrop, .yui3-widget-mask').remove();
    }

    var externalserver = 'https://stream.proctorlink.com';
    var localMediaStream = null;
    var USE_AUDIO = true;
    var ASK_AUDIO = true;
    var mobileAudioPermissionSettled = true;
    var mobileAudioAcquireInFlight = false;
    var userAudioHookStarted = false;
    var audioStartRetryTimer = null;
    var mobileAudioGestureRetryBound = false;
    var quizTerminationInProgress = false;
    var suppressRealtimePopupUntil = 0;
    var microphoneSettleGraceUntil = 0;
    var tabSwitchListenerBound = false;
    let hiddenCloseButton = null;
    var objectDetectionEnabled = false;
    var objectDetectionController = null;
    var objectDetectionControllerPromise = null;
    var onlineWebcamSetupPromise = null;
    var mediaAcquireInProgress = false;
    var mediaAcquireTimeoutId = null;
    var MEDIA_ACQUIRE_TIMEOUT_MS = 12000;

    /**
     * Permission prompts and Android camera hand-off into Moodle's popup
     * need longer than 12s or we fire a false "camera is disabled" warning.
     *
     * @return {number}
     */
    function getMediaAcquireTimeoutMs() {
        try {
            if (window.opener && !window.opener.closed && window.opener !== window) {
                return 45000;
            }
        } catch (e) {
            // Ignore.
        }
        if (typeof ismobiledevice === 'function' && ismobiledevice()) {
            return 30000;
        }
        return MEDIA_ACQUIRE_TIMEOUT_MS;
    }

    /**
     * Stop every local camera/mic track. The opener must release the hardware
     * before the secure-window popup can open the front camera on Android.
     *
     * @return {void}
     */
    function releaseAllLocalMediaTracks() {
        stopFrontCameraGuard();
        if (localMediaStream) {
            try {
                localMediaStream.getTracks().forEach(function(track) {
                    try {
                        track.onended = null;
                    } catch (e2) {
                        // Ignore.
                    }
                    track.stop();
                });
            } catch (e) {
                // Ignore.
            }
            localMediaStream = null;
        }
        document.querySelectorAll('video').forEach(function(videoEl) {
            if (!videoEl.srcObject) {
                return;
            }
            try {
                videoEl.srcObject.getTracks().forEach(function(track) {
                    try {
                        track.onended = null;
                    } catch (e2) {
                        // Ignore.
                    }
                    track.stop();
                });
            } catch (e) {
                // Ignore.
            }
            videoEl.srcObject = null;
        });
    }

    window.__proctorlinkReleaseCamera = releaseAllLocalMediaTracks;

    /**
     * Moodle "Browser security" opens the attempt in a window with an opener.
     *
     * @return {boolean}
     */
    function isQuizSecurityPopup() {
        try {
            return Boolean(window.opener && !window.opener.closed && window.opener !== window);
        } catch (e) {
            return false;
        }
    }

    /**
     * Student preview is desktop-only. Phones keep an off-screen video so
     * frames still decode for capture (display:none stops that on iOS/Android).
     *
     * @param {boolean|number} [enablestudentvideo]
     * @return {boolean}
     */
    function shouldShowStudentVideoPreview(enablestudentvideo) {
        if (!Number(enablestudentvideo)) {
            return false;
        }
        if (typeof ismobiledevice === 'function' && ismobiledevice()) {
            return false;
        }
        return true;
    }

    /**
     * Phones in a popup often cannot complete getUserMedia until the first tap.
     *
     * @return {boolean}
     */
    function shouldDeferMediaDisabledAlert() {
        return isQuizSecurityPopup() && isPhoneCameraDevice();
    }

    /**
     * Ask the quiz view window to drop the camera, then wait so Android can
     * hand the device to this popup.
     *
     * @return {Promise<void>}
     */
    function preparePopupCameraAccess() {
        try {
            if (window.opener && !window.opener.closed &&
                    typeof window.opener.__proctorlinkReleaseCamera === 'function') {
                window.opener.__proctorlinkReleaseCamera();
            }
        } catch (e) {
            // Ignore.
        }
        if (!isQuizSecurityPopup()) {
            return Promise.resolve();
        }
        var wait = 700;
        if (isAndroidPhone() || isPhoneCameraDevice()) {
            wait = 1500;
        }
        return new Promise(function(resolve) {
            window.setTimeout(resolve, wait);
        });
    }

    /**
     * The teacher room only receives a picture after the student publisher
     * calls enableCameraAndMicrophone. If this page opens the camera first,
     * that call fails and the room stays empty.
     *
     * @param {number} [timeoutMs]
     * @return {Promise<void>}
     */
    function waitForPublisherCamera(timeoutMs) {
        var limit = timeoutMs || 4000;
        if (liveIframeImageSeen) {
            return Promise.resolve();
        }
        return new Promise(function(resolve) {
            var start = Date.now();
            var timer = window.setInterval(function() {
                if (liveIframeImageSeen || (Date.now() - start) >= limit) {
                    window.clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    }

    /**
     * Moodle's fullscreen popup calls resizeTo() while the new window is still
     * 0×0. getUserMedia during that window fails on Android and is not retried.
     *
     * @return {Promise<void>}
     */
    function whenSecurePopupLayoutReady() {
        if (!isQuizSecurityPopup()) {
            return Promise.resolve();
        }
        var usable = function() {
            return window.innerWidth > 80 && window.innerHeight > 80;
        };
        if (usable()) {
            return Promise.resolve();
        }
        return new Promise(function(resolve) {
            var left = 30;
            var timer = window.setInterval(function() {
                left -= 1;
                if (usable() || left <= 0) {
                    window.clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * The fullscreen popup has no user gesture after it opens. A failed
     * getUserMedia must run again from the first tap, still on the front lens.
     *
     * @param {function(): void} startFn
     * @return {void}
     */
    function bindSecurePopupCameraGesture(startFn) {
        if (window.__proctorlinkPopupCamGesture || typeof startFn !== 'function') {
            return;
        }
        if (!isQuizSecurityPopup() || !isPhoneCameraDevice()) {
            return;
        }
        window.__proctorlinkPopupCamGesture = true;
        var retry = function() {
            if (mediaStreamHasLiveVideo(localMediaStream) || mediaAcquireInProgress) {
                return;
            }
            startFn();
        };
        ['touchstart', 'pointerdown', 'click'].forEach(function(evt) {
            document.addEventListener(evt, retry, {capture: true, passive: true});
        });
    }

    /**
     * Release the identity-capture camera when the quiz starts in a popup.
     * Keep it if the form is retargeted into the plugin iframe shell.
     *
     * @return {void}
     */
    function bindOpenerCameraRelease() {
        if (window.__proctorlinkReleaseBound) {
            return;
        }
        window.__proctorlinkReleaseBound = true;
        $(document).on('click.proctorlinkReleaseCam', '#id_submitbutton', function() {
            var form = this.form || $(this).closest('form')[0];
            var target = form ? (form.target || form.getAttribute('target') || '') : '';
            if (target === QUIZ_ATTEMPT_IFRAME_NAME) {
                return;
            }
            releaseAllLocalMediaTracks();
        });
        $(document).on('submit.proctorlinkReleaseCam', 'form', function() {
            var target = this.target || this.getAttribute('target') || '';
            if (target === QUIZ_ATTEMPT_IFRAME_NAME) {
                return;
            }
            if (!$(this).find('#id_submitbutton').length) {
                return;
            }
            releaseAllLocalMediaTracks();
        });
        window.addEventListener('pagehide', function() {
            try {
                if (/\/mod\/quiz\/startattempt\.php/i.test(window.location.pathname || '')) {
                    releaseAllLocalMediaTracks();
                }
            } catch (e) {
                // Ignore.
            }
        });
    }

    bindOpenerCameraRelease();
    bindAttemptPageshowResume();

    var LIVE_STREAM_OWNER_KEY = 'proctorlinkLiveStreamOwner';
    var liveStreamOwnerId = null;
    var liveStreamHeartbeatTimer = null;

    /**
     * @return {Object|null}
     */
    function readLiveStreamOwner() {
        try {
            var raw = localStorage.getItem(LIVE_STREAM_OWNER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * True when another tab/window is already publishing this attempt
     * to the teacher. A second publisher replaces the first on the
     * streaming server, so closing either window drops the teacher's feed.
     *
     * @param {number|string} quizid
     * @param {number|string} attemptid
     * @return {boolean}
     */
    function isOtherWindowPublishingLive(quizid, attemptid) {
        var owner = readLiveStreamOwner();
        if (!owner || !owner.id) {
            return false;
        }
        if (liveStreamOwnerId && owner.id === liveStreamOwnerId) {
            return false;
        }
        if (String(owner.quizid) !== String(quizid) ||
                String(owner.attemptid) !== String(attemptid)) {
            return false;
        }
        return (Date.now() - Number(owner.ts || 0)) < 8000;
    }

    /**
     * @param {number|string} quizid
     * @param {number|string} attemptid
     * @return {void}
     */
    function claimLiveStreamOwnership(quizid, attemptid) {
        liveStreamOwnerId = 'w' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
        var write = function() {
            try {
                localStorage.setItem(LIVE_STREAM_OWNER_KEY, JSON.stringify({
                    id: liveStreamOwnerId,
                    quizid: quizid,
                    attemptid: attemptid,
                    ts: Date.now()
                }));
            } catch (e) {
                // Ignore.
            }
        };
        write();
        if (liveStreamHeartbeatTimer) {
            window.clearInterval(liveStreamHeartbeatTimer);
        }
        liveStreamHeartbeatTimer = window.setInterval(write, 2000);
        if (!window.__proctorlinkLiveOwnerPagehide) {
            window.__proctorlinkLiveOwnerPagehide = true;
            window.addEventListener('pagehide', function() {
                var owner = readLiveStreamOwner();
                if (owner && liveStreamOwnerId && owner.id === liveStreamOwnerId) {
                    try {
                        localStorage.removeItem(LIVE_STREAM_OWNER_KEY);
                    } catch (e) {
                        // Ignore.
                    }
                }
                if (liveStreamHeartbeatTimer) {
                    window.clearInterval(liveStreamHeartbeatTimer);
                    liveStreamHeartbeatTimer = null;
                }
            });
        }
    }
    const DETECTION_FRAME_WIDTH = 640;
    const DETECTION_FRAME_HEIGHT = 480;
    var QUIZ_ATTEMPT_IFRAME_NAME = 'proctorlink-quiz-in-if';
    var liveProctoringParentActive = false;
    var quizIframeWatchTimer = null;
    var liveProctorImageInterval = null;
    var localProctorImageInterval = null;
    var localProctorImageTimeoutId = null;
    var lastProctorImageAt = 0;
    var proctorVisibleCatchUpId = null;
    var proctorCaptureInFlight = false;
    var lastMediaDisabledAlertAt = 0;
    var missingMediaWarningTimer = null;
    var proctorTimeIntervalMs = 300000;
    var quizIframeWatchStarted = false;
    var pendingLiveStartFromPreflight = null;
    var quizAttemptSeenInIframe = false;
    var hardMediaRevivePending = false;
    var leavingAttemptShell = false;
    var quizIframeLoadingHideTimer = null;
    var quizIframeLoadingShowTimer = null;
    /** @type {object|null} */
    var attemptMediaResume = null;
    /** @type {Function|null} */
    var liveProctorPollingResume = null;
    /** @type {boolean} */
    var liveStudentIframeReady = false;
    /** @type {boolean} */
    var liveUseParentMedia = false;
    var liveIframeImageSeen = false;
    var lastLiveIframeImageAt = 0;
    var publisherReconnectGraceUntil = 0;
    /** @type {string|null} */
    var pausedStudentIframeSrc = null;
    /** @type {Promise<void>|null} */
    var publisherBlankPromise = null;

    /**
     * @return {void}
     */
    function clearMediaAcquireTimeout() {
        if (mediaAcquireTimeoutId) {
            window.clearTimeout(mediaAcquireTimeoutId);
            mediaAcquireTimeoutId = null;
        }
    }

    /**
     * @param {number} cmid
     * @param {number} attemptid
     * @param {boolean} mainimage
     * @param {boolean} requireAudio
     * @return {void}
     */
    function beginMediaAcquire(cmid, attemptid, mainimage, requireAudio) {
        mediaAcquireInProgress = true;
        if (requireAudio) {
            mobileAudioPermissionSettled = false;
            markMicrophoneSettleGrace(getMicrophoneSettleGraceMs());
        }
        clearMediaDisabledAlertState();
        clearMediaAcquireTimeout();
        mediaAcquireTimeoutId = window.setTimeout(function() {
            mediaAcquireTimeoutId = null;
            if (!mediaAcquireInProgress) {
                return;
            }
            mediaAcquireInProgress = false;
            if (quizTerminationInProgress || shouldSuppressMediaAlerts()) {
                return;
            }
            var hasLiveVideo = localMediaStream && localMediaStream.getVideoTracks &&
                localMediaStream.getVideoTracks().some(function(track) {
                    return track.readyState === 'live';
                });
            var hasLiveAudio = localMediaStream && localMediaStream.getAudioTracks &&
                localMediaStream.getAudioTracks().some(function(track) {
                    return track.readyState === 'live';
                });
            if (hasLiveVideo && (!requireAudio || hasLiveAudio)) {
                return;
            }
            if (mainimage) {
                return;
            }
            reportMissingMediaIfNeeded(cmid, attemptid, mainimage);
            scheduleMissingMediaWarnings(cmid, attemptid, mainimage);
        }, getMediaAcquireTimeoutMs());
    }

    /**
     * @return {void}
     */
    function endMediaAcquire() {
        clearMediaAcquireTimeout();
        mediaAcquireInProgress = false;
    }

    /**
     * @param {string} url
     * @param {{replace: boolean}} [options]
     * @return {void}
     */
    function navigateTop(url, options) {
        window.__proctorlinkAllowUnload = true;
        var useReplace = options && options.replace;
        if (!(options && options.replace === false)) {
            try {
                var leaveUrl = new URL(url, window.location.href);
                if (/\/mod\/quiz\/(?:review|view)\.php$/i.test(leaveUrl.pathname || '')) {
                    useReplace = true;
                }
            } catch (e) {
                // Ignore.
            }
        }
        var target = url;
        try {
            if (window.top && window.top !== window.self) {
                window.top.__proctorlinkAllowUnload = true;
                window.top.onbeforeunload = null;
                if (useReplace) {
                    window.top.location.replace(target);
                } else {
                    window.top.location.href = target;
                }
                return;
            }
        } catch (e) {
            // Ignore.
        }
        window.onbeforeunload = null;
        if (useReplace) {
            window.location.replace(target);
        } else {
            window.location.href = target;
        }
    }

    /**
     * @return {boolean}
     */
    function isProctorlinkQuizIframe() {
        try {
            return window.self !== window.top && window.name === QUIZ_ATTEMPT_IFRAME_NAME;
        } catch (e) {
            return window.self !== window.top;
        }
    }

    /**
     * Paths that stay inside the attempt shell iframe (no top-level tear-down).
     *
     * @param {string} pathname Location pathname
     * @return {boolean}
     */
    function isAttemptOrSummaryPath(pathname) {
        return /\/mod\/quiz\/(?:attempt|summary|view)\.php$/i.test(pathname || '');
    }

    /**
     * @param {string} pathname
     * @return {boolean}
     */
    function isSummaryPath(pathname) {
        return /\/mod\/quiz\/summary\.php$/i.test(pathname || '');
    }

    /**
     * @param {string} pathname
     * @return {boolean}
     */
    function isViewPath(pathname) {
        return /\/mod\/quiz\/view\.php$/i.test(pathname || '');
    }

    /**
     * @param {string} pathname
     * @return {boolean}
     */
    function isReviewPath(pathname) {
        return /\/mod\/quiz\/review\.php$/i.test(pathname || '');
    }

    /**
     * Whether media warning popups should be skipped (summary/view teardown).
     *
     * @return {boolean}
     */
    function shouldSuppressMediaAlerts() {
        try {
            if (window.__proctorlinkCameraStopping) {
                return true;
            }
            if (document.body && (
                document.body.classList.contains('proctorlink-on-summary') ||
                document.body.classList.contains('proctorlink-on-view')
            )) {
                return true;
            }
            var iframe = document.getElementById(QUIZ_ATTEMPT_IFRAME_NAME);
            if (iframe && iframe.contentWindow) {
                var iframePath = iframe.contentWindow.location.pathname || '';
                if (isSummaryPath(iframePath) || isViewPath(iframePath) || isReviewPath(iframePath)) {
                    return true;
                }
            }
        } catch (e) {
            // Ignore.
        }
        return false;
    }

    /**
     * @param {MediaStream|null} stream
     * @return {boolean}
     */
    function mediaStreamHasLiveVideo(stream) {
        return !!(stream && typeof stream.getVideoTracks === 'function' &&
            stream.getVideoTracks().some(function(track) {
                return track && track.readyState === 'live';
            }));
    }

    /**
     * @param {MediaStream|null} stream
     * @return {boolean}
     */
    function mediaStreamHasLiveAudio(stream) {
        return !!(stream && typeof stream.getAudioTracks === 'function' &&
            stream.getAudioTracks().some(function(track) {
                return track && track.readyState === 'live';
            }));
    }

    /**
     * True when a non-ended mic track exists. iOS often attaches tracks before
     * readyState becomes live; a second getUserMedia then re-prompts.
     *
     * @param {MediaStream|null} stream
     * @return {boolean}
     */
    function mediaStreamHasAudioTrack(stream) {
        return !!(stream && typeof stream.getAudioTracks === 'function' &&
            stream.getAudioTracks().some(function(track) {
                return track && track.readyState !== 'ended';
            }));
    }

    /**
     * @param {MediaStream|null} stream
     * @return {void}
     */
    function enableAudioTracks(stream) {
        if (!stream || typeof stream.getAudioTracks !== 'function') {
            return;
        }
        stream.getAudioTracks().forEach(function(track) {
            if (track && track.readyState !== 'ended') {
                track.enabled = true;
            }
        });
    }

    /**
     * @param {number} [ms]
     * @return {void}
     */
    function markMicrophoneSettleGrace(ms) {
        var wait = typeof ms === 'number' ? ms : 4000;
        microphoneSettleGraceUntil = Date.now() + wait;
    }

    /**
     * Wait for an already-granted mic track to become live (iOS delay).
     *
     * @param {MediaStream|null} stream
     * @param {number} [timeoutMs]
     * @return {Promise<MediaStream|null>}
     */
    function waitForLiveAudio(stream, timeoutMs) {
        if (!stream) {
            return Promise.resolve(stream);
        }
        enableAudioTracks(stream);
        if (mediaStreamHasLiveAudio(stream)) {
            return Promise.resolve(stream);
        }
        if (!mediaStreamHasAudioTrack(stream)) {
            return Promise.resolve(stream);
        }
        var timeout = typeof timeoutMs === 'number' ? timeoutMs : 2000;
        return new Promise(function(resolve) {
            var started = Date.now();
            var poll = function() {
                enableAudioTracks(stream);
                if (mediaStreamHasLiveAudio(stream) || Date.now() - started >= timeout) {
                    resolve(stream);
                    return;
                }
                window.setTimeout(poll, 150);
            };
            poll();
        });
    }

    /**
     * Desktop Mac (Safari, Chrome, Firefox). Not iPhone/iPad.
     *
     * @return {boolean}
     */
    function isMacDesktop() {
        var ua = navigator.userAgent || '';
        if (/iPhone|iPad|iPod/i.test(ua)) {
            return false;
        }
        if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
            return false;
        }
        return /Macintosh|Mac OS X/i.test(ua);
    }

    /**
     * First Mac/iOS mic grant is slow: OS prompt + AudioContext stay suspended.
     *
     * @return {boolean}
     */
    function needsSlowMicrophoneSettle() {
        return isIosPhone() || isMacDesktop();
    }

    /**
     * @return {number}
     */
    function getMicrophoneLiveWaitMs() {
        return needsSlowMicrophoneSettle() ? 2500 : 800;
    }

    /**
     * @return {number}
     */
    function getMicrophoneSettleGraceMs() {
        return needsSlowMicrophoneSettle() ? 8000 : 4000;
    }

    /**
     * Merge mic tracks onto the camera stream. Clone when addTrack fails
     * (Safari/Firefox Mac often reject a track already owned by another stream).
     *
     * @param {MediaStream} videoStream
     * @param {MediaStream} audioStream
     * @return {MediaStream}
     */
    function addMacAudioTracks(videoStream, audioStream) {
        if (!videoStream || !audioStream) {
            return videoStream;
        }
        audioStream.getAudioTracks().forEach(function(track) {
            if (!track || track.readyState === 'ended') {
                return;
            }
            track.enabled = true;
            var already = videoStream.getAudioTracks().some(function(existing) {
                return existing.id === track.id;
            });
            if (already) {
                return;
            }
            try {
                videoStream.addTrack(track);
            } catch (e) {
                try {
                    if (typeof track.clone === 'function') {
                        videoStream.addTrack(track.clone());
                    }
                } catch (err) {
                    // Ignore.
                }
            }
        });
        return videoStream;
    }

    /**
     * @param {boolean} needAudio
     * @param {boolean} hasAudio
     * @return {boolean}
     */
    function isMissingMediaReportDeferred(needAudio, hasAudio) {
        if (!needAudio || hasAudio) {
            return false;
        }
        // Safari on iOS can take several seconds to mark a granted mic live.
        // After that, a denied camera or microphone warns on the quiz interval.
        return Date.now() < microphoneSettleGraceUntil;
    }

    /**
     * @param {boolean} needAudio
     * @param {boolean} hasVideo
     * @param {boolean} hasAudio
     * @return {{key: string, message: string}}
     */
    function getMissingMediaAlertCopy(needAudio, hasVideo, hasAudio) {
        if (needAudio && hasVideo && !hasAudio) {
            return {
                key: 'nomicrophonedisabled',
                message: M.util.get_string('nomicrophonedisabled', 'quizaccess_quizproctoring', '')
            };
        }
        if (!hasVideo && (!needAudio || hasAudio)) {
            return {
                key: 'nocameradisabled',
                message: getNormalizedCameraDisabledMessage()
            };
        }
        return {
            key: 'nocameradetected',
            message: M.util.get_string('nocameradetectedm', 'quizaccess_quizproctoring', '')
        };
    }

    /**
     * Report camera and/or microphone disabled at the quiz time interval.
     *
     * @param {number} cmid
     * @param {number} attemptid
     * @param {boolean} mainimage
     * @param {{assumeVideo?: boolean}} [options]
     * @return {boolean} true when a device is missing
     */
    function reportMissingMediaIfNeeded(cmid, attemptid, mainimage, options) {
        if (mediaAcquireInProgress || mobileAudioAcquireInFlight) {
            return false;
        }
        var assumeVideo = options && options.assumeVideo;
        var hasVideo = assumeVideo || mediaStreamHasLiveVideo(localMediaStream);
        enableAudioTracks(localMediaStream);
        var hasAudio = mediaStreamHasLiveAudio(localMediaStream);
        var needAudio = ASK_AUDIO;
        if (hasVideo && (!needAudio || hasAudio)) {
            publisherReconnectGraceUntil = 0;
            clearMediaDisabledAlertState();
            return false;
        }
        if (Date.now() < publisherReconnectGraceUntil) {
            return false;
        }
        if (isMissingMediaReportDeferred(needAudio, hasAudio)) {
            return false;
        }
        var alertCopy = getMissingMediaAlertCopy(needAudio, hasVideo, hasAudio);
        reportMediaDisabledOnce(cmid, attemptid, mainimage, alertCopy.key, alertCopy.message);
        return true;
    }

    /**
     * Hide the attempt webcam when the quiz leaves the question page.
     *
     * @return {void}
     */
    function hideAttemptVideoUi() {
        document.body.classList.remove('quizproctoring-show-video');
        document.body.classList.add('proctorlink-on-summary');
        document.querySelectorAll(
            'video.quizaccess_quizproctoring-video, video#video, .proctorlink-video-wrap'
        ).forEach(function(el) {
            el.style.removeProperty('display');
            el.setAttribute('aria-hidden', 'true');
        });
    }

    /**
     * True when the quiz iframe (or this window) is on attempt.php.
     *
     * @return {boolean}
     */
    function isQuizIframeOnAttemptPage() {
        try {
            var iframe = document.getElementById(QUIZ_ATTEMPT_IFRAME_NAME);
            if (iframe && iframe.contentWindow) {
                var iframePath = iframe.contentWindow.location.pathname || '';
                return /\/mod\/quiz\/attempt\.php$/i.test(iframePath);
            }
        } catch (e) {
            return false;
        }
        return /\/mod\/quiz\/attempt\.php$/i.test(window.location.pathname || '');
    }

    /**
     * @param {string} pathname
     * @return {void}
     */
    function syncAttemptVideoForIframePath(pathname) {
        if (isSummaryPath(pathname) || isViewPath(pathname) || isReviewPath(pathname)) {
            hideAttemptVideoUi();
            stopParentCameraKeepShell({isView: isViewPath(pathname) || isReviewPath(pathname)});
            return;
        }
        if (!/\/mod\/quiz\/attempt\.php$/i.test(pathname || '')) {
            return;
        }
        resumeParentCameraKeepShell();
    }

    /**
     * Stop and remove parent webcam/mic while keeping the attempt shell
     * (summary / Back → view.php). Flush audio first so the last chunks are saved
     * before tracks are stopped.
     *
     * @param {{isView?: boolean}} [options]
     * @return {Promise}
     */
    function stopParentCameraKeepShell(options) {
        // Unload the publisher before audio flush. Otherwise the teacher
        // still sees the student until this promise finishes.
        disconnectLivePublisherNow();
        hideAttemptVideoUi();
        if (window.__proctorlinkCameraStopping) {
            return window.__proctorlinkCameraStopping;
        }
        document.body.classList.add('proctorlink-on-summary');
        if (options && options.isView) {
            document.body.classList.add('proctorlink-on-view');
        }
        stopFrontCameraGuard();
        try {
            EyeTracking.stop(false);
        } catch (e) {
            // Ignore.
        }
        if (objectDetectionController && typeof objectDetectionController.stop === 'function') {
            try {
                objectDetectionController.stop();
            } catch (e) {
                // Ignore.
            }
        }
        if (liveProctorImageInterval) {
            clearInterval(liveProctorImageInterval);
            liveProctorImageInterval = null;
        }
        if (localProctorImageTimeoutId) {
            window.clearTimeout(localProctorImageTimeoutId);
            localProctorImageTimeoutId = null;
        }
        if (localProctorImageInterval) {
            clearInterval(localProctorImageInterval);
            localProctorImageInterval = null;
        }
        proctorCaptureInFlight = false;
        lastMediaDisabledAlertAt = 0;
        liveIframeImageSeen = false;
        lastLiveIframeImageAt = 0;
        liveStudentIframeReady = false;
        onlineWebcamSetupPromise = null;
        userAudioHookStarted = false;

        var releaseMedia = function() {
            if (localMediaStream) {
                try {
                    localMediaStream.getTracks().forEach(function(track) {
                        try {
                            track.onended = null;
                        } catch (e2) {
                            // Ignore.
                        }
                        track.stop();
                    });
                } catch (e) {
                    // Ignore.
                }
                localMediaStream = null;
            }
            document.querySelectorAll('video.quizaccess_quizproctoring-video, video#video').forEach(function(videoEl) {
                if (videoEl.srcObject) {
                    try {
                        videoEl.srcObject.getTracks().forEach(function(track) {
                            track.stop();
                        });
                    } catch (e) {
                        // Ignore.
                    }
                    videoEl.srcObject = null;
                }
                if (videoEl.parentNode) {
                    videoEl.parentNode.removeChild(videoEl);
                }
            });
            document.querySelectorAll('.proctorlink-video-wrap').forEach(function(wrap) {
                if (!wrap.querySelector('video') && wrap.parentNode) {
                    wrap.parentNode.removeChild(wrap);
                }
            });
            var studentContainer = document.querySelector('.student-iframe-container');
            if (studentContainer) {
                var studentFrame = studentContainer.querySelector('iframe');
                if (studentFrame) {
                    var frameSrc = studentFrame.getAttribute('src') || studentFrame.src || '';
                    if (frameSrc && frameSrc.indexOf('about:blank') === -1) {
                        pausedStudentIframeSrc = frameSrc;
                    }
                    try {
                        studentFrame.src = 'about:blank';
                    } catch (e) {
                        // Ignore.
                    }
                    studentFrame.removeAttribute('src');
                    studentFrame.removeAttribute('allow');
                }
                studentContainer.style.setProperty('display', 'none', 'important');
                if (studentContainer.parentNode) {
                    studentContainer.parentNode.removeChild(studentContainer);
                }
            }
        };

        window.__proctorlinkCameraStopping = Promise.all([
            flushProctorlinkAudioUpload(true).catch(function() {
                return null;
            }),
            // Wait until Firefox has unloaded the publisher. Removing it first
            // skips LiveKit disconnect and the teacher picture lingers.
            disconnectLivePublisherNow()
        ]).then(function() {
            releaseMedia();
            return null;
        }).finally(function() {
            window.__proctorlinkCameraStopping = null;
        });
        return window.__proctorlinkCameraStopping;
    }

    /**
     * Add or reuse a hidden field on a form (uses the form's document so this
     * works when the form lives in the quiz iframe).
     *
     * @param {HTMLFormElement} form
     * @param {string} name
     * @param {string} value
     * @return {HTMLInputElement|null}
     */
    function ensureHiddenFormField(form, name, value) {
        if (!form || !name) {
            return null;
        }
        var existing = form.querySelector('input[name="' + name + '"]');
        if (existing) {
            if (!existing.value || existing.value === '0') {
                existing.value = value;
            }
            return existing;
        }
        var formDoc = form.ownerDocument || document;
        var hidden = formDoc.createElement('input');
        hidden.type = 'hidden';
        hidden.name = name;
        hidden.value = value;
        form.appendChild(hidden);
        return hidden;
    }

    /**
     * Programmatic summary submit must include finishattempt/timeup.
     * Calling form.submit() omits the clicked button, so Moodle treats it as return to attempt.
     *
     * @param {HTMLFormElement} form
     * @return {void}
     */
    function submitSummaryFinishForm(form) {
        if (!form) {
            return;
        }
        ensureHiddenFormField(form, 'finishattempt', '1');
        // Calling requestSubmit() requires a real submitter.
        // A hidden finishattempt input throws TypeError; fall back to the submit button.
        var submitter = form.querySelector('button[type="submit"], input[type="submit"]');
        try {
            if (typeof form.requestSubmit === 'function') {
                if (submitter) {
                    form.requestSubmit(submitter);
                } else {
                    form.requestSubmit();
                }
                return;
            }
        } catch (e) {
            // Fall through to form.submit().
        }
        try {
            HTMLFormElement.prototype.submit.call(form);
        } catch (e2) {
            form.submit();
        }
    }

    /**
     * Flush audio chunks before final quiz submit from the summary page.
     * Shell mode disables audiorecord's automatic form-submit flush.
     *
     * @param {HTMLFormElement} form
     * @return {void}
     */
    function flushAudioThenSubmitSummaryForm(form) {
        if (!form || form.dataset.proctorlinkAudioFlushed === '1') {
            return;
        }
        form.dataset.proctorlinkAudioFlushed = '1';
        hideAttemptVideoUi();
        showOpaqueLeaveCover();
        var finishSubmit = function() {
            submitSummaryFinishForm(form);
        };
        var timedOut = false;
        var timer = window.setTimeout(function() {
            timedOut = true;
            finishSubmit();
        }, 8000);
        flushProctorlinkAudioUpload(true).then(function() {
            if (!timedOut) {
                window.clearTimeout(timer);
                finishSubmit();
            }
            return null;
        }).catch(function() {
            if (!timedOut) {
                window.clearTimeout(timer);
                finishSubmit();
            }
            return null;
        });
    }

    /**
     * Moodle summary "Submit all and finish" form (#frm-finishattempt).
     * Do not key off translated button text, and do not treat the attempt
     * #responseform as a finish form just because it has a hidden timeup field.
     *
     * @param {HTMLFormElement|Element|null} form
     * @return {boolean}
     */
    function isSummaryFinishAttemptForm(form) {
        if (!form || !form.querySelector) {
            return false;
        }
        if (form.id === 'frm-finishattempt') {
            return true;
        }
        return !!form.querySelector('input[name="finishattempt"], button[name="finishattempt"]');
    }

    /**
     * True for the summary finish control. Labels are translated
     * (FR "Tout envoyer et terminer", TR "Tümünü gönder ve bitir"), so match
     * Moodle's .btn-finishattempt / #frm-finishattempt markup instead.
     *
     * @param {Element|null} submit
     * @param {HTMLFormElement|Element|null} form
     * @return {boolean}
     */
    function isSummaryFinishControl(submit, form) {
        if (submit && submit.closest &&
                submit.closest('.btn-finishattempt, #frm-finishattempt')) {
            return true;
        }
        return isSummaryFinishAttemptForm(form);
    }

    /**
     * Restart speech recording after summary/view → attempt.
     *
     * @return {void}
     */
    function restartAttemptAudioRecording() {
        if (!attemptMediaResume || !Number(attemptMediaResume.enableRecordAudio)) {
            return;
        }
        userAudioHookStarted = false;
        startUserAudioRecording(localMediaStream, attemptMediaResume.attemptid);
    }

    /**
     * On iOS, live tracks often stay muted or frozen after iframe Back.
     *
     * @param {MediaStream|null} stream
     * @return {void}
     */
    function unstickIosMediaStream(stream) {
        if (!stream || !stream.getTracks) {
            return;
        }
        stream.getTracks().forEach(function(track) {
            if (!track || track.readyState !== 'live') {
                return;
            }
            try {
                track.enabled = false;
                track.enabled = true;
            } catch (e) {
                // Ignore.
            }
        });
    }

    /**
     * True when the parent camera should be revived (attempt shell / attempt page).
     *
     * @return {boolean}
     */
    function canResumeParentCameraKeepShell() {
        if (document.body.classList.contains('proctorlink-on-summary') ||
                document.body.classList.contains('proctorlink-on-view')) {
            if (!isQuizIframeOnAttemptPage()) {
                return false;
            }
        }
        if (isQuizIframeOnAttemptPage()) {
            return true;
        }
        // Back on iOS can throw while the quiz iframe is restoring from history.
        return document.body.classList.contains('proctorlink-attempt-shell');
    }

    /**
     * Play the existing webcam preview without reconnecting the MediaStream.
     *
     * @return {void}
     */
    function keepLivePreviewPlayingIfNeeded() {
        var videoEl = document.querySelector('video.quizaccess_quizproctoring-video') ||
            document.getElementById('video');
        if (!videoEl || !localMediaStream) {
            return;
        }
        if (videoEl.srcObject !== localMediaStream) {
            attachStreamToVideoElement(videoEl, localMediaStream);
            return;
        }
        if (!videoEl.paused && !videoEl.ended) {
            return;
        }
        var playPromise = videoEl.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(function() {
                // Ignore.
            });
        }
    }

    /**
     * Re-open the parent webcam after Return / Continue from summary or view.
     *
     * @return {void}
     */
    function resumeParentCameraKeepShell() {
        if (!canResumeParentCameraKeepShell()) {
            return;
        }

        var beginResume = function() {
            if (!canResumeParentCameraKeepShell()) {
                return;
            }
            resumeParentCameraKeepShellNow();
        };
        if (window.__proctorlinkCameraStopping) {
            Promise.resolve(window.__proctorlinkCameraStopping)
                .catch(function() {
                    return null;
                })
                .then(beginResume)
                .catch(function() {
                    return null;
                });
            return;
        }
        beginResume();
    }

    /**
     * Post init after the publisher document loads. Posting before load is dropped,
     * so the teacher room stays blank while local snapshots continue.
     *
     * @param {HTMLIFrameElement} frame
     * @return {void}
     */
    function bindStudentPublisherLoad(frame) {
        if (!frame || frame.getAttribute('data-proctorlink-pub-load') === '1') {
            return;
        }
        frame.setAttribute('data-proctorlink-pub-load', '1');
        frame.addEventListener('load', function() {
            var src = frame.getAttribute('src') || '';
            if (!src || src.indexOf('about:blank') !== -1) {
                return;
            }
            postStudentIframeInit(frame.contentWindow, liveUseParentMedia && !isAndroidPhone());
        });
    }

    /**
     * Firefox will not unload a throttled cross-origin publisher, so LiveKit
     * stays in the teacher room until the frame is removed and the server
     * times the participant out.
     *
     * @param {HTMLIFrameElement} iframeEl
     * @return {void}
     */
    function wakePublisherFrameForUnload(iframeEl) {
        var container = iframeEl.parentElement;
        iframeEl.style.setProperty('display', 'block', 'important');
        iframeEl.style.setProperty('visibility', 'visible', 'important');
        iframeEl.style.setProperty('opacity', '1', 'important');
        iframeEl.style.setProperty('width', '2px', 'important');
        iframeEl.style.setProperty('height', '2px', 'important');
        if (!container) {
            return;
        }
        container.style.setProperty('display', 'block', 'important');
        container.style.setProperty('visibility', 'visible', 'important');
        container.style.setProperty('opacity', '1', 'important');
        container.style.setProperty('width', '2px', 'important');
        container.style.setProperty('height', '2px', 'important');
        container.style.setProperty('z-index', '1002', 'important');
    }

    /**
     * Leave the teacher room immediately. The student page disconnects when
     * this frame unloads; removing the node first only times the room out.
     *
     * @return {Promise<void>}
     */
    function disconnectLivePublisherNow() {
        var iframeEl = document.querySelector('.student-iframe-container iframe');
        if (!iframeEl) {
            return Promise.resolve();
        }
        var src = iframeEl.getAttribute('src') || '';
        if (!src || src.indexOf('about:blank') !== -1) {
            return publisherBlankPromise || Promise.resolve();
        }
        if (!pausedStudentIframeSrc) {
            pausedStudentIframeSrc = src;
        }
        if (publisherBlankPromise) {
            return publisherBlankPromise;
        }
        publisherBlankPromise = new Promise(function(resolve) {
            var settled = false;
            var finish = function() {
                if (settled) {
                    return;
                }
                settled = true;
                resolve();
            };
            // A hidden frame's about:blank navigation is deferred in Firefox,
            // so the summary page is already up while the teacher still sees video.
            wakePublisherFrameForUnload(iframeEl);
            iframeEl.addEventListener('load', finish, {once: true});
            try {
                iframeEl.src = 'about:blank';
            } catch (e) {
                finish();
                return;
            }
            window.setTimeout(finish, 1200);
        }).then(function() {
            publisherBlankPromise = null;
            return null;
        });
        return publisherBlankPromise;
    }

    /**
     * Restore the teacher publisher iframe after summary/view paused it.
     *
     * @return {void}
     */
    function restorePausedStudentPublisherIframe() {
        if (!pausedStudentIframeSrc) {
            return;
        }
        var url = pausedStudentIframeSrc;
        var container = document.querySelector('.student-iframe-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'student-iframe-container';
            document.body.appendChild(container);
        }
        var frame = container.querySelector('iframe');
        if (!frame) {
            frame = document.createElement('iframe');
            frame.setAttribute('frameborder', '0');
            container.appendChild(frame);
        }
        frame.setAttribute('allow', 'camera; microphone; autoplay; fullscreen');
        bindStudentPublisherLoad(frame);
        pausedStudentIframeSrc = null;
        // Android will not start the camera in an iframe that is display:none.
        // Show the off-screen publisher first, then navigate after the lens
        // released on submit is free. A parent getUserMedia here takes that lens
        // and the teacher picture never starts.
        hideStudentIframeFromStudent();
        var assignSrc = function() {
            if (!frame.isConnected) {
                return;
            }
            var current = frame.getAttribute('src') || '';
            if (current !== url) {
                frame.src = url;
            }
        };
        if (isAndroidPhone()) {
            window.setTimeout(assignSrc, 700);
        } else {
            assignSrc();
        }
    }

    /**
     * Re-attach a still-live parent camera after a hard revive.
     *
     * @param {boolean} hardRevive
     * @return {void}
     */
    function reattachLiveAttemptPreview(hardRevive) {
        var videoEl = document.querySelector('video.quizaccess_quizproctoring-video');
        if (!videoEl && attemptMediaResume) {
            videoEl = appendAttemptVideo(attemptMediaResume.enableStudentVideo);
        }
        if (hardRevive && (isIosPhone() || isPhoneCameraDevice())) {
            unstickIosMediaStream(localMediaStream);
            if (videoEl) {
                try {
                    videoEl.srcObject = null;
                } catch (clearSrcErr) {
                    // Ignore.
                }
            }
        }
        if (videoEl && localMediaStream && videoEl.srcObject !== localMediaStream) {
            attachStreamToVideoElement(videoEl, localMediaStream);
        }
        if (videoEl) {
            applyAttemptVideoVisibility(
                videoEl,
                attemptMediaResume ? attemptMediaResume.enableStudentVideo : 1
            );
        }
        ensureAttemptVideoPlaying();
        restartProctorIntervalCapture(true);
        restartAttemptAudioRecording();
        reviveLiveStudentPublisher(hardRevive);
    }

    /**
     * Restart webcam after summary/view stopped the tracks.
     *
     * @return {void}
     */
    function restartAttemptMediaFromResume() {
        if (!attemptMediaResume) {
            return;
        }
        // A promise left from the camera opened before summary would resolve
        // against the video element that releaseMedia already removed.
        onlineWebcamSetupPromise = null;
        var args = attemptMediaResume;
        if (args.mode === 'live') {
            appendAttemptVideo(args.enableStudentVideo);
            if (!document.getElementById('canvas')) {
                $('<canvas>').attr({
                    id: 'canvas',
                    width: '280',
                    height: '240',
                    'style': 'display: none;'
                }).appendTo('body');
            }
            bindMobileAudioGestureRetry(
                args.attemptid, args.enableRecordAudio, args.cmid, args.mainimage
            );
            startOnlineProctoringWebcam(
                args.cmid, args.attemptid, args.mainimage, ASK_AUDIO, args.enableRecordAudio
            ).then(function(stream) {
                if (stream && mediaStreamHasLiveVideo(stream)) {
                    liveUseParentMedia = true;
                }
                restartProctorIntervalCapture(true);
                return null;
            }).catch(function() {
                return null;
            });
            return;
        }
        setupLocalMedia(
            args.cmid, args.mainimage, args.verifyduringattempt, args.attemptid,
            args.teacher, args.enableStudentVideo, args.enableRecordAudio,
            args.setinterval, args.quizid, function() {
                restartProctorIntervalCapture(true);
            }
        );
    }

    /**
     * True when the teacher video iframe is already connected.
     *
     * @return {boolean}
     */
    function studentPublisherIsActive() {
        var iframeEl = document.querySelector('.student-iframe-container iframe');
        if (!iframeEl) {
            return false;
        }
        var src = iframeEl.getAttribute('src') || '';
        return Boolean(src) && src.indexOf('about:blank') === -1;
    }

    /**
     * Next and Previous only change the question. Keep the camera that is already
     * live in the security popup so the teacher stream is not reloaded.
     *
     * @return {boolean}
     */
    function attemptCameraAlreadyLiveInPopup() {
        return isQuizSecurityPopup() &&
            !pausedStudentIframeSrc &&
            !document.body.classList.contains('proctorlink-on-summary') &&
            !document.body.classList.contains('proctorlink-on-view') &&
            (mediaStreamHasLiveVideo(localMediaStream) || studentPublisherIsActive());
    }

    /**
     * @return {void}
     */
    function resumeParentCameraKeepShellNow() {
        var hasLive = mediaStreamHasLiveVideo(localMediaStream) ||
            mediaStreamHasLiveAudio(localMediaStream);
        var hardRevive = hardMediaRevivePending;
        var returning = Boolean(pausedStudentIframeSrc) || hardRevive ||
            document.body.classList.contains('proctorlink-on-summary') ||
            document.body.classList.contains('proctorlink-on-view');
        // Submit / Return to attempt must still bring the stream back.
        if (attemptCameraAlreadyLiveInPopup()) {
            document.body.classList.remove('proctorlink-on-summary');
            document.body.classList.remove('proctorlink-on-view');
            revealAttemptVideoAfterReturn();
            keepLivePreviewPlayingIfNeeded();
            return;
        }
        if (!returning && (hasLive || studentPublisherIsActive())) {
            revealAttemptVideoAfterReturn();
            keepLivePreviewPlayingIfNeeded();
            return;
        }
        hardMediaRevivePending = false;
        userAudioHookStarted = false;
        // The publisher reloads after submit. "ready" arrives before the camera
        // and mic are live, especially while a non-English page is still loading.
        liveIframeImageSeen = false;
        lastLiveIframeImageAt = 0;
        publisherReconnectGraceUntil = Date.now() + 30000;
        clearMediaDisabledAlertState();
        document.body.classList.remove('proctorlink-on-view');
        document.body.classList.remove('proctorlink-on-summary');
        if (!pausedStudentIframeSrc && attemptMediaResume && attemptMediaResume.liveIframeUrl) {
            pausedStudentIframeSrc = attemptMediaResume.liveIframeUrl;
        }
        // Android publishes from the student iframe. Opening the camera in this
        // page as well leaves the teacher room with no video.
        if (isAndroidPhone()) {
            liveUseParentMedia = false;
        }
        // Summary removes the publisher. One fresh load republishes the teacher
        // room. Blanking that iframe again drops the video; snapshots do not use it.
        var publisherWasRemoved = !studentPublisherIsActive();
        restorePausedStudentPublisherIframe();
        hideStudentIframeFromStudent();
        revealAttemptVideoAfterReturn();
        if (isAndroidPhone()) {
            restartProctorIntervalCapture(true);
            return;
        }
        if (hasLive) {
            reattachLiveAttemptPreview(false);
            revealAttemptVideoAfterReturn();
            return;
        }
        if (hardRevive && !publisherWasRemoved) {
            reviveLiveStudentPublisher(true);
        }
        // Live publisher and the local preview both lose their tracks on summary.
        // Restart whenever the stream is gone. Android already returned above so
        // this page does not open a second camera there.
        if (attemptMediaResume) {
            restartAttemptMediaFromResume();
            return;
        }
        restartProctorIntervalCapture(true);
    }

    /**
     * Summary hides the webcam with display:none. In the browser-security popup
     * the quiz iframe then covers that spot, so the picture stays hidden on return.
     *
     * @return {void}
     */
    function revealAttemptVideoAfterReturn() {
        var enable = attemptMediaResume ? attemptMediaResume.enableStudentVideo : 1;
        var videoEl = getAttemptVideoElement();
        if (!videoEl && attemptMediaResume) {
            videoEl = appendAttemptVideo(enable);
        }
        if (!videoEl) {
            return;
        }
        applyAttemptVideoVisibility(videoEl, enable);
        var showPreview = shouldShowStudentVideoPreview(enable);
        document.querySelectorAll(
            'video.quizaccess_quizproctoring-video, video#video, .proctorlink-video-wrap'
        ).forEach(function(el) {
            el.style.removeProperty('display');
            el.style.setProperty('display', 'block', 'important');
            if (showPreview) {
                el.style.setProperty('visibility', 'visible', 'important');
                el.style.setProperty('opacity', '1', 'important');
                el.removeAttribute('aria-hidden');
            }
        });
        var wrap = videoEl.parentElement &&
            videoEl.parentElement.classList.contains('proctorlink-video-wrap') ?
            videoEl.parentElement : videoEl;
        if (shouldShowStudentVideoPreview(enable)) {
            wrap.classList.remove('quizproctoring-video-offscreen');
            videoEl.classList.remove('quizproctoring-video-offscreen');
            wrap.style.setProperty('z-index', '10000001', 'important');
            videoEl.style.setProperty('z-index', '10000001', 'important');
        }
    }

    /**
     * @param {string} pathname
     * @return {boolean}
     */
    function isTransientQuizPath(pathname) {
        return /\/mod\/quiz\/(?:startattempt|processattempt)\.php$/i.test(pathname || '');
    }

    /**
     * @param {Location|URL|{search: string}} loc Window location
     * @return {number|null}
     */
    function parseAttemptIdFromLocation(loc) {
        try {
            var params = new URLSearchParams(loc.search || '');
            var id = params.get('attempt');
            return id ? parseInt(id, 10) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Moodle "Return to attempt" POSTs to bare attempt.php (params in hidden fields),
     * so the address bar often has no ?attempt= even though the page is valid.
     *
     * @return {number|null}
     */
    function parseAttemptIdFromDocument() {
        var el = document.querySelector(
            '#responseform input[name="attempt"], input[name="attempt"]'
        );
        if (!el || !el.value) {
            return null;
        }
        var id = parseInt(el.value, 10);
        return id ? id : null;
    }

    /**
     * @param {Location|URL|{search: string}} loc
     * @param {number|string|null} [fallback]
     * @return {number|null}
     */
    function resolveAttemptId(loc, fallback) {
        var fromUrl = parseAttemptIdFromLocation(loc);
        if (fromUrl) {
            return fromUrl;
        }
        var fromDom = parseAttemptIdFromDocument();
        if (fromDom) {
            return fromDom;
        }
        if (fallback !== null && fallback !== undefined && fallback !== '') {
            var id = parseInt(fallback, 10);
            return id ? id : null;
        }
        return null;
    }

    /**
     * @param {Location} loc Window location
     * @return {number|null}
     */
    function parseCmidFromLocation(loc) {
        try {
            var params = new URLSearchParams(loc.search || '');
            var cmid = params.get('cmid');
            return cmid ? parseInt(cmid, 10) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * @return {number|null}
     */
    function parseCmidFromDocument() {
        var el = document.querySelector('#responseform input[name="cmid"], input[name="cmid"]');
        if (!el || !el.value) {
            return null;
        }
        var id = parseInt(el.value, 10);
        return id ? id : null;
    }

    /**
     * @param {number|string|null} [fallback]
     * @return {number|null}
     */
    function resolveCmid(fallback) {
        var fromUrl = parseCmidFromLocation(window.location);
        if (fromUrl) {
            return fromUrl;
        }
        var fromDom = parseCmidFromDocument();
        if (fromDom) {
            return fromDom;
        }
        if (fallback !== null && fallback !== undefined && fallback !== '') {
            var id = parseInt(fallback, 10);
            return id ? id : null;
        }
        return null;
    }

    /**
     * Build a GET attempt URL with query params (needed for the shell iframe).
     *
     * @param {number} attemptId
     * @param {number|null} cmid
     * @return {string}
     */
    function buildAttemptShellUrl(attemptId, cmid) {
        var url = new URL(M.cfg.wwwroot + '/mod/quiz/attempt.php');
        url.searchParams.set('attempt', String(attemptId));
        if (cmid) {
            url.searchParams.set('cmid', String(cmid));
        }
        try {
            var pageParam = new URLSearchParams(window.location.search || '').get('page');
            if (pageParam === null || pageParam === '') {
                // Use thispage (current page). Do not fall back to #followingpage:
                // that is Moodle's next page and querySelector would pick it if it
                // appears first in the DOM, skipping a question after refresh.
                var pageEl = document.querySelector('input[name="thispage"]');
                if (pageEl && pageEl.value !== '') {
                    pageParam = pageEl.value;
                }
            }
            if (pageParam !== null && pageParam !== '' && Number(pageParam) >= 0) {
                url.searchParams.set('page', String(pageParam));
            }
        } catch (e) {
            // Ignore.
        }
        return url.toString();
    }

    /**
     * @param {Location} loc Iframe location
     * @return {boolean} true when this location was handled as attempt.php without attempt id
     */
    function trySyncParentAttemptIdFromIframe(loc) {
        var path = loc.pathname || '';
        if (!/\/mod\/quiz\/attempt\.php$/i.test(path) || parseAttemptIdFromLocation(loc)) {
            return false;
        }
        var iframe = document.getElementById(QUIZ_ATTEMPT_IFRAME_NAME);
        var doc = iframe && iframe.contentDocument;
        var aid = null;
        var cmid = null;
        if (doc) {
            var aEl = doc.querySelector('#responseform input[name="attempt"], input[name="attempt"]');
            var cEl = doc.querySelector('#responseform input[name="cmid"], input[name="cmid"]');
            aid = aEl && aEl.value ? parseInt(aEl.value, 10) : null;
            cmid = cEl && cEl.value ? parseInt(cEl.value, 10) : null;
        }
        if (aid) {
            var built = new URL(buildAttemptShellUrl(aid, cmid));
            var target = built.pathname + built.search;
            if ((window.location.pathname + window.location.search) !== target) {
                window.history.replaceState(window.history.state, document.title, target);
            }
        }
        return true;
    }

    /**
     * @param {Location} loc Iframe location
     * @return {void}
     */
    function syncParentUrlFromIframeLocation(loc) {
        if (!loc || !loc.href || isProctorlinkQuizIframe()) {
            return;
        }
        try {
            var path = loc.pathname || '';
            if (!isAttemptOrSummaryPath(path)) {
                return;
            }
            if (trySyncParentAttemptIdFromIframe(loc)) {
                return;
            }
            if (/\/mod\/quiz\/attempt\.php$/i.test(window.location.pathname || '') &&
                    !parseAttemptIdFromLocation(window.location)) {
                return;
            }
            var newUrl = path + (loc.search || '') + (loc.hash || '');
            if (window.location.pathname === path && window.location.search === (loc.search || '')) {
                return;
            }
            window.history.replaceState(window.history.state, document.title, newUrl);
        } catch (e) {
            // Ignore.
        }
    }

    /**
     * @param {Element} link
     * @param {string} href
     * @param {Location} winLocation
     * @return {boolean}
     */
    function isSamePageQuizNavLink(link, href, winLocation) {
        if (!link || !href || !winLocation) {
            return false;
        }
        if (href.charAt(0) === '#') {
            return true;
        }
        if (link.classList && link.classList.contains('thispage')) {
            return true;
        }
        if (href.indexOf('#question-') === -1) {
            return false;
        }
        try {
            var dest = new URL(href, winLocation.href);
            return dest.pathname === winLocation.pathname && dest.search === winLocation.search;
        } catch (e) {
            return false;
        }
    }

    /**
     * Compare attempt URLs ignoring cache-bust params.
     *
     * @param {string} a
     * @param {string} b
     * @return {boolean}
     */
    function sameAttemptShellUrl(a, b) {
        if (!a || !b || a === 'about:blank' || b === 'about:blank') {
            return false;
        }
        try {
            var ua = new URL(a, window.location.href);
            var ub = new URL(b, window.location.href);
            ua.searchParams.delete('_pls');
            ub.searchParams.delete('_pls');
            return ua.pathname === ub.pathname && ua.search === ub.search;
        } catch (e) {
            return false;
        }
    }

    /**
     * Load a URL into the quiz iframe without bouncing through about:blank
     * (about:blank aborts in-flight Moodle AMD/jQuery and causes RequireJS scripterror).
     *
     * @param {HTMLIFrameElement} iframe
     * @param {string} url
     * @param {{force: boolean}} [options]
     * @return {boolean} true when src was changed
     */
    function forceQuizIframeToUrl(iframe, url, options) {
        if (!iframe || !url) {
            return false;
        }
        var currentSrc = iframe.getAttribute('src') || '';
        if (!(options && options.force) && currentSrc && currentSrc !== 'about:blank' &&
                sameAttemptShellUrl(currentSrc, url)) {
            return false;
        }
        iframe.src = url;
        return true;
    }

    /**
     * @return {HTMLIFrameElement}
     */
    function ensureQuizAttemptIframe() {
        var iframe = document.querySelector('iframe[name="' + QUIZ_ATTEMPT_IFRAME_NAME + '"]');
        if (iframe) {
            return iframe;
        }
        iframe = document.createElement('iframe');
        iframe.name = QUIZ_ATTEMPT_IFRAME_NAME;
        iframe.id = QUIZ_ATTEMPT_IFRAME_NAME;
        iframe.className = 'proctorlink-quiz-attempt-iframe';
        iframe.setAttribute('allow', 'camera; microphone; autoplay; fullscreen');
        iframe.setAttribute('title', 'Quiz attempt');
        iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;opacity:0;';
        document.body.appendChild(iframe);
        return iframe;
    }

    /**
     * Hide Moodle chrome once the attempt iframe is ready to cover the viewport.
     *
     * @return {void}
     */
    function hideAttemptPageChrome() {
        ['page', 'page-header', 'page-navbar', 'page-footer', 'nav-drawer',
            'theme_boost-drawers-blocks', 'theme_boost-drawers-courseindex',
            'theme_boost-drawers-primary'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.dataset.proctorlinkHidden = '1';
            }
        });
        document.querySelectorAll(
            '.navbar.fixed-top, .drawer, .drawer-toggler, [data-region="fixed-drawer"]'
        ).forEach(function(el) {
            el.style.display = 'none';
            el.dataset.proctorlinkHidden = '1';
        });
    }

    /**
     * Disable Boost #page.drawers margin animation on the parent shell only.
     * Do not force overflow-y:scroll on the parent (conflicts with shell overflow:hidden).
     *
     * @return {void}
     */
    function freezeParentShellDrawerTransition() {
        var page = document.getElementById('page');
        if (page) {
            page.style.setProperty('transition', 'none', 'important');
        }
    }

    /**
     * Disable Boost #page.drawers margin animation and keep scrollbar space stable
     * inside the quiz iframe (prevents left/right slide glitches).
     *
     * @param {Document} [doc]
     * @return {void}
     */
    function freezeQuizPageDrawerTransition(doc) {
        var root = doc || document;
        if (root === document && !isProctorlinkQuizIframe()) {
            freezeParentShellDrawerTransition();
            return;
        }
        var html = root.documentElement;
        if (html) {
            html.classList.add('proctorlink-quiz-iframe');
            html.style.setProperty('scrollbar-gutter', 'stable');
        }
        if (root.body) {
            root.body.classList.add('proctorlink-quiz-iframe');
            root.body.style.setProperty('scrollbar-gutter', 'stable');
        }
        var page = root.getElementById('page');
        if (page) {
            page.style.setProperty('transition', 'none', 'important');
        }
    }

    /**
     * Size the quiz iframe to the visual viewport so it matches top-level pages
     * (summary / parent attempt) and does not sit ~scrollbar-width narrower.
     *
     * @param {HTMLIFrameElement} [iframe]
     * @return {void}
     */
    function sizeQuizAttemptIframeToViewport(iframe) {
        var el = iframe || document.getElementById(QUIZ_ATTEMPT_IFRAME_NAME);
        if (!el) {
            return;
        }
        var w = window.innerWidth || document.documentElement.clientWidth;
        var h = window.innerHeight || document.documentElement.clientHeight;
        el.style.cssText = 'position:fixed;top:0;left:0;width:' + w +
            'px;height:' + h + 'px;border:0;z-index:1000;background:#fff;';
    }

    /**
     * @return {void}
     */
    function activateAttemptShell() {
        var firstActivate = !document.body.classList.contains('proctorlink-attempt-shell');
        freezeQuizPageDrawerTransition(document);
        document.body.classList.remove('proctorlink-shell-preparing');
        document.body.classList.add('proctorlink-attempt-shell');
        var quizIframe = document.getElementById(QUIZ_ATTEMPT_IFRAME_NAME);
        if (quizIframe) {
            sizeQuizAttemptIframeToViewport(quizIframe);
            try {
                freezeQuizPageDrawerTransition(quizIframe.contentDocument);
            } catch (e) {
                // Ignore.
            }
        }
        hideAttemptPageChrome();
        $('.mod_quiz_preflight_popup').hide();
        if (firstActivate) {
            $('.modal-backdrop, .yui3-widget-mask').remove();
            $('body').removeClass('modal-open');
            document.body.style.paddingRight = '';
            $('.modal.show').removeClass('show').css('display', 'none');
            cleanupModalBackdrop();
            if (!window.__proctorlinkShellResizeBound) {
                window.__proctorlinkShellResizeBound = true;
                window.addEventListener('resize', function() {
                    if (document.body.classList.contains('proctorlink-attempt-shell')) {
                        sizeQuizAttemptIframeToViewport();
                    }
                });
            }
        }
        hideQuizIframeLoading();
    }

    /**
     * True when the quiz iframe has finished loading an attempt page.
     *
     * @param {HTMLIFrameElement} iframe
     * @return {boolean}
     */
    function isQuizIframeAttemptReady(iframe) {
        try {
            var doc = iframe && iframe.contentDocument;
            var path = iframe.contentWindow.location.pathname || '';
            return Boolean(
                doc &&
                /\/mod\/quiz\/attempt\.php$/i.test(path) &&
                doc.getElementById('responseform')
            );
        } catch (e) {
            return false;
        }
    }

    /**
     * Undo a failed shell reveal so the already-rendered parent attempt stays usable.
     *
     * @return {void}
     */
    function abortAttemptShellReveal() {
        document.body.classList.remove('proctorlink-shell-preparing');
        document.body.classList.remove('proctorlink-attempt-shell');
        hideQuizIframeLoading();
        document.querySelectorAll('[data-proctorlink-hidden]').forEach(function(el) {
            el.style.display = '';
            delete el.dataset.proctorlinkHidden;
        });
        var iframe = document.getElementById(QUIZ_ATTEMPT_IFRAME_NAME);
        if (iframe) {
            iframe.style.cssText =
                'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;opacity:0;';
        }
    }

    /**
     * Parent already rendered the attempt (e.g. Return to attempt POST). Keep it
     * visible until the shell iframe is ready, then swap — never use an opaque
     * cover here (that shows a blank page during the transition).
     *
     * @param {HTMLIFrameElement} iframe
     * @param {string} shellUrl
     * @return {void}
     */
    function prepareAndRevealAttemptShell(iframe, shellUrl) {
        if (!iframe || !shellUrl) {
            return;
        }
        iframe.dataset.proctorlinkSrcSet = '1';
        quizAttemptSeenInIframe = true;

        if (isQuizIframeAttemptReady(iframe)) {
            activateAttemptShell();
            return;
        }

        freezeQuizPageDrawerTransition(document);
        document.body.classList.add('proctorlink-shell-preparing');
        var revealed = false;
        var reveal = function() {
            if (revealed || !isQuizIframeAttemptReady(iframe)) {
                return;
            }
            revealed = true;
            activateAttemptShell();
        };

        iframe.addEventListener('load', reveal);
        forceQuizIframeToUrl(iframe, shellUrl, {force: true});
        window.setTimeout(reveal, 300);
        window.setTimeout(function() {
            if (!revealed) {
                abortAttemptShellReveal();
            }
        }, 8000);
    }

    /**
     * @return {void}
     */
    function removeQuizAttemptIframe() {
        var iframe = document.getElementById(QUIZ_ATTEMPT_IFRAME_NAME);
        if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    }

    /**
     * Recover from bfcache / SEB exit leaving shell + spinner without a quiz iframe.
     *
     * @return {void}
     */
    function resetStaleProctorlinkShellState() {
        var iframe = document.getElementById(QUIZ_ATTEMPT_IFRAME_NAME);
        var overlay = document.getElementById('proctorlink-quiz-loading');
        var loadingVisible = overlay && overlay.classList.contains('is-visible');
        var shellActive = document.body.classList.contains('proctorlink-attempt-shell');
        if (!shellActive && !loadingVisible) {
            return;
        }
        if (!iframe || leavingAttemptShell) {
            stopLiveProctoringMedia();
            leavingAttemptShell = false;
            return;
        }
        if (loadingVisible) {
            try {
                var path = iframe.contentWindow.location.pathname || '';
                if (!/\/mod\/quiz\/attempt\.php$/i.test(path)) {
                    stopLiveProctoringMedia();
                    leavingAttemptShell = false;
                }
            } catch (e) {
                stopLiveProctoringMedia();
                leavingAttemptShell = false;
            }
        }
    }

    /**
     * Loading overlay stayed up but the quiz iframe never reached attempt.php.
     *
     * @return {void}
     */
    function recoverFromStuckQuizLoading() {
        hideQuizIframeLoading();
        var iframe = document.getElementById(QUIZ_ATTEMPT_IFRAME_NAME);
        if (!iframe) {
            stopLiveProctoringMedia();
            leavingAttemptShell = false;
            return;
        }
        try {
            var path = iframe.contentWindow.location.pathname || '';
            if (!/\/mod\/quiz\/attempt\.php$/i.test(path)) {
                stopLiveProctoringMedia();
                leavingAttemptShell = false;
            }
        } catch (e) {
            stopLiveProctoringMedia();
            leavingAttemptShell = false;
        }
    }

    /**
     * Tear down media/iframe without restoring parent chrome (used while an opaque
     * leave cover is showing so summary/review navigation never flashes attempt UI).
     *
     * @return {void}
     */
    function teardownProctoringForLeaveNavigation() {
        liveProctoringParentActive = false;
        window.proctorlinkLiveAudioParent = false;
        pendingLiveStartFromPreflight = null;
        attemptMediaResume = null;
        liveProctorPollingResume = null;
        pausedStudentIframeSrc = null;
        quizAttemptSeenInIframe = false;
        if (quizIframeWatchTimer) {
            clearInterval(quizIframeWatchTimer);
            quizIframeWatchTimer = null;
        }
        quizIframeWatchStarted = false;
        if (liveProctorImageInterval) {
            clearInterval(liveProctorImageInterval);
            liveProctorImageInterval = null;
        }
        if (localProctorImageTimeoutId) {
            window.clearTimeout(localProctorImageTimeoutId);
            localProctorImageTimeoutId = null;
        }
        if (localProctorImageInterval) {
            clearInterval(localProctorImageInterval);
            localProctorImageInterval = null;
        }
        proctorCaptureInFlight = false;
        if (localMediaStream) {
            try {
                localMediaStream.getTracks().forEach(function(track) {
                    track.stop();
                });
            } catch (e) {
                // Ignore.
            }
            localMediaStream = null;
        }
        $('.student-iframe-container').remove();
        var videoEl = typeof getAttemptVideoElement === 'function' ? getAttemptVideoElement() : null;
        if (videoEl && videoEl.srcObject) {
            try {
                videoEl.srcObject.getTracks().forEach(function(track) {
                    track.stop();
                });
            } catch (e) {
                // Ignore.
            }
            videoEl.srcObject = null;
        }
        removeQuizAttemptIframe();
    }

    /**
     * @return {void}
     */
    function stopLiveProctoringMedia() {
        teardownProctoringForLeaveNavigation();
        document.querySelectorAll('[data-proctorlink-hidden]').forEach(function(el) {
            el.style.display = '';
            delete el.dataset.proctorlinkHidden;
        });
        document.body.classList.remove('proctorlink-attempt-shell');
        document.body.classList.remove('proctorlink-shell-preparing');
        document.body.classList.remove('proctorlink-on-summary');
        document.body.classList.remove('proctorlink-on-view');
        hideQuizIframeLoading();
        $('#proctorlink-quiz-loading').remove();
    }

    /**
     * Show an opaque white cover so shell teardown cannot flash the parent attempt.
     *
     * @return {void}
     */
    function showOpaqueLeaveCover() {
        if (quizIframeLoadingShowTimer) {
            window.clearTimeout(quizIframeLoadingShowTimer);
            quizIframeLoadingShowTimer = null;
        }
        var overlay = ensureQuizIframeLoadingOverlay();
        overlay.classList.add('is-visible');
        overlay.classList.add('is-leaving');
    }

    /**
     * @param {string} href
     * @return {void}
     */
    function leaveAttemptShellTo(href) {
        if (leavingAttemptShell) {
            return;
        }
        leavingAttemptShell = true;
        window.__proctorlinkAllowUnload = true;
        var dest = null;
        try {
            dest = new URL(href, window.location.href);
        } catch (e) {
            // Ignore.
        }

        var isHttp = !dest || dest.protocol === 'http:' || dest.protocol === 'https:';
        var sameDocument = false;
        if (dest && isHttp) {
            sameDocument = dest.pathname === window.location.pathname &&
                dest.search === window.location.search;
        }
        var replaceHistory = false;
        if (dest && isHttp) {
            replaceHistory = /\/mod\/quiz\/(?:review|view)\.php$/i.test(dest.pathname || '');
        }

        var finishLeave = function() {
            showOpaqueLeaveCover();
            if (!isHttp || sameDocument) {
                teardownProctoringForLeaveNavigation();
                if (!isHttp) {
                    navigateTop(href);
                    return;
                }
                window.onbeforeunload = null;
                window.location.reload();
                return;
            }

            teardownProctoringForLeaveNavigation();
            navigateTop(href, {replace: replaceHistory});
        };

        showOpaqueLeaveCover();
        var leaveStarted = false;
        var runFinishLeaveOnce = function() {
            if (leaveStarted) {
                return;
            }
            leaveStarted = true;
            finishLeave();
        };
        var flushTimeout = window.setTimeout(runFinishLeaveOnce, 8000);
        var pendingStop = window.__proctorlinkCameraStopping;
        var flushChain = Promise.resolve(pendingStop).catch(function() {
            return null;
        }).then(function() {
            return flushProctorlinkAudioUpload(true);
        });
        flushChain.then(function() {
            window.clearTimeout(flushTimeout);
            runFinishLeaveOnce();
            return null;
        }).catch(function() {
            window.clearTimeout(flushTimeout);
            runFinishLeaveOnce();
        });
    }

    /**
     * Fill overlay with Moodle core/loading (theme-overridable) once.
     *
     * @param {HTMLElement} overlay
     * @return {void}
     */
    function fillQuizLoadingOverlayContent(overlay) {
        if (!overlay || overlay.dataset.proctorlinkLoadingFilled === '1') {
            return;
        }
        overlay.dataset.proctorlinkLoadingFilled = '1';
        require(['core/templates'], function(Templates) {
            Templates.render('quizaccess_quizproctoring/quiz_loading', {})
                .then(function(html) {
                    if (overlay.isConnected) {
                        overlay.innerHTML = html;
                    }
                    return null;
                })
                .catch(function() {
                    if (!overlay.isConnected) {
                        return;
                    }
                    overlay.innerHTML =
                        '<div class="proctorlink-quiz-loading-inner d-flex flex-column ' +
                        'align-items-center justify-content-center">' +
                        '<div class="spinner-border text-primary" role="status">' +
                        '<span class="visually-hidden sr-only">Loading</span></div></div>';
                });
        });
    }

    /**
     * Theme-compatible full-page loading overlay (Moodle core/loading inside).
     *
     * @return {HTMLElement}
     */
    function ensureQuizIframeLoadingOverlay() {
        var overlay = document.getElementById('proctorlink-quiz-loading');
        if (overlay) {
            fillQuizLoadingOverlayContent(overlay);
            return overlay;
        }
        overlay = document.createElement('div');
        overlay.id = 'proctorlink-quiz-loading';
        overlay.className = 'proctorlink-quiz-loading';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-busy', 'true');
        overlay.innerHTML =
            '<div class="proctorlink-quiz-loading-inner d-flex flex-column ' +
            'align-items-center justify-content-center">' +
            '<div class="spinner-border text-primary" role="status">' +
            '<span class="visually-hidden sr-only">Loading</span></div></div>';
        document.body.appendChild(overlay);
        fillQuizLoadingOverlayContent(overlay);
        return overlay;
    }

    /**
     * Soft loading overlay for in-shell quiz navigations.
     * Use immediate=true for Next/Previous/Back/Finish so processattempt white
     * never flashes; delayed for less critical cases.
     *
     * @param {boolean} [immediate]
     * @return {void}
     */
    function showQuizIframeLoading(immediate) {
        if (quizIframeLoadingShowTimer) {
            window.clearTimeout(quizIframeLoadingShowTimer);
            quizIframeLoadingShowTimer = null;
        }
        var reveal = function() {
            var overlay = ensureQuizIframeLoadingOverlay();
            overlay.classList.remove('is-leaving');
            overlay.classList.add('is-visible');
        };
        if (immediate) {
            reveal();
        } else {
            quizIframeLoadingShowTimer = window.setTimeout(function() {
                quizIframeLoadingShowTimer = null;
                reveal();
            }, 180);
        }
        if (quizIframeLoadingHideTimer) {
            window.clearTimeout(quizIframeLoadingHideTimer);
        }
        quizIframeLoadingHideTimer = window.setTimeout(function() {
            quizIframeLoadingHideTimer = null;
            recoverFromStuckQuizLoading();
        }, 8000);
    }

    /**
     * @return {void}
     */
    function hideQuizIframeLoading() {
        if (quizIframeLoadingShowTimer) {
            window.clearTimeout(quizIframeLoadingShowTimer);
            quizIframeLoadingShowTimer = null;
        }
        if (quizIframeLoadingHideTimer) {
            window.clearTimeout(quizIframeLoadingHideTimer);
            quizIframeLoadingHideTimer = null;
        }
        var overlay = document.getElementById('proctorlink-quiz-loading');
        if (overlay) {
            overlay.classList.remove('is-visible');
            overlay.classList.remove('is-leaving');
        }
    }

    if (!window.__proctorlinkLoadingPageshowBound) {
        window.__proctorlinkLoadingPageshowBound = true;
        window.addEventListener('pageshow', function(event) {
            resetStaleProctorlinkShellState();
            if (!document.body.classList.contains('proctorlink-attempt-shell')) {
                hideQuizIframeLoading();
                $('#proctorlink-quiz-loading').remove();
                return;
            }
            if (event && event.persisted &&
                    /\/mod\/quiz\/attempt\.php$/i.test(window.location.pathname || '') &&
                    resolveAttemptId(window.location)) {
                leavingAttemptShell = false;
                hideQuizIframeLoading();
                var iframe = document.getElementById(QUIZ_ATTEMPT_IFRAME_NAME);
                if (iframe) {
                    try {
                        forceQuizIframeToUrl(iframe, buildAttemptShellUrl(
                            resolveAttemptId(window.location),
                            resolveCmid()
                        ), {force: true});
                    } catch (e) {
                        // Ignore.
                    }
                }
            }
        });
    }

    /**
     * True when the click opens a new tab/window (Ctrl/Cmd/Shift/middle-click/_blank)
     * so the current attempt iframe will not navigate.
     *
     * @param {MouseEvent} e
     * @param {Element} [link]
     * @return {boolean}
     */
    function isModifiedNavigationClick(e, link) {
        if (!e) {
            return false;
        }
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
            return true;
        }
        if (e.button === 1 || e.which === 2) {
            return true;
        }
        if (link) {
            var target = (link.getAttribute('target') || '').toLowerCase();
            if (target === '_blank' || target === '_new') {
                return true;
            }
        }
        return false;
    }

    /**
     * Show the quiz iframe loader when a link leaves the current page.
     *
     * @param {MouseEvent} e Click event
     * @param {HTMLAnchorElement} link Clicked link
     * @param {Window} win Quiz iframe window
     * @return {void}
     */
    function handleQuizIframeNavLinkClick(e, link, win) {
        if (isModifiedNavigationClick(e, link)) {
            return;
        }
        var href = link.getAttribute('href') || '';
        if (isSamePageQuizNavLink(link, href, win.location)) {
            return;
        }
        if (!href || href.charAt(0) === '#' ||
                (href.indexOf(':') !== -1 && !/^(https?:|\/|\.\/|\.\.\/)/i.test(href))) {
            return;
        }
        try {
            var linkUrl = new URL(href, win.location.href);
            if (isAttemptOrSummaryPath(linkUrl.pathname)) {
                if (isSummaryPath(linkUrl.pathname) || isViewPath(linkUrl.pathname)) {
                    disconnectLivePublisherNow();
                }
                showQuizIframeLoading(true);
                return;
            }
        } catch (err) {
            // Fall through.
        }
        showQuizIframeLoading(true);
    }

    /**
     * Show the quiz iframe loader for Next, Previous, and other submits.
     *
     * @param {MouseEvent} e Click event
     * @param {HTMLElement} submit Clicked submit control
     * @return {void}
     */
    function handleQuizIframeNavSubmitClick(e, submit) {
        if (isModifiedNavigationClick(e, submit)) {
            return;
        }
        if (submit.closest('.modal, [data-region="modal-container"], .moodle-dialogue')) {
            return;
        }
        var navForm = submit.form || (submit.closest && submit.closest('form'));
        if (navForm) {
            var formTarget = (navForm.getAttribute('target') || '').toLowerCase();
            if (!formTarget || formTarget === '_top' || formTarget === '_parent') {
                navForm.setAttribute('target', '_self');
                navForm.target = '_self';
            }
        }
        // Confirmation must stay visible. Never match translated labels.
        var submitForm = submit.form || (submit.closest && submit.closest('form'));
        if (isSummaryFinishControl(submit, submitForm)) {
            return;
        }
        showQuizIframeLoading(true);
    }

    /**
     * @param {HTMLIFrameElement} iframe
     * @return {void}
     */
    function bindQuizIframeLoadingIndicator(iframe) {
        if (!iframe || iframe.dataset.proctorlinkLoadingBound === '1') {
            return;
        }
        iframe.dataset.proctorlinkLoadingBound = '1';
        ensureQuizIframeLoadingOverlay();

        var bindInside = function() {
            try {
                var win = iframe.contentWindow;
                var doc = iframe.contentDocument;
                if (!win || !doc) {
                    return;
                }
                var path = (win.location && win.location.pathname) || '';
                if (isAttemptOrSummaryPath(path)) {
                    freezeQuizPageDrawerTransition(doc);
                    hideQuizIframeLoading();
                }
                win.addEventListener('beforeunload', function() {
                    var cur = (win.location && win.location.pathname) || '';
                    if (isAttemptOrSummaryPath(cur)) {
                        return;
                    }
                    showQuizIframeLoading();
                });
                win.addEventListener('pageshow', function() {
                    if (/\/mod\/quiz\/attempt\.php$/i.test(
                            (win.location && win.location.pathname) || ''
                    )) {
                        resumeParentCameraKeepShell();
                    }
                });

                doc.addEventListener('click', function(e) {
                    var link = e.target.closest && e.target.closest('a[href]');
                    var submit = e.target.closest && e.target.closest(
                        'button[type="submit"], input[type="submit"], button[name="next"], button[name="previous"]'
                    );
                    if (link) {
                        handleQuizIframeNavLinkClick(e, link, win);
                        return;
                    }
                    if (submit) {
                        handleQuizIframeNavSubmitClick(e, submit);
                    }
                }, true);
                doc.addEventListener('auxclick', function(e) {
                    if (e.button === 1) {
                        e.stopPropagation();
                    }
                }, true);
                doc.addEventListener('submit', function(e) {
                    try {
                        var form = e.target;
                        var action = (form && form.getAttribute('action')) || '';
                        var actionPath = action ? (new URL(action, win.location.href)).pathname : '';
                        var onSummary = isSummaryPath((win.location && win.location.pathname) || path);
                        if (onSummary && isSummaryFinishAttemptForm(form) &&
                                form.dataset.proctorlinkAudioFlushed !== '1') {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            flushAudioThenSubmitSummaryForm(form);
                            return;
                        }
                        if (/\/mod\/quiz\/(?:attempt|summary|processattempt)\.php$/i.test(actionPath) ||
                                isAttemptOrSummaryPath(path)) {
                            if (isSummaryPath(actionPath)) {
                                disconnectLivePublisherNow();
                            }
                            if (form && form.closest &&
                                    form.closest('.modal, [data-region="modal-container"], .moodle-dialogue')) {
                                showQuizIframeLoading(true);
                                return;
                            }
                            showQuizIframeLoading(true);
                            return;
                        }
                    } catch (err) {
                        // Ignore.
                    }
                    showQuizIframeLoading(true);
                }, true);
            } catch (e) {
                // Ignore.
            }
        };

        iframe.addEventListener('load', bindInside);
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
            bindInside();
        }
    }

    /**
     * @param {HTMLIFrameElement} iframe
     * @param {{onAttempt: Function, onLeave: Function}} options
     * @return {void}
     */
    function watchQuizAttemptIframe(iframe, options) {
        if (quizIframeWatchStarted || !iframe) {
            return;
        }
        quizIframeWatchStarted = true;
        bindQuizIframeLoadingIndicator(iframe);
        var lastHref = '';
        var check = function() {
            try {
                var win = iframe.contentWindow;
                if (!win) {
                    return;
                }
                var loc = win.location;
                var href = loc.href;
                if (!href || href === 'about:blank') {
                    return;
                }
                if (href === lastHref) {
                    if (document.body.classList.contains('proctorlink-shell-preparing') &&
                            isQuizIframeAttemptReady(iframe)) {
                        activateAttemptShell();
                        hideQuizIframeLoading();
                    }
                    return;
                }
                lastHref = href;
                var path = loc.pathname || '';
                if (isTransientQuizPath(path)) {
                    showQuizIframeLoading(true);
                    return;
                }
                if (isSummaryPath(path) || isViewPath(path)) {
                    quizAttemptSeenInIframe = true;
                    syncAttemptVideoForIframePath(path);
                    syncParentUrlFromIframeLocation(loc);
                    hideQuizIframeLoading();
                    return;
                }
                if (isReviewPath(path)) {
                    quizAttemptSeenInIframe = true;
                    showOpaqueLeaveCover();
                    if (typeof options.onLeave === 'function') {
                        options.onLeave(href);
                    }
                    return;
                }
                if (/\/mod\/quiz\/attempt\.php$/i.test(path)) {
                    quizAttemptSeenInIframe = true;
                    syncAttemptVideoForIframePath(path);
                    syncParentUrlFromIframeLocation(loc);
                    if (typeof options.onAttempt === 'function') {
                        options.onAttempt(loc);
                    }
                    hideQuizIframeLoading();
                    return;
                }
                if (quizAttemptSeenInIframe && typeof options.onLeave === 'function') {
                    options.onLeave(href);
                }
            } catch (e) {
                // Ignore.
            }
        };
        if (quizIframeWatchTimer) {
            clearInterval(quizIframeWatchTimer);
        }
        iframe.addEventListener('load', check);
        quizIframeWatchTimer = setInterval(check, 400);
    }

    /**
     * True when the event is inside a quiz question that uses drag/drop or ordering.
     *
     * @param {Event} event
     * @return {boolean}
     */
    function isQuizQuestionInteractionTarget(event) {
        var el = event && event.target;
        if (!el || !el.closest) {
            return false;
        }
        return Boolean(el.closest(
            '.que, .formulation, .ablock, .answer, ' +
            '.draghome, .drag, .drop, .dropzone, .droparea, .dropreplace, ' +
            '.qtype_ddwtos, .qtype_ddimageortext, .qtype_ddmarker, ' +
            '.qtype_ordering, .sortable, .ui-sortable, .ui-draggable, .ui-droppable, ' +
            '[data-drag], [draggable="true"]'
        ));
    }

    /**
     * Block copy/paste and context menu. Do not cancel question drag/drop.
     *
     * @return {void}
     */
    function installQuizInteractionLocks() {
        document.addEventListener('keydown', function(event) {
            if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'v')) {
                event.preventDefault();
            }
            if (event.altKey && (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar')) {
                event.preventDefault();
                event.stopPropagation();
            }
        });
        document.addEventListener('dragstart', function(event) {
            if (isQuizQuestionInteractionTarget(event)) {
                return;
            }
            event.preventDefault();
        }, true);
        document.addEventListener('drop', function(event) {
            if (isQuizQuestionInteractionTarget(event)) {
                return;
            }
            event.preventDefault();
        }, true);
        document.addEventListener('contextmenu', function(event) {
            if (isQuizQuestionInteractionTarget(event)) {
                return;
            }
            event.preventDefault();
        });
    }

    /**
     * Sync remaining warning count from the server without resetting an in-progress
     * attempt back to the full threshold (e.g. after Back → Continue).
     *
     * @param {number|string} warnings Remaining warnings from PHP
     * @param {number|string|null} attemptid Current attempt id
     * @return {void}
     */
    function syncWarningThresholdFromServer(warnings, attemptid) {
        var serverLeft = Number(warnings);
        if (Number.isNaN(serverLeft)) {
            serverLeft = 0;
        }
        var prevAttempt = null;
        var prevLeft = null;
        try {
            prevAttempt = JSON.parse(localStorage.getItem('proctorlinkWarningAttemptId'));
            prevLeft = JSON.parse(localStorage.getItem('warningThreshold'));
        } catch (e) {
            // Ignore.
        }
        var sameAttempt = attemptid && prevAttempt && Number(prevAttempt) === Number(attemptid);
        if (sameAttempt && prevLeft !== null && !Number.isNaN(Number(prevLeft))) {
            serverLeft = Math.min(serverLeft, Number(prevLeft));
        } else {
            localStorage.setItem('warningOriginalThreshold', JSON.stringify(serverLeft));
            localStorage.setItem('warningEmailCount', JSON.stringify(0));
        }
        localStorage.setItem('warningThreshold', JSON.stringify(serverLeft));
        if (attemptid) {
            localStorage.setItem('proctorlinkWarningAttemptId', JSON.stringify(Number(attemptid)));
        }
    }

    /**
     * True when the preflight form is being cancelled rather than started.
     *
     * @param {HTMLFormElement} form
     * @param {jQuery.Event|Event} [event]
     * @return {boolean}
     */
    function isPreflightCancelSubmit(form, event) {
        var submitter = null;
        if (event) {
            submitter = event.submitter || (event.originalEvent && event.originalEvent.submitter);
        }
        if (submitter && (submitter.id === 'id_cancel' || submitter.name === 'cancel')) {
            return true;
        }
        if (form && form.querySelector) {
            var cancelBtn = form.querySelector('#id_cancel, input[name="cancel"], button[name="cancel"]');
            if (cancelBtn && document.activeElement === cancelBtn) {
                return true;
            }
        }
        return false;
    }

    /**
     * Keep cancel on the parent page; do not send it into the attempt iframe.
     *
     * @param {HTMLFormElement} [form]
     * @return {void}
     */
    function restorePreflightFormTarget(form) {
        var el = form || document.getElementById('mod_quiz_preflight_form');
        if (el && (el.target === QUIZ_ATTEMPT_IFRAME_NAME ||
                el.getAttribute('target') === QUIZ_ATTEMPT_IFRAME_NAME)) {
            el.removeAttribute('target');
            el.target = '';
        }
    }

    /**
     * @param {Array} liveStartArgs
     * @return {void}
     */
    function setupPreflightLiveAttemptShell(liveStartArgs) {
        var iframe = ensureQuizAttemptIframe();

        pendingLiveStartFromPreflight = function(resolvedAttemptId) {
            if (liveProctoringParentActive) {
                return;
            }
            var keepStream = typeof ismobiledevice === 'function' && ismobiledevice() &&
                mediaStreamHasLiveVideo(localMediaStream);
            if (localMediaStream && !keepStream) {
                try {
                    localMediaStream.getTracks().forEach(function(track) {
                        track.stop();
                    });
                } catch (e) {
                    // Ignore.
                }
                localMediaStream = null;
                onlineWebcamSetupPromise = null;
            }
            $('#video').each(function() {
                if (!$(this).hasClass('quizaccess_quizproctoring-video')) {
                    try {
                        if (this.srcObject && !keepStream) {
                            this.srcObject.getTracks().forEach(function(track) {
                                track.stop();
                            });
                        }
                        this.srcObject = null;
                    } catch (e) {
                        // Ignore.
                    }
                    this.removeAttribute('id');
                    this.id = 'proctorlink-preflight-video';
                    $(this).hide();
                }
            });
            $('#canvas').each(function() {
                if ($(this).closest('.student-iframe-container').length === 0 &&
                        !$(this).parent().is('body')) {
                    this.removeAttribute('id');
                    this.id = 'proctorlink-preflight-canvas';
                    $(this).hide();
                }
            });
            $('#proctorlink-preflight-video, #proctorlink-preflight-canvas').hide();
            var args = liveStartArgs.slice();
            args[1] = false;
            args[2] = true;
            args[3] = resolvedAttemptId;
            init.apply(null, args);
        };

        var retargetPreflightForm = function(form) {
            if (!form) {
                return;
            }
            resetVideoPositionToDefault();
            form.setAttribute('target', QUIZ_ATTEMPT_IFRAME_NAME);
            form.target = QUIZ_ATTEMPT_IFRAME_NAME;
            ensureQuizAttemptIframe();
        };

        $(document).off('click.proctorlinkShell submit.proctorlinkShell');
        $(document).on('click.proctorlinkShell', '#id_submitbutton', function() {
            retargetPreflightForm(this.form || $(this).closest('form')[0]);
            if (ASK_AUDIO && localMediaStream && !mediaStreamHasLiveAudio(localMediaStream) &&
                    !mediaStreamHasAudioTrack(localMediaStream) && !isIosPhone()) {
                ensureMicrophoneOnStream(localMediaStream).then(function(withAudio) {
                    localMediaStream = withAudio || localMediaStream;
                    return null;
                }).catch(function() {
                    return null;
                });
            }
            showQuizIframeLoading();
        });

        $(document).on('submit.proctorlinkShell', 'form', function(e) {
            if (isPreflightCancelSubmit(this, e)) {
                restorePreflightFormTarget(this);
                hideQuizIframeLoading();
                return;
            }
            if ($(this).find('#id_submitbutton').length) {
                retargetPreflightForm(this);
                showQuizIframeLoading();
            }
        });

        watchQuizAttemptIframe(iframe, {
            onAttempt: function(loc) {
                activateAttemptShell();
                iframe.dataset.proctorlinkSrcSet = '1';
                syncParentUrlFromIframeLocation(loc);
                hideQuizIframeLoading();
                var aid = parseAttemptIdFromLocation(loc) || liveStartArgs[3];
                if (aid && pendingLiveStartFromPreflight) {
                    pendingLiveStartFromPreflight(aid);
                    pendingLiveStartFromPreflight = null;
                }
            },
            onLeave: function(href) {
                leaveAttemptShellTo(href);
            }
        });
    }

    /**
     * @param {number|string|null} [attemptIdHint] Attempt id from PHP init (POST return may omit ?attempt=)
     * @param {number|string|null} [cmidHint] Course module id from PHP init
     * @return {HTMLIFrameElement|null}
     */
    function setupTopLevelAttemptShell(attemptIdHint, cmidHint) {
        if (isProctorlinkQuizIframe()) {
            return null;
        }
        if (isSummaryPath(window.location.pathname) ||
                isReviewPath(window.location.pathname) ||
                /\/mod\/quiz\/view\.php$/i.test(window.location.pathname || '')) {
            return null;
        }

        var attemptId = resolveAttemptId(window.location, attemptIdHint);
        var cmid = resolveCmid(cmidHint);

        if (/\/mod\/quiz\/attempt\.php$/i.test(window.location.pathname) && !attemptId) {
            window.__proctorlinkAllowUnload = true;
            if (cmid) {
                window.location.replace(M.cfg.wwwroot + '/mod/quiz/view.php?id=' + cmid);
            }
            return null;
        }

        leavingAttemptShell = false;
        resetStaleProctorlinkShellState();
        hideQuizIframeLoading();
        if (quizIframeWatchTimer) {
            clearInterval(quizIframeWatchTimer);
            quizIframeWatchTimer = null;
        }
        quizIframeWatchStarted = false;
        quizAttemptSeenInIframe = false;

        var iframe = ensureQuizAttemptIframe();
        var onAttemptPage = /\/mod\/quiz\/attempt\.php$/i.test(window.location.pathname);
        if (onAttemptPage && attemptId) {
            var shellUrl = buildAttemptShellUrl(attemptId, cmid);
            prepareAndRevealAttemptShell(iframe, shellUrl);
        } else if (document.body.classList.contains('proctorlink-attempt-shell')) {
            activateAttemptShell();
        }
        watchQuizAttemptIframe(iframe, {
            onAttempt: function() {
                activateAttemptShell();
                hideQuizIframeLoading();
            },
            onLeave: function(href) {
                leaveAttemptShellTo(href);
            }
        });
        return iframe;
    }

    var frontCameraGuardTimer = null;

    /**
     * Stop every track on a MediaStream.
     *
     * @param {MediaStream} stream
     * @return {void}
     */
    function stopMediaStream(stream) {
        if (!stream || !stream.getTracks) {
            return;
        }
        try {
            stream.getTracks().forEach(function(track) {
                try {
                    track.onended = null;
                } catch (e2) {
                    // Ignore.
                }
                track.stop();
            });
        } catch (e) {
            // Ignore.
        }
    }

    /**
     * @return {boolean}
     */
    function isAndroidPhone() {
        return /Android/i.test(navigator.userAgent || '');
    }

    /**
     * @return {boolean}
     */
    function isIosPhone() {
        var ua = navigator.userAgent || '';
        return /iPhone|iPad|iPod/i.test(ua) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    /**
     * @return {boolean}
     */
    function isPhoneCameraDevice() {
        return isAndroidPhone() || isIosPhone() ||
            (typeof ismobiledevice === 'function' && ismobiledevice());
    }

    /**
     * Drop any video tracks from a mic-only request. Some Android browsers
     * treat {audio: true} as "default camera + mic" and attach the rear lens.
     *
     * @param {MediaStream} stream
     * @return {void}
     */
    function stripVideoTracksFromStream(stream) {
        if (!stream || !stream.getVideoTracks) {
            return;
        }
        stream.getVideoTracks().forEach(function(track) {
            try {
                stream.removeTrack(track);
            } catch (e) {
                // Ignore.
            }
            try {
                track.stop();
            } catch (e2) {
                // Ignore.
            }
        });
    }

    var FRONT_CAMERA_STORAGE_KEY = 'proctorlinkFrontCameraId';

    /**
     * @param {string} label
     * @return {boolean}
     */
    function cameraLabelLooksRear(label) {
        var l = String(label || '').toLowerCase();
        if (!l) {
            return false;
        }
        if (/front|user|selfie/.test(l) && !/back|rear|environment/.test(l)) {
            return false;
        }
        return /facing[\s:_-]*(back|environment)|back camera|rear camera|\brear\b|\bback\b|environment/.test(l);
    }

    /**
     * @param {string} label
     * @return {boolean}
     */
    function cameraLabelLooksFront(label) {
        var l = String(label || '').toLowerCase();
        if (!l || cameraLabelLooksRear(l)) {
            return false;
        }
        return /front|user|face|selfie|facing[\s:_-]*(user|front)/.test(l);
    }

    /**
     * @return {string}
     */
    function getStoredFrontCameraId() {
        try {
            return localStorage.getItem(FRONT_CAMERA_STORAGE_KEY) || '';
        } catch (e) {
            return '';
        }
    }

    /**
     * @param {string} deviceId
     * @return {void}
     */
    function storeFrontCameraId(deviceId) {
        if (!deviceId) {
            return;
        }
        try {
            localStorage.setItem(FRONT_CAMERA_STORAGE_KEY, deviceId);
        } catch (e) {
            // Ignore.
        }
    }

    /**
     * @param {MediaStream} stream
     * @return {{mode: string, deviceId: string, label: string}|null}
     */
    function getPhoneVideoTrackInfo(stream) {
        if (!stream || !stream.getVideoTracks) {
            return null;
        }
        var track = stream.getVideoTracks()[0];
        if (!track) {
            return null;
        }
        var settings = {};
        try {
            settings = track.getSettings() || {};
        } catch (e) {
            settings = {};
        }
        return {
            mode: String(settings.facingMode || '').toLowerCase(),
            deviceId: String(settings.deviceId || ''),
            label: String(track.label || '')
        };
    }

    /**
     * @param {MediaStream} stream
     * @return {boolean}
     */
    function streamIsRearCamera(stream) {
        var info = getPhoneVideoTrackInfo(stream);
        if (!info) {
            return false;
        }
        if (info.mode === 'environment') {
            return true;
        }
        if (info.mode === 'user') {
            return false;
        }
        return cameraLabelLooksRear(info.label);
    }

    /**
     * @param {MediaStream} stream
     * @return {boolean}
     */
    function streamIsFrontCamera(stream) {
        var info = getPhoneVideoTrackInfo(stream);
        if (!info) {
            return false;
        }
        if (info.mode === 'user') {
            return true;
        }
        if (info.mode === 'environment') {
            return false;
        }
        if (cameraLabelLooksFront(info.label)) {
            return true;
        }
        return false;
    }

    /**
     * @param {MediaStream} stream
     * @return {void}
     */
    function rememberFrontCameraFromStream(stream) {
        if (!streamIsFrontCamera(stream)) {
            return;
        }
        var info = getPhoneVideoTrackInfo(stream);
        if (info && info.deviceId) {
            storeFrontCameraId(info.deviceId);
        }
    }

    /**
     * @param {Error|*} err
     * @return {boolean}
     */
    function isFatalGetUserMediaError(err) {
        var name = err && err.name ? err.name : '';
        return name === 'NotAllowedError' || name === 'PermissionDeniedError' ||
            name === 'SecurityError';
    }

    /**
     * @return {Promise<MediaDeviceInfo[]>}
     */
    function listVideoInputDevices() {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
            return Promise.resolve([]);
        }
        return navigator.mediaDevices.enumerateDevices().then(function(devices) {
            var videos = [];
            (devices || []).forEach(function(device) {
                if (device && device.kind === 'videoinput' && device.deviceId) {
                    videos.push(device);
                }
            });
            return videos;
        }).catch(function() {
            return [];
        });
    }

    /**
     * Labeled front cameras first. Never include a rear-labeled lens.
     * If labels are empty (common Android), skip the current default device —
     * that lens is almost always the back camera.
     *
     * @param {MediaDeviceInfo[]} videos
     * @param {string} currentDeviceId
     * @param {boolean} currentIsRear
     * @return {string[]}
     */
    function frontCandidateDeviceIds(videos, currentDeviceId, currentIsRear) {
        var frontIds = [];
        var otherIds = [];
        (videos || []).forEach(function(device) {
            if (!device || !device.deviceId) {
                return;
            }
            if (cameraLabelLooksFront(device.label)) {
                frontIds.push(device.deviceId);
                return;
            }
            if (cameraLabelLooksRear(device.label)) {
                return;
            }
            otherIds.push(device.deviceId);
        });
        if (frontIds.length) {
            return frontIds;
        }
        if (currentDeviceId && (currentIsRear || otherIds.length > 1)) {
            otherIds = otherIds.filter(function(id) {
                return id !== currentDeviceId;
            });
        }
        // Android enumerates back camera first; the last unlabeled lens is usually front.
        otherIds.reverse();
        return otherIds;
    }

    /**
     * @param {boolean} audio
     * @param {Object|boolean} videoConstraints
     * @return {Promise<MediaStream>}
     */
    function openCameraWithConstraints(audio, videoConstraints) {
        return navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: Boolean(audio)
        });
    }

    /**
     * @param {string[]} ids
     * @param {boolean} audio
     * @param {number} index
     * @return {Promise<MediaStream>}
     */
    function tryPhoneCameraDeviceIds(ids, audio, index) {
        if (index >= ids.length) {
            return Promise.reject(new Error('Front camera unavailable'));
        }
        return openCameraWithConstraints(audio, {deviceId: {exact: ids[index]}}).then(function(stream) {
            if (!streamIsFrontCamera(stream) || streamIsRearCamera(stream)) {
                stopMediaStream(stream);
                return tryPhoneCameraDeviceIds(ids, audio, index + 1);
            }
            rememberFrontCameraFromStream(stream);
            return stream;
        }).catch(function(err) {
            if (isFatalGetUserMediaError(err)) {
                throw err;
            }
            return tryPhoneCameraDeviceIds(ids, audio, index + 1);
        });
    }

    /**
     * After permission, labels are usually available. Drop a rear/default stream
     * and reopen the front lens by deviceId.
     *
     * @param {MediaStream} stream
     * @param {boolean} audio
     * @return {Promise<MediaStream>}
     */
    function switchPhoneStreamToFrontCamera(stream, audio) {
        if (!stream || !mediaStreamHasLiveVideo(stream)) {
            return Promise.reject(new Error('Front camera unavailable'));
        }
        if (streamIsFrontCamera(stream) && !streamIsRearCamera(stream)) {
            rememberFrontCameraFromStream(stream);
            return Promise.resolve(stream);
        }
        return listVideoInputDevices().then(function(videos) {
            var info = getPhoneVideoTrackInfo(stream) || {deviceId: '', mode: '', label: ''};
            var currentIsRear = streamIsRearCamera(stream);
            var candidates = frontCandidateDeviceIds(videos, info.deviceId, currentIsRear);
            if (info.deviceId && candidates.indexOf(info.deviceId) !== -1 &&
                    !currentIsRear && streamIsFrontCamera(stream)) {
                rememberFrontCameraFromStream(stream);
                return stream;
            }
            if (!candidates.length) {
                if (currentIsRear || videos.length > 1) {
                    stopMediaStream(stream);
                    throw new Error('Front camera unavailable');
                }
                return stream;
            }
            if (info.deviceId && candidates.length === 1 && candidates[0] === info.deviceId &&
                    !currentIsRear) {
                return stream;
            }
            stopMediaStream(stream);
            return tryPhoneCameraDeviceIds(candidates, audio, 0);
        });
    }

    /**
     * Phones: never keep a rear stream. Switch onto a proven or labeled front lens.
     *
     * @param {MediaStream} stream
     * @param {boolean} wantAudio
     * @return {Promise<MediaStream>}
     */
    function ensureStreamIsFrontCamera(stream, wantAudio) {
        if (!stream || !mediaStreamHasLiveVideo(stream) || !isPhoneCameraDevice()) {
            return Promise.resolve(stream);
        }
        return switchPhoneStreamToFrontCamera(stream, Boolean(wantAudio));
    }

    /**
     * Mandatory front camera on phones. Never fall back to the rear lens.
     *
     * @param {boolean} audio
     * @return {Promise<MediaStream>}
     */
    function requestPhoneFrontCamera(audio) {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            return Promise.reject(new Error('getUserMedia unavailable'));
        }
        var stored = getStoredFrontCameraId();
        var attempts = [];
        attempts.push({facingMode: {exact: 'user'}});
        attempts.push({facingMode: 'user'});
        if (stored) {
            attempts.push({deviceId: {exact: stored}});
        }
        var tryConstraint = function(index) {
            if (index >= attempts.length) {
                return listVideoInputDevices().then(function(videos) {
                    var ids = frontCandidateDeviceIds(videos, '', true);
                    if (!ids.length) {
                        throw new Error('Front camera unavailable');
                    }
                    return tryPhoneCameraDeviceIds(ids, audio, 0);
                });
            }
            return openCameraWithConstraints(audio, attempts[index]).then(function(stream) {
                var askedForUser = Boolean(attempts[index] && attempts[index].facingMode);
                if (askedForUser && !streamIsRearCamera(stream)) {
                    if (streamIsFrontCamera(stream)) {
                        rememberFrontCameraFromStream(stream);
                    }
                    return stream;
                }
                if (streamIsRearCamera(stream)) {
                    stopMediaStream(stream);
                    return tryConstraint(index + 1);
                }
                return switchPhoneStreamToFrontCamera(stream, audio);
            }).catch(function(err) {
                if (isFatalGetUserMediaError(err)) {
                    throw err;
                }
                return tryConstraint(index + 1);
            });
        };
        return tryConstraint(0);
    }

    /**
     * @return {void}
     */
    function stopFrontCameraGuard() {
        if (frontCameraGuardTimer) {
            window.clearInterval(frontCameraGuardTimer);
            frontCameraGuardTimer = null;
        }
    }

    /**
     * Disabled: reopening the camera during the attempt flipped phones to the rear lens.
     *
     * @return {void}
     */
    function startFrontCameraGuard() {
        return;
    }

    /**
     * @param {number} ms
     * @return {Promise<void>}
     */
    function waitMs(ms) {
        return new Promise(function(resolve) {
            window.setTimeout(resolve, ms);
        });
    }

    /**
     * @return {void}
     */
    function markAudioPermissionSettled() {
        mobileAudioPermissionSettled = true;
    }

    /**
     * @param {Error} err
     * @return {Promise<MediaStream>}
     */
    function fallbackToCameraOnlyOrRethrow(err) {
        return requestPreferredUserMedia(false).catch(function() {
            throw err;
        });
    }

    /**
     * @param {MediaStream} stream
     * @param {boolean} strict
     * @return {Promise<MediaStream>}
     */
    function finishOpenedStreamAudio(stream, strict) {
        if (mediaStreamHasLiveAudio(stream)) {
            markAudioPermissionSettled();
            return Promise.resolve(stream);
        }
        if (strict) {
            stopMediaStream(stream);
            throw new Error('Both camera and microphone are required');
        }
        if (isIosPhone()) {
            // Combined getUserMedia already asked for the mic. A follow-up
            // {audio: true, video: false} shows a second iOS prompt.
            if (mediaStreamHasAudioTrack(stream)) {
                markAudioPermissionSettled();
            }
            return Promise.resolve(stream);
        }
        return ensureMicrophoneOnStream(stream).then(function(withAudio) {
            markAudioPermissionSettled();
            return withAudio;
        });
    }

    /**
     * @param {MediaStream} stream
     * @return {Promise<MediaStream>}
     */
    function settleOpenedStreamAudio(stream) {
        return waitForLiveAudio(stream, getMicrophoneLiveWaitMs()).then(function(ready) {
            return finishOpenedStreamAudio(ready, false);
        });
    }

    /**
     * @param {MediaStream} stream
     * @return {Promise<MediaStream>}
     */
    function settleOpenedStreamAudioStrict(stream) {
        return waitForLiveAudio(stream, getMicrophoneLiveWaitMs()).then(function(ready) {
            return finishOpenedStreamAudio(ready, true);
        });
    }

    /**
     * Open camera preferring the front (user-facing) lens.
     * Phones never use unconstrained {video: true} and never keep a rear stream.
     *
     * @param {boolean} wantAudio whether to include microphone
     * @param {boolean} [strictBoth] when true with wantAudio, never fall back to camera-only
     * @return {Promise<MediaStream>}
     */
    function requestPreferredUserMedia(wantAudio, strictBoth) {
        const audio = Boolean(wantAudio);
        const strict = Boolean(strictBoth);

        const openMedia = function() {
            if (isPhoneCameraDevice()) {
                return requestPhoneFrontCamera(audio);
            }
            const attempts = [
                {video: {facingMode: {ideal: 'user'}}, audio: audio},
                {video: {facingMode: 'user'}, audio: audio},
                {video: {facingMode: {exact: 'user'}}, audio: audio}
            ];
            const tryNext = function(index) {
                if (index >= attempts.length) {
                    return Promise.reject(new Error('getUserMedia failed for all constraints'));
                }
                return navigator.mediaDevices.getUserMedia(attempts[index]).catch(function(err) {
                    var errName = err && err.name ? err.name : '';
                    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' ||
                            errName === 'SecurityError') {
                        throw err;
                    }
                    if (errName === 'NotReadableError' || errName === 'AbortError') {
                        throw err;
                    }
                    return tryNext(index + 1);
                });
            };
            return tryNext(0);
        };

        return openMedia().catch(function(err) {
            var errName = err && err.name ? err.name : '';
            if (audio && !strict && !isIosPhone() &&
                    (errName === 'NotAllowedError' || errName === 'PermissionDeniedError')) {
                return fallbackToCameraOnlyOrRethrow(err);
            }
            throw err;
        }).then(function(stream) {
            if (!audio) {
                markAudioPermissionSettled();
                return stream;
            }
            markMicrophoneSettleGrace(getMicrophoneSettleGraceMs());
            enableAudioTracks(stream);
            if (mediaStreamHasLiveAudio(stream)) {
                markAudioPermissionSettled();
                return stream;
            }
            if (strict) {
                return settleOpenedStreamAudioStrict(stream);
            }
            return settleOpenedStreamAudio(stream);
        });
    }

    /**
     * @param {boolean} wantAudio
     * @param {boolean} [strictBoth]
     * @param {number} retriesLeft
     * @param {number} delay
     * @return {Promise<MediaStream>}
     */
    function retryPreferredUserMediaAfterDelay(wantAudio, strictBoth, retriesLeft, delay) {
        return waitMs(delay).then(function() {
            return requestPreferredUserMediaWithRetry(wantAudio, strictBoth, retriesLeft);
        });
    }

    /**
     * Retry getUserMedia after brief delays.
     *
     * @param {boolean} wantAudio
     * @param {boolean} [strictBoth]
     * @param {number} [retriesLeft]
     * @return {Promise<MediaStream>}
     */
    function requestPreferredUserMediaWithRetry(wantAudio, strictBoth, retriesLeft) {
        if (typeof retriesLeft !== 'number') {
            retriesLeft = (isQuizSecurityPopup() || isAndroidPhone()) ? 5 : 3;
        }
        return requestPreferredUserMedia(wantAudio, strictBoth).catch(function(err) {
            if (retriesLeft <= 0) {
                markAudioPermissionSettled();
                throw err;
            }
            var name = err && err.name ? err.name : '';
            var msg = err && err.message ? String(err.message) : '';
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError' ||
                    name === 'SecurityError') {
                markAudioPermissionSettled();
                throw err;
            }
            var retryable = name === 'NotReadableError' || name === 'AbortError' ||
                name === 'NotFoundError' || name === 'OverconstrainedError' ||
                msg.indexOf('failed for all constraints') !== -1 ||
                msg.indexOf('Both camera and microphone') !== -1 ||
                msg.indexOf('Front camera unavailable') !== -1;
            if (!retryable) {
                throw err;
            }
            var delay = (name === 'NotReadableError' || name === 'AbortError') ? 900 : 700;
            return retryPreferredUserMediaAfterDelay(wantAudio, strictBoth, retriesLeft - 1, delay);
        });
    }

    /**
     * Request microphone only (used on mobile live proctoring and as audio fallback).
     *
     * @return {Promise<MediaStream>}
     */
    function requestMicrophoneOnly() {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            return Promise.reject(new Error('getUserMedia unavailable'));
        }
        return navigator.mediaDevices.getUserMedia({audio: true, video: false});
    }

    /**
     * Add a dedicated mic stream when the camera stream has no live audio (common on phones).
     * Never adopt the mic MediaStream as the camera — Android may attach the rear lens.
     *
     * @param {MediaStream} stream
     * @return {Promise<MediaStream>}
     */
    function ensureMicrophoneOnStream(stream) {
        if (stream && mediaStreamHasLiveAudio(stream)) {
            enableAudioTracks(stream);
            return Promise.resolve(stream);
        }
        if (stream && mediaStreamHasAudioTrack(stream)) {
            return waitForLiveAudio(stream, getMicrophoneLiveWaitMs());
        }
        if (isIosPhone()) {
            markMicrophoneSettleGrace(8000);
            return waitForLiveAudio(stream, 2500).then(function(ready) {
                return ready || stream;
            });
        }
        if (!stream) {
            return requestMicrophoneOnly();
        }
        return requestMicrophoneOnly().then(function(audioStream) {
            stripVideoTracksFromStream(audioStream);
            addMacAudioTracks(stream, audioStream);
            return stream;
        }).catch(function() {
            return stream;
        });
    }

    /**
     * Open front camera + mic after a tap. Popup pages on phones have no user
     * gesture when the attempt first loads, so auto getUserMedia is denied.
     *
     * @param {number|string} attemptid
     * @param {boolean|number} enablerecordaudio
     * @param {number} [cmid]
     * @param {boolean} [mainimage]
     * @return {void}
     */
    function acquireAttemptCameraAndMicrophoneFromGesture(attemptid, enablerecordaudio, cmid, mainimage) {
        if (quizTerminationInProgress || mediaAcquireInProgress || mobileAudioAcquireInFlight) {
            return;
        }
        if (onlineWebcamSetupPromise) {
            return;
        }
        mobileAudioAcquireInFlight = true;
        var wantAudio = ASK_AUDIO || Boolean(Number(enablerecordaudio));
        var liveMode = attemptMediaResume && attemptMediaResume.mode === 'live';
        var finish = function() {
            mobileAudioAcquireInFlight = false;
        };
        if (liveMode && document.getElementById('video') && document.getElementById('canvas')) {
            startOnlineProctoringWebcam(
                cmid, attemptid, mainimage, wantAudio, Number(enablerecordaudio)
            ).then(function(stream) {
                if (!stream && !mediaStreamHasLiveVideo(localMediaStream)) {
                    reportMissingMediaIfNeeded(cmid, attemptid, mainimage);
                } else if (mediaStreamHasLiveVideo(stream || localMediaStream)) {
                    liveUseParentMedia = true;
                    scheduleParentStreamRelay();
                    restartProctorIntervalCapture(true);
                }
                return null;
            }).catch(function() {
                return null;
            }).finally(finish).catch(function() {
                return null;
            });
            return;
        }
        beginMediaAcquire(cmid, attemptid, mainimage, wantAudio);
        preparePopupCameraAccess()
            .then(function() {
                return requestPreferredUserMediaWithRetry(wantAudio, false);
            })
            .then(function(stream) {
                endMediaAcquire();
                localMediaStream = stream;
                if (!document.getElementById('canvas')) {
                    $('<canvas>').attr({
                        id: 'canvas',
                        width: '280',
                        height: '240',
                        'style': 'display: none;'
                    }).appendTo('body');
                }
                var enableStudentVideo = attemptMediaResume ?
                    attemptMediaResume.enableStudentVideo : 1;
                appendAttemptVideo(enableStudentVideo);
                var videoEl = getAttemptVideoElement() || document.getElementById('video');
                if (videoEl) {
                    attachStreamToVideoElement(videoEl, stream);
                    applyAttemptVideoVisibility(
                        videoEl,
                        enableStudentVideo
                    );
                }
                if (Number(enablerecordaudio) && mediaStreamHasLiveAudio(stream)) {
                    userAudioHookStarted = false;
                    startUserAudioRecording(stream, attemptid);
                }
                if (mediaStreamHasLiveVideo(stream) || mediaStreamHasLiveAudio(stream)) {
                    clearMediaDisabledAlertState();
                }
                if (mediaStreamHasLiveVideo(stream)) {
                    liveUseParentMedia = true;
                    scheduleParentStreamRelay();
                    restartProctorIntervalCapture(true);
                }
                return stream;
            })
            .catch(function() {
                endMediaAcquire();
                reportMissingMediaIfNeeded(cmid, attemptid, mainimage);
                scheduleMissingMediaWarnings(cmid, attemptid, mainimage);
            })
            .finally(finish)
            .catch(function() {
                return null;
            });
    }

    /**
     * Retry camera and mic on the first tap. iOS/Android popups block getUserMedia
     * until a user gesture; {audio: true} alone must not replace a missing camera.
     *
     * @param {number|string} attemptid
     * @param {boolean|number} enablerecordaudio
     * @param {number} [cmid]
     * @param {boolean} [mainimage]
     * @return {void}
     */
    function bindMobileAudioGestureRetry(attemptid, enablerecordaudio, cmid, mainimage) {
        if (mobileAudioGestureRetryBound) {
            return;
        }
        var needsGesture = (typeof ismobiledevice === 'function' && ismobiledevice()) ||
            isMacDesktop() || isQuizSecurityPopup();
        if (!needsGesture) {
            return;
        }
        mobileAudioGestureRetryBound = true;
        var retry = function() {
            if (quizTerminationInProgress) {
                return;
            }
            if (mediaStreamHasLiveVideo(localMediaStream)) {
                ensureAttemptVideoPlaying();
                tryRelayParentStreamToStudentIframe();
                restartProctorIntervalCapture(true);
                if (!USE_AUDIO || mediaStreamHasLiveAudio(localMediaStream)) {
                    if (USE_AUDIO) {
                        startUserAudioRecording(localMediaStream, attemptid);
                    }
                    return;
                }
                if (mediaStreamHasAudioTrack(localMediaStream) || isIosPhone()) {
                    enableAudioTracks(localMediaStream);
                    waitForLiveAudio(localMediaStream, 2500).then(function(ready) {
                        var stream = ready || localMediaStream;
                        if (USE_AUDIO && mediaStreamHasLiveAudio(stream)) {
                            userAudioHookStarted = false;
                            startUserAudioRecording(stream, attemptid);
                        }
                        return null;
                    }).catch(function() {
                        return null;
                    });
                    return;
                }
                if (mobileAudioAcquireInFlight || !Number(enablerecordaudio)) {
                    return;
                }
                mobileAudioAcquireInFlight = true;
                ensureMicrophoneOnStream(localMediaStream).then(function(withAudio) {
                    localMediaStream = withAudio || localMediaStream;
                    if (mediaStreamHasLiveAudio(localMediaStream)) {
                        userAudioHookStarted = false;
                        startUserAudioRecording(localMediaStream, attemptid);
                    }
                    return null;
                }).catch(function() {
                    return null;
                }).finally(function() {
                    mobileAudioAcquireInFlight = false;
                }).catch(function() {
                    return null;
                });
                return;
            }
            acquireAttemptCameraAndMicrophoneFromGesture(
                attemptid, enablerecordaudio, cmid, mainimage
            );
        };
        ['touchstart', 'pointerdown', 'click'].forEach(function(evt) {
            document.addEventListener(evt, retry, {passive: true});
        });
        var bindIframe = function() {
            try {
                var iframe = document.querySelector('iframe[name="proctorlink-quiz-in-if"]') ||
                    document.getElementById('proctorlink-quiz-in-if');
                if (!iframe || !iframe.contentDocument || iframe.dataset.proctorlinkMicRetry === '1') {
                    return;
                }
                ['touchstart', 'pointerdown', 'click'].forEach(function(evt) {
                    iframe.contentDocument.addEventListener(evt, retry, {passive: true});
                });
                iframe.dataset.proctorlinkMicRetry = '1';
            } catch (e) {
                // Cross-origin or not ready.
            }
        };
        bindIframe();
        window.setInterval(bindIframe, 2000);
    }

    /**
     * Live proctoring on phones uses the external iframe for video; still record mic locally.
     *
     * @param {number|string} attemptid
     * @param {boolean|number} enablerecordaudio
     * @return {Promise<MediaStream|null>}
     */
    function startMobileLiveAudioRecording(attemptid, enablerecordaudio) {
        if (!Number(enablerecordaudio)) {
            mobileAudioPermissionSettled = true;
            return Promise.resolve(null);
        }
        if (isIosPhone()) {
            // Mic-only getUserMedia re-prompts on iOS after camera+mic was granted.
            if (mediaStreamHasLiveAudio(localMediaStream) ||
                    mediaStreamHasAudioTrack(localMediaStream)) {
                enableAudioTracks(localMediaStream);
                mobileAudioPermissionSettled = true;
                startUserAudioRecording(localMediaStream, attemptid);
                return Promise.resolve(localMediaStream);
            }
            markMicrophoneSettleGrace(8000);
            return Promise.resolve(localMediaStream);
        }
        if (mediaStreamHasLiveAudio(localMediaStream)) {
            mobileAudioPermissionSettled = true;
            startUserAudioRecording(localMediaStream, attemptid);
            return Promise.resolve(localMediaStream);
        }
        if (mediaStreamHasLiveVideo(localMediaStream)) {
            return ensureMicrophoneOnStream(localMediaStream).then(function(withAudio) {
                localMediaStream = withAudio || localMediaStream;
                mobileAudioPermissionSettled = true;
                if (mediaStreamHasLiveAudio(localMediaStream)) {
                    userAudioHookStarted = false;
                    startUserAudioRecording(localMediaStream, attemptid);
                }
                return localMediaStream;
            });
        }
        if (mobileAudioAcquireInFlight) {
            return Promise.resolve(null);
        }
        mobileAudioAcquireInFlight = true;
        mobileAudioPermissionSettled = false;
        return requestMicrophoneOnly().then(function(stream) {
            stripVideoTracksFromStream(stream);
            userAudioHookStarted = false;
            if (mediaStreamHasLiveVideo(localMediaStream)) {
                addMacAudioTracks(localMediaStream, stream);
                stream = localMediaStream;
            } else {
                localMediaStream = stream;
            }
            mobileAudioPermissionSettled = true;
            startUserAudioRecording(stream, attemptid);
            if (mediaStreamHasLiveAudio(stream)) {
                clearMediaDisabledAlertState();
            }
            return stream;
        }).catch(function() {
            mobileAudioPermissionSettled = true;
            return null;
        }).finally(function() {
            mobileAudioAcquireInFlight = false;
        });
    }

    /**
     * Capture a cropped video frame as a PNG data URL for realtime alerts.
     *
     * @param {HTMLVideoElement} video
     * @param {HTMLCanvasElement} canvas
     * @return {string|null}
     */
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

    /**
     * Attach a MediaStream to a video element.
     *
     * @param {HTMLVideoElement} videoEl
     * @param {MediaStream} stream
     * @return {void}
     */
    function attachStreamToVideoElement(videoEl, stream) {
        if (!videoEl || !stream) {
            return;
        }
        configureLivePreviewVideo(videoEl);
        if (videoEl.classList && videoEl.classList.contains('quizaccess_quizproctoring-video') &&
                !isPreflightCaptureVideo(videoEl)) {
            ensureAttemptVideoWrap(videoEl);
        } else {
            unwrapAttemptVideoIfNeeded(videoEl);
        }
        videoEl.srcObject = stream;
        var playVideo = function() {
            var playPromise = videoEl.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(function() {
                    // Ignore.
                });
            }
        };
        if (videoEl.readyState >= 2) {
            playVideo();
        } else {
            videoEl.onloadedmetadata = function() {
                videoEl.onloadedmetadata = null;
                playVideo();
            };
            playVideo();
        }
    }

    /**
     * Configure a live webcam <video> so Safari does not treat it as a player.
     *
     * @param {HTMLVideoElement} videoEl
     * @return {void}
     */
    function configureLivePreviewVideo(videoEl) {
        if (!videoEl) {
            return;
        }
        videoEl.muted = true;
        videoEl.defaultMuted = true;
        videoEl.controls = false;
        videoEl.playsInline = true;
        videoEl.disablePictureInPicture = true;
        if ('disableRemotePlayback' in videoEl) {
            videoEl.disableRemotePlayback = true;
        }
        videoEl.setAttribute('muted', 'true');
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('webkit-playsinline', 'true');
        videoEl.setAttribute('autoplay', 'autoplay');
        videoEl.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback noplaybackrate');
        videoEl.setAttribute('disablepictureinpicture', '');
        videoEl.removeAttribute('controls');
        if (videoEl.controlsList && typeof videoEl.controlsList.add === 'function') {
            try {
                videoEl.controlsList.add('nodownload');
                videoEl.controlsList.add('nofullscreen');
                videoEl.controlsList.add('noremoteplayback');
            } catch (e) {
                // Ignore.
            }
        }
        keepLivePreviewPlaying(videoEl);
        blockLivePreviewFullscreen(videoEl);
    }

    /**
     * Safari hover/click can pause the live preview. Resume without showing controls.
     *
     * @param {HTMLVideoElement} videoEl
     * @return {void}
     */
    function keepLivePreviewPlaying(videoEl) {
        if (!videoEl || videoEl.dataset.proctorlinkKeepPlaying === '1') {
            return;
        }
        videoEl.dataset.proctorlinkKeepPlaying = '1';
        var resumeIfLive = function() {
            if (quizTerminationInProgress || shouldSuppressMediaAlerts()) {
                return;
            }
            var stream = videoEl.srcObject;
            if (!stream || typeof stream.getTracks !== 'function') {
                return;
            }
            var live = stream.getTracks().some(function(track) {
                return track.readyState === 'live';
            });
            if (!live || (!videoEl.paused && !videoEl.ended)) {
                return;
            }
            var playPromise = videoEl.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(function() {
                    // Ignore.
                });
            }
        };
        videoEl.addEventListener('pause', resumeIfLive, true);
        ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(function(type) {
            videoEl.addEventListener(type, function(event) {
                event.preventDefault();
                resumeIfLive();
            }, true);
        });
    }

    /**
     * Firefox Mac treats the webcam as a player (double-click / Full Screen).
     * Keep the preview at the fixed size and exit fullscreen if it is requested.
     *
     * @param {HTMLVideoElement} videoEl
     * @return {void}
     */
    function blockLivePreviewFullscreen(videoEl) {
        if (!videoEl) {
            return;
        }
        var wrap = videoEl.parentElement && videoEl.parentElement.classList.contains('proctorlink-video-wrap') ?
            videoEl.parentElement : videoEl;
        if (wrap.dataset.proctorlinkNoFullscreen === '1') {
            return;
        }
        wrap.dataset.proctorlinkNoFullscreen = '1';
        var exitFullscreen = function() {
            var fs = document.fullscreenElement || document.mozFullScreenElement ||
                document.webkitFullscreenElement;
            if (fs !== videoEl && fs !== wrap && !(wrap.contains && wrap.contains(fs))) {
                return;
            }
            var exit = document.exitFullscreen || document.mozCancelFullScreen ||
                document.webkitExitFullscreen;
            if (exit) {
                try {
                    exit.call(document);
                } catch (e) {
                    // Ignore.
                }
            }
        };
        document.addEventListener('fullscreenchange', exitFullscreen);
        document.addEventListener('mozfullscreenchange', exitFullscreen);
        document.addEventListener('webkitfullscreenchange', exitFullscreen);
        var block = function(event) {
            if (event.cancelable) {
                event.preventDefault();
            }
            event.stopPropagation();
            exitFullscreen();
        };
        wrap.addEventListener('dblclick', block, true);
        videoEl.addEventListener('dblclick', block, true);
        wrap.addEventListener('webkitbeginfullscreen', block, true);
        videoEl.addEventListener('webkitbeginfullscreen', block, true);
    }

    /**
     * True when this <video> belongs to the preflight take-picture dialogue.
     *
     * @param {HTMLElement} videoEl
     * @return {boolean}
     */
    function isPreflightCaptureVideo(videoEl) {
        if (!videoEl || !videoEl.closest) {
            return false;
        }
        return Boolean(videoEl.closest('.mod_quiz_preflight_popup, .moodle-dialogue, .videohtml'));
    }

    /**
     * Undo overlay wrapping if the capture dialogue video was moved to the corner.
     *
     * @param {HTMLVideoElement} videoEl
     * @return {void}
     */
    function unwrapAttemptVideoIfNeeded(videoEl) {
        if (!videoEl || !videoEl.parentElement) {
            return;
        }
        var parent = videoEl.parentElement;
        if (!parent.classList.contains('proctorlink-video-wrap')) {
            return;
        }
        if (parent.parentNode) {
            parent.parentNode.insertBefore(videoEl, parent);
        }
        parent.remove();
    }

    /**
     * Put the webcam inside a wrapper so hover never hits the <video> (Safari pause glyph).
     *
     * @param {HTMLVideoElement} videoEl
     * @return {HTMLElement|null}
     */
    function ensureAttemptVideoWrap(videoEl) {
        if (!videoEl) {
            return null;
        }
        if (isPreflightCaptureVideo(videoEl) ||
                !(videoEl.classList && videoEl.classList.contains('quizaccess_quizproctoring-video'))) {
            unwrapAttemptVideoIfNeeded(videoEl);
            return videoEl;
        }
        if (videoEl.parentElement && videoEl.parentElement.classList.contains('proctorlink-video-wrap')) {
            blockLivePreviewFullscreen(videoEl);
            return videoEl.parentElement;
        }
        var wrap = document.createElement('div');
        wrap.className = 'proctorlink-video-wrap';
        if (videoEl.parentNode) {
            videoEl.parentNode.insertBefore(wrap, videoEl);
        } else {
            document.body.appendChild(wrap);
        }
        wrap.appendChild(videoEl);
        blockLivePreviewFullscreen(videoEl);
        return wrap;
    }

    /**
     * Ask the live student iframe to prefer the parent MediaStream (desktop live).
     *
     * @param {Window} iframeWindow
     * @param {boolean} useParentMedia
     * @return {void}
     */
    function postStudentIframeInit(iframeWindow, useParentMedia) {
        if (!iframeWindow) {
            return;
        }
        try {
            iframeWindow.postMessage({
                type: 'init',
                timestamp: Date.now(),
                lang: $('html').attr('lang') || 'en',
                useParentMedia: Boolean(useParentMedia),
            }, externalserver);
        } catch (e) {
            // Ignore.
        }
    }

    /**
     * Relay cloned parent webcam/mic tracks to the live student iframe.
     *
     * @return {void}
     */
    function tryRelayParentStreamToStudentIframe() {
        if (!liveUseParentMedia || !liveStudentIframeReady || !localMediaStream) {
            return;
        }
        var iframeEl = document.querySelector('.student-iframe-container iframe');
        if (!iframeEl || !iframeEl.contentWindow) {
            return;
        }
        var liveTracks = localMediaStream.getTracks().filter(function(track) {
            return track.readyState === 'live';
        });
        if (!liveTracks.length) {
            return;
        }
        var clones = [];
        try {
            clones = liveTracks.map(function(track) {
                return track.clone();
            });
        } catch (cloneErr) {
            clones = [];
        }
        if (!clones.length) {
            return;
        }
        try {
            // Structured-clone the tracks. Listing them in the transfer list
            // ends them in Firefox, so the teacher room gets a dead video.
            iframeEl.contentWindow.postMessage({
                type: 'parent-media-stream',
                timestamp: Date.now(),
                tracks: clones,
            }, externalserver);
        } catch (e) {
            clones.forEach(function(track) {
                try {
                    track.stop();
                } catch (stopErr) {
                    // Ignore.
                }
            });
        }
    }

    /**
     * Resolve the live student publisher URL.
     *
     * @param {HTMLIFrameElement|null} iframeEl
     * @return {string}
     */
    function getLiveStudentPublisherUrl(iframeEl) {
        var url = '';
        if (attemptMediaResume && attemptMediaResume.liveIframeUrl) {
            url = attemptMediaResume.liveIframeUrl;
        } else if (iframeEl) {
            url = iframeEl.getAttribute('src') || iframeEl.src || '';
        }
        if (!url && pausedStudentIframeSrc) {
            url = pausedStudentIframeSrc;
        }
        if (url === 'about:blank' && attemptMediaResume && attemptMediaResume.liveIframeUrl) {
            url = attemptMediaResume.liveIframeUrl;
        }
        return url;
    }

    /**
     * True when the publisher iframe must be reloaded (dead stream on a phone).
     *
     * @param {boolean} reloadIframe
     * @param {HTMLIFrameElement|null} iframeEl
     * @param {string} url
     * @return {boolean}
     */
    function shouldReloadLiveStudentPublisher(reloadIframe, iframeEl, url) {
        return Boolean(reloadIframe) &&
            (isIosPhone() || isPhoneCameraDevice()) &&
            Boolean(iframeEl) && Boolean(url) && url !== 'about:blank';
    }

    /**
     * Bounce the cross-origin publisher iframe so WebRTC can reconnect.
     *
     * @param {HTMLIFrameElement} iframeEl
     * @param {string} url
     * @return {void}
     */
    function reloadLiveStudentPublisherIframe(iframeEl, url) {
        liveStudentIframeReady = false;
        iframeEl.setAttribute('allow', 'camera; microphone; autoplay; fullscreen');
        bindStudentPublisherLoad(iframeEl);
        var restorePublisher = function() {
            try {
                iframeEl.src = url;
            } catch (e) {
                iframeEl.setAttribute('src', url);
            }
            pausedStudentIframeSrc = null;
            scheduleParentStreamRelay();
        };
        try {
            iframeEl.src = 'about:blank';
        } catch (blankErr) {
            restorePublisher();
            return;
        }
        window.setTimeout(restorePublisher, 50);
    }

    /**
     * Re-publish the parent camera after a dead stream (bfcache or summary return).
     * Question Next/Previous must not reload this iframe.
     *
     * @param {boolean} [reloadIframe]
     * @return {void}
     */
    function reviveLiveStudentPublisher(reloadIframe) {
        var iframeEl = document.querySelector('.student-iframe-container iframe');
        var url = getLiveStudentPublisherUrl(iframeEl);
        if ((!url || url === 'about:blank') && !iframeEl) {
            return;
        }
        hideStudentIframeFromStudent();
        if (shouldReloadLiveStudentPublisher(reloadIframe, iframeEl, url)) {
            reloadLiveStudentPublisherIframe(iframeEl, url);
            return;
        }
        if (iframeEl) {
            try {
                postStudentIframeInit(iframeEl.contentWindow, liveUseParentMedia);
            } catch (e2) {
                // Ignore.
            }
        }
        scheduleParentStreamRelay();
    }

    /**
     * Keep the ProctorLink student iframe running but not visible on phones.
     * display:none stops WebRTC from publishing the live stream.
     *
     * @return {void}
     */
    function hideStudentIframeFromStudent() {
        var container = document.querySelector('.student-iframe-container');
        if (!container) {
            return;
        }
        container.classList.add('quizproctoring-video-offscreen');
        container.setAttribute('aria-hidden', 'true');
        container.style.setProperty('display', 'block', 'important');
        container.style.setProperty('visibility', 'visible', 'important');
        container.style.setProperty('width', '240px', 'important');
        container.style.setProperty('height', '180px', 'important');
        container.style.setProperty('opacity', '0.01', 'important');
        container.style.setProperty('pointer-events', 'none', 'important');
        // Above the quiz iframe. Firefox will not send video from a publisher
        // that the JavaScript-security shell covers.
        container.style.setProperty('z-index', '1002', 'important');
    }

    /**
     * Relay now and again shortly after — mobile iframes often miss the first postMessage.
     *
     * @return {void}
     */
    function scheduleParentStreamRelay() {
        tryRelayParentStreamToStudentIframe();
        window.setTimeout(tryRelayParentStreamToStudentIframe, 400);
        window.setTimeout(tryRelayParentStreamToStudentIframe, 1500);
        window.setTimeout(tryRelayParentStreamToStudentIframe, 3000);
    }

    /**
     * @param {number} [setinterval] seconds
     * @return {number}
     */
    function getProctorIntervalMs(setinterval) {
        var intervalms = Number(setinterval) * 1000;
        if (!intervalms || intervalms < 1000) {
            intervalms = proctorTimeIntervalMs || 15000;
        }
        return intervalms;
    }

    /**
     * Remaining ms before the next interval snapshot is allowed.
     *
     * @param {number} intervalms
     * @return {number}
     */
    function msUntilNextProctorCapture(intervalms) {
        if (!lastProctorImageAt) {
            return 0;
        }
        return Math.max(0, intervalms - (Date.now() - lastProctorImageAt));
    }

    /**
     * Skip a snapshot if one was already taken inside the quiz interval.
     *
     * @return {boolean}
     */
    function shouldSkipProctorIntervalCapture() {
        return msUntilNextProctorCapture(proctorTimeIntervalMs) > 250;
    }

    /**
     * @return {void}
     */
    function markProctorImageCaptured() {
        lastProctorImageAt = Date.now();
    }

    /**
     * @return {void}
     */
    function stopLocalProctorImageCapture() {
        if (localProctorImageTimeoutId) {
            window.clearTimeout(localProctorImageTimeoutId);
            localProctorImageTimeoutId = null;
        }
        if (localProctorImageInterval) {
            clearInterval(localProctorImageInterval);
            localProctorImageInterval = null;
        }
    }

    /**
     * @return {void}
     */
    function stopLiveIframeProctorImageCapture() {
        if (liveProctorImageInterval) {
            clearInterval(liveProctorImageInterval);
            liveProctorImageInterval = null;
        }
    }

    /**
     * Schedule periodic proctoring snapshots from the local #video stream.
     *
     * @param {Camera} camera
     * @param {number} setinterval seconds between captures
     * @param {Function} [allowCapture] return false to skip a tick
     * @param {boolean} [immediate] capture sooner after resume
     * @return {void}
     */
    function scheduleLocalProctorImageCapture(camera, setinterval, allowCapture, immediate) {
        if (!camera || typeof camera.proctoringimage !== 'function') {
            return;
        }
        stopLocalProctorImageCapture();
        stopLiveIframeProctorImageCapture();
        var intervalms = getProctorIntervalMs(setinterval);
        proctorTimeIntervalMs = intervalms;
        var delayms = msUntilNextProctorCapture(intervalms);
        if (!lastProctorImageAt) {
            delayms = immediate ? 400 : 800;
        } else if (delayms < 400 && immediate) {
            delayms = 400;
        }
        localProctorImageTimeoutId = window.setTimeout(function() {
            localProctorImageTimeoutId = null;
            stopLocalProctorImageCapture();
            var tick = function() {
                if (shouldSuppressMediaAlerts() || quizTerminationInProgress || mediaAcquireInProgress) {
                    return;
                }
                if (allowCapture && !allowCapture()) {
                    return;
                }
                camera.proctoringimage();
            };
            tick();
            localProctorImageInterval = setInterval(tick, intervalms);
        }, delayms);
    }

    /**
     * @return {Window|null}
     */
    function getActiveStudentIframeWindow() {
        var el = document.querySelector('.student-iframe-container iframe');
        try {
            return (el && el.contentWindow) ? el.contentWindow : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Background tabs skip interval ticks. After a tab switch, take a due snapshot
     * so continuous switching does not starve green interval images.
     *
     * @return {void}
     */
    function scheduleProctorCatchUpOnVisible() {
        if (proctorVisibleCatchUpId) {
            window.clearTimeout(proctorVisibleCatchUpId);
        }
        proctorVisibleCatchUpId = window.setTimeout(function() {
            proctorVisibleCatchUpId = null;
            if (document.visibilityState !== 'visible' ||
                    shouldSuppressMediaAlerts() ||
                    quizTerminationInProgress) {
                return;
            }
            restartProctorIntervalCapture(true);
        }, 400);
    }

    /**
     * Restart timed snapshots after summary / Return to attempt / bfcache.
     *
     * @param {boolean} [immediate]
     * @return {void}
     */
    function restartProctorIntervalCapture(immediate) {
        if (shouldSuppressMediaAlerts() || quizTerminationInProgress) {
            return;
        }
        if (typeof liveProctorPollingResume === 'function') {
            liveProctorPollingResume(Boolean(immediate));
            return;
        }
        var args = attemptMediaResume;
        if (!args || !args.camera) {
            return;
        }
        scheduleLocalProctorImageCapture(args.camera, args.setinterval, function() {
            return document.visibilityState !== 'hidden';
        }, Boolean(immediate));
    }

    /**
     * Mobile Safari/Chrome restore attempt.php from bfcache with dead tracks.
     *
     * @return {void}
     */
    function bindAttemptPageshowResume() {
        if (window.__proctorlinkAttemptPageshowBound) {
            return;
        }
        window.__proctorlinkAttemptPageshowBound = true;
        window.addEventListener('pageshow', function(event) {
            try {
                if (isProctorlinkQuizIframe()) {
                    return;
                }
                if (!/\/mod\/quiz\/attempt\.php$/i.test(window.location.pathname || '')) {
                    return;
                }
            } catch (e) {
                return;
            }
            var fromBfcache = event && event.persisted;
            if (!fromBfcache && (!(isIosPhone() || isPhoneCameraDevice()) || !quizAttemptSeenInIframe)) {
                return;
            }
            if (fromBfcache) {
                onlineWebcamSetupPromise = null;
                liveStudentIframeReady = false;
                hardMediaRevivePending = true;
            }
            if (localMediaStream &&
                    !mediaStreamHasLiveVideo(localMediaStream) &&
                    !mediaStreamHasLiveAudio(localMediaStream)) {
                localMediaStream = null;
            }
            if (attemptMediaResume) {
                resumeParentCameraKeepShellNow();
            }
        });
    }

    /**
     * Handle a proctoring snapshot posted from the live student iframe (mobile live).
     *
     * @param {Camera} camera
     * @param {string} imageData base64 PNG from iframe
     * @return {void}
     */
    function uploadLiveIframeProctoringImage(camera, imageData) {
        if (!camera || !camera.canvas || !imageData ||
                proctorCaptureInFlight || quizTerminationInProgress ||
                shouldSuppressMediaAlerts()) {
            return;
        }
        if (shouldSkipProctorIntervalCapture()) {
            return;
        }
        var context = camera.canvas.getContext('2d');
        var img = new Image();
        img.onload = function() {
            const canvas = camera.canvas;
            const outputWidth = 280;
            const outputHeight = 240;
            const targetRatio = outputWidth / outputHeight;
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;
            const imgRatio = iw / ih;
            let sx = 0;
            let sy = 0;
            let sw = iw;
            let sh = ih;
            if (imgRatio > targetRatio) {
                sh = ih;
                sw = ih * targetRatio;
                sx = (iw - sw) / 2;
            } else {
                sw = iw;
                sh = iw / targetRatio;
                sy = (ih - sh) / 2;
            }
            canvas.width = outputWidth;
            canvas.height = outputHeight;
            context.drawImage(img, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
            var payload = canvas.toDataURL('image/png');
            if (!payload) {
                return;
            }
            if (shouldSkipProctorIntervalCapture()) {
                return;
            }
            markProctorImageCaptured();
            proctorCaptureInFlight = true;
            $.ajax({
                url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
                method: 'POST',
                dataType: 'json',
                data: {
                    imgBase64: payload,
                    cmid: camera.cmid,
                    attemptid: camera.attemptid,
                    mainimage: camera.mainimage
                },
                success: function(response) {
                    response = parseProctoringAjaxResponse(response);
                    if (shouldSuppressMediaAlerts()) {
                        return;
                    }
                    if (response && response.errorcode) {
                        if (response.errorcode === 'domainblocked') {
                            showPluginErrorPopup(response);
                            return;
                        }
                        var warningsl = JSON.parse(localStorage.getItem('warningThreshold')) || 0;
                        var leftwarnings = Math.max(warningsl - 1, 0);
                        localStorage.setItem('warningThreshold', JSON.stringify(leftwarnings));
                        trackWarningAndMaybeQueueEmail(camera.cmid, camera.attemptid);
                        $(document).trigger('popup', response.error);
                    } else if (response && response.redirect && response.url) {
                        redirectAfterProctorAutoSubmit(
                            response.url, response.msg, camera.attemptid, camera.quizid
                        );
                    }
                },
                complete: function() {
                    proctorCaptureInFlight = false;
                }
            });
        };
        img.src = imageData;
    }

    Camera.prototype.retake = function() {
        $('#userimageset').val(0);
        $('#' + this.videoid).show(this.cmid);
        $('#' + this.takepictureid).show();
        $('#' + this.canvasid).hide();
        $('#' + this.retakeid).hide();
        $("#id_submitbutton").prop("disabled", true);
    };
    Camera.prototype.showpopup = function(event, message) {
        const cameraInstance = this;
        if (shouldSuppressMediaAlerts()) {
            return null;
        }
        if (this.activeModal) {
            this.activeModal.destroy();
            this.activeModal = null;
            cleanupModalBackdrop();
        }
        var text = message;
        if (text === null || text === undefined || text === '') {
            return null;
        }
        if (typeof text !== 'string') {
            text = String(text);
        }
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open');
        return ModalFactory.create({
            body: text,
        }).then((modal) => {
            this.activeModal = modal;
            modal.getRoot().on(ModalEvents.hidden, function() {
                modal.destroy();
                cameraInstance.activeModal = null;
                cleanupModalBackdrop();
            });
            modal.show();
            try {
                var root = modal.getRoot();
                if (root && root.length) {
                    root.css('z-index', 20000);
                    root.find('.modal').css('z-index', 20001);
                }
            } catch (e) {
                // Ignore.
            }
            return null;
        }).catch(() => {
            showCustomModal(text);
            return null;
        });
    };

    Camera.prototype.stopcamera = function() {
        stopFrontCameraGuard();
        EyeTracking.stop(false);
        if (localMediaStream) {
            localMediaStream.getTracks().forEach(function(track) {
                try {
                    track.onended = null;
                } catch (e) {
                    // Ignore.
                }
                track.stop();
            });
            localMediaStream = null;
        }
    };

    /**
     * Close identity capture without leaving a black video or loading overlay.
     *
     * @param {Camera} camera
     * @return {void}
     */
    function teardownPreflightCapture(camera) {
        if (camera) {
            camera.preflightCancelled = true;
            camera.preflightStarted = false;
            camera.preflightStartPending = false;
            if (typeof camera.stopcamera === 'function') {
                camera.stopcamera();
            }
        }
        ['video', 'proctorlink-preflight-video', 'canvas', 'proctorlink-preflight-canvas'].forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) {
                return;
            }
            if (el.tagName === 'VIDEO') {
                try {
                    el.srcObject = null;
                    el.removeAttribute('src');
                    el.load();
                } catch (e) {
                    // Ignore.
                }
            }
            el.style.display = 'none';
        });
        $('#takepicture').show();
        $('#retake').hide();
        $('#userimageset').val(0);
        $('#id_submitbutton').prop('disabled', true);
        enableQuizStartButton();
        hideQuizIframeLoading();
        var loading = document.getElementById('proctorlink-quiz-loading');
        if (loading && loading.parentNode &&
                !document.body.classList.contains('proctorlink-attempt-shell')) {
            loading.parentNode.removeChild(loading);
        }
        cleanupModalBackdrop();
        resetVideoPositionToDefault();
        restorePreflightFormTarget();
    }

    /**
     * @param {Camera} camera
     * @return {void}
     */
    function bindPreflightCameraControls(camera) {
        $('.quizstartbuttondiv [type=submit]').off('click.proctorlinkPreflight')
            .on('click.proctorlinkPreflight', function() {
                resetVideoPositionToDefault();
                startPreflightCameraWhenReady(camera);
            });
        $('#' + camera.takepictureid).on('click', function(e) {
            e.preventDefault();
            camera.takepicture();
        });
        $('#' + camera.retakeid).on('click', function(e) {
            e.preventDefault();
            camera.retake();
        });
        $(document).off('click.proctorlinkPreflightCancel')
            .on('click.proctorlinkPreflightCancel',
                '#id_cancel, .mod_quiz_preflight_popup .closebutton', function() {
                    teardownPreflightCapture(camera);
                });
        // Moodle's YUI Cancel handler halt()s the event; run first in capture.
        if (!window.__proctorlinkPreflightCancelCapture) {
            window.__proctorlinkPreflightCancelCapture = true;
            document.addEventListener('click', function(event) {
                var target = event.target;
                if (!target || !target.closest) {
                    return;
                }
                if (target.closest('#id_cancel, .mod_quiz_preflight_popup .closebutton')) {
                    teardownPreflightCapture(camera);
                }
            }, true);
        }
        $(document).on('click', '.filemanager', function(e) {
            e.preventDefault();
            hiddenCloseButton = $(this).closest('.moodle-dialogue-base').find('.closebutton');
            hiddenCloseButton.hide();
        });
        $(document).on('click', '.closebutton', function() {
            if (hiddenCloseButton) {
                hiddenCloseButton.show();
                hiddenCloseButton = null;
            }
        });
        document.addEventListener('keydown', function(event) {
            if (event.key !== 'Escape') {
                return;
            }
            var popup = document.querySelector('.mod_quiz_preflight_popup');
            var popupOpen = popup && !popup.classList.contains('yui3-widget-hidden');
            var startAttemptForm = /\/mod\/quiz\/startattempt\.php/i.test(window.location.pathname || '') &&
                document.getElementById('id_cancel');
            if (popupOpen || startAttemptForm) {
                teardownPreflightCapture(camera);
            }
        });
    }

    /**
     * @param {Object} args
     * @return {void}
     */
    function initPreflightSession(args) {
        if (window.__proctorlinkPreflightInit) {
            return;
        }
        window.__proctorlinkPreflightInit = true;
        localStorage.removeItem('eyecheckoff');
        if (document.readyState === 'complete') {
            $('.quizstartbuttondiv [type=submit]').prop("disabled", false);
        } else {
            $(window).on('load', function() {
                $('.quizstartbuttondiv [type=submit]').prop("disabled", false);
            });
        }
        var camera = new Camera(args.cmid, args.mainimage, args.attemptid, args.quizid);
        if (args.securewindow !== 'securewindow') {
            setupPreflightLiveAttemptShell([
                args.cmid, false, true, args.attemptid, args.teacher, args.quizid,
                args.enableeyecheckreal, args.studenthexstring, args.onlinestudent,
                args.securewindow, args.userfullname, args.enablestudentvideo,
                args.enablerecordaudio, args.enableobjectdetect, args.setinterval,
                args.warnings, args.userid, args.usergroup, args.detectionval,
                args.warningEmailThreshold, args.storeallimages
            ]);
        }
        bindPreflightCameraControls(camera);
        if (args.securewindow === 'securewindow' &&
                window.location.href.includes('startattempt.php')) {
            startPreflightCameraWhenReady(camera);
        }
    }

    /**
     * @param {Object} args
     * @param {boolean} useParentLiveStream
     * @return {void}
     */
    function configureLiveAttemptResume(args, useParentLiveStream) {
        attemptMediaResume = {
            mode: 'live',
            cmid: args.cmid,
            attemptid: args.attemptid,
            mainimage: args.mainimage,
            requireAudio: ASK_AUDIO,
            enableRecordAudio: Number(args.enablerecordaudio),
            enableStudentVideo: args.enablestudentvideo,
            storeallimages: Number(args.storeallimages),
            setinterval: args.setinterval
        };
        if (ismobiledevice()) {
            document.body.classList.add('quizproctoring-phone');
            hideStudentIframeFromStudent();
            applyAttemptVideoVisibility(
                getAttemptVideoElement() || document.getElementById('video'),
                0
            );
            if (!useParentLiveStream && Number(args.enablerecordaudio)) {
                startMobileLiveAudioRecording(args.attemptid, args.enablerecordaudio);
            }
            return;
        }
        document.body.classList.remove('quizproctoring-phone');
    }

    /**
     * @param {Object} state
     * @return {void}
     */
    function handleTeacherTerminateQuiz(state) {
        if (quizTerminationInProgress) {
            return;
        }
        quizTerminationInProgress = true;
        window.onbeforeunload = null;
        if (state.attemptid) {
            syncProctorlinkAttemptAudioOwner(state.attemptid);
        }
        var teacherSubmitStarted = false;
        var submitTeacherTerminatedQuiz = function() {
            if (teacherSubmitStarted) {
                return;
            }
            teacherSubmitStarted = true;
            window.clearTimeout(flushTimer);
            stopAttemptMediaTracks();
            $.ajax({
                url: M.cfg.wwwroot +
                    '/mod/quiz/accessrule/quizproctoring/ajax_sendalert.php',
                method: 'POST',
                data: {
                    quizid: state.quizid,
                    userid: state.userid,
                    attemptid: state.attemptid,
                    quizsubmit: 1
                },
                success: function(response) {
                    if (response && response.errorcode) {
                        quizTerminationInProgress = false;
                        $(document).trigger('popup', response.error);
                    } else if (response && response.success) {
                        $(document).trigger('popup', response.msg);
                        setTimeout(function() {
                            navigateTop(response.url);
                        }, 3000);
                    } else {
                        quizTerminationInProgress = false;
                    }
                },
                error: function() {
                    quizTerminationInProgress = false;
                }
            });
        };
        var flushTimer = window.setTimeout(submitTeacherTerminatedQuiz, 8000);
        flushProctorlinkAudioUpload(false, getProctorlinkAudioFlushMeta(state.attemptid, state.quizid))
            .then(function() {
                submitTeacherTerminatedQuiz();
                return null;
            }).catch(function() {
                submitTeacherTerminatedQuiz();
            });
    }

    /**
     * @param {Object} state
     * @return {void}
     */
    function onLiveStudentIframeReady(state) {
        state.iframeReady = true;
        liveStudentIframeReady = true;
        scheduleParentStreamRelay();
        if (Number(state.enablerecordaudio) &&
                !mediaStreamHasLiveAudio(localMediaStream) &&
                !state.useParentLiveStream) {
            startMobileLiveAudioRecording(state.attemptid, state.enablerecordaudio);
        }
    }

    /**
     * @param {Object} state
     * @param {string} imageData
     * @return {void}
     */
    function onLiveStudentIframeImage(state, imageData) {
        if (state.useParentLiveStream) {
            return;
        }
        state.responseReceived = true;
        state.iframeMissCount = 0;
        liveIframeImageSeen = true;
        lastLiveIframeImageAt = Date.now();
        publisherReconnectGraceUntil = 0;
        clearMediaDisabledAlertState();
        if (ismobiledevice() && document.visibilityState === 'hidden') {
            return;
        }
        uploadLiveIframeProctoringImage(state.camera, imageData);
    }

    /**
     * @param {MessageEvent} event
     * @param {Object} state
     * @return {void}
     */
    function handleLiveStudentIframeMessage(event, state) {
        if (event.origin !== externalserver || !event.data) {
            return;
        }
        var data = event.data;
        if (data.type === 'camera_ready' || data.type === 'video_ready') {
            liveIframeImageSeen = true;
            lastLiveIframeImageAt = Date.now();
            publisherReconnectGraceUntil = 0;
            clearMediaDisabledAlertState();
            return;
        }
        if (data.type === 'ready') {
            onLiveStudentIframeReady(state);
            return;
        }
        if (data.type === 'proctoring_image') {
            onLiveStudentIframeImage(state, data.imageData);
            return;
        }
        if (data.type === 'proctoring-alert') {
            $.ajax({
                url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_sendalert.php',
                method: 'POST',
                data: {
                    quizid: state.quizid,
                    userid: state.userid,
                    attemptid: state.attemptid,
                    alertmessage: data.text,
                    teacherid: data.teacherid
                },
                success: function(response) {
                    if (response && response.errorcode) {
                        $(document).trigger('popup', response.error);
                    } else if (response && response.success) {
                        $(document).trigger('popup', data.text);
                    }
                },
            });
            return;
        }
        if (data.type === 'disable-eye-tracking') {
            EyeTracking.applyRemoteDisable(true);
            $.ajax({
                url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_realtime.php',
                method: 'POST',
                data: {
                    cmid: state.camera.cmid,
                    attemptid: state.attemptid,
                    teachersub: 1,
                    validate: 'eyecheckoff'
                },
            });
            return;
        }
        if (data.type === 'enable-eye-tracking') {
            $.ajax({
                url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_eyetoggle.php',
                method: 'POST',
                data: {
                    cmid: state.camera.cmid,
                    attemptid: state.attemptid,
                    userid: state.userid,
                    action: 'enable',
                },
                success: function(response) {
                    if (response && response.success && response.iseyecheck) {
                        $(document).trigger('eye-tracking-enabled');
                    }
                },
            });
            return;
        }
        if (data.type === 'terminate-quiz') {
            handleTeacherTerminateQuiz(state);
        }
    }

    /**
     * @param {Object} state
     * @return {void}
     */
    function pollLiveStudentIframe(state) {
        if (shouldSuppressMediaAlerts() || quizTerminationInProgress) {
            return;
        }
        if (document.visibilityState === 'hidden') {
            return;
        }
        var pollWin = getActiveStudentIframeWindow();
        if (state.iframeReady && (!USE_AUDIO || mobileAudioPermissionSettled)) {
            // "ready" is sent before the camera starts. Do not treat that as a
            // live stream, or a slow non-English reload looks like a disabled device.
            var assumeVideo = liveIframeImageSeen &&
                ((Date.now() - lastLiveIframeImageAt) < (proctorTimeIntervalMs * 2));
            reportMissingMediaIfNeeded(state.cmid, state.attemptid, state.mainimage, {
                assumeVideo: assumeVideo
            });
        }
        if (state.iframeReady && pollWin) {
            if (!state.responseReceived) {
                state.iframeMissCount += 1;
                if (state.iframeMissCount >= 5) {
                    state.iframeMissCount = 0;
                    try {
                        postStudentIframeInit(pollWin, false);
                    } catch (e) {
                        state.iframeReady = false;
                        liveStudentIframeReady = false;
                    }
                }
            } else {
                state.iframeMissCount = 0;
            }
            if (proctorCaptureInFlight || shouldSkipProctorIntervalCapture()) {
                return;
            }
            state.responseReceived = false;
            try {
                pollWin.postMessage({
                    type: 'get_proctoring_image',
                    timestamp: Date.now()
                }, externalserver);
            } catch (error) {
                state.iframeReady = false;
                liveStudentIframeReady = false;
            }
            return;
        }
        if (pollWin) {
            postStudentIframeInit(pollWin, false);
            return;
        }
        state.iframeReady = false;
        liveStudentIframeReady = false;
    }

    /**
     * @param {Object} state
     * @param {boolean} [immediate]
     * @return {void}
     */
    function startLiveStudentIframePolling(state, immediate) {
        if (shouldSuppressMediaAlerts() || quizTerminationInProgress) {
            return;
        }
        if (!liveStudentIframeReady) {
            state.iframeReady = false;
        }
        var iframeWin = getActiveStudentIframeWindow();
        var preferLocal = mediaStreamHasLiveVideo(localMediaStream);
        if (preferLocal) {
            if (state.camera) {
                scheduleLocalProctorImageCapture(state.camera, state.setinterval, function() {
                    return document.visibilityState !== 'hidden';
                }, Boolean(immediate));
            }
            tryRelayParentStreamToStudentIframe();
            if (iframeWin && !state.iframeReady) {
                postStudentIframeInit(iframeWin, true);
            }
            return;
        }
        stopLocalProctorImageCapture();
        stopLiveIframeProctorImageCapture();
        liveProctorImageInterval = setInterval(function() {
            pollLiveStudentIframe(state);
        }, getProctorIntervalMs(state.setinterval));
        if (immediate || !shouldSkipProctorIntervalCapture()) {
            pollLiveStudentIframe(state);
        }
    }

    /**
     * @param {Object} args
     * @return {Camera}
     */
    function startOnlineStudentLiveSession(args) {
        claimLiveStreamOwnership(args.quizid, args.attemptid);
        setupTopLevelAttemptShell(args.attemptid, args.cmid);
        liveProctoringParentActive = true;
        window.proctorlinkLiveAudioParent = true;
        if (!getStoredVideoPosition()) {
            resetVideoPositionToDefault();
        }
        var iframeContainer = $("<div>").addClass("student-iframe-container");
        var baseUrl = `${externalserver}/student`;
        var params = new URLSearchParams({
            id: args.studenthexstring,
            name: args.userfullname,
            examId: args.quizid,
            attemptid: args.attemptid,
            room: args.room,
            parentOrigin: window.location.origin
        });
        var iframeUrl = `${baseUrl}?${params.toString()}`;
        var useParentLiveStream = !ismobiledevice() || isIosPhone() ||
            mediaStreamHasLiveVideo(localMediaStream);
        liveUseParentMedia = useParentLiveStream;
        var iframe = $("<iframe>")
            .attr({
                'frameborder': '0',
                'allow': 'camera; microphone; autoplay; fullscreen',
            })
            .on('load', function() {
                postStudentIframeInit(iframe[0].contentWindow, useParentLiveStream && !isAndroidPhone());
            });
        iframeContainer.append(iframe);
        $('body').append(iframeContainer);
        // Off-screen but display:block before navigation, or phones never
        // start the publisher. Phones set src now so the teacher room gets
        // the camera first. Desktop opens the usual webcam preview first.
        hideStudentIframeFromStudent();
        if (ismobiledevice()) {
            iframe.attr('src', iframeUrl);
        }
        appendAttemptVideo(args.enablestudentvideo);
        $('<canvas>').attr({
            id: 'canvas',
            width: '280',
            height: '240',
            'style': 'display: none;'
        }).appendTo('body');
        configureLiveAttemptResume(args, useParentLiveStream);
        if (attemptMediaResume) {
            attemptMediaResume.liveIframeUrl = iframeUrl;
        }
        bindTabSwitchListener(args.cmid, args.attemptid, args.mainimage);
        var camera = new Camera(args.cmid, args.mainimage, args.attemptid, args.quizid);
        if (attemptMediaResume) {
            attemptMediaResume.camera = camera;
        }
        if (useParentLiveStream) {
            // Desktop keeps the same local webcam preview used for the whole quiz.
            // Phones leave the lens to the publisher and must not open a second camera.
            var desktopCamera = !ismobiledevice();
            whenSecurePopupLayoutReady().then(function() {
                if (desktopCamera) {
                    return null;
                }
                return waitForPublisherCamera(4000);
            }).then(function() {
                if (!desktopCamera && liveIframeImageSeen) {
                    // The student frame already published. Opening the camera
                    // here takes that lens and the teacher room goes blank.
                    liveUseParentMedia = false;
                    if (typeof liveProctorPollingResume === 'function') {
                        liveProctorPollingResume(true);
                    }
                    return null;
                }
                return startOnlineProctoringWebcam(
                    args.cmid, args.attemptid, args.mainimage, ASK_AUDIO, Number(args.enablerecordaudio)
                );
            }).then(function(stream) {
                if (!iframe.attr('src')) {
                    iframe.attr('src', iframeUrl);
                }
                window.setTimeout(function() {
                    if (typeof liveProctorPollingResume === 'function') {
                        liveProctorPollingResume();
                    } else if (camera) {
                        scheduleLocalProctorImageCapture(camera, args.setinterval, function() {
                            return document.visibilityState !== 'hidden';
                        });
                    }
                }, 0);
                if (!stream || !camera) {
                    return null;
                }
                camera.video = document.getElementById('video');
                camera.canvas = document.getElementById('canvas');
                if (camera.video && localMediaStream) {
                    attachStreamToVideoElement(camera.video, localMediaStream);
                    applyAttemptVideoVisibility(camera.video, args.enablestudentvideo);
                }
                scheduleParentStreamRelay();
                return null;
            }).catch(function() {
                return null;
            });
        }
        bindMobileAudioGestureRetry(
            args.attemptid, args.enablerecordaudio, args.cmid, args.mainimage
        );
        var state = {
            iframeReady: false,
            responseReceived: true,
            iframeMissCount: 0,
            useParentLiveStream: useParentLiveStream,
            camera: camera,
            cmid: args.cmid,
            attemptid: args.attemptid,
            mainimage: args.mainimage,
            setinterval: args.setinterval,
            quizid: args.quizid,
            userid: args.userid,
            enablerecordaudio: args.enablerecordaudio
        };
        window.addEventListener('message', function(event) {
            handleLiveStudentIframeMessage(event, state);
        });
        liveProctorPollingResume = function(immediate) {
            startLiveStudentIframePolling(state, immediate);
        };
        liveProctorPollingResume();
        return camera;
    }

    var init = function(cmid, mainimage, verifyduringattempt = true, attemptid = null,
        teacher, quizid, enableeyecheckreal, studenthexstring,
        onlinestudent = 0, securewindow = null, userfullname,
        enablestudentvideo = 1, enablerecordaudio = 0, enableobjectdetect = 1, setinterval = 300,
        warnings = 0, userid = null, usergroup = '', detectionval = null, warningEmailThreshold = 0,
        storeallimages = 0) {
        // Ask for the mic when recording is on, or live proctoring needs it for the teacher.
        // Image capture only requires a live mic when audio recording is enabled.
        ASK_AUDIO = Boolean(Number(enablerecordaudio) || Number(onlinestudent));
        USE_AUDIO = Boolean(Number(enablerecordaudio));
        if (typeof ismobiledevice === 'function' && ismobiledevice() && Number(onlinestudent)) {
            ASK_AUDIO = Boolean(Number(enablerecordaudio));
            USE_AUDIO = Boolean(Number(enablerecordaudio));
        }
        mobileAudioPermissionSettled = !ASK_AUDIO;
        if (ASK_AUDIO) {
            markMicrophoneSettleGrace(8000);
        }
        var intervalSeconds = Number(setinterval);
        if (!intervalSeconds || intervalSeconds < 1) {
            intervalSeconds = 300;
        }
        proctorTimeIntervalMs = intervalSeconds * 1000;
        if (!verifyduringattempt) {
            initPreflightSession({
                cmid: cmid,
                mainimage: mainimage,
                attemptid: attemptid,
                quizid: quizid,
                teacher: teacher,
                enableeyecheckreal: enableeyecheckreal,
                studenthexstring: studenthexstring,
                onlinestudent: onlinestudent,
                securewindow: securewindow,
                userfullname: userfullname,
                enablestudentvideo: enablestudentvideo,
                enablerecordaudio: enablerecordaudio,
                enableobjectdetect: enableobjectdetect,
                setinterval: setinterval,
                warnings: warnings,
                userid: userid,
                usergroup: usergroup,
                detectionval: detectionval,
                warningEmailThreshold: warningEmailThreshold,
                storeallimages: storeallimages
            });
            return;
        }
        if (isProctorlinkQuizIframe()) {
                installQuizInteractionLocks();
                window.onbeforeunload = null;
                require(['core_form/changechecker'], function(FormChangeChecker) {
                    if (FormChangeChecker.disableAllChecks) {
                        FormChangeChecker.disableAllChecks();
                    }
                    if (FormChangeChecker.resetAllFormDirtyStates) {
                        FormChangeChecker.resetAllFormDirtyStates();
                    }
                });
                return;
            }
            resetStaleProctorlinkShellState();
            if (liveProctoringParentActive) {
                return;
            }
            localStorage.setItem('quizid', JSON.stringify(quizid));
            if (attemptid) {
                syncProctorlinkAttemptAudioOwner(attemptid);
            }
            syncWarningThresholdFromServer(warnings, attemptid);
            localStorage.setItem('warningEmailThreshold', JSON.stringify(warningEmailThreshold));
            objectDetectionEnabled = Number(enableobjectdetect) === 1;
            if (objectDetectionEnabled) {
                scheduleObjectDetectionPreload();
            }
            EyeTracking.configure({
                onTiltAlert: function(cmid, attemptid, mainimage, imageData) {
                    realtimeDetection(cmid, attemptid, mainimage, 'eyesnotopen', imageData);
                },
                captureFrame: captureVideoFrameDataUrl,
                isTerminationInProgress: function() {
                    return quizTerminationInProgress;
                },
                shouldSkipFrame: function() {
                    return shouldSuppressMediaAlerts() ||
                        (ismobiledevice() && document.visibilityState === 'hidden');
                },
            });
            EyeTracking.initFromQuizSettings(enableeyecheckreal, detectionval);
            EyeTracking.bindDocumentEvents();
            if (EyeTracking.isEnabled()) {
                EyeTracking.schedulePreload();
            }
            installQuizInteractionLocks();
            var room = `${studenthexstring}_${quizid}`;
            if (usergroup != '') {
                room = `${studenthexstring}_${quizid}_${usergroup}`;
            }

            if (Number(onlinestudent) && isOtherWindowPublishingLive(quizid, attemptid)) {
                liveProctoringParentActive = false;
            } else if (Number(onlinestudent)) {
                startOnlineStudentLiveSession({
                    cmid: cmid,
                    mainimage: mainimage,
                    attemptid: attemptid,
                    quizid: quizid,
                    studenthexstring: studenthexstring,
                    userfullname: userfullname,
                    room: room,
                    enablestudentvideo: enablestudentvideo,
                    enablerecordaudio: enablerecordaudio,
                    setinterval: setinterval,
                    storeallimages: storeallimages,
                    userid: userid
                });
            } else {
                setupTopLevelAttemptShell(attemptid, cmid);
                liveProctoringParentActive = true;
                window.proctorlinkLiveAudioParent = Boolean(Number(enablerecordaudio));
                if (!getStoredVideoPosition()) {
                    resetVideoPositionToDefault();
                }
                attemptMediaResume = {
                    mode: 'local',
                    cmid: cmid,
                    attemptid: attemptid,
                    mainimage: mainimage,
                    requireAudio: ASK_AUDIO,
                    enableRecordAudio: enablerecordaudio,
                    enableStudentVideo: enablestudentvideo,
                    teacher: teacher,
                    setinterval: setinterval,
                    quizid: quizid,
                    verifyduringattempt: verifyduringattempt,
                    storeallimages: Number(storeallimages)
                };
                setupLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
                    teacher, enablestudentvideo, enablerecordaudio, setinterval,
                    quizid);
                bindMobileAudioGestureRetry(
                    attemptid, enablerecordaudio, cmid, mainimage
                );
            }
        registerVideoPositionSave();
    };

    return {
        init: init
    };

    /**
     * Reattach a camera and microphone that are already open.
     *
     * @param {int} cmid - cmid
     * @param {boolean} mainimage - boolean value
     * @param {boolean} verifyduringattempt - boolean value
     * @param {int} attemptid - Attempt Id
     * @param {boolean} enablestudentvideo - boolean value
     * @param {boolean} enablerecordaudio - boolean value
     * @param {bigint} setinterval - int value
     * @param {int} quizid - int value
     * @return {boolean} true when the existing stream was reused
     */
    function reuseExistingLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
            enablestudentvideo, enablerecordaudio, setinterval, quizid) {
        if (localMediaStream &&
                !mediaStreamHasLiveVideo(localMediaStream) &&
                !mediaStreamHasLiveAudio(localMediaStream)) {
            localMediaStream = null;
        }
        if (localMediaStream === null) {
            return false;
        }
        if (verifyduringattempt) {
            var existingVideo = document.querySelector('video.quizaccess_quizproctoring-video');
            if (!existingVideo) {
                $('<canvas>').attr({id: 'canvas', width: '280',
                    height: '240', 'style': 'display: none;'}).appendTo('body');
                appendAttemptVideo(enablestudentvideo);
                var attemptVideo = getAttemptVideoElement();
                if (attemptVideo) {
                    attachStreamToVideoElement(attemptVideo, localMediaStream);
                }
            } else if (mediaStreamHasLiveVideo(localMediaStream) &&
                    existingVideo.srcObject !== localMediaStream) {
                attachStreamToVideoElement(existingVideo, localMediaStream);
                applyAttemptVideoVisibility(existingVideo, enablestudentvideo);
            }
            if (Number(enablerecordaudio)) {
                attachMicAndStartRecording(localMediaStream, attemptid);
            }
            bindMobileAudioGestureRetry(attemptid, enablerecordaudio, cmid, mainimage);
            var resumeCamera = new Camera(cmid, mainimage, attemptid, quizid);
            resumeCamera.startcamera(localMediaStream);
            if (attemptMediaResume) {
                attemptMediaResume.camera = resumeCamera;
            }
            scheduleLocalProctorImageCapture(resumeCamera, setinterval, function() {
                return document.visibilityState !== 'hidden';
            }, true);
        }
        return true;
    }

    /**
     * Setup Local Media
     *
     * @param {int} cmid - cmid
     * @param {boolean} mainimage - boolean value
     * @param {boolean} verifyduringattempt - boolean value
     * @param {int} attemptid - Attempt Id
     * @param {boolean} teacher - boolean value
     * @param {boolean} enablestudentvideo - boolean value
     * @param {boolean} enablerecordaudio - boolean value
     * @param {bigint} setinterval - int value
     * @param {int} quizid - int value
     * @param {function} callback - The callback function to execute after setting up the media stream.
     * @return {void}
     */
    function setupLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
        teacher, enablestudentvideo, enablerecordaudio,
        setinterval, quizid, callback) {
        require(['core/ajax'], function() {
            if (quizTerminationInProgress ||
                    (shouldSuppressMediaAlerts() && !isQuizIframeOnAttemptPage())) {
                if (callback) {
                    callback();
                }
                return;
            }
            if (reuseExistingLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
                    enablestudentvideo, enablerecordaudio, setinterval, quizid)) {
                if (callback) {
                    callback();
                }
                return;
            }
            var teacherroom = getTeacherroom();
            if (teacherroom !== 'teacher') {
                navigator.getUserMedia = (
                    navigator.getUserMedia ||
                    navigator.webkitGetUserMedia ||
                    navigator.mozGetUserMedia ||
                    navigator.msGetUserMedia
                );
                bindMobileAudioGestureRetry(attemptid, enablerecordaudio, cmid, mainimage);
                beginMediaAcquire(cmid, attemptid, mainimage, USE_AUDIO);
                void whenSecurePopupLayoutReady()
                .then(function() {
                    return preparePopupCameraAccess();
                })
                .then(function() {
                    return requestPreferredUserMediaWithRetry(ASK_AUDIO, false);
                })
                .then(function(stream) {
                    endMediaAcquire();
                    if (quizTerminationInProgress ||
                            (shouldSuppressMediaAlerts() && !isQuizIframeOnAttemptPage())) {
                        if (stream && stream.getTracks) {
                            stream.getTracks().forEach(function(track) {
                                try {
                                    track.stop();
                                } catch (e) {
                                    // Ignore.
                                }
                            });
                        }
                        return null;
                    }
                    localMediaStream = stream;
                    if (verifyduringattempt) {
                        $('<canvas>').attr({id: 'canvas', width: '280',
                            height: '240', 'style': 'display: none;'}).appendTo('body');
                        appendAttemptVideo(enablestudentvideo);
                        if (Number(enablerecordaudio)) {
                            mobileAudioPermissionSettled = false;
                            markMicrophoneSettleGrace(getMicrophoneSettleGraceMs());
                            settleLocalStreamMicrophone(stream, attemptid);
                            bindMobileAudioGestureRetry(
                                attemptid, enablerecordaudio, cmid, mainimage
                            );
                        }
                    }
                    let allowproctoring = true;

                    bindTabSwitchListener(cmid, attemptid, mainimage, function(state) {
                        if (ismobiledevice()) {
                            allowproctoring = state !== 'hidden';
                        }
                    });

                    var camera = new Camera(cmid, mainimage, attemptid, quizid);
                    camera.startcamera(stream);
                    if (attemptMediaResume) {
                        attemptMediaResume.camera = camera;
                    }
                    if (objectDetectionEnabled) {
                        const videoEl = document.getElementById('video');
                        const canvasEl = document.getElementById('canvas');
                        startObjectDetectionOnElements(cmid, attemptid, mainimage, videoEl, canvasEl);
                    }
                    if (EyeTracking.isActive()) {
                        const videoEl = document.getElementById('video');
                        const canvasEl = document.getElementById('canvas');
                        if (videoEl && canvasEl) {
                            EyeTracking.start(cmid, attemptid, mainimage, videoEl, canvasEl);
                        }
                    }

                    scheduleLocalProctorImageCapture(camera, setinterval, function() {
                        return allowproctoring;
                    });

                    return stream;
                })
                .catch(function() {
                    endMediaAcquire();
                    if (verifyduringattempt && !shouldSuppressMediaAlerts()) {
                        bindTabSwitchListener(cmid, attemptid, mainimage);
                        var camera = new Camera(cmid, mainimage, attemptid, quizid);
                        scheduleLocalProctorImageCapture(camera, setinterval, function() {
                            return document.visibilityState !== 'hidden';
                        });
                        bindMobileAudioGestureRetry(
                            attemptid, enablerecordaudio, cmid, mainimage
                        );
                        if (!shouldDeferMediaDisabledAlert()) {
                            reportMissingMediaIfNeeded(cmid, attemptid, mainimage);
                        }
                        scheduleMissingMediaWarnings(cmid, attemptid, mainimage);
                    }
                })
                .finally(function() {
                    if (callback) {
                        callback();
                    }
                });
            } else {
                localMediaStream = createDummyMediaStream();
                if (callback) {
                    callback();
                }
            }
        });
    }

    /**
     * Checks if the current device is a mobile device.
     *
     * @returns {boolean} True if the device is a mobile device, false otherwise.
     */
    function ismobiledevice() {
        return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
    }

    /**
     * Detect device information from user agent string.
     *
     * @returns {string} Device type (Windows, Mac, Tablet, Mobile, or Unknown)
     */
    function detectDeviceInfo() {
        const useragent = navigator.userAgent || '';
        if (!useragent) {
            return 'Unknown';
        }

        const ua = useragent.toLowerCase();

        if (/ipad/i.test(ua)) {
            return 'Mac iPad';
        }

        if (/iphone|ipod/i.test(ua)) {
            return 'Mobile';
        }

        if (/macintosh|mac os x|mac_powerpc/i.test(ua)) {
            return 'Mac Desktop';
        }

        if ((/android/i.test(ua) && /tablet/i.test(ua)) ||
            (/android/i.test(ua) && !/mobile/i.test(ua))) {
            return 'Tablet';
        }

        if (/blackberry|windows phone|opera mini/i.test(ua) ||
            (/android/i.test(ua) && /mobile/i.test(ua))) {
            return 'Mobile';
        }

        if (/windows|win32|win64|wow64/i.test(ua)) {
            return 'Windows';
        }

        if (/cros/i.test(ua)) {
            return 'Chrome OS';
        }

        if (/linux/i.test(ua) && !/android/i.test(ua)) {
            return 'Linux';
        }

        if (/x11|unix|bsd/i.test(ua) && !/android|linux/i.test(ua)) {
            return 'Unix';
        }

        return 'Unknown';
    }

    /**
     * Keep audiorecord IndexedDB owner key aligned with the live attempt.
     *
     * @param {number|string} attemptid
     * @return {void}
     */
    function syncProctorlinkAttemptAudioOwner(attemptid) {
        if (!attemptid) {
            return;
        }
        try {
            localStorage.setItem('proctorlink_attemptid', String(attemptid));
        } catch (e) {
            // Ignore.
        }
        var input = document.querySelector('input[name="attempt"][data-proctorlink-audio-owner="1"]');
        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'attempt';
            input.setAttribute('data-proctorlink-audio-owner', '1');
            document.body.appendChild(input);
        }
        input.value = String(attemptid);
    }

    /**
     * Attempt/quiz ids for a final audio flush (IndexedDB owner + upload_audio.php).
     *
     * @param {number|string} [attemptid]
     * @param {number|string} [quizid]
     * @return {{attemptid?: string, quizid?: string}}
     */
    function getProctorlinkAudioFlushMeta(attemptid, quizid) {
        var meta = {};
        if (attemptid) {
            meta.attemptid = String(attemptid);
        }
        var resolvedQuizId = quizid;
        if (!resolvedQuizId) {
            try {
                if (window.__proctorlinkQuizId) {
                    resolvedQuizId = window.__proctorlinkQuizId;
                }
            } catch (e) {
                // Ignore.
            }
        }
        if (!resolvedQuizId) {
            try {
                resolvedQuizId = JSON.parse(localStorage.getItem('quizid'));
            } catch (e2) {
                var raw = localStorage.getItem('quizid');
                if (raw) {
                    resolvedQuizId = String(raw).replace(/^"|"$/g, '');
                }
            }
        }
        if (resolvedQuizId) {
            meta.quizid = String(resolvedQuizId);
        }
        return meta;
    }

    /**
     * @param {boolean} [keepalive]
     * @param {{attemptid?: string|number, quizid?: string|number}|null} [meta]
     * @return {Promise}
     */
    function flushProctorlinkAudioUpload(keepalive, meta) {
        var flushFn = null;
        try {
            if (typeof window.proctorlinkFlushAudioUpload === 'function') {
                flushFn = window.proctorlinkFlushAudioUpload;
            } else if (window.parent && window.parent !== window &&
                    typeof window.parent.proctorlinkFlushAudioUpload === 'function') {
                flushFn = window.parent.proctorlinkFlushAudioUpload.bind(window.parent);
            }
        } catch (e) {
            flushFn = typeof window.proctorlinkFlushAudioUpload === 'function'
                ? window.proctorlinkFlushAudioUpload : null;
        }
        if (typeof flushFn === 'function') {
            try {
                var result = flushFn(!!keepalive, meta || null);
                if (result && typeof result.then === 'function') {
                    return result.catch(function() {
                        return null;
                    });
                }
            } catch (e) {
                // Ignore.
            }
        }
        return Promise.resolve(null);
    }

    /**
     * Proctor-failed auto-submit already finished the attempt server-side.
     * Flush leftover audio (critical on Mac/Safari) before leaving for review.
     *
     * @param {string} url review URL
     * @param {string} [msg] autosubmit message
     * @param {number|string} [attemptid]
     * @param {number|string} [quizid]
     * @return {void}
     */
    function redirectAfterProctorAutoSubmit(url, msg, attemptid, quizid) {
        if (!url || window.__proctorlinkAutoSubmitRedirect) {
            return;
        }
        window.__proctorlinkAutoSubmitRedirect = true;
        quizTerminationInProgress = true;
        window.onbeforeunload = null;
        window.__proctorlinkAllowUnload = true;
        if (attemptid) {
            syncProctorlinkAttemptAudioOwner(attemptid);
        }
        if (msg) {
            $(document).trigger('popup', msg);
        }

        var navigated = false;
        var flushDone = false;
        var minWaitDone = false;
        var go = function() {
            if (navigated || !flushDone || !minWaitDone) {
                return;
            }
            navigated = true;
            stopAttemptMediaTracks();
            navigateTop(url);
        };

        window.setTimeout(function() {
            minWaitDone = true;
            go();
        }, 3000);

        var flushTimer = window.setTimeout(function() {
            flushDone = true;
            go();
        }, 8000);

        // Wait for the POST (no keepalive) so Mac/Safari does not drop FormData.
        flushProctorlinkAudioUpload(false, getProctorlinkAudioFlushMeta(attemptid, quizid))
            .then(function() {
                window.clearTimeout(flushTimer);
                flushDone = true;
                go();
                return null;
            })
            .catch(function() {
                window.clearTimeout(flushTimer);
                flushDone = true;
                go();
            });
    }

    /**
     * Stop camera/mic after a final audio flush so no new clips start.
     *
     * @return {void}
     */
    function stopAttemptMediaTracks() {
        try {
            EyeTracking.stop(false);
        } catch (e) {
            // Ignore.
        }
        if (localProctorImageInterval) {
            clearInterval(localProctorImageInterval);
            localProctorImageInterval = null;
        }
        if (liveProctorImageInterval) {
            clearInterval(liveProctorImageInterval);
            liveProctorImageInterval = null;
        }
        if (localMediaStream) {
            try {
                localMediaStream.getTracks().forEach(function(track) {
                    try {
                        track.onended = null;
                    } catch (e2) {
                        // Ignore.
                    }
                    track.stop();
                });
            } catch (e) {
                // Ignore.
            }
            localMediaStream = null;
        }
        if (audioStartRetryTimer) {
            window.clearInterval(audioStartRetryTimer);
            audioStartRetryTimer = null;
        }
        userAudioHookStarted = false;
    }

    /**
     * @param {MediaStream} stream
     * @param {number|string} [attemptid]
     * @return {void}
     */
    function startUserAudioRecording(stream, attemptid) {
        if (attemptid) {
            syncProctorlinkAttemptAudioOwner(attemptid);
        }
        var begin = function(audioSource) {
            if (!audioSource || typeof audioSource.getAudioTracks !== 'function') {
                return;
            }
            audioSource.getAudioTracks().forEach(function(track) {
                if (track) {
                    track.enabled = true;
                }
            });
            var tryStart = function(triesLeft) {
                if (userAudioHookStarted) {
                    return;
                }
                if (typeof window.useraudiorecord === 'function') {
                    var started = window.useraudiorecord(audioSource, attemptid);
                    if (started !== false) {
                        userAudioHookStarted = true;
                        if (liveProctoringParentActive) {
                            window.proctorlinkLiveAudioParent = true;
                        }
                    }
                    return;
                }
                if (triesLeft > 0) {
                    window.setTimeout(function() {
                        tryStart(triesLeft - 1);
                    }, 200);
                }
            };
            tryStart(15);
        };
        if (mediaStreamHasLiveAudio(stream)) {
            begin(stream);
            scheduleAudioRecordingRetry(attemptid);
            return;
        }
        ensureMicrophoneOnStream(stream || localMediaStream).then(function(withAudio) {
            localMediaStream = withAudio || stream || localMediaStream;
            if (mediaStreamHasLiveAudio(localMediaStream)) {
                userAudioHookStarted = false;
                begin(localMediaStream);
            }
            scheduleAudioRecordingRetry(attemptid);
            return null;
        }).catch(function() {
            scheduleAudioRecordingRetry(attemptid);
            return null;
        });
    }

    /**
     * First Mac attempt often grants camera before the mic is live, then marks
     * the recorder as started even when monitoring was skipped.
     *
     * @param {number|string} [attemptid]
     * @return {void}
     */
    function scheduleAudioRecordingRetry(attemptid) {
        if (!USE_AUDIO || audioStartRetryTimer || !isMacDesktop()) {
            return;
        }
        var tries = 0;
        audioStartRetryTimer = window.setInterval(function() {
            tries += 1;
            if (quizTerminationInProgress || tries > 20) {
                window.clearInterval(audioStartRetryTimer);
                audioStartRetryTimer = null;
                return;
            }
            if (typeof window.proctorlinkUnlockAudio === 'function') {
                window.proctorlinkUnlockAudio();
            }
            if (userAudioHookStarted &&
                    typeof window.proctorlinkAudioMonitorActive === 'function' &&
                    window.proctorlinkAudioMonitorActive()) {
                window.clearInterval(audioStartRetryTimer);
                audioStartRetryTimer = null;
                return;
            }
            if (userAudioHookStarted &&
                    typeof window.proctorlinkAudioMonitorActive === 'function' &&
                    !window.proctorlinkAudioMonitorActive()) {
                userAudioHookStarted = false;
            }
            if (localMediaStream) {
                startUserAudioRecording(localMediaStream, attemptid);
            }
        }, 500);
    }

    /**
     * @param {MediaStream} stream
     * @param {number|string} attemptid
     * @return {Promise<MediaStream|null>}
     */
    function attachMicAndStartRecording(stream, attemptid) {
        return ensureMicrophoneOnStream(stream).then(function(withAudio) {
            localMediaStream = withAudio || stream || localMediaStream;
            startUserAudioRecording(localMediaStream, attemptid);
            return localMediaStream;
        }).catch(function() {
            return null;
        });
    }

    /**
     * @param {MediaStream} stream
     * @param {number|string} attemptid
     * @return {Promise<MediaStream|null>}
     */
    function settleLocalStreamMicrophone(stream, attemptid) {
        return ensureMicrophoneOnStream(stream).then(function(withAudio) {
            localMediaStream = withAudio || stream;
            if (mediaStreamHasLiveAudio(localMediaStream) ||
                    mediaStreamHasAudioTrack(localMediaStream)) {
                markAudioPermissionSettled();
                if (mediaStreamHasLiveAudio(localMediaStream)) {
                    startUserAudioRecording(localMediaStream, attemptid);
                    clearMediaDisabledAlertState();
                }
            } else if (!isIosPhone()) {
                markAudioPermissionSettled();
            }
            return localMediaStream;
        }).catch(function() {
            return null;
        });
    }

    /**
     * Track warnings for email threshold and, when needed, schedule
     * an adhoc email task via AJAX without affecting quiz flow.
     *
     * @param {int} cmid - course module id
     * @param {int} attemptid - quiz attempt id
     * @return {void}
     */
    function trackWarningAndMaybeQueueEmail(cmid, attemptid) {
        var original = JSON.parse(localStorage.getItem('warningOriginalThreshold')) || 0;
        if (original !== 0) {
            return;
        }

        var warningEmailThreshold = JSON.parse(localStorage.getItem('warningEmailThreshold')) || 0;
        if (warningEmailThreshold <= 0) {
            return;
        }

        var emailCount = JSON.parse(localStorage.getItem('warningEmailCount')) || 0;
        emailCount += 1;
        localStorage.setItem('warningEmailCount', JSON.stringify(emailCount));

        if (emailCount !== warningEmailThreshold) {
            return;
        }

        var quizid = JSON.parse(localStorage.getItem('quizid')) || null;
        if (!quizid) {
            return;
        }

        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_warningemail.php',
            method: 'POST',
            data: {
                cmid: cmid,
                quizid: quizid,
                attemptid: attemptid,
                warningemailcount: emailCount
            }
        });
    }

    /**
     * Repeat a camera or microphone warning for as long as the device stays off.
     * Each popup waits for the quiz time interval.
     *
     * @param {number} cmid
     * @param {number} attemptid
     * @param {boolean} mainimage
     * @return {void}
     */
    function scheduleMissingMediaWarnings(cmid, attemptid, mainimage) {
        if (missingMediaWarningTimer || mainimage) {
            return;
        }
        missingMediaWarningTimer = window.setInterval(function() {
            if (quizTerminationInProgress || shouldSuppressMediaAlerts()) {
                window.clearInterval(missingMediaWarningTimer);
                missingMediaWarningTimer = null;
                return;
            }
            var hasVideo = mediaStreamHasLiveVideo(localMediaStream);
            var hasAudio = mediaStreamHasLiveAudio(localMediaStream);
            if (hasVideo && (!ASK_AUDIO || hasAudio)) {
                window.clearInterval(missingMediaWarningTimer);
                missingMediaWarningTimer = null;
                return;
            }
            reportMissingMediaIfNeeded(cmid, attemptid, mainimage);
        }, getProctorIntervalMs());
    }

    /**
     * Report a camera/microphone disabled warning on the quiz time interval.
     * First detection only starts the timer; the popup (with warnings left) fires later.
     *
     * @param {number} cmid
     * @param {number} attemptid
     * @param {boolean} mainimage
     * @param {string} validatekey
     * @param {string} popupmessage
     * @return {void}
     */
    function reportMediaDisabledOnce(cmid, attemptid, mainimage, validatekey, popupmessage) {
        if (quizTerminationInProgress || shouldSuppressMediaAlerts() || mediaAcquireInProgress) {
            return;
        }
        var now = Date.now();
        if (!lastMediaDisabledAlertAt) {
            lastMediaDisabledAlertAt = now;
            return;
        }
        if ((now - lastMediaDisabledAlertAt) < proctorTimeIntervalMs) {
            return;
        }
        lastMediaDisabledAlertAt = now;

        if (!attemptid || mainimage) {
            if (popupmessage) {
                $(document).trigger('popup', popupmessage);
            }
            return;
        }

        suppressRealtimePopupUntil = 0;
        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_realtime.php',
            method: 'POST',
            dataType: 'json',
            data: {
                cmid: cmid,
                attemptid: attemptid,
                mainimage: mainimage,
                validate: validatekey,
            },
            success: function(response) {
                handleRealtimeWarningResponse(
                    parseProctoringAjaxResponse(response),
                    popupmessage,
                    cmid,
                    attemptid
                );
            },
            error: function(xhr) {
                handleRealtimeWarningXhrError(xhr, popupmessage, cmid, attemptid);
            }
        });
    }

    /**
     * Reset media-disabled alert cooldown.
     *
     * @return {void}
     */
    function clearMediaDisabledAlertState() {
        lastMediaDisabledAlertAt = 0;
    }

    /**
     * Bind a single tab-switch visibility listener.
     *
     * @param {number} cmid
     * @param {number} attemptid
     * @param {boolean} mainimage
     * @param {Function} [onVisibility]
     * @return {void}
     */
    function bindTabSwitchListener(cmid, attemptid, mainimage, onVisibility) {
        if (tabSwitchListenerBound) {
            return;
        }
        tabSwitchListenerBound = true;
        document.addEventListener('visibilitychange', function() {
            if (typeof onVisibility === 'function') {
                onVisibility(document.visibilityState);
            }
            if (document.visibilityState === 'visible') {
                resumeParentCameraKeepShell();
                visibilitychange(cmid, attemptid, mainimage);
                scheduleProctorCatchUpOnVisible();
            }
        });
    }

    /**
     * Setup visibility change
     *
     * @param {int} cmid - cmid
     * @param {int} attemptid - Attempt Id
     * @param {boolean} mainimage - boolean value
     * @return {void}
     */
    function visibilitychange(cmid, attemptid, mainimage) {
        if (document.body.classList.contains('proctorlink-on-summary') ||
                document.body.classList.contains('proctorlink-on-view') ||
                shouldSuppressMediaAlerts()) {
            return;
        }

        var warningsl = JSON.parse(localStorage.getItem('warningThreshold')) || 0;
        var leftwarnings = Math.max(warningsl - 1, 0);
        localStorage.setItem('warningThreshold', JSON.stringify(leftwarnings));
        let message = M.util.get_string('tabwarning', 'quizaccess_quizproctoring');
        if (leftwarnings === 1) {
            message = M.util.get_string('tabwarningoneleft', 'quizaccess_quizproctoring');
        } else if (leftwarnings > 1) {
            message = M.util.get_string('tabwarningmultiple', 'quizaccess_quizproctoring', leftwarnings);
        }
        $(document).trigger('popup', message);
        trackWarningAndMaybeQueueEmail(cmid, attemptid);
        $.ajax({
        url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
        method: 'POST',
        data: {cmid: cmid, attemptid: attemptid, mainimage: mainimage, tab: true},
            success: function(response) {
                if (response && response.redirect && response.url) {
                    redirectAfterProctorAutoSubmit(response.url, response.msg, attemptid);
                }
            }
        });
    }

    /**
     * Create Dummy Media Stream
     *
     * @return {string} dummyStream
     */
     function createDummyMediaStream() {
        const audioContext = new AudioContext();
        const dummyAudio = audioContext.createMediaStreamDestination();
        const dummyVideo = document.createElement('canvas').captureStream(0);

        const dummyStream = new MediaStream();
        dummyStream.addTrack(dummyAudio.stream.getAudioTracks()[0]);
        dummyStream.addTrack(dummyVideo.getVideoTracks()[0]);
        return dummyStream;
    }

    /**
     * Get Teacher room
     *
     * @return {string} teacher
     */
    function getTeacherroom() {
        var urlParams = new URLSearchParams(window.location.search);
        var teacher = urlParams.get('teacher');
        return teacher;
    }

/**
 * Read saved webcam coordinates from localStorage or cookie.
 *
 * @return {{left: number, top: number}|null}
 */
function getStoredVideoPosition() {
    let savedPosition = localStorage.getItem('videoPosition');
    if (!savedPosition) {
        const match = document.cookie.match(/(?:^|; )quizproctoring_videopos=([^;]*)/);
        if (match) {
            const parts = decodeURIComponent(match[1]).split(',');
            const left = Number(parts[0]);
            const top = Number(parts[1]);
            if (!Number.isNaN(left) && !Number.isNaN(top)) {
                return {left: left, top: top};
            }
        }
        return null;
    }
    try {
        const {left, top} = JSON.parse(savedPosition);
        if (Number.isNaN(Number(left)) || Number.isNaN(Number(top))) {
            return null;
        }
        return {left: Number(left), top: Number(top)};
    } catch (e) {
        return null;
    }
}

/**
 * Inject CSS so the webcam keeps the dragged position across page loads.
 *
 * @param {number|null} left left offset
 * @param {number|null} top top offset
 * @return {void}
 */
function applyStoredVideoPositionStyle(left, top) {
    let posLeft = left;
    let posTop = top;
    if (posLeft === undefined || posTop === undefined || posLeft === null || posTop === null) {
        const stored = getStoredVideoPosition();
        if (!stored) {
            return;
        }
        posLeft = stored.left;
        posTop = stored.top;
    }
    let styleEl = document.getElementById('quizproctoring-video-pos-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'quizproctoring-video-pos-style';
        (document.head || document.documentElement).appendChild(styleEl);
    }
    styleEl.textContent = '#page-mod-quiz-attempt .proctorlink-video-wrap,' +
        '#page-mod-quiz-attempt video.quizaccess_quizproctoring-video,' +
        '#page-mod-quiz-attempt .quizaccess_quizproctoring-video,' +
        'body.proctorlink-attempt-shell .proctorlink-video-wrap,' +
        'body.proctorlink-attempt-shell video.quizaccess_quizproctoring-video,' +
        'body.proctorlink-attempt-shell .quizaccess_quizproctoring-video {' +
        'position:fixed !important;' +
        'left:' + posLeft + 'px !important;' +
        'top:' + posTop + 'px !important;' +
        'bottom:auto !important;' +
        'right:auto !important;' +
        '}';
}

/**
 * @return {void}
 */
function resetVideoPositionToDefault() {
    localStorage.removeItem('videoPosition');
    document.cookie = 'quizproctoring_videopos=; path=/; Max-Age=0; SameSite=Lax';
    var styleEl = document.getElementById('quizproctoring-video-pos-style');
    if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
    }
    var videoEl = document.querySelector('video.quizaccess_quizproctoring-video');
    var wrap = videoEl && videoEl.parentElement &&
        videoEl.parentElement.classList.contains('proctorlink-video-wrap') ?
        videoEl.parentElement : videoEl;
    if (wrap) {
        wrap.classList.remove('video-drag-positioned');
        wrap.style.removeProperty('left');
        wrap.style.removeProperty('top');
        wrap.style.removeProperty('bottom');
        wrap.style.removeProperty('right');
    }
    if (videoEl && wrap !== videoEl) {
        videoEl.classList.remove('video-drag-positioned');
        videoEl.style.removeProperty('left');
        videoEl.style.removeProperty('top');
        videoEl.style.removeProperty('bottom');
        videoEl.style.removeProperty('right');
    }
}

/**
 * Get the proctoring webcam element on the attempt page.
 *
 * @return {HTMLElement|null}
 */
function getAttemptVideoElement() {
    return document.querySelector('video.quizaccess_quizproctoring-video');
}

/**
 * Show the live preview, or keep a paintable off-screen video for capture.
 * Never use display:none on phones — iOS/Android stop decoding frames.
 *
 * @param {HTMLElement} videoEl
 * @param {boolean|number} enablestudentvideo
 * @return {void}
 */
function applyAttemptVideoVisibility(videoEl, enablestudentvideo) {
    if (!videoEl) {
        return;
    }
    var wrap = videoEl.parentElement &&
        videoEl.parentElement.classList.contains('proctorlink-video-wrap') ?
        videoEl.parentElement : videoEl;
    var show = typeof shouldShowStudentVideoPreview === 'function' ?
        shouldShowStudentVideoPreview(enablestudentvideo) : Number(enablestudentvideo);
    if (show) {
        document.body.classList.add('quizproctoring-show-video');
        document.body.classList.remove('quizproctoring-phone');
        if (wrap && wrap.classList) {
            wrap.classList.remove('quizproctoring-video-offscreen');
        }
        videoEl.classList.remove('quizproctoring-video-offscreen');
        wrap.removeAttribute('aria-hidden');
        videoEl.removeAttribute('aria-hidden');
        wrap.style.setProperty('display', 'block', 'important');
        wrap.style.setProperty('visibility', 'visible', 'important');
        wrap.style.setProperty('opacity', '1', 'important');
        wrap.style.setProperty('z-index', '9999999', 'important');
        videoEl.style.setProperty('display', 'block', 'important');
        videoEl.style.setProperty('visibility', 'visible', 'important');
        videoEl.style.setProperty('opacity', '1', 'important');
        return;
    }
    document.body.classList.remove('quizproctoring-show-video');
    if (typeof ismobiledevice === 'function' && ismobiledevice()) {
        document.body.classList.add('quizproctoring-phone');
    }
    if (wrap && wrap.classList) {
        wrap.classList.add('quizproctoring-video-offscreen');
    }
    wrap.setAttribute('aria-hidden', 'true');
    videoEl.setAttribute('aria-hidden', 'true');
    wrap.style.setProperty('display', 'block', 'important');
    wrap.style.setProperty('visibility', 'visible', 'important');
    wrap.style.setProperty('opacity', '0.01', 'important');
    // Above the quiz iframe (z-index 1000). iOS Safari will not decode a video
    // that the iframe covers, so interval snapshots never upload.
    wrap.style.setProperty('z-index', '1001', 'important');
    videoEl.style.setProperty('display', 'block', 'important');
    videoEl.style.setProperty('visibility', 'visible', 'important');
    videoEl.style.setProperty('opacity', '1', 'important');
}

/**
 * Re-attach/play the attempt video. Phones often get a live stream but a black
 * preview until play() runs from a tap.
 *
 * @return {void}
 */
function ensureAttemptVideoPlaying() {
    var videoEl = typeof getAttemptVideoElement === 'function' ?
        getAttemptVideoElement() : document.querySelector('video.quizaccess_quizproctoring-video');
    if (!videoEl) {
        videoEl = document.getElementById('video');
    }
    if (!videoEl || !localMediaStream ||
            (typeof mediaStreamHasLiveVideo === 'function' && !mediaStreamHasLiveVideo(localMediaStream))) {
        return;
    }
    if (!document.getElementById('canvas')) {
        $('<canvas>').attr({
            id: 'canvas',
            width: '280',
            height: '240',
            'style': 'display: none;'
        }).appendTo('body');
    }
    if (videoEl.srcObject !== localMediaStream) {
        attachStreamToVideoElement(videoEl, localMediaStream);
    } else {
        var playPromise = videoEl.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(function() {
                // Ignore.
            });
        }
    }
    applyAttemptVideoVisibility(
        videoEl,
        attemptMediaResume ? attemptMediaResume.enableStudentVideo : 1
    );
}

/**
 * Create the attempt webcam element and restore its saved position.
 *
 * @param {boolean} enablestudentvideo show video preview
 * @return {HTMLElement|null}
 */
function appendAttemptVideo(enablestudentvideo) {
    let videoEl = getAttemptVideoElement();
    if (!videoEl) {
        $('<video>').attr({
            'id': 'video',
            'class': 'quizaccess_quizproctoring-video',
            'width': '180',
            'height': '135',
            'autoplay': 'autoplay',
            'playsinline': 'true',
            'muted': 'true'
        }).appendTo('body');
        videoEl = getAttemptVideoElement();
    }
    if (videoEl) {
        configureLivePreviewVideo(videoEl);
        ensureAttemptVideoWrap(videoEl);
    }
    var wrap = videoEl && videoEl.parentElement &&
        videoEl.parentElement.classList.contains('proctorlink-video-wrap') ?
        videoEl.parentElement : videoEl;
    applyAttemptVideoVisibility(videoEl, enablestudentvideo);
    bindVideoDrag(wrap || videoEl);
    return videoEl;
}

/**
 * Apply a dragged/fixed position to the webcam element.
 * Clears bottom/right anchors so the element does not stretch across the page.
 *
 * @param {HTMLElement} element video element
 * @param {number} left left offset in pixels
 * @param {number} top top offset in pixels
 * @param {boolean} [persistStyleSheet] also update the shared position stylesheet
 * @return {void}
 */
function applyDraggedVideoPosition(element, left, top, persistStyleSheet) {
    if (persistStyleSheet !== false) {
        applyStoredVideoPositionStyle(left, top);
    }
    if (!element) {
        return;
    }
    element.style.setProperty('position', 'fixed', 'important');
    element.style.setProperty('left', left + 'px', 'important');
    element.style.setProperty('top', top + 'px', 'important');
    element.style.setProperty('bottom', 'auto', 'important');
    element.style.setProperty('right', 'auto', 'important');
    element.style.setProperty('z-index', '9999999', 'important');
    if (element.tagName !== 'VIDEO') {
        element.style.setProperty('pointer-events', 'auto', 'important');
    }
    element.style.setProperty('cursor', 'grab', 'important');
    element.classList.add('video-drag-positioned');
}

/**
 * Restore saved webcam position from localStorage or cookie.
 *
 * @param {HTMLElement} element video element
 * @return {void}
 */
function restoreVideoPosition(element) {
    const stored = getStoredVideoPosition();
    if (!stored) {
        return;
    }
    applyDraggedVideoPosition(element, stored.left, stored.top);
}

/**
 * Save the current dragged webcam position.
 *
 * @param {number} [left] left offset
 * @param {number} [top] top offset
 * @return {void}
 */
function persistVideoPosition(left, top) {
    let posLeft = left;
    let posTop = top;
    if (posLeft === undefined || posTop === undefined) {
        const wrap = document.querySelector('.proctorlink-video-wrap') || getAttemptVideoElement();
        if (!wrap) {
            return;
        }
        posLeft = parseInt(wrap.style.left, 10);
        posTop = parseInt(wrap.style.top, 10);
    }
    if (Number.isNaN(posLeft) || Number.isNaN(posTop)) {
        return;
    }
    localStorage.setItem('videoPosition', JSON.stringify({left: posLeft, top: posTop}));
    document.cookie = 'quizproctoring_videopos=' + encodeURIComponent(posLeft + ',' + posTop) +
        '; path=/; SameSite=Lax';
    applyStoredVideoPositionStyle(posLeft, posTop);
}

/**
 * Save position when navigating between quiz pages.
 *
 * @return {void}
 */
function registerVideoPositionSave() {
    const save = function() {
        persistVideoPosition();
    };
    window.addEventListener('pagehide', save);
    $(document).on('click', '#responseform input[type="submit"], #responseform button[type="submit"]', save);
    const form = document.getElementById('responseform');
    if (form) {
        form.addEventListener('submit', save);
    }
}

/**
 * Restore position and bind drag handlers once.
 *
 * @param {HTMLElement} element video element
 * @return {void}
 */
function bindVideoDrag(element) {
    if (!element) {
        return;
    }
    if (element.tagName === 'VIDEO' && isPreflightCaptureVideo(element)) {
        unwrapAttemptVideoIfNeeded(element);
        return;
    }
    var dragEl = element;
    if (element.tagName === 'VIDEO') {
        configureLivePreviewVideo(element);
        dragEl = ensureAttemptVideoWrap(element) || element;
    }
    restoreVideoPosition(dragEl);
    if (dragEl.dataset.quizproctoringDraggable === '1') {
        return;
    }
    dragEl.dataset.quizproctoringDraggable = '1';
    makeDraggable(dragEl);
}

/**
 * DraggableVideoPosition
 *
 * @param {HTMLElement} element video element
 * @return {void}
 */
function makeDraggable(element) {
    let offsetX = 0;
    let offsetY = 0;
    let dragWidth = 0;
    let dragHeight = 0;
    let isDragging = false;
    let rafId = 0;
    let pendingX = 0;
    let pendingY = 0;
    let lastLeft = 0;
    let lastTop = 0;
    let originLeft = 0;
    let originTop = 0;
    let activePointerId = null;
    const usePointer = typeof window.PointerEvent === 'function';

    element.style.setProperty('cursor', 'grab', 'important');
    element.style.setProperty('z-index', '9999999', 'important');
    element.style.setProperty('pointer-events', 'auto', 'important');
    element.style.setProperty('touch-action', 'none', 'important');
    element.style.setProperty('user-select', 'none', 'important');
    element.style.setProperty('-webkit-user-select', 'none', 'important');
    element.style.setProperty('-webkit-user-drag', 'none');
    element.setAttribute('draggable', 'false');

    /**
     * @param {boolean} on Whether a drag is active
     * @return {void}
     */
    function setDraggingUi(on) {
        if (on) {
            document.body.classList.add('proctorlink-video-is-dragging');
        } else {
            document.body.classList.remove('proctorlink-video-is-dragging');
        }
    }

    /**
     * @return {void}
     */
    function releasePointer() {
        if (activePointerId === null) {
            return;
        }
        try {
            if (element.releasePointerCapture &&
                    (!element.hasPointerCapture || element.hasPointerCapture(activePointerId))) {
                element.releasePointerCapture(activePointerId);
            }
        } catch (e) {
            // Ignore.
        }
        activePointerId = null;
    }

    /**
     * @param {number} clientX
     * @param {number} clientY
     * @return {void}
     */
    function queueMove(clientX, clientY) {
        pendingX = clientX;
        pendingY = clientY;
        if (rafId) {
            return;
        }
        rafId = window.requestAnimationFrame(function() {
            rafId = 0;
            moveElement(pendingX, pendingY);
        });
    }

    /**
     * @param {number} clientX
     * @param {number} clientY
     * @return {void}
     */
    function moveElement(clientX, clientY) {
        let newLeft = clientX - offsetX;
        let newTop = clientY - offsetY;
        const maxLeft = Math.max(0, window.innerWidth - dragWidth);
        const maxTop = Math.max(0, window.innerHeight - dragHeight);
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        if (newLeft === lastLeft && newTop === lastTop) {
            return;
        }
        lastLeft = newLeft;
        lastTop = newTop;
        element.style.setProperty(
            'transform',
            'translate3d(' + (newLeft - originLeft) + 'px, ' + (newTop - originTop) + 'px, 0)',
            'important'
        );
    }

    /**
     * @param {number} clientX
     * @param {number} clientY
     * @param {number|null} [pointerId]
     * @return {void}
     */
    function beginDrag(clientX, clientY, pointerId) {
        if (isDragging) {
            return;
        }
        const rect = element.getBoundingClientRect();
        isDragging = true;
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;
        dragWidth = rect.width;
        dragHeight = rect.height;
        lastLeft = rect.left;
        lastTop = rect.top;
        originLeft = rect.left;
        originTop = rect.top;
        element.classList.add('video-dragging');
        element.style.setProperty('cursor', 'grabbing', 'important');
        element.style.setProperty('z-index', '9999999', 'important');
        element.style.setProperty('will-change', 'transform', 'important');
        element.style.setProperty('transform', 'translate3d(0, 0, 0)', 'important');
        setDraggingUi(true);
        if (pointerId !== undefined && pointerId !== null && element.setPointerCapture) {
            try {
                element.setPointerCapture(pointerId);
                activePointerId = pointerId;
            } catch (e) {
                activePointerId = pointerId;
            }
        }
    }

    /**
     * End drag and persist position once.
     *
     * Moodle secure-window halt()s mouseup at body, so release must not rely
     * on a bubbling document mouseup listener.
     *
     * @return {void}
     */
    function endDrag() {
        if (!isDragging) {
            return;
        }
        isDragging = false;
        if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
            moveElement(pendingX, pendingY);
        }
        releasePointer();
        element.classList.remove('video-dragging');
        element.style.setProperty('cursor', 'grab', 'important');
        element.style.removeProperty('will-change');
        element.style.removeProperty('transform');
        setDraggingUi(false);
        applyDraggedVideoPosition(element, lastLeft, lastTop, false);
        persistVideoPosition(lastLeft, lastTop);
    }

    /**
     * @param {PointerEvent} e
     * @return {boolean}
     */
    function isActivePointer(e) {
        return activePointerId === null || e.pointerId === activePointerId;
    }

    element.addEventListener('dragstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });

    if (usePointer) {
        element.addEventListener('pointerdown', function(e) {
            if (e.isPrimary === false) {
                return;
            }
            if (e.pointerType === 'mouse' && e.button !== 0) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            beginDrag(e.clientX, e.clientY, e.pointerId);
        });
        element.addEventListener('pointermove', function(e) {
            if (!isDragging || !isActivePointer(e)) {
                return;
            }
            e.preventDefault();
            queueMove(e.clientX, e.clientY);
        });
        const stopPointer = function(e) {
            if (!isActivePointer(e)) {
                return;
            }
            endDrag();
        };
        element.addEventListener('pointerup', stopPointer);
        element.addEventListener('pointercancel', stopPointer);
        element.addEventListener('lostpointercapture', function() {
            endDrag();
        });
        window.addEventListener('pointerup', stopPointer, true);
        window.addEventListener('pointercancel', stopPointer, true);
    } else {
        element.addEventListener('mousedown', function(e) {
            if (e.button !== 0) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            beginDrag(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) {
                return;
            }
            e.preventDefault();
            queueMove(e.clientX, e.clientY);
        }, true);
        window.addEventListener('mouseup', function() {
            endDrag();
        }, true);
        element.addEventListener('touchstart', function(e) {
            if (!e.touches || !e.touches.length) {
                return;
            }
            const touch = e.touches[0];
            beginDrag(touch.clientX, touch.clientY);
        }, {passive: true});
        window.addEventListener('touchmove', function(e) {
            if (!isDragging || !e.touches || !e.touches.length) {
                return;
            }
            e.preventDefault();
            const touch = e.touches[0];
            queueMove(touch.clientX, touch.clientY);
        }, {passive: false, capture: true});
        window.addEventListener('touchend', function() {
            endDrag();
        }, true);
        window.addEventListener('touchcancel', function() {
            endDrag();
        }, true);
    }

    window.addEventListener('blur', endDrag);
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            endDrag();
        }
    });
}

/**
 * Report that local camera/microphone tracks are unavailable during an attempt.
 *
 * @param {number} cmid course module id
 * @param {number} attemptid attempt id
 * @param {boolean} mainimage main image mode
 * @return {void}
 */
function reportOnlineProctoringMediaDisabled(cmid, attemptid, mainimage) {
    reportMissingMediaIfNeeded(cmid, attemptid, mainimage);
    scheduleMissingMediaWarnings(cmid, attemptid, mainimage);
}

/**
 * Bind ended handlers for live-proctoring local media tracks.
 * Reacquires the stream first — the external iframe often steals the device briefly.
 *
 * @param {MediaStream} stream media stream
 * @param {HTMLVideoElement} vElement video element
 * @param {number} cmid course module id
 * @param {number} attemptid attempt id
 * @param {boolean} mainimage main image mode
 * @param {boolean} requireaudiopermission whether local mic was required
 * @param {boolean} enablerecordaudio enable audio recording
 * @param {object} state reacquire attempt state
 * @return {void}
 */
function bindOnlineProctoringTrackHandlers(stream, vElement, cmid, attemptid, mainimage,
    requireaudiopermission, enablerecordaudio, state) {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.onended = function() {
            if (shouldSuppressMediaAlerts()) {
                return;
            }
            void reacquireOnlineProctoringWebcam(
                cmid, attemptid, mainimage, requireaudiopermission, enablerecordaudio, state, vElement
            );
        };
    }

    if (requireaudiopermission) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.onended = function() {
                if (shouldSuppressMediaAlerts()) {
                    return;
                }
                const hasLiveVideo = stream.getVideoTracks().some(function(track) {
                    return track.readyState === 'live';
                });
                if (!hasLiveVideo) {
                    return;
                }
                void reacquireOnlineProctoringWebcam(
                    cmid, attemptid, mainimage, requireaudiopermission, enablerecordaudio, state, vElement
                );
            };
        } else {
            mobileAudioPermissionSettled = true;
        }
    }
}

/**
 * Silently reopen local camera after the live-proctoring iframe releases/steals it.
 *
 * @param {number} cmid course module id
 * @param {number} attemptid attempt id
 * @param {boolean} mainimage main image mode
 * @param {boolean} requireaudiopermission whether local mic was required
 * @param {boolean} enablerecordaudio enable audio recording
 * @param {object} state reacquire attempt state
 * @param {HTMLVideoElement} vElement video element
 * @return {Promise<MediaStream|null>}
 */
function reacquireOnlineProctoringWebcam(cmid, attemptid, mainimage, requireaudiopermission,
    enablerecordaudio, state, vElement) {
    if (quizTerminationInProgress || state.reacquiring || shouldSuppressMediaAlerts() ||
            mediaAcquireInProgress) {
        return Promise.resolve(null);
    }
    if (state.reacquireAttempts >= 3) {
        reportOnlineProctoringMediaDisabled(cmid, attemptid, mainimage, requireaudiopermission);
        return Promise.resolve(null);
    }

    state.reacquiring = true;
    state.reacquireAttempts += 1;
    beginMediaAcquire(cmid, attemptid, mainimage, requireaudiopermission);

    return new Promise(function(resolve) {
        setTimeout(resolve, 800 * state.reacquireAttempts);
    }).then(function() {
        if (quizTerminationInProgress) {
            state.reacquiring = false;
            endMediaAcquire();
            return null;
        }
        return requestPreferredUserMediaWithRetry(requireaudiopermission, false, 2);
    }).then(function(stream) {
        state.reacquiring = false;
        endMediaAcquire();
        if (!stream) {
            return null;
        }
        localMediaStream = stream;
        if (vElement) {
            attachStreamToVideoElement(vElement, stream);
        }
        startFrontCameraGuard();
        bindOnlineProctoringTrackHandlers(
            stream, vElement, cmid, attemptid, mainimage, requireaudiopermission, enablerecordaudio, state
        );
        if (Number(enablerecordaudio)) {
            userAudioHookStarted = false;
            startUserAudioRecording(stream, attemptid);
        }
        tryRelayParentStreamToStudentIframe();
        state.reacquireAttempts = 0;
        if (mediaStreamHasLiveAudio(stream)) {
            mobileAudioPermissionSettled = true;
            clearMediaDisabledAlertState();
        }
        return stream;
    }).catch(function() {
        state.reacquiring = false;
        endMediaAcquire();
        if (state.reacquireAttempts < 3) {
            return reacquireOnlineProctoringWebcam(
                cmid, attemptid, mainimage, requireaudiopermission, enablerecordaudio, state, vElement
            );
        }
        reportOnlineProctoringMediaDisabled(cmid, attemptid, mainimage, requireaudiopermission);
        return null;
    });
}

/**
 * Start webcam + realtime object detection for online proctoring (no iframe ready wait).
 *
 * @param {number} cmid course module id
 * @param {number} attemptid attempt id
 * @param {boolean} mainimage main image mode
 * @param {boolean} requireaudiopermission require microphone permission
 * @param {boolean} enablerecordaudio enable audio recording
 * @return {Promise<MediaStream|null>}
 */
function startOnlineProctoringWebcam(cmid, attemptid, mainimage, requireaudiopermission, enablerecordaudio) {
    if (onlineWebcamSetupPromise) {
        return onlineWebcamSetupPromise;
    }

    const vElement = document.getElementById('video');
    const cElement = document.getElementById('canvas');
    if (!vElement || !cElement) {
        return Promise.resolve(null);
    }

    const wantBoth = Boolean(requireaudiopermission);
    var applyLiveStream = function(stream) {
        endMediaAcquire();
        localMediaStream = stream;
        attachStreamToVideoElement(vElement, stream);
        startFrontCameraGuard();
        applyAttemptVideoVisibility(
            vElement,
            attemptMediaResume ? attemptMediaResume.enableStudentVideo : 1
        );
        bindVideoDrag(vElement);

        const state = {
            reacquiring: false,
            reacquireAttempts: 0,
        };

        bindOnlineProctoringTrackHandlers(
            stream, vElement, cmid, attemptid, mainimage, requireaudiopermission, enablerecordaudio, state
        );

        if (Number(enablerecordaudio)) {
            startUserAudioRecording(stream, attemptid);
        }
        enableAudioTracks(stream);
        if (mediaStreamHasLiveAudio(stream) || mediaStreamHasAudioTrack(stream)) {
            mobileAudioPermissionSettled = true;
            if (mediaStreamHasLiveAudio(stream)) {
                clearMediaDisabledAlertState();
            } else {
                markMicrophoneSettleGrace(getMicrophoneSettleGraceMs());
            }
        } else if (!wantBoth) {
            mobileAudioPermissionSettled = true;
        } else {
            markMicrophoneSettleGrace(getMicrophoneSettleGraceMs());
        }
        if (EyeTracking.isActive()) {
            EyeTracking.start(cmid, attemptid, mainimage, vElement, cElement);
        }
        hideStudentIframeFromStudent();
        if (objectDetectionEnabled) {
            startObjectDetectionOnElements(cmid, attemptid, mainimage, vElement, cElement);
        }
        tryRelayParentStreamToStudentIframe();
        if (attemptMediaResume && attemptMediaResume.liveIframeUrl) {
            var liveIframe = document.querySelector('.student-iframe-container iframe');
            var currentSrc = liveIframe ? (liveIframe.getAttribute('src') || '') : '';
            if (liveIframe && (!currentSrc || currentSrc === 'about:blank')) {
                liveIframe.setAttribute('src', attemptMediaResume.liveIframeUrl);
            }
        }
        scheduleParentStreamRelay();
        return stream;
    };

    if (mediaStreamHasLiveVideo(localMediaStream)) {
        onlineWebcamSetupPromise = Promise.resolve(localMediaStream).then(applyLiveStream);
        return onlineWebcamSetupPromise;
    }

    beginMediaAcquire(cmid, attemptid, mainimage, wantBoth);
    onlineWebcamSetupPromise = preparePopupCameraAccess()
        .then(function() {
            return requestPreferredUserMediaWithRetry(wantBoth, false);
        })
        .then(applyLiveStream)
        .catch(function() {
            onlineWebcamSetupPromise = null;
            endMediaAcquire();
            hideStudentIframeFromStudent();
            if (!shouldDeferMediaDisabledAlert()) {
                reportMissingMediaIfNeeded(cmid, attemptid, mainimage);
            }
            scheduleMissingMediaWarnings(cmid, attemptid, mainimage);
            return null;
        });

    return onlineWebcamSetupPromise;
}

/**
 * Load the object detection helper script once.
 *
 * @return {Promise<Object>} Object detection library namespace
 */
function loadObjectDetectionLibrary() {
    if (window.quizproctoringObjectDetection &&
        typeof window.quizproctoringObjectDetection.create === 'function') {
        return Promise.resolve(window.quizproctoringObjectDetection);
    }
    if (window.__quizproctoringObjectDetectionLoadPromise) {
        return window.__quizproctoringObjectDetectionLoadPromise;
    }

    const scriptpath = M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/libraries/js/object_detection.js';
    window.__quizproctoringObjectDetectionLoadPromise = fetch(scriptpath, {mode: 'same-origin', credentials: 'same-origin'})
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch script: ${scriptpath}`);
            }
            return response.text();
        })
        .then((code) => {
            const previousDefine = window.define;
            window.define = undefined;
            let evalError = null;
            try {
                // eslint-disable-next-line no-eval
                (0, eval)(code);
            } catch (error) {
                evalError = error;
            } finally {
                window.define = previousDefine;
            }
            if (evalError) {
                throw evalError;
            }
            if (!window.quizproctoringObjectDetection ||
                typeof window.quizproctoringObjectDetection.create !== 'function') {
                throw new Error('Object detection library did not initialize correctly');
            }
            return window.quizproctoringObjectDetection;
        })
        .catch((error) => {
            window.__quizproctoringObjectDetectionLoadPromise = null;
            throw error;
        });

    return window.__quizproctoringObjectDetectionLoadPromise;
}

/**
 * Get or create the shared object detection controller.
 *
 * @return {Promise<Object|null>} Controller instance or null on failure
 */
function getObjectDetectionController() {
    if (objectDetectionController) {
        objectDetectionController.setEnabled(objectDetectionEnabled);
        return Promise.resolve(objectDetectionController);
    }
    if (objectDetectionControllerPromise) {
        return objectDetectionControllerPromise;
    }

    objectDetectionControllerPromise = loadObjectDetectionLibrary()
        .then((library) => {
            objectDetectionController = library.create({
                realtimeDetection: realtimeDetection,
                isMobileDevice: ismobiledevice,
                isQuizTerminating: function() {
                    return quizTerminationInProgress;
                }
            });
            objectDetectionController.setEnabled(objectDetectionEnabled);
            return objectDetectionController;
        })
        .catch(() => {
            objectDetectionControllerPromise = null;
            return null;
        });

    return objectDetectionControllerPromise;
}

/**
 * Preload object detection assets when enabled.
 *
 * @return {Promise<Object|null>}
 */
function scheduleObjectDetectionPreload() {
    return getObjectDetectionController().then((controller) => {
        if (controller) {
            controller.schedulePreload();
        }
        return controller;
    }).catch(() => null);
}

/**
 * Start object detection against the provided video/canvas elements.
 *
 * @param {number} cmid course module id
 * @param {number} attemptid attempt id
 * @param {boolean} mainimage main image mode
 * @param {HTMLVideoElement|null} videoEl video element
 * @param {HTMLCanvasElement|null} canvasEl canvas element
 * @return {Promise<Object|null>}
 */
function startObjectDetectionOnElements(cmid, attemptid, mainimage, videoEl, canvasEl) {
    if (!videoEl || !canvasEl) {
        return Promise.resolve(null);
    }
    return getObjectDetectionController().then((controller) => {
        if (controller) {
            controller.start(cmid, attemptid, mainimage, videoEl, canvasEl);
        }
        return controller;
    }).catch(() => null);
}

/**
 * Track eye-focus warnings for auto-disable (5 warnings within 30 seconds).
 *
 * @param {number} cmid course module id
 * @param {number} attemptid attempt id
 * @param {string} face validation type
 * @param {Object} response AJAX response
 * @return {void}
 */
function maybeRecordEyeFocusWarning(cmid, attemptid, face, response) {
    if (face !== 'eyesnotopen' || !EyeTracking.isEnabled()) {
        return;
    }
    if (!response || response.status === 'eyecheckoff') {
        return;
    }
    if (response.errorcode || response.status === 'eyecheckon') {
        EyeTracking.recordFocusWarning(cmid, attemptid);
    }
}

/**
 * Parse AJAX JSON (jQuery may leave string responses unparsed).
 *
 * @param {*} response raw AJAX response
 * @return {Object|null}
 */
function parseProctoringAjaxResponse(response) {
    if (!response) {
        return null;
    }
    if (typeof response === 'object') {
        return response;
    }
    if (typeof response === 'string' && response.length) {
        try {
            return JSON.parse(response);
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Handle JSON from ajax_realtime.php (violations, redirects, eye state).
 *
 * @param {Object|null} response parsed response
 * @param {number} cmid course module id
 * @param {number} attemptid attempt id
 * @param {string} face validate key
 * @return {void}
 */
function handleRealtimeDetectionResponse(response, cmid, attemptid, face) {
    if (!response) {
        return;
    }
    if (response.status === 'eyecheckoff') {
        $(document).trigger('eye-tracking-disabled');
        return;
    }
    if (response.status === 'eyecheckon') {
        if (response.errorcode) {
            handleRealtimeWarningResponse(response, response.error || '', cmid, attemptid);
            maybeRecordEyeFocusWarning(cmid, attemptid, face, response);
        } else {
            $(document).trigger('eye-tracking-enabled');
        }
        return;
    }
    if (response.errorcode) {
        handleRealtimeWarningResponse(response, response.error || '', cmid, attemptid);
        maybeRecordEyeFocusWarning(cmid, attemptid, face, response);
        return;
    }
    if (response.redirect && response.url) {
        redirectAfterProctorAutoSubmit(response.url, response.msg, attemptid);
    }
}

/**
 * Send a realtime proctoring detection payload to the server.
 *
 * @param {number} cmid course module id
 * @param {number} attemptid attempt id
 * @param {boolean} mainimage main image mode
 * @param {string} face validation type
 * @param {string} data image data URL
 * @return {void}
 */
function realtimeDetection(cmid, attemptid, mainimage, face, data) {
    if (quizTerminationInProgress || shouldSuppressMediaAlerts()) {
        return;
    }
    var requestData = {
        cmid: cmid,
        attemptid: attemptid,
        mainimage: mainimage,
        validate: face,
        imgBase64: data,
    };
    $.ajax({
        url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_realtime.php',
        method: 'POST',
        dataType: 'json',
        data: requestData,
        success: function(response) {
            handleRealtimeDetectionResponse(
                parseProctoringAjaxResponse(response),
                cmid,
                attemptid,
                face
            );
        },
        error: function(xhr) {
            handleRealtimeWarningXhrError(xhr, '', cmid, attemptid);
        }
    });
}
/**
 * Setup show Custom Modal
 *
 * @param {Longtext} message - string value
 * @return {void}
 */
function showCustomModal(message) {
    $('.custom-modal').remove();
    const modalHtml = `
        <div class="custom-modal show" role="dialog" aria-modal="true" tabindex="-1">
            <div class="custom-modal-dialog modal-dialog-scrollable">
                <div class="custom-modal-content">
                    <div class="custom-modal-header">
                        <h5 class="custom-modal-title"></h5>
                        <button type="button" class="custom-close-btn" aria-label="Close">&times;</button>
                    </div>
                    <div class="custom-modal-body">
                        ${message}
                    </div>
                </div>
            </div>
        </div>
    `;
    $('body').append(modalHtml);
    $('.custom-modal').fadeIn();
    $('.custom-close-btn').click(function() {
        closeCustomModal();
    });
    $(document).on('click.custommodal', function(e) {
        const $modalContent = $('.custom-modal-content');
        if (!$modalContent.is(e.target) && $modalContent.has(e.target).length === 0) {
            closeCustomModal();
        }
    });
    $(document).on('keydown.custommodal', function(e) {
        if (e.key === 'Escape') {
            closeCustomModal();
        }
    });
}

/**
 * Setup close Custom Modal
 *
 * @return {void}
 */
function closeCustomModal() {
    $('.custom-modal').fadeOut(function() {
        $(this).remove();
    });
    $(document).off('click.custommodal');
    $(document).off('keydown.custommodal');
}

/**
 * Show plugin error popup from AJAX response.
 *
 * @param {Object} response - AJAX response object
 * @return {void}
 */
function showPluginErrorPopup(response) {
    $(document).trigger('popup', response.error);
}

/**
 * Handle realtime warning JSON response and keep warning counter in sync.
 *
 * @param {Object} response - AJAX response object
 * @param {string} fallbackmessage - fallback warning text
 * @param {number} cmid - course module id
 * @param {number} attemptid - attempt id
 * @return {void}
 */
function handleRealtimeWarningResponse(response, fallbackmessage, cmid, attemptid) {
    if (shouldSuppressMediaAlerts()) {
        return;
    }
    if (response && response.redirect && response.url) {
        redirectAfterProctorAutoSubmit(response.url, response.msg, attemptid);
        return;
    }
    if (!response || (!response.errorcode && !response.error)) {
        if (quizTerminationInProgress) {
            return;
        }
        if (fallbackmessage) {
            $(document).trigger('popup', fallbackmessage);
        }
        return;
    }
    if (quizTerminationInProgress) {
        return;
    }
    if (Date.now() < suppressRealtimePopupUntil) {
        suppressRealtimePopupUntil = 0;
        return;
    }
    if (response.errorcode === 'domainblocked') {
        $(document).trigger('popup', response.error);
        return;
    }
    $(document).trigger('popup', response.error || fallbackmessage);
    decrementWarningCounter();
    trackWarningAndMaybeQueueEmail(cmid, attemptid);
}

/**
 * Handle realtime warning XHR error responses (moodle_exception JSON payloads).
 *
 * @param {Object} xhr - jQuery XHR object
 * @param {string} fallbackmessage - fallback warning text
 * @param {number} cmid - course module id
 * @param {number} attemptid - attempt id
 * @return {void}
 */
function handleRealtimeWarningXhrError(xhr, fallbackmessage, cmid, attemptid) {
    let payload = null;
    if (xhr && xhr.responseJSON) {
        payload = xhr.responseJSON;
    } else if (xhr && xhr.responseText) {
        try {
            payload = JSON.parse(xhr.responseText);
        } catch (e) {
            payload = null;
        }
    }
    if (payload && (payload.errorcode || payload.error)) {
        handleRealtimeWarningResponse(payload, fallbackmessage, cmid, attemptid);
        return;
    }
    if (fallbackmessage) {
        $(document).trigger('popup', fallbackmessage);
    }
}

/**
 * Decrease locally tracked warning threshold count by one.
 *
 * @return {void}
 */
function decrementWarningCounter() {
    const warningsl = JSON.parse(localStorage.getItem('warningThreshold')) || 0;
    const leftwarnings = Math.max(warningsl - 1, 0);
    localStorage.setItem('warningThreshold', JSON.stringify(leftwarnings));
}

/**
 * Normalize legacy cached camera disabled message formatting.
 *
 * @return {string} Camera disabled warning message.
 */
function getNormalizedCameraDisabledMessage() {
    const key = 'nocameradisabled';
    const component = 'quizaccess_quizproctoring';
    const message = M.util.get_string(key, component, '');
    if (message === 'Camera is disabled.Please enable to continue.') {
        return 'Camera is disabled. Please enable to continue.';
    }
    return message;
}
});
