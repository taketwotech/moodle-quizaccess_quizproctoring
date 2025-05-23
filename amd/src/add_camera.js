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
        var context = this.canvas.getContext('2d');
        context.drawImage(this.video, 0, 0, this.width, this.height);
        var data = this.canvas.toDataURL('image/png');
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

    var signalingSocket = null;
    var externalserver = 'https://proctoring.taketwotechnologies.com';
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
    var ICE_SERVERS = [{urls: "stun:stun.l.google.com:19302"}];

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
        warnings = 0) {
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
            if (enableeyecheckreal) {
                const waitForElements = setInterval(() => {
                    const vElement = document.getElementById('video');
                    const cElement = document.getElementById('canvas');

                    if (vElement && cElement) {
                        clearInterval(waitForElements);
                        if (typeof setupFaceMesh !== 'undefined') {
                            // eslint-disable-next-line no-undef
                            setupFaceMesh(vElement, cElement, function(result) {
                                if (result.status) {
                                    realtimeDetection(cmid, attemptid, mainimage,
                                        result.status, result.data);
                                }
                            });
                        }
                    }
                }, 500);
            }
            if (onlinestudent) {
                // eslint-disable-next-line no-undef
                signalingSocket = io(externalserver);
                signalingSocket.on('connect', function() {
                // Retrieve the session state from localStorage
                var storedSession = localStorage.getItem('sessionState');
                var sessionState = storedSession ? JSON.parse(storedSession) : null;
                setupLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
                teacher, enablestudentvideo, setinterval,
                quizid, function() {
                    // Once User gives access to mic/cam, join the channel and start peering up
                    var teacherroom = getTeacherroom();
                    var typet = {"type": (teacherroom === 'teacher') ? 'teacher' : 'student'};
                    var fullname = userfullname;
                    var domain = studenthexstring;

                    signalingSocket.emit('join', {"room": quizid, "userdata": {'quizid': quizid,
                        'type': typet, 'fullname': fullname, 'domain': domain}});

                    // Restore the session state if available
                    if (sessionState) {
                        restoreSessionState(sessionState);
                    }
                });
            });

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
                  remoteMedia.prop("controls", true);
                  remoteMedia.addClass("quizaccess_quizproctoring");
                  remoteMedia.prop("muted", true);
                  if ($("#region-main-box .videos-container").length === 0) {
                    $("#region-main-box").append($("<div>").addClass("videos-container"));
                  }
                  var studentContainer = $("<div>").addClass("student-container");
                  const studentData = cachedStudentData.find((sd) => sd.id === peerId);
                  const studentNameText = studentData ? studentData.fullname : config.fullname || "";
                  if (studentNameText) {
                    const studentName = $("<span>").addClass("student-name").text(studentNameText);
                    studentContainer.append(remoteMedia);
                    studentContainer.append(studentName);
                    peerMediaElements[peerId] = studentContainer;
                    var teacherroom = getTeacherroom();
                    if (teacherroom === "teacher") {
                        total = total + 1;
                        if (noStudentOnlineDiv && total > 0) {
                            noStudentOnlineDiv.style.display = 'none';
                        }
                        $(".videos-container").append(studentContainer);
                        remoteMedia[0].srcObject = connectedPeers[peerId].stream;
                        if (USE_VIDEO && event.track.kind === "video") {
                            const videoElement = remoteMedia[0];
                            videoElement.onloadedmetadata = () => {
                            if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                                studentContainer.css("display", "none");
                            }
                        };
                        setTimeout(() => {
                          if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                            studentContainer.css("display", "none");
                          }
                        }, 2000);
                      }
                    }
                  }
                }
            };
            // Add our local stream
            if (localMediaStream) {
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

                    delete connectedPeers[peerId];

                    var remoteContainer = peerMediaElements[peerId];
                    if (remoteContainer) {
                        total = total - 1;
                        if (total === 0 && noStudentOnlineDiv) {
                            noStudentOnlineDiv.style.display = 'block';
                        }
                        remoteContainer.remove();
                    }

                    delete peers[peerId];
                    delete peerMediaElements[peerId];
                });

        } else {
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
 * Restore Video Position
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
 * Draggable Video Position
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
