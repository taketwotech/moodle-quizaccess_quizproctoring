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
                        $(document).trigger('popup', 'Camera or microphone is disabled. Please enable both to continue.');
                    };

                    const audioTrack = stream.getAudioTracks()[0];
                    if (audioTrack) {
                        audioTrack.onended = function() {
                            $(document).trigger('popup', 'Camera or microphone is disabled. Please enable both to continue.');
                        };
                    } else {
                        $(document).trigger('popup', 'Camera or microphone is disabled. Please enable both to continue.');
                    }
                    restoreVideoPosition(videoElement);
                    makeDraggable(videoElement);
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

    const targetRatio = 4 / 3; // Or use 1 for square crop

    // Get video actual dimensions
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const videoRatio = vw / vh;

    let sx, sy, sw, sh;

    if (videoRatio > targetRatio) {
        // Video is wider than target ratio – crop sides
        sh = vh;
        sw = vh * targetRatio;
        sx = (vw - sw) / 2;
        sy = 0;
    } else {
        // Video is taller than target ratio – crop top/bottom
        sw = vw;
        sh = vw / targetRatio;
        sx = 0;
        sy = (vh - sh) / 2;
    }

    // Set canvas to fixed output size (e.g., 320x240 for 4:3)
    canvas.width = this.width;   // e.g., 320
    canvas.height = this.height; // e.g., 240

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const data = canvas.toDataURL('image/png');
        //var context = this.canvas.getContext('2d');
        //context.drawImage(this.video, 0, 0, this.width, this.height);
        //var data = this.canvas.toDataURL('image/png');
        $('#' + this.videoid).hide();
        $('#' + this.takepictureid).hide();
        $('#' + this.canvasid).show();
        $('#' + this.retakeid).show();
        $('#userimageset').val(1);
        $("#id_submitbutton").prop("disabled", true);
        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
            method: 'POST',
            data: {imgBase64: data, cmid: this.cmid, attemptid: this.attemptid, mainimage: this.mainimage},
            success: function(response) {
                if (response && response.errorcode) {
                    $('#userimageset').val(0);
                    $(document).trigger('popup', response.error);
                } else {
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
            var context = this.canvas.getContext('2d');
            context.drawImage(this.video, 0, 0, this.width, this.height);
            var data = this.canvas.toDataURL('image/png');
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
        warnings = 0, usergroup = '', detectionval = null) {
        if (!verifyduringattempt) {
            localStorage.removeItem('eyecheckoff');
            var camera;
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
            $(document).on('click', '.closebutton', function() {
                if (typeof camera !== 'undefined' && typeof camera.stopcamera === 'function') {
                    camera.stopcamera();
                    camera.resetcamera();
                    $("#id_submitbutton").prop("disabled", true);
                    localStorage.removeItem('videoPosition');
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
            console.log('Room:', room);
            // Add iframe for student view
            if (onlinestudent) {
                // Add iframe for student view
                const iframeContainer = $("<div>").addClass("student-iframe-container").css({
                    display: 'none'
                });

                const baseUrl = `${externalserver}/student`;
                const params = new URLSearchParams({
                    id: studenthexstring,
                    name: userfullname,
                    examId: quizid,
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
                        'style': 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; ' +
                                'width: 230px; height: 173px; border-radius: 3px; ' +
                                'box-shadow: 0 2px 10px rgba(0,0,0,0.2);'
                    })
                    .on('load', function() {
                        console.log('Iframe loaded, sending initial message');
                        // Send initial message to establish connection
                        try {
                            iframe[0].contentWindow.postMessage({ 
                                type: 'init',
                                timestamp: Date.now()
                            }, externalserver);
                        } catch (error) {
                            console.error('Error sending initial message:', error);
                        }
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

                // Add canvas for proctoring
                $('<canvas>').attr({
                    id: 'canvas',
                    width: '280',
                    height: '240',
                    'style': 'display: none;'
                }).appendTo('body');

                if (verifyduringattempt) {
                    const waitForElements = setInterval(() => {
                        const vElement = document.getElementById('video');
                        const cElement = document.getElementById('canvas');
                        if (vElement && cElement) {
                            navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                            .then((stream) => {
                                vElement.srcObject = stream;
                                vElement.play();
                            })
                            .catch((err) => {
                                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
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
                            });
                            clearInterval(waitForElements);
                            if (enableeyecheckreal) {
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
                            makeDraggable(vElement);
                        }
                    }, 500);

                    // Handle visibility change
                    document.addEventListener('visibilitychange', function() {
                        if (document.visibilityState === 'visible') {
                            visibilitychange(cmid, attemptid, mainimage);
                        }
                    });

                    // Initialize camera and start proctoring
                    var camera = new Camera(cmid, mainimage, attemptid, quizid);
                    let iframeReady = false;
                    let responseReceived = true;
                    // Add message listener for iframe communication
                    window.addEventListener('message', function(event) {
                        console.log('Received message:', {
                            origin: event.origin,
                            expectedOrigin: externalserver,
                            data: event.data
                        });
                        
                        if (event.origin === externalserver) {
                            const data = event.data;
                            if (data.type === 'ready') {
                                console.log('Iframe is ready for communication');
                                iframeReady = true;
                            } else if (data.type === 'proctoring_image') {
                                responseReceived = true;
                                console.log('Received proctoring image from iframe');
                                // Process the image from iframe
                                var context = camera.canvas.getContext('2d');
                                var img = new Image();
                                img.onload = function() {
                                    context.drawImage(img, 0, 0, camera.width, camera.height);
                                    var imageData = camera.canvas.toDataURL('image/png');
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
                            }
                        } else {
                            console.log('Message origin mismatch:', {
                                received: event.origin,
                                expected: externalserver
                            });
                        }
                    });

                    // Start sending messages only after iframe is ready
                    setInterval(function() {
                        if (iframeReady) {
                            if (!responseReceived) {
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
                            console.log('Sending get_proctoring_image message to iframe');
                            try {
                                iframe[0].contentWindow.postMessage({ 
                                    type: 'get_proctoring_image',
                                    timestamp: Date.now()
                                }, externalserver);
                            } catch (error) {
                                console.error('Error sending message to iframe:', error);
                                iframeReady = false; // Reset ready state on error
                            }
                        } else {
                            console.log('Iframe not ready, sending init message');
                            try {
                                iframe[0].contentWindow.postMessage({ 
                                    type: 'init',
                                    timestamp: Date.now()
                                }, externalserver);
                            } catch (error) {
                                console.error('Error sending init message:', error);
                            }
                        }
                    }, setinterval * 1000);
                }
            } else {
                if (enableeyecheckreal) {                    
                    const waitForElements = setInterval(() => {
                        const vElement = document.getElementById('video');
                        const cElement = document.getElementById('canvas');
                        if (vElement && cElement) {
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

                attachMediaStream = function(element, stream) {
                    element.srcObject = stream;
                };

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
                        document.addEventListener('visibilitychange', function() {
                            if (document.visibilityState === 'visible') {
                                visibilitychange(cmid, attemptid, mainimage);
                            }
                        });
                        var camera = new Camera(cmid, mainimage, attemptid, quizid);
                        camera.startcamera();
                        let intervalinms = setinterval * 1000;
                        let randomdelayms = Math.floor(Math.random() * intervalinms) + 1;
                        setTimeout(function() {
                            camera.proctoringimage();
                            setInterval(camera.proctoringimage.bind(camera), intervalinms);
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
            } else {
                localMediaStream = createDummyMediaStream();
                if (callback) {
                    callback();
                }
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
        var warningsl = JSON.parse(localStorage.getItem('warningThreshold')) || 0;
        var leftwarnings = Math.max(warningsl - 1, 0);
        localStorage.setItem('warningThreshold', JSON.stringify(leftwarnings));
        var message = "Do not move away from active tab.";
        if (leftwarnings === 1) {
            message = `Do not move away from active tab. You have only ${leftwarnings} warning left.`;
        } else if (leftwarnings > 1) {
            message = `Do not move away from active tab. You have only ${leftwarnings} warnings left.`;
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
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;
            const maxLeft = window.innerWidth - element.offsetWidth;
            const maxTop = window.innerHeight - element.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));
            if (element.style.position !== 'fixed') {
                element.style.position = 'fixed';
            }
             element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
        });
    });
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'grab';
            localStorage.setItem('videoPosition', JSON.stringify({
                left: parseInt(element.style.left, 10),
                top: parseInt(element.style.top, 10)
            }));
        }
    });
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
        success: function(response) {console.log(response);
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
