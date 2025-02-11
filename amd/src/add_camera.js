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
                    videoElement.playsinline = true;
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

                    const savedPosition = JSON.parse(localStorage.getItem('videoPosition'));
                    if (savedPosition) {
                        videoElement.style.left = savedPosition.left;
                        videoElement.style.top = savedPosition.top;
                    }

                    let offsetX;
                    let offsetY;
                    let isDragging = false;

                    const stopDragging = function() {
                        if (isDragging) {
                            isDragging = false;
                            videoElement.style.zIndex = 9999998;

                            // Save position
                            const position = {
                                left: videoElement.style.left,
                                top: videoElement.style.top,
                            };
                            localStorage.setItem('videoPosition', JSON.stringify(position));
                        }
                    };

                    videoElement.addEventListener('mousedown', function(e) {
                        isDragging = true;
                        offsetX = e.clientX - videoElement.getBoundingClientRect().left;
                        offsetY = e.clientY - videoElement.getBoundingClientRect().top;
                        videoElement.style.zIndex = 9999999;
                    });

                    window.addEventListener('mousemove', function(e) {
                        if (isDragging) {
                            videoElement.style.left = `${e.clientX - offsetX}px`;
                            videoElement.style.top = `${e.clientY - offsetY}px`;
                        }
                    });

                    window.addEventListener('mouseup', stopDragging);

                    // Additional safeguard: Cancel dragging if the mouse leaves the viewport
                    window.addEventListener('mouseout', stopDragging);

                    // Timeout fallback to stop dragging after a delay
                    setInterval(() => {
                        if (isDragging) {
                            stopDragging();
                        }
                    }, 2000);

                    takePictureButton.prop('disabled', false);
                }
                return videoElement;
            })
            .catch(function() {
                takePictureButton.prop('disabled', true);
            });
    };

    Camera.prototype.takepicture = function() {
        var context = this.canvas.getContext('2d');
        context.drawImage(this.video, 0, 0, this.width, this.height);
        var data = this.canvas.toDataURL('image/png');
        $('#' + this.videoid).hide();
        $('#' + this.takepictureid).hide();
        $('#' + this.canvasid).show();
        $('#' + this.retakeid).show();
        $("input[name='userimg']").val(data);
        $("#id_submitbutton").prop("disabled", true);
        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
            method: 'POST',
            data: {imgBase64: data, cmid: this.cmid, attemptid: this.attemptid, mainimage: this.mainimage},
            success: function(response) {
                if (response && response.errorcode) {
                    $("input[name='userimg']").val('');
                    $(document).trigger('popup', response.error);
                } else {
                    $("#id_submitbutton").prop("disabled", false);
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
        $("input[name='userimg']").val('');
    };

    var signalingSocket = null;
    var localMediaStream = null;
    var peers = {};
    var peerId = null;
    var peerMediaElements = {};
    var connectedPeers = {};
    var USE_AUDIO = true;
    var USE_VIDEO = true;
    var MUTE_AUDIO_BY_DEFAULT = true;
    var attachMediaStream = null;
    var stream = null;
    var total = 0;
    let cachedStudentData = null;
    let db; // For IndexedDB
    let recording = false;
    var recordRTC;
    let uploadQueue = []; // Queue for uploads
    let isUploading = false; // Flag to track upload state
    let activeUploads = new Set();

    var ICE_SERVERS = [{urls: "stun:stun.l.google.com:19302"}];

    Camera.prototype.retake = function() {
        $("input[name='userimg']").val('');
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
        teacher, quizid, serviceoption, externalserver, securewindow = null, userfullname,
        userid, enablestudentvideo = 1, enablestrictcheck = 0, setinterval = 300) {
        const noStudentOnlineDiv = document.getElementById('nostudentonline');
        if (!verifyduringattempt) {
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
            signalingSocket = io(externalserver);
            signalingSocket.on('connect', function() {
            // Retrieve the session state from localStorage
            var storedSession = localStorage.getItem('sessionState');
            var sessionState = storedSession ? JSON.parse(storedSession) : null;
            setupLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
            teacher, enablestudentvideo, enablestrictcheck, setinterval,
            serviceoption, quizid, function() {
                // Once User gives access to mic/cam, join the channel and start peering up
                var teacherroom = getTeacherroom();
                var typet = {"type": (teacherroom === 'teacher') ? 'teacher' : 'student'};
                var fullname = userfullname;

                signalingSocket.emit('join', {"room": quizid, "userdata": {'quizid': quizid,
                    'type': typet, 'fullname': fullname}});

                // Restore the session state if available
                if (sessionState) {
                    restoreSessionState(sessionState);
                }
            });
            //setupIndexedDB();
        });
        const waitForElements = setInterval(() => {
            const vElement = document.getElementById('video');
            const cElement = document.getElementById('canvas');

            if (vElement && cElement) {
                clearInterval(waitForElements);
                const faceMesh = new FaceMesh({
                    locateFile: (file) => {
                        return `${M.cfg.wwwroot}/mod/quiz/accessrule/quizproctoring/libraries/facemesh/${file}`;
                    }
                });
                if (typeof setupFaceMesh !== 'undefined') {
                    setupFaceMesh(faceMesh, enablestrictcheck,
                        function(result) {
                        if (result.status) {
                            realtimeDetection(cmid, attemptid,
                                mainimage, result.status, result.data);
                        }
                    });
                }
            }
        }, 500);

        signalingSocket.on('disconnect', function() {
            /* Tear down all of our peer connections and remove all
             * media divs when we disconnect */

            for (peerId in peerMediaElements) {
                peerMediaElements[peerId].remove();
            }
            for (peerId in peers) {
                peers[peerId].close();
            }

            peers = {};
            peerMediaElements = {};
        });

        signalingSocket.on('addPeer', function(config) {
            if (!config.studentData || config.studentData.length === 0) {
                // No studentData received or it is empty
            } else {
                cachedStudentData = config.studentData;
            }

            if (cachedStudentData) {
                const existingStudent = cachedStudentData.find(student => student.id === config.peer_id);
                if (!existingStudent) {
                    cachedStudentData.push({id: config.peer_id, fullname: config.fullname});
                }
            } else {
                cachedStudentData = [];
            }


            var peerId = config.peer_id;

            if (peerId in peers) {
                return;
            }

            var peerConnection = new RTCPeerConnection(
                {"iceServers": ICE_SERVERS},
                {"optional": [{"DtlsSrtpKeyAgreement": true}]}
            );
            peers[peerId] = peerConnection;
            // Add peer to the connectedPeers object
            connectedPeers[peerId] = {
                stream: new MediaStream()
            };

            peerConnection.onicecandidate = function(event) {
                if (event.candidate) {
                    signalingSocket.emit('relayICECandidate', {
                        'peer_id': peerId,
                        'ice_candidate': {
                            'sdpMLineIndex': event.candidate.sdpMLineIndex,
                            'candidate': event.candidate.candidate
                        }
                    });
                }
            };

            peerConnection.ontrack = function(event) {

                // Update connectedPeers stream
                connectedPeers[peerId].stream.addTrack(event.track);
                var remoteMedia;

                if (peerMediaElements[peerId]) {
                    remoteMedia = peerMediaElements[peerId];
                } else {
                    remoteMedia = USE_VIDEO ? $("<video>") : $("<audio>");
                    remoteMedia.attr("autoplay", "autoplay");
                    remoteMedia.attr("muted", "true");
                    remoteMedia.attr("controls", "");
                    remoteMedia.attr("class", "quizaccess_quizproctoring");

                    remoteMedia.attr("controls", "");
                    if ($('#region-main-box .videos-container').length === 0) {
                        $('#region-main-box').append($("<div>").addClass("videos-container"));
                    }

                    var studentContainer = $("<div>").addClass("student-container");
                    const studentData = cachedStudentData.find(sd => sd.id === peerId);
                    const studentNameText = studentData ? studentData.fullname :
                    config.fullname || "";

                    const studentName = $("<span>").addClass("student-name").text(studentNameText);
                    studentContainer.append(remoteMedia);
                    studentContainer.append(studentName);

                    peerMediaElements[peerId] = remoteMedia;
                    var teacherroom = getTeacherroom();
                    if (teacherroom === 'teacher') {
                        total = total + 1;
                        $('.videos-container').append(studentContainer);
                        remoteMedia[0].srcObject = connectedPeers[peerId].stream;
                    }
                }
            };
            // Add our local stream
            if (localMediaStream) {
                if (noStudentOnlineDiv) {
                    noStudentOnlineDiv.style.display = 'none';
                }
                peerConnection.addStream(localMediaStream);
            }
            if (config.should_create_offer) {
                peerConnection.createOffer(
                    function(localDescription) {
                        peerConnection.setLocalDescription(localDescription,
                            function() {
                                signalingSocket.emit('relaySessionDescription',
                                    {'peer_id': peerId, 'session_description': localDescription});
                            }
                        );
                    },
                    function() {
                        // Error handling will be implemented later
                    }
                );
            }
        });

                /**
                 * Peers exchange session descriptions which contains information
                 * about their audio / video settings and that sort of stuff. First
                 * the 'offerer' sends a description to the 'answerer' (with type
                 * "offer"), then the answerer sends one back (with type "answer").
                 */
                signalingSocket.on('sessionDescription', function(config) {
                    var peerId = config.peer_id;
                    var peer = peers[peerId];
                    var remoteDescription = config.session_description;
                    var desc = new RTCSessionDescription(remoteDescription);
                    peer.setRemoteDescription(desc)
                    .then(function() {
                        if (remoteDescription.type === "offer") {
                            return peer.createAnswer();
                        }
                        return null;
                    })
                    .then(function(localDescription) {
                        if (localDescription) {
                            return peer.setLocalDescription(localDescription);
                        }
                        return null;
                    })
                    .then(function() {
                        if (peer.localDescription) {
                            signalingSocket.emit('relaySessionDescription', {
                                'peer_id': peerId,
                                'session_description': peer.localDescription
                            });
                        }
                        return null;
                    })
                    .catch(function(error) {
                        throw error;
                    });
                });

                /**
                 * The offerer will send a number of ICE Candidate blobs to the answerer so they
                 * can begin trying to find the best path to one another on the net.
                 */
                signalingSocket.on('iceCandidate', function(config) {
                    var peer = peers[config.peer_id];
                    var iceCandidate = config.ice_candidate;
                    peer.addIceCandidate(new RTCIceCandidate(iceCandidate));
                });
                /**
                 * When a user leaves a channel (or is disconnected from the
                 * signaling server) everyone will recieve a 'removePeer' message
                 * telling them to trash the media channels they have open for those
                 * that peer. If it was this client that left a channel, they'll also
                 * receive the removePeers. If this client was disconnected, they
                 * wont receive removePeers, but rather the
                 * signalingSocket.on('disconnect') code will kick in and tear down
                 * all the peer sessions.
                 */
                    signalingSocket.on('removePeer', function(config) {
                    var peerId = config.peer_id;

                    if (!(peerId in peers)) {
                        return;
                    }

                    // Close the peer connection
                    peers[peerId].removeStream(connectedPeers[peerId].stream);
                    peers[peerId].close();

                    // Remove the peer from connectedPeers
                    delete connectedPeers[peerId];

                    var remoteMedia = peerMediaElements[peerId];
                    if (remoteMedia) {
                        total = total - 1;
                        if (total === 0) {
                            noStudentOnlineDiv.style.display = 'block';
                        }
                        remoteMedia.closest('.student-container').remove();
                    }
                    // Remove references
                    delete peers[peerId];
                    delete peerMediaElements[peerId];
                });

            $('#mod_quiz-next-nav').click(function(event) {
            /*$('#responseform').append('<input type="hidden" name="next" value="Next page">');
            event.preventDefault();
            $('#page-wrapper').append('<img src="/mod/quiz/accessrule/quizproctoring/pix/loading.gif" id="loading">');
            $('#loading').show();
            $("#mod_quiz-prev-nav").prop("disabled", true);
            $("#mod_quiz-next-nav").prop("disabled", true);*/
            stopRecording();
        });

            var recordButton = $("<button class='start-recording'>").text("Start Recording").click(function() {
                    if (recording) {                       
                        stopRecording();
                        $(this).removeClass("stop-recording").addClass("start-recording").text("Start Recording");
                    }
                });
                // Append the recordButton to the buttons container
                $('footer').append(recordButton);
    }

    };
    return {
        init: init
    };

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

    /**
     * Setup Local Media
     *
     * @param {int} cmid - cmid
     * @param {boolean} mainimage - boolean value
     * @param {boolean} verifyduringattempt - boolean value
     * @param {int} attemptid - Attempt Id
     * @param {boolean} teacher - boolean value
     * @param {boolean} enablestudentvideo - boolean value
     * @param {boolean} enablestrictcheck - boolean value
     * @param {bigint} setinterval - int value
     * @param {Longtext} serviceoption - string value
     * @param {int} quizid - int value
     * @param {function} callback - The callback function to execute after setting up the media stream.
     * @return {void}
     */
    function setupLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
        teacher, enablestudentvideo, enablestrictcheck,
        setinterval, serviceoption, quizid, callback) {
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
                    //startRecording();
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
                               $.ajax({
                                url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
                                method: 'POST',
                                data: {cmid: cmid, attemptid: attemptid, mainimage: mainimage, tab: true},
                                    success: function(response) {
                                        if (response && response.errorcode) {
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
                        });
                        var camera = new Camera(cmid, mainimage, attemptid, quizid);
                        camera.startcamera();
                        setInterval(camera.proctoringimage.bind(camera), setinterval * 1000);
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
 * RestoreSessionState
 *
 * @param {Longtext} sessionState sessionState
 */
function restoreSessionState(sessionState) {
    for (var peerId in sessionState.connectedPeers) {
        if (sessionState.connectedPeers.hasOwnProperty(peerId)) {
            var peer = sessionState.connectedPeers[peerId];

            // Create RTCPeerConnection and add track
            var peerConnection = new RTCPeerConnection(
                {"iceServers": ICE_SERVERS},
                {"optional": [{"DtlsSrtpKeyAgreement": true}]}
            );

            peers[peerId] = peerConnection;

            setupPeerConnection(peerConnection, peerId, peer);
        }
    }
}

/**
 * SetupPeerConnection
 *
 * @param {Longtext} peerConnection peerConnection
 * @param {Longtext} peerId peerId
 * @param {Longtext} peer peer
 */
function setupPeerConnection(peerConnection, peerId, peer) {
    peerConnection.onicecandidate = function(event) {
        if (event.candidate) {
            signalingSocket.emit('relayICECandidate', {
                'peer_id': peerId,
                'ice_candidate': {
                    'sdpMLineIndex': event.candidate.sdpMLineIndex,
                    'candidate': event.candidate.candidate
                }
            });
        }
    };

    peerConnection.ontrack = function(event) {
        // Update connectedPeers stream
        peer.stream.addTrack(event.track);

        var remoteMedia;

        if (peerMediaElements[peerId]) {
            remoteMedia = peerMediaElements[peerId];
        } else {
            remoteMedia = USE_VIDEO ? $("<video>") : $("<audio>");
            remoteMedia.attr("autoplay", "autoplay");

            if (MUTE_AUDIO_BY_DEFAULT) {
                remoteMedia.attr("muted", "true");
            }
            remoteMedia.attr("controls", "");
            peerMediaElements[peerId] = remoteMedia;
            var teacherroom = getTeacherroom();
            if (teacherroom === 'teacher') {
                $('#region-main-box').append(remoteMedia);
                attachMediaStream(remoteMedia[0], stream);
            }
        }
        attachMediaStream(remoteMedia[0], peer.stream);
    };

    // Add our local stream
    peerConnection.addStream(localMediaStream);

    // Add existing tracks to the new connection
    for (var track of peer.stream.getTracks()) {
        peerConnection.addTrack(track, peer.stream);
    }

    // Create an offer
    peerConnection.createOffer(
        function(localDescription) {
            peerConnection.setLocalDescription(localDescription,
                function() {
                    signalingSocket.emit('relaySessionDescription', {
                        'peer_id': peerId,
                        'session_description': localDescription
                    });
                }
            );
        });
}

/**
 * Realtime Detection Ajax call
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
            if (response && response.errorcode) {
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
// Setup IndexedDB
function setupIndexedDB() {
    const request = indexedDB.open("VideoDB", 1);

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("videos")) {
            db.createObjectStore("videos", {
                keyPath: "id",
                autoIncrement: true,
            });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log("IndexedDB is ready!");
        resumeUploads(); // Resume uploads if any
    };

    request.onerror = (event) => {
        console.error("Error opening IndexedDB:", event.target.error);
    };
}

// Save video to IndexedDB
function saveVideoToIndexedDB(blob) {
    if (!db) {
        console.error("IndexedDB is not initialized");
        return;
    }

    const transaction = db.transaction("videos", "readwrite");
    const store = transaction.objectStore("videos");

    const videoEntry = {
        timestamp: new Date().toISOString(),
        blob: blob,
        status: 'pending' // Track upload status
    };

    const request = store.add(videoEntry);

    request.onsuccess = (event) => {
        const id = event.target.result; // Get the ID of the newly created entry
        console.log("Video saved to IndexedDB successfully with ID:", id);
        videoEntry.id = id; // Assign the ID to the videoEntry
        uploadQueue.push(videoEntry); // Add to upload queue
        processUploadQueue(); // Start processing the queue
    };

    request.onerror = (event) => {
        console.error("Error saving video to IndexedDB:", event.target.error);
    };
}

// Update the status of a video in IndexedDB
function updateVideoStatusInIndexedDB(id, status) {
    if (!db) {
        console.error("IndexedDB is not initialized");
        return;
    }

    const transaction = db.transaction("videos", "readwrite");
    const store = transaction.objectStore("videos");

    const request = store.get(id);

    request.onsuccess = (event) => {
        const videoData = event.target.result;
        if (videoData) {
            videoData.status = status; // Update the status
            const updateRequest = store.put(videoData);

            updateRequest.onsuccess = () => {
                console.log(`Video ID ${id} status updated to "${status}"`);
            };

            updateRequest.onerror = (event) => {
                console.error(`Error updating video ID ${id} status:`, event.target.error);
            };
        } else {
            console.error(`Video with ID ${id} not found in IndexedDB`);
        }
    };

    request.onerror = (event) => {
        console.error(`Error retrieving video ID ${id}:`, event.target.error);
    };
}

// Process the upload queue
function processUploadQueue() {
    if (isUploading || uploadQueue.length === 0) {
        return; // Exit if already uploading or queue is empty
    }

    const videoData = uploadQueue.shift(); // Get the next video to upload
    if (activeUploads.has(videoData.id)) {
        processUploadQueue(); // Skip if already uploading
        return;
    }

    activeUploads.add(videoData.id); // Mark as active upload
    updateVideoStatusInIndexedDB(videoData.id, "uploading"); // Set status to 'uploading'

    const formData = new FormData();
    var fileName = Date.now() + '_' + Math.floor(Math.random() * 1000);
    const videoname = `${fileName}.webm`;
    formData.append("video", videoData.blob, videoname);
    formData.append("filepath", "/mod/quiz/accessrule/quizproctoring/upload/");

    fetch("/upload", {
        method: "POST",
        body: formData,
    })
        .then((response) => {
            if (response.ok) {
                console.log(`Uploaded video: ${videoData.timestamp}`);
                updateVideoStatusInIndexedDB(videoData.id, "uploaded"); // Update status to 'uploaded'
                deleteVideoFromIndexedDB(videoData.id); // Delete video from IndexedDB
            } else {
                console.error("Upload failed:", response.statusText);
                updateVideoStatusInIndexedDB(videoData.id, "pending"); // Reset status to 'pending'
                uploadQueue.push(videoData); // Re-add to the queue
            }
        })
        .catch((error) => {
            console.error("Error uploading video:", error);
            updateVideoStatusInIndexedDB(videoData.id, "pending"); // Reset status to 'pending'
            uploadQueue.push(videoData); // Re-add to the queue
        })
        .finally(() => {
            activeUploads.delete(videoData.id); // Remove from active uploads
            processUploadQueue(); // Process the next upload
        });
}

// Resume uploads from IndexedDB
function resumeUploads() {
    if (!db) {
        console.error("IndexedDB is not initialized");
        return;
    }

    const transaction = db.transaction("videos", "readwrite");
    const store = transaction.objectStore("videos");

    const request = store.openCursor();

    request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            const videoData = cursor.value;

            if (videoData.status === "pending") {
                // Add to queue if not already queued
                const existing = uploadQueue.some((video) => video.id === videoData.id);
                if (!existing) {
                    uploadQueue.push(videoData);
                }
            } else if (videoData.status === "uploading") {
                // Assume it's uploaded and delete it
                console.log(`Assuming video ID ${videoData.id} was successfully uploaded. Deleting from IndexedDB.`);
                deleteVideoFromIndexedDB(videoData.id);
            }

            cursor.continue(); // Move to the next video
        } else {
            console.log("All pending and uploading videos processed.");
            processUploadQueue(); // Start processing the queue
        }
    };

    request.onerror = (event) => {
        console.error("Error retrieving videos:", event.target.error);
    };
}

// Delete video from IndexedDB after upload
function deleteVideoFromIndexedDB(id) {
    if (!id) {
        console.error("No ID provided for deletion");
        return; // Exit if no ID is provided
    }

    const transaction = db.transaction("videos", "readwrite");
    const store = transaction.objectStore("videos");

    const request = store.delete(id);

    request.onsuccess = () => {
        console.log(`Video with ID ${id} deleted from IndexedDB`);
    };

    request.onerror = (event) => {
        console.error("Error deleting video from IndexedDB:", event.target.error);
    };
}

function startRecording() {
    recordRTC = RecordRTC(localMediaStream, {
        type: 'video'
    });
    recordRTC.startRecording();
    recording = true;
}

 function stopRecording() {
    // Stop recording for the local user
    if (recordRTC) {
        recordRTC.stopRecording(function(videoURL) {
        // videoURL contains the recorded video data
        console.log(videoURL);
        fetch(videoURL)
            .then(response => response.blob())
            .then(blob => {
                saveVideoToIndexedDB(blob);
            })
            .catch(error => {
                console.error("Error fetching video URL:", error);
            });
        });
    }
recording = false;
}
});
