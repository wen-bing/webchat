function WebRTCClient(currentUser, socket) {
  var _currentUser = currentUser;
  var _socket = socket;

  //video views
  var _videoChatContainer = $("#videoChatContainer");
  var _localVideoView = $("#localView");
  var _remoteVideoView = $("#remoteView");

  var _stun_server = 'STUN stun.l.google.com:19302';
  var _peerConnection = null;
  var _localStream;
  var _remoteStream;
  var needFormatCandidate;

  window.URL = window.URL || window.webkitURL;
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  var _caller;
  var _callee;

  this.supportVideoCall = function() {
    var connection = tryCreatePeerConnection();
    return hasGetUserMedia() && connection != undefined;
  }

  this.startCall = function(callee) {
    _caller = _currentUser;
    _callee = callee;
    tryGetUserMedia();
  }

  this.hungup = function() {
    stop(true);
  }

  this.isCaller = function(user){
    return user === _currentUser;
  }

  this.handleAttendeeOffline = function(user) {
    if(_peerConnection) {
      alert("The remove is offline. Turnoff video calls");
      stop(false);
    }
  }

  function hasGetUserMedia() {
    return !!navigator.getUserMedia;
  }

  _socket.on('msg_start_call', function(data) {
    //console.log('received a call invitation');
    var result = window.confirm("You've a incoming video call request. Do you accept it?");
    if(result) {
      _caller = data.from;
      _callee = _currentUser;
      tryGetUserMedia();
    } else {
      _socket.emit('msg_call_answer', {
        answer: false,
        to: data.from,
        from: _currentUser
      });
    }
  });

  _socket.on('msg_call_answer', function(data) {
    if(data.answer) {
      if(!_peerConnection) {
        initPeerConnection();
      }
      _peerConnection.addStream(_localStream);

      _socket.emit('msg_answer_ack', {
        from: _currentUser,
        to: data.from
      });

      doCall();
    } else {
      alert(data.callee + 'reject your call.');
      stop(false);
    }
  });

  _socket.on('msg_answer_ack', function(data) {
    if(!_peerConnection) {
      initPeerConnection();
    }
    _peerConnection.addStream(_localStream);
  });

  _socket.on('msg_call_unspport', function(data) {
    alert("The remove doesn't support video call.");
    stop(false);
  })

  //on receive a signal message
  _socket.on('msg_signal_msg', function(data) {
    processSignalingMessage(data.msg);
  });

  function showLocalVideoView() {
    _videoChatContainer.show();
  }

  function hideVideoViews() {
    _remoteVideoView.attr("src", null);
    _localVideoView.attr("src", null);
    _videoChatContainer.hide();
  }

  function tryGetUserMedia() {
    try {
      navigator.getUserMedia({
        audio: true,
        video: true
      }, onGetMediaSuccess, onGetMediaError);
    } catch(e) {
      alert("getUserMedia not supported.");
      console.log("getUserMedia failed with exception: " + e.message);
      stop(false);
    }
  }

  function onGetMediaSuccess(stream) {
    var url = window.URL.createObjectURL(stream);
    _localVideoView.attr("src", url);
    _localStream = stream;
    if(_caller == _currentUser) {
      _socket.emit('msg_start_call', {
        from: _currentUser,
        to: _callee
      });
    } else {
      _socket.emit('msg_call_answer', {
        answer: true,
        from: _currentUser,
        to: _caller
      });
    }
  }

  function onGetMediaError(error) {
    console.log("Failed to get access to local media. Error code was " + error.code);
    alert(Message.getUserMedia_UNSUPPORT);
    if(_callee == _currentUser) {
      _socket.emit(MeetingMsg.VIDEO_CALL_UNSUPPORT, {
        from: _currentUser,
        to: _caller
      });
    }
    stop(false);
  }

  function tryCreatePeerConnection() {
    var connection;
    try {
      connection = new webkitPeerConnection00(_stun_server, onICECandidate);
    } catch(e) {
      console.log("Failed to create webkitPeerConnection00, exception: " + e.message);
      try {
        connection = new PeerConnnection00(_stun_server, onICECandidate);
        console.log("Created PeerConnnection with config \"" + _stun_server + "\".");
      } catch(e) {
        console.log("Failed to create PeerConnection, exception: " + e.message);
      }
    }
    return connection;
  }

  function initPeerConnection() {
    _peerConnection = tryCreatePeerConnection();
    if(_peerConnection) {
      // _peerConnection.onconnecting = onSessionConnecting;
      // _peerConnection.onopen = onSessionOpened;
      _peerConnection.onaddstream = onRemoteStreamAdded;
      _peerConnection.onremovestream = onRemoteStreamRemoved;
    }
  }

  function onICECandidate(candidate, moreToFollow) {
    if(candidate) {
      sendMessage({
        type: 'candidate',
        label: candidate.label,
        candidate: candidate.toSdp()
      });
    }
  }

  // function onSessionConnecting(message) {
  //   //console.log("Session connecting.");
  // }

  // function onSessionOpened(message) {
  //   //console.log("Session opened.");
  // }

  function onRemoteStreamAdded(event) {
    _remoteStream = event.stream;
    var url = window.URL.createObjectURL(event.stream);
    _remoteVideoView.attr("src", url);
  }

  function onRemoteStreamRemoved(event) {
    _remoteVideoView.attr("src", null);
  }

  function doCall() {
    var offer = _peerConnection.createOffer({
      audio: true,
      video: true
    });
    _peerConnection.setLocalDescription(_peerConnection.SDP_OFFER, offer);
    sendMessage({
      type: 'offer',
      sdp: offer.toSdp()
    });
    _peerConnection.startIce();
  }

  function doAnswer() {
    var offer = _peerConnection.remoteDescription;
    var answer = _peerConnection.createAnswer(offer.toSdp(), {
      audio: true,
      video: true
    });
    _peerConnection.setLocalDescription(_peerConnection.SDP_ANSWER, answer);
    sendMessage({
      type: 'answer',
      sdp: answer.toSdp()
    });
    _peerConnection.startIce();
  }

  function onRemoteHangup(from) {
    if(_peerConnection) {
      alert("Remote hungup, the call stoped now.");
      stop(false);
    }
  }

  function stop(needNotify) {
    if(needNotify) {
      sendMessage({
        type: 'bye',
        from: _currentUser
      });
    }
    if(_peerConnection) {
      _peerConnection.close();
      _peerConnection = null;
    }
    _localStream = null;
    _caller = null;
    _callee = null;
    _isVideoEnabled = false;
    _isAudioEnabled = false;
    hideVideoViews();
  }

  function sendMessage(message) {
    var msgString = JSON.stringify(message);
    _socket.emit('msg_signal_msg', {
      msg: msgString,
      from: _currentUser,
      to: _currentUser == _caller? _callee: _caller
    });
  }

  function processSignalingMessage(message) {
    var msg = JSON.parse(message);
    if(msg.type === 'offer') {
      _peerConnection.setRemoteDescription(_peerConnection.SDP_OFFER, new SessionDescription(msg.sdp));
      doAnswer();
    } else if(msg.type === 'answer') {
      _peerConnection.setRemoteDescription(_peerConnection.SDP_ANSWER, new SessionDescription(msg.sdp));
    } else if(msg.type === 'candidate') {
      var candidate = new IceCandidate(msg.label, msg.candidate);
      _peerConnection.processIceMessage(candidate);
    } else if(msg.type === 'bye') {
      onRemoteHangup(msg.from);
    }
  }
}