/**
 * JavaScript class for Camera
 *
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
window.addEventListener('beforeunload', function(event) {
    event.stopImmediatePropagation();
    event.returnValue = '';
});
define(['jquery', 'core/str', 'core/modal_factory'],
function($, str, ModalFactory) {
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
        docElement.on('popup', this.showpopup.bind(this));
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

    Camera.prototype.startcamera = function() {
        const takePictureButton = $('#' + this.takepictureid);
        takePictureButton.prop('disabled', true);
        return navigator.mediaDevices.getUserMedia({video: true, audio: true})
            .then(function(stream) {
                const videoElement = document.getElementById('video');
                if (videoElement) {
                    videoElement.srcObject = stream;
                    videoElement.muted = true;
                    videoElement.setAttribute('playsinline', 'true');
                    localMediaStream = stream;
                    videoElement.play();

                    videoElement.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                    });

                    stream.getVideoTracks()[0].onended = function() {
                        takePictureButton.prop('disabled', true);
                        $(document).trigger('popup', M.util.get_string('nocameradetectedm', 'quizaccess_quizproctoring'));
                    };

                    const audioTrack = stream.getAudioTracks()[0];
                    if (audioTrack) {
                        audioTrack.onended = function() {
                            $(document).trigger('popup', M.util.get_string('nocameradetectedm', 'quizaccess_quizproctoring'));
                        };
                    } else {
                        $(document).trigger('popup', M.util.get_string('nocameradetectedm', 'quizaccess_quizproctoring'));
                    }
                    if (this.attemptid) {
                        restoreVideoPosition(videoElement);
                        makeDraggable(videoElement);
                    }
                    takePictureButton.prop('disabled', false);
                }
                return videoElement;
            })
            .catch(function() {
                takePictureButton.prop('disabled', true);
            });
    };

    Camera.prototype.takepicture = function() {
        const video = this.video;
        const canvas = this.canvas;

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

        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
            method: 'POST',
            data: {
                imgBase64: data,
                cmid: this.cmid,
                attemptid: this.attemptid,
                mainimage: this.mainimage
            },
            success: function(response) {
                if (response && response.errorcode) {
                    $('#userimageset').val(0);
                    $(document).trigger('popup', response.error);
                } else {
                    $('#userimageset').val(1);
                    if ($('#id_consentcheckbox').is(':checked')) {
                        $("#id_submitbutton").prop("disabled", false);
                    }
                }
            }
        });
    };

    Camera.prototype.proctoringimage = function() {
        var requestData = {
            cmid: this.cmid,
            attemptid: this.attemptid,
            mainimage: this.mainimage
        };
        if (this.canvas) {
            const video = this.video;
            const canvas = this.canvas;

            const outputWidth = 280;
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
            requestData.imgBase64 = data;
        }
        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
            method: 'POST',
            data: requestData,
            success: function(response) {
                if (response && response.errorcode) {
                    var warningsl = JSON.parse(localStorage.getItem('warningThreshold')) || 0;
                    var leftwarnings = Math.max(warningsl - 1, 0);
                    localStorage.setItem('warningThreshold', JSON.stringify(leftwarnings));
                    $(document).trigger('popup', response.error);
                } else {
                    if (response.redirect && response.url) {
                        window.onbeforeunload = null;
                        $(document).trigger('popup', response.msg);
                        setTimeout(function() {
                            window.location.href = encodeURI(response.url);
                        }, 3000);
                    }
                }
            }
        });
    };

    Camera.prototype.resetcamera = function() {
        var context = this.canvas.getContext('2d');
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        $('#' + this.canvasid).hide();
        $('#' + this.retakeid).hide();
        $('#' + this.videoid).show();
        $('#' + this.takepictureid).show();
        $('#userimageset').val(0);
        $("#id_submitbutton").prop("disabled", true);
    };

    var externalserver = 'https://stream.proctorlink.com';
    var localMediaStream = null;
    var USE_AUDIO = true;
    var USE_VIDEO = true;
    let hiddenCloseButton = null;

    Camera.prototype.retake = function() {
        $('#userimageset').val(0);
        $('#' + this.videoid).show(this.cmid);
        $('#' + this.takepictureid).show();
        $('#' + this.canvasid).hide();
        $('#' + this.retakeid).hide();
        $("#id_submitbutton").prop("disabled", true);
    };
    Camera.prototype.showpopup = function(event, message) {
        if (this.activeModal) {
            this.activeModal.hide();
            this.activeModal.destroy();
        }
        return ModalFactory.create({
            body: message,
        }).then((modal) => {
            this.activeModal = modal;
            modal.show();
            return null;
        }).catch(() => {
            showCustomModal(message);
        });
    };

    Camera.prototype.stopcamera = function() {
        if (localMediaStream) {
            localMediaStream.getTracks().forEach(function(track) {
                track.stop();
            });
            localMediaStream = null;
        }
    };

    var init = function(cmid, mainimage, verifyduringattempt = true, attemptid = null,
        teacher, quizid, enableeyecheckreal, studenthexstring,
        onlinestudent = 0, securewindow = null, userfullname,
        enablestudentvideo = 1, setinterval = 300,
        warnings = 0, userid, usergroup = '', detectionval = null) {
        let camera;
        if (!verifyduringattempt) {
            localStorage.removeItem('eyecheckoff');
            if (document.readyState === 'complete') {
                $('.quizstartbuttondiv [type=submit]').prop("disabled", false);
            } else {
                $(window).on('load', function() {
                    $('.quizstartbuttondiv [type=submit]').prop("disabled", false);
                });
            }
            camera = new Camera(cmid, mainimage, attemptid, quizid);
            $('.quizstartbuttondiv [type=submit]').on('click', function() {
                localStorage.removeItem('videoPosition');
                camera.startcamera();
            });
            // Take picture on button click
            $('#' + camera.takepictureid).on('click', function(e) {
                e.preventDefault();
                camera.takepicture();
            });
            // Show video again when retake
            $('#' + camera.retakeid).on('click', function(e) {
                e.preventDefault();
                camera.retake();
            });
            $('#id_cancel').on('click', function() {
                camera.stopcamera();
                camera.resetcamera();
                $("#id_submitbutton").prop("disabled", true);
                localStorage.removeItem('videoPosition');
            });

            $(document).on('click', '.filemanager', function(e) {
                e.preventDefault();
                hiddenCloseButton = $(this).closest('.moodle-dialogue-base').find('.closebutton');
                hiddenCloseButton.hide();
            });

            $(document).on('click', '.mod_quiz_preflight_popup .closebutton', function() {
                if (typeof camera !== 'undefined' && typeof camera.stopcamera === 'function') {
                    camera.stopcamera();
                    camera.resetcamera();
                    $("#id_submitbutton").prop("disabled", true);
                    localStorage.removeItem('videoPosition');
                }
            });

            $(document).on('click', '.closebutton', function() {
                if (hiddenCloseButton) {
                    hiddenCloseButton.show();
                    hiddenCloseButton = null;
               }
            });

            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    camera.stopcamera();
                    camera.resetcamera();
                    $("#id_submitbutton").prop("disabled", true);
                    localStorage.removeItem('videoPosition');
                }
            });
            if (securewindow === 'securewindow') {
                const currentUrl = window.location.href;
                if (currentUrl.includes('startattempt.php')) {
                    camera.startcamera();
                }
            }
        } else {
            localStorage.setItem('warningThreshold', JSON.stringify(warnings));
            document.addEventListener('keydown', function(event) {
                if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'v')) {
                    event.preventDefault();
                }
            });
            document.addEventListener('dragstart', function(event) {
                event.preventDefault();
            });

            document.addEventListener('drop', function(event) {
                event.preventDefault();
            });

            document.addEventListener('contextmenu', function(event) {
                event.preventDefault();
            });
            var room = `${studenthexstring}_${quizid}`;
            if (usergroup != '') {
                room = `${studenthexstring}_${quizid}_${usergroup}`;
            }

            if (onlinestudent) {
                const iframeContainer = $("<div>").addClass("student-iframe-container").css({
                    display: 'block'
                });

                const baseUrl = `${externalserver}/student`;
                const params = new URLSearchParams({
                    id: studenthexstring,
                    name: userfullname,
                    examId: quizid,
                    attemptid: attemptid,
                    room: room
                });
                const iframeUrl = `${baseUrl}?${params.toString()}`;
                const iframe = $("<iframe>")
                    .attr({
                        'src': iframeUrl,
                        'width': '100%',
                        'height': '480',
                        'frameborder': '0',
                        'allow': 'camera; microphone',
                        'style': 'position: absolute; bottom: 20px; right: 20px; z-index: 9999; ' +
                                'width: 230px; height: 173px; border-radius: 3px; '
                    })
                    .on('load', function() {
                        iframe[0].contentWindow.postMessage({
                            type: 'init',
                            timestamp: Date.now()
                        }, externalserver);
                    });
                iframeContainer.append(iframe);
                $('body').append(iframeContainer);
                $('<video>').attr({
                    'id': 'video',
                    'class': 'quizaccess_quizproctoring-video',
                    'width': '280',
                    'height': '240',
                    'autoplay': 'autoplay'
                }).css('display', enablestudentvideo ? 'block' : 'none')
                .appendTo('body');

                $('<canvas>').attr({
                    id: 'canvas',
                    width: '280',
                    height: '240',
                    'style': 'display: none;'
                }).appendTo('body');

                if (verifyduringattempt) {
                    document.addEventListener('visibilitychange', function() {
                        if (document.visibilityState === 'visible') {
                            visibilitychange(cmid, attemptid, mainimage);
                        }
                    });

                    camera = new Camera(cmid, mainimage, attemptid, quizid);
                    let iframeReady = false;
                    let responseReceived = true;
                    window.addEventListener('message', function(event) {
                        if (event.origin === externalserver) {
                            const data = event.data;
                            if (data.type === 'ready') {
                                iframeReady = true;
                                const waitForElements = setInterval(() => {
                                    const vElement = document.getElementById('video');
                                    const cElement = document.getElementById('canvas');
                                    if (vElement && cElement) {
                                        navigator.mediaDevices.getUserMedia({video: true, audio: true})
                                        // eslint-disable-next-line promise/always-return
                                        .then((stream) => {
                                            vElement.srcObject = stream;
                                            vElement.play();
                                            vElement.muted = true;
                                            restoreVideoPosition(vElement);
                                            makeDraggable(vElement);
                                            $(".student-iframe-container").css({display: 'none'});
                                        })
                                        .catch((err) => {
                                            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                                                $(".student-iframe-container").css({display: 'none'});
                                                $.ajax({
                                                url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
                                                method: 'POST',
                                                data: {
                                                    cmid: cmid,
                                                    attemptid: attemptid,
                                                    mainimage: mainimage,
                                                },
                                                success: function(response) {
                                                    if (response && response.errorcode) {
                                                        const warningsl = JSON.parse(localStorage.getItem('warningThreshold')) || 0;
                                                        const leftwarnings = Math.max(warningsl - 1, 0);
                                                        localStorage.setItem('warningThreshold', JSON.stringify(leftwarnings));
                                                        $(document).trigger('popup', response.error);
                                                    } else if (response.redirect && response.url) {
                                                        window.onbeforeunload = null;
                                                        $(document).trigger('popup', response.msg);
                                                        setTimeout(function() {
                                                            window.location.href = encodeURI(response.url);
                                                        }, 3000);
                                                    }
                                                }
                                            });
                                                throw err;
                                            }
                                        });
                                        clearInterval(waitForElements);
                                        if (enableeyecheckreal) {
                                            // eslint-disable-next-line no-undef
                                            const faceMesh = new FaceMesh({
                                                locateFile: (file) => {
                                                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
                                                }
                                            });
                                            if (typeof setupFaceMesh !== 'undefined') {
                                                // eslint-disable-next-line no-undef
                                                setupFaceMesh(vElement, cElement, faceMesh, detectionval, function(result) {
                                                    if (result.status) {
                                                        realtimeDetection(cmid, attemptid, mainimage,
                                                            result.status, result.data);
                                                    }
                                                });
                                            }
                                        }
                                    }
                                }, 500);
                            } else if (data.type === 'proctoring_image') {
                                responseReceived = true;
                                if (ismobiledevice() && document.visibilityState === 'hidden') {
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
                                    var imageData = canvas.toDataURL('image/png');
                                    $.ajax({
                                        url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
                                        method: 'POST',
                                        data: {
                                            imgBase64: imageData,
                                            cmid: camera.cmid,
                                            attemptid: camera.attemptid,
                                            mainimage: camera.mainimage
                                        },
                                        success: function(response) {
                                            if (response && response.errorcode) {
                                                var warningsl = JSON.parse(localStorage.getItem('warningThreshold')) || 0;
                                                var leftwarnings = Math.max(warningsl - 1, 0);
                                                localStorage.setItem('warningThreshold', JSON.stringify(leftwarnings));
                                                $(document).trigger('popup', response.error);
                                            } else if (response.redirect && response.url) {
                                                window.onbeforeunload = null;
                                                $(document).trigger('popup', response.msg);
                                                setTimeout(function() {
                                                    window.location.href = encodeURI(response.url);
                                                }, 3000);
                                            }
                                        }
                                    });
                                };
                                img.src = data.imageData;
                            } else if (data.type === 'proctoring-alert') {
                                $.ajax({
                                    url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_sendalert.php',
                                    method: 'POST',
                                    data: {
                                        quizid: quizid,
                                        userid: userid,
                                        attemptid: attemptid,
                                        alertmessage: data.text
                                    },
                                    success: function(response) {
                                        if (response && response.errorcode) {
                                            $(document).trigger('popup', response.error);
                                        } else {
                                            if (response.success) {
                                                $(document).trigger('popup', data.text);
                                            }
                                        }
                                    },
                                });
                            } else if (data.type === 'disable-eye-tracking') {
                                $.ajax({
                                    url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_realtime.php',
                                    method: 'POST',
                                    data: {
                                        cmid: camera.cmid,
                                        attemptid: attemptid,
                                        validate: 'eyecheckoff'
                                    },
                                    success: function(response) {
                                        if (response.status === 'eyecheckoff') {
                                            localStorage.setItem('eyecheckoff', JSON.stringify(true));
                                        }
                                    },
                                });
                            } else if (data.type === 'terminate-quiz') {
                                $.ajax({
                                    url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_sendalert.php',
                                    method: 'POST',
                                    data: {
                                        quizid: quizid,
                                        userid: userid,
                                        attemptid: attemptid,
                                        quizsubmit: 1
                                    },
                                    success: function(response) {
                                        if (response && response.errorcode) {
                                            $(document).trigger('popup', response.error);
                                        } else {
                                            if (response.success) {
                                                window.onbeforeunload = null;
                                                $(document).trigger('popup', response.msg);
                                                setTimeout(function() {
                                                    window.location.href = encodeURI(response.url);
                                                }, 3000);
                                            }
                                        }
                                    },
                                });
                            }
                        }
                    });

                    setInterval(function() {
                        if (iframeReady) {
                            if (!responseReceived) {
                                if (ismobiledevice() && document.visibilityState === 'hidden') {
                                    return;
                                }
                                $.ajax({
                                    url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
                                    method: 'POST',
                                    data: {
                                        cmid: cmid,
                                        attemptid: attemptid,
                                        mainimage: mainimage,
                                    },
                                    success: function(response) {
                                        if (response && response.errorcode) {
                                            const warningsl = JSON.parse(localStorage.getItem('warningThreshold')) || 0;
                                            const leftwarnings = Math.max(warningsl - 1, 0);
                                            localStorage.setItem('warningThreshold', JSON.stringify(leftwarnings));
                                            $(document).trigger('popup', response.error);
                                        } else if (response.redirect && response.url) {
                                            window.onbeforeunload = null;
                                            $(document).trigger('popup', response.msg);
                                            setTimeout(function() {
                                                window.location.href = encodeURI(response.url);
                                            }, 3000);
                                        }
                                    }
                                });
                            }

                            responseReceived = false;
                            try {
                                iframe[0].contentWindow.postMessage({
                                    type: 'get_proctoring_image',
                                    timestamp: Date.now()
                                }, externalserver);
                            } catch (error) {
                                iframeReady = false;
                            }
                        } else {
                            iframe[0].contentWindow.postMessage({
                                type: 'init',
                                timestamp: Date.now(),
                                lang: $('html').attr('lang') || 'en'
                            }, externalserver);
                        }
                    }, setinterval * 1000);
                }
            } else {
                if (enableeyecheckreal) {
                    const waitForElements = setInterval(() => {
                        const vElement = document.getElementById('video');
                        const cElement = document.getElementById('canvas');
                        if (vElement && cElement) {
                            // eslint-disable-next-line no-undef
                            const faceMesh = new FaceMesh({
                                locateFile: (file) => {
                                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
                                }
                            });
                            clearInterval(waitForElements);
                            if (typeof setupFaceMesh !== 'undefined') {
                                // eslint-disable-next-line no-undef
                                setupFaceMesh(vElement, cElement, faceMesh, detectionval, function(result) {
                                    if (result.status) {
                                        realtimeDetection(cmid, attemptid, mainimage,
                                                result.status, result.data);
                                    }
                                });
                            }
                        }
                    }, 500);
                }
                setupLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
                    teacher, enablestudentvideo, setinterval,
                    quizid);
            }
        }
    };

    return {
        init: init
    };

    /**
     * Setup Local Media
     *
     * @param {int} cmid - cmid
     * @param {boolean} mainimage - boolean value
     * @param {boolean} verifyduringattempt - boolean value
     * @param {int} attemptid - Attempt Id
     * @param {boolean} teacher - boolean value
     * @param {boolean} enablestudentvideo - boolean value
     * @param {bigint} setinterval - int value
     * @param {int} quizid - int value
     * @param {function} callback - The callback function to execute after setting up the media stream.
     * @return {void}
     */
    function setupLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
        teacher, enablestudentvideo,
        setinterval, quizid, callback) {
        require(['core/ajax'], function() {
            if (localMediaStream !== null) {
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
                navigator.mediaDevices.getUserMedia({"audio": USE_AUDIO, "video": USE_VIDEO})
                .then(function(stream) {
                    localMediaStream = stream;
                    if (verifyduringattempt) {
                        $('<canvas>').attr({id: 'canvas', width: '280',
                            height: '240', 'style': 'display: none;'}).appendTo('body');
                        $('<video>').attr({
                            'id': 'video',
                            'class': 'quizaccess_quizproctoring-video',
                            'width': '280',
                            'height': '240',
                            'autoplay': 'autoplay'
                        }).css('display', enablestudentvideo ? 'block' : 'none')
                          .appendTo('body');
                        let allowproctoring = true;

                        document.addEventListener('visibilitychange', function() {
                            if (ismobiledevice()) {
                                if (document.visibilityState === 'hidden') {
                                    allowproctoring = false;
                                } else {
                                    allowproctoring = true;
                                    visibilitychange(cmid, attemptid, mainimage);
                                }
                            } else {
                                if (document.visibilityState === 'visible') {
                                    visibilitychange(cmid, attemptid, mainimage);
                                }
                            }
                        });

                        var camera = new Camera(cmid, mainimage, attemptid, quizid);
                        camera.startcamera();

                        let intervalinms = setinterval * 1000;
                        let randomdelayms = Math.floor(Math.random() * intervalinms) + 1;

                        setTimeout(function() {
                            setInterval(function() {
                                if (allowproctoring) {
                                    camera.proctoringimage();
                                }
                            }, intervalinms);
                        }, randomdelayms);
                    }
                    return stream;
                })
                .catch(function(error) {
                    // Handle the case where permission is denied
                    if (verifyduringattempt) {
                        var teacherroom = getTeacherroom();
                        if (teacherroom !== 'teacher') {
                            var camera = new Camera(cmid, mainimage, attemptid, quizid);
                            camera.startcamera();
                            setInterval(camera.proctoringimage.bind(camera), setinterval * 1000);
                        }
                        document.addEventListener('visibilitychange', function() {
                            if (document.visibilityState === 'visible') {
                                visibilitychange(cmid, attemptid, mainimage);
                            }
                        });
                    }
                    throw error;
                })
                .finally(function() {
                    if (callback) {
                        callback();
                    }
                });
                // Promise is handled with catch, no need to return
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
     * Setup visibility change
     *
     * @param {int} cmid - cmid
     * @param {int} attemptid - Attempt Id
     * @param {boolean} mainimage - boolean value
     * @return {void}
     */
    function visibilitychange(cmid, attemptid, mainimage) {
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
        $.ajax({
        url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
        method: 'POST',
        data: {cmid: cmid, attemptid: attemptid, mainimage: mainimage, tab: true},
            success: function(response) {
                if (response.redirect && response.url) {
                    window.onbeforeunload = null;
                    $(document).trigger('popup', response.msg);
                    setTimeout(function() {
                        window.location.href = encodeURI(response.url);
                    }, 3000);
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

        // Combine audio and video into a dummy MediaStream
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
 * RestoreVideoPosition
 *
 * @param {HTMLElement} element - The video element whose position should be restored.
 * @return {void}
 */
function restoreVideoPosition(element) {
    const savedPosition = localStorage.getItem('videoPosition');
    if (savedPosition) {
        const {left, top} = JSON.parse(savedPosition);
        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
    }
}

/**
 * DraggableVideoPosition
 *
 * @param {HTMLElement} element - The video element
 * @return {void}
 */
function makeDraggable(element) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    element.addEventListener('mousedown', function(e) {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) {
            return;
        }
        requestAnimationFrame(() => {
            moveElement(e.clientX, e.clientY);
        });
    });

    document.addEventListener('mouseup', function() {
        endDrag();
    });

    element.addEventListener('touchstart', function(e) {
        isDragging = true;
        const touch = e.touches[0];
        offsetX = touch.clientX - element.getBoundingClientRect().left;
        offsetY = touch.clientY - element.getBoundingClientRect().top;
    });

    document.addEventListener('touchmove', function(e) {
        if (!isDragging) {
            return;
        }
        const touch = e.touches[0];
        requestAnimationFrame(() => {
            moveElement(touch.clientX, touch.clientY);
        });
    });

    document.addEventListener('touchend', function() {
        endDrag();
    });

    /**
     * Moves the draggable element to the specified screen coordinates.
     *
     * @param {number} clientX - The X-coordinate of the cursor.
     * @param {number} clientY - The Y-coordinate of the cursor.
     * @return {void}
     */
    function moveElement(clientX, clientY) {
        let newLeft = clientX - offsetX;
        let newTop = clientY - offsetY;
        const maxLeft = window.innerWidth - element.offsetWidth;
        const maxTop = window.innerHeight - element.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        if (element.style.position !== 'fixed') {
            element.style.position = 'fixed';
        }
        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
    }

    /**
     * DraggableVideoPosition
     *
     * @return {void}
     */
    function endDrag() {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'grab';
            localStorage.setItem('videoPosition', JSON.stringify({
                left: parseInt(element.style.left, 10),
                top: parseInt(element.style.top, 10)
            }));
        }
    }
}

/**
 * RealtimeDetectionAjaxCall
 *
 * @param {int} cmid - cmid
 * @param {int} attemptid - Attempt Id
 * @param {boolean} mainimage - boolean value
 * @param {string} face string value
 * @param {Longtext} data video
 * @return {void}
 */
function realtimeDetection(cmid, attemptid, mainimage, face, data) {
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
        data: requestData,
        success: function(response) {
            if (response && response.status === 'eyecheckoff') {
                localStorage.setItem('eyecheckoff', JSON.stringify(true));
                return;
            }
            if (response && response.errorcode) {
                var warningsl = JSON.parse(localStorage.getItem('warningThreshold')) || 0;
                var leftwarnings = Math.max(warningsl - 1, 0);
                localStorage.setItem('warningThreshold', JSON.stringify(leftwarnings));
                $(document).trigger('popup', response.error);
            } else {
                if (response.redirect && response.url) {
                    window.onbeforeunload = null;
                    $(document).trigger('popup', response.msg);
                    setTimeout(function() {
                        window.location.href = encodeURI(response.url);
                    }, 3000);
                }
            }
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
    $(document).on('click', function(e) {
        const $modalContent = $('.custom-modal-content');
        if (!$modalContent.is(e.target) && $modalContent.has(e.target).length === 0) {
            closeCustomModal();
        }
    });
    $(document).on('keydown', function(e) {
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
    $(document).off('click');
    $(document).off('keydown');
}
});
