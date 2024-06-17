/**
 * JavaScript class for Camera
 *
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
window.addEventListener('beforeunload', function (event) {
    event.stopImmediatePropagation();
    event.returnValue = '';
});
define(['jquery', 'core/str', 'core/modal_factory','core/ajax'],
function($, str, ModalFactory, ajax) {
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
        setTimeout(navigator.mediaDevices.getUserMedia({video: true, audio: true})
            .then(function(stream) {
                if (this.video) {
                  this.video.srcObject = stream;
                  this.video.muted = true;                  
                  local_media_stream = stream;
                  this.video.play();
                  return true;
                }
                return true;
            })
        .catch(function() {
            // Console.log(err);
        }), 10000);
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

    Camera.prototype.takepicture = function() {
        // Console.log('takepicture function');
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
                    // Console.log(response.errorcode);
                    $("input[name='userimg']").val('');
                    $(document).trigger('popup', response.error);
                } else {
                    $("#id_submitbutton").prop("disabled", false);
                }
            }
        });
    };
    Camera.prototype.proctoringimage = function() {
        // Console.log(this.cmid);
        var context = this.canvas.getContext('2d');
        context.drawImage(this.video, 0, 0, this.width, this.height);
        var data = this.canvas.toDataURL('image/png');
        var quizid = this.quizid;
        var cmid = this.cmid;
        var attemptid = this.attemptid;
        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax.php',
            method: 'POST',
            data: {imgBase64: data, cmid: this.cmid, attemptid: this.attemptid, mainimage: this.mainimage},
            success: function(response) {
                if (response && response.errorcode) {
                    console.log(response.errorcode);
                    $(document).trigger('popup', response.error);
                } else {
                    if (response.redirect && response.url) {
                        window.onbeforeunload = null;
                        window.location.href = encodeURI(response.url);
                    }
                }
            }
        });
    };
    
    var signaling_socket = null;    /* our socket.io connection to our webserver */
    var local_media_stream = null; /* our own mic / webcam */
    var peers = {};                /* keep track of our peer connections, indexed by peer_id (aka socket.io id) */
    var peer_media_elements = {};  /* keep track of our <video>/<audio> tags, indexed by peer_id */
    var connectedPeers = {};

    var recordingStatus = {};
    var recording = false;
    var recordRTC;
    
    var USE_AUDIO = true;
    var USE_VIDEO = true;
    var MUTE_AUDIO_BY_DEFAULT = true;

    /** Use different stun server doing commercial stuff **/
    /** Ref: https://gist.github.com/zziuni/3741933 **/
    var ICE_SERVERS = [{urls:"stun:stun.l.google.com:19302"}];

    Camera.prototype.retake = function() {
        $("input[name='userimg']").val('');
        $('#' + this.videoid).show(this.cmid);
        $('#' + this.takepictureid).show();
        $('#' + this.canvasid).hide();
        $('#' + this.retakeid).hide();
    };
    Camera.prototype.showpopup = function(event, message) {
        return ModalFactory.create({
            body: message,
        }).then(function(modal) {
            modal.show();
            return null;
        });
    };

    var init = function(cmid, mainimage, verifyduringattempt = true, attemptid = null, teacher, quizid, externalserver, serviceoption, setinterval = 300) {        
        if(!verifyduringattempt) {
            var camera;
            camera = new Camera(cmid, mainimage, attemptid, quizid);
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
        } else {
            signaling_socket = io(externalserver);

        signaling_socket.on('connect', function () {
            console.log("Connected to signaling server..");

             // Retrieve the session state from localStorage
            var storedSession = localStorage.getItem('sessionState');
            var sessionState = storedSession ? JSON.parse(storedSession) : null;
            
           setup_local_media(cmid, mainimage, verifyduringattempt, attemptid, teacher, setinterval, serviceoption, quizid, function () {
                // Once User gives access to mic/cam, join the channel and start peering up
                var room = getRoomFromQuery(quizid);
                var teacherroom = getTeacherroom();
                var typet = { "type": (teacherroom === 'teacher') ? 'teacher' : 'student' }; 

                join_chat_channel(room, { 'quizid': quizid, 'type': typet });         // LINE WHICH SOLVED

                // Restore the session state if available
                if (sessionState) {
                    restoreSessionState(sessionState);
                }
            });         
        });

        signaling_socket.on('disconnect', function() {
            console.log("Disconnected from signaling server");
            /* Tear down all of our peer connections and remove all
             * media divs when we disconnect */

            for (peer_id in peer_media_elements) {
                peer_media_elements[peer_id].remove();
            }
            for (peer_id in peers) {
                peers[peer_id].close();
            }

            peers = {};
            peer_media_elements = {};
        });

        signaling_socket.on('addPeer', function(config) {
            console.log('Signaling server said to add peer:', config);
            var peer_id = config.peer_id;

            if (peer_id in peers) {
                console.log("Already connected to peer ", peer_id);
                return;
            }

            var peer_connection = new RTCPeerConnection(
                {"iceServers": ICE_SERVERS},
                {"optional": [{"DtlsSrtpKeyAgreement": true}]}
            );
            peers[peer_id] = peer_connection;

            // Add peer to the connectedPeers object
            connectedPeers[peer_id] = {
                stream: new MediaStream(),
                recordRTC: null
            };

            peer_connection.onicecandidate = function(event) {
                if (event.candidate) {
                    signaling_socket.emit('relayICECandidate', {
                        'peer_id': peer_id,
                        'ice_candidate': {
                            'sdpMLineIndex': event.candidate.sdpMLineIndex,
                            'candidate': event.candidate.candidate
                        }
                    });
                }
            };

            peer_connection.ontrack = function(event) {
                console.log("ontrack", event);

                // Update connectedPeers stream
                connectedPeers[peer_id].stream.addTrack(event.track);                
                var remote_media;

                if (peer_media_elements[peer_id]) {
                    remote_media = peer_media_elements[peer_id];
                } 
                else {
                    remote_media = USE_VIDEO ? $("<video>") : $("<audio>");
                    remote_media.attr("autoplay", "autoplay");
                    remote_media.attr("muted", "true");  /* always mute ourselves by default */
                    remote_media.attr("controls", "");
                    remote_media.attr("class", "quizaccess_quizproctoring");
                    
                    if (MUTE_AUDIO_BY_DEFAULT) {
                        remote_media.attr("muted", "true");
                    }
                    remote_media.attr("controls", "");
                    peer_media_elements[peer_id] = remote_media;
                    var teacherroom = getTeacherroom();
                    if (teacherroom === 'teacher') {
                        $('#region-main-box').append(remote_media);
                        attachMediaStream(remote_media[0], connectedPeers[peer_id].stream);
                    }
                }
                
            };

            // Add our local stream
            peer_connection.addStream(local_media_stream);

            if (config.should_create_offer) {
                console.log("Creating RTC offer to ", peer_id);
                peer_connection.createOffer(
                    function(local_description) {
                        console.log("Local offer description is: ", local_description);
                        peer_connection.setLocalDescription(local_description,
                            function() {
                                signaling_socket.emit('relaySessionDescription',
                                    {'peer_id': peer_id, 'session_description': local_description});
                                console.log("Offer setLocalDescription succeeded");
                            },
                            function() { Alert("Offer setLocalDescription failed!"); }
                        );
                    },
                    function(error) {
                        console.log("Error sending offer: ", error);
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
                signaling_socket.on('sessionDescription', function(config) {
                    console.log('Remote description received: ', config);
                    var peer_id = config.peer_id;
                    var peer = peers[peer_id];
                    var remote_description = config.session_description;
                    console.log(config.session_description);

                    var desc = new RTCSessionDescription(remote_description);
                    var stuff = peer.setRemoteDescription(desc, 
                        function() {
                            console.log("setRemoteDescription succeeded");
                            if (remote_description.type == "offer") {
                                console.log("Creating answer");
                                peer.createAnswer(
                                    function(local_description) {
                                        console.log("Answer description is: ", local_description);
                                        peer.setLocalDescription(local_description,
                                            function() { 
                                                signaling_socket.emit('relaySessionDescription', 
                                                    {'peer_id': peer_id, 'session_description': local_description});
                                                console.log("Answer setLocalDescription succeeded");
                                            },
                                            function() { Alert("Answer setLocalDescription failed!"); }
                                        );
                                    },
                                    function(error) {
                                        console.log("Error creating answer: ", error);
                                        console.log(peer);
                                    });
                            }
                        },
                        function(error) {
                            console.log("setRemoteDescription error: ", error);
                        }
                    );
                    console.log("Description Object: ", desc);

                });

                /**
                 * The offerer will send a number of ICE Candidate blobs to the answerer so they 
                 * can begin trying to find the best path to one another on the net.
                 */
                signaling_socket.on('iceCandidate', function(config) {
                    var peer = peers[config.peer_id];
                    var ice_candidate = config.ice_candidate;
                    peer.addIceCandidate(new RTCIceCandidate(ice_candidate));
                });
                /**
                 * When a user leaves a channel (or is disconnected from the
                 * signaling server) everyone will recieve a 'removePeer' message
                 * telling them to trash the media channels they have open for those
                 * that peer. If it was this client that left a channel, they'll also
                 * receive the removePeers. If this client was disconnected, they
                 * wont receive removePeers, but rather the
                 * signaling_socket.on('disconnect') code will kick in and tear down
                 * all the peer sessions.
                 */
                signaling_socket.on('removePeer', function (config) {
                    console.log('Signaling server said to remove peer:', config);
                    var peer_id = config.peer_id;

                    if (!(peer_id in peers)) {
                        console.log("[" + socket.id + "] ERROR: peer_id does not exist", peer_id);
                        return;
                    }

                    // Close the peer connection
                    peers[peer_id].removeStream(connectedPeers[peer_id].stream);
                    peers[peer_id].close();

                    // Remove the peer from connectedPeers
                    delete connectedPeers[peer_id];

                    var remote_media = peer_media_elements[peer_id];
                    if (remote_media) {
                        remote_media.remove();
                        adjustLayout();
                    }
                    // Remove references
                    delete peers[peer_id];
                    delete peer_media_elements[peer_id];
                });

                 // Function to adjust the layout after removing a video element
                function adjustLayout() {
                    var videosContainer = $('#region-main');
                    var videoElements = videosContainer.children('video');
                    var totalVideos = videoElements.length;

                    // Adjust the layout based on the total number of videos
                    if (totalVideos > 1) {
                        // For example, distribute the videos evenly in rows and columns
                        var rows = Math.ceil(Math.sqrt(totalVideos));
                        var cols = Math.ceil(totalVideos / rows);

                        videoElements.each(function(index) {
                            var row = Math.floor(index / cols);
                            var col = index % cols;

                            $(this).css({
                                'position': 'absolute',
                                'top': (row * 240) + 'px', // Adjust based on your video height
                                'left': (col * 320) + 'px' // Adjust based on your video width
                            });
                        });
                    } 
                }

        function restoreSessionState(sessionState) {
            for (var peer_id in sessionState.connectedPeers) {
                var peer = sessionState.connectedPeers[peer_id];

                // Create RTCPeerConnection and add track
                var peer_connection = new RTCPeerConnection(
                    { "iceServers": ICE_SERVERS },
                    { "optional": [{ "DtlsSrtpKeyAgreement": true }] }
                );

                peers[peer_id] = peer_connection;

                peer_connection.onicecandidate = function (event) {
                    if (event.candidate) {
                        signaling_socket.emit('relayICECandidate', {
                            'peer_id': peer_id,
                            'ice_candidate': {
                                'sdpMLineIndex': event.candidate.sdpMLineIndex,
                                'candidate': event.candidate.candidate
                            }
                        });
                    }
                };

                peer_connection.ontrack = function (event) {
                    // Update connectedPeers stream
                    peer.stream.addTrack(event.track);

                    var remote_media;

                    if (peer_media_elements[peer_id]) {
                        remote_media = peer_media_elements[peer_id];
                    } else {
                        remote_media = USE_VIDEO ? $("<video>") : $("<audio>");
                        remote_media.attr("autoplay", "autoplay");

                        if (MUTE_AUDIO_BY_DEFAULT) {
                            remote_media.attr("muted", "true");
                        }
                        remote_media.attr("controls", "");
                        peer_media_elements[peer_id] = remote_media;
                        var teacherroom = getTeacherroom();
                        if (teacherroom === 'teacher') {
                            $('#region-main-box').append(remote_media);
                            attachMediaStream(remote_media[0], stream);
                        }
                    }

                    attachMediaStream(remote_media[0], peer.stream);
                };

                // Add our local stream
                peer_connection.addStream(local_media_stream);

                // Add existing tracks to the new connection
                for (var track of peer.stream.getTracks()) {
                    peer_connection.addTrack(track, peer.stream);
                }

                // Create an offer
                peer_connection.createOffer(
                    function (local_description) {
                        peer_connection.setLocalDescription(local_description,
                            function () {
                                signaling_socket.emit('relaySessionDescription',
                                    { 'peer_id': peer_id, 'session_description': local_description });
                            },
                            function () { console.error("Offer setLocalDescription failed!"); }
                        );
                    },
                    function (error) {
                        console.error("Error creating offer: ", error);
                    }
                );
            }
        } 
    }

    };
    return {
        init: init
    };


     function setup_local_media(cmid, mainimage, verifyduringattempt, attemptid, teacher, setinterval, serviceoption, quizid, callback, errorback) {
        require(['core/ajax'], function(ajax) {
        if (local_media_stream != null) {  /* i.e, if we've already been initialized */
            if (callback) callback();
            return; 
        }
        /* Ask user for permission to use mic &/or cam, 
         * attach it to an <audio> or <video> tag if they give us access. */
        console.log("Requesting access to local audio/video i/p");


        navigator.getUserMedia = ( 
               navigator.getUserMedia ||
               navigator.webkitGetUserMedia ||
               navigator.mozGetUserMedia ||
               navigator.msGetUserMedia);

        attachMediaStream = function(element, stream) {
            console.log('DEPRECATED, attachMediaStream will soon be removed.');
            element.srcObject = stream;
         };

        navigator.mediaDevices.getUserMedia({"audio":USE_AUDIO, "video":USE_VIDEO})
        .then(function(stream) {                /* user accepted access to a/v */
        console.log("Access granted to audio/video");
        local_media_stream = stream;
        var camera;
        var warning = 0;
        if (verifyduringattempt) {
            var teacherroom = getTeacherroom();
            if (teacherroom !== 'teacher') {
                $('<canvas>').attr({id: 'canvas', width: '280', height: '240', 'style': 'display: none;'}).appendTo('body');
                $('<video>').attr({
                    'id': 'video',
                    'class': 'quizaccess_quizproctoring-video',
                    'width': '280',
                    'height': '240',
                    'autoplay': 'autoplay'}).appendTo('body');                
                camera = new Camera(cmid, mainimage, attemptid, quizid);
                setInterval(camera.proctoringimage.bind(camera), setinterval * 1000);
            }
        }
        if (callback) callback();
        })
        });
    }


    function getRoomFromQuery(room) {
        console.log('Room from URL:', room);
        return room || DEFAULT_CHANNEL;
    }

    function getTeacherroom() {
        var urlParams = new URLSearchParams(window.location.search);
        var teacher = urlParams.get('teacher');
        console.log('teacher from URL:', teacher);
        return teacher;
    }

    function join_chat_channel(room, userdata) {
        console.log('Join room');
        signaling_socket.emit('join', {"room": room, "userdata": userdata});
    }
});
