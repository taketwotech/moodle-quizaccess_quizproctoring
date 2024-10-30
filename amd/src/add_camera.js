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
        return navigator.mediaDevices.getUserMedia({video: true, audio: true})
            .then(function(stream) {
                const videoElement = document.getElementById('video');
                if (videoElement) {
                    videoElement.srcObject = stream;
                    videoElement.muted = true;
                    videoElement.playsinline = true;
                    localMediaStream = stream;
                    videoElement.play();
                }
                return videoElement; // Return videoElement or stream here
            })
            .catch(function() {
                // Console.log(err);
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
        return ModalFactory.create({
            body: message,
        }).then(function(modal) {
            modal.show();
            return null;
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
        teacher, quizid, serviceoption, setinterval = 300) {
        if (!verifyduringattempt) {
            var camera;
            camera = new Camera(cmid, mainimage, attemptid, quizid);
            $('.quizstartbuttondiv [type=submit]').on('click', function() {
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
            });
            $(document).on('click', '.closebutton', function() {
                if (typeof camera !== 'undefined' && typeof camera.stopcamera === 'function') {
                    camera.stopcamera();
                }
            });
        } else {
            signalingSocket = io(externalserver);
            signalingSocket.on('connect', function() {
            // Retrieve the session state from localStorage
            var storedSession = localStorage.getItem('sessionState');
            var sessionState = storedSession ? JSON.parse(storedSession) : null;
           setupLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
            teacher, setinterval, serviceoption, quizid, function() {
                // Once User gives access to mic/cam, join the channel and start peering up
                var teacherroom = getTeacherroom();
                var typet = {"type": (teacherroom === 'teacher') ? 'teacher' : 'student'};

                signalingSocket.emit('join', {"room": quizid, "userdata": {'quizid': quizid, 'type': typet}});

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

                    if (MUTE_AUDIO_BY_DEFAULT) {
                        remoteMedia.attr("muted", "true");
                    }
                    remoteMedia.attr("controls", "");
                    peerMediaElements[peerId] = remoteMedia;
                    var teacherroom = getTeacherroom();
                    if (teacherroom === 'teacher') {
                        $('#region-main-box').append(remoteMedia);
                        attachMediaStream(remoteMedia[0], connectedPeers[peerId].stream);
                    }
                }
            };
            // Add our local stream
            peerConnection.addStream(localMediaStream);

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
                        remoteMedia.remove();
                    }
                    // Remove references
                    delete peers[peerId];
                    delete peerMediaElements[peerId];
                });
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
     * @param {bigint} setinterval - int value
     * @param {Longtext} serviceoption - string value
     * @param {int} quizid - int value
     * @param {function} callback - The callback function to execute after setting up the media stream.
     * @return {void}
     */
    function setupLocalMedia(cmid, mainimage, verifyduringattempt, attemptid,
        teacher, setinterval, serviceoption, quizid, callback) {
        require(['core/ajax'], function() {
            if (localMediaStream !== null) {
                if (callback) {
                    callback();
                }
                return;
            }

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
                        var teacherroom = getTeacherroom();
                        if (teacherroom !== 'teacher') {
                            $('<canvas>').attr({id: 'canvas', width: '280',
                                height: '240', 'style': 'display: none;'}).appendTo('body');
                            $('<video>').attr({
                                'id': 'video',
                                'class': 'quizaccess_quizproctoring-video',
                                'width': '280',
                                'height': '240',
                                'autoplay': 'autoplay'
                            }).appendTo('body');
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
                    }
                    return stream;
                })
                .catch(function() {
                    // Handle the case where permission is denied
                    if (verifyduringattempt) {
                        var teacherroom = getTeacherroom();
                        if (teacherroom !== 'teacher') {
                            var camera = new Camera(cmid, mainimage, attemptid, quizid);
                            camera.startcamera();
                            setInterval(camera.proctoringimage.bind(camera), setinterval * 1000);
                        }
                    }
                })
                .finally(function() {
                    if (callback) {
                        callback();
                    }
                });
        });
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
});
