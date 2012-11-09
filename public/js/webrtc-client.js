function WebRTCClient(currentUser, socket) {
  var _currentUser = currentUser;
  var _socket = socket;

  //video views
  var _videoChatContainer = $("#videoDIV");
  var _localVideoView = $("#localView");
  var _remoteVideoView = $("#remoteView");

  var mediaConstraints = {'has_audio':true, 'has_video':true};
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
      showLocalVideoView();
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
    _videoChatContainer.removeClass('hide');
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
    var pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
    try {
      connection = new webkitRTCPeerConnection(pc_config);
      connection.onicecandidate = onIceCandidate;
      console.log("Created webkitRTCPeerConnnection with config \"" + JSON.stringify(pc_config) + "\".");
    } catch (e) {
      console.log("Create webkitRTCPeerConnnection failed.");
      alert("The browser current support vidoe, please use chrome 23 stable version.")
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

  function onIceCandidate(event) {
    if (event.candidate) {
      sendMessage({type: 'candidate',
                   label: event.candidate.sdpMLineIndex,
                   id: event.candidate.sdpMid,
                   candidate: event.candidate.candidate});
    } else {
      console.log("End of candidates.");
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
    _peerConnection.createOffer(setLocalAndSendMessage, null, mediaConstraints);
  }

  function doAnswer() {
    _peerConnection.createAnswer(setLocalAndSendMessage, null, mediaConstraints);
  }

  function setLocalAndSendMessage(sessionDescription) {
    _peerConnection.setLocalDescription(sessionDescription);
    sendMessage(sessionDescription);
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

    if (msg.type === 'offer') {
      // We only know JSEP version after createPeerConnection().
      _peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
      doAnswer();
    } else if (msg.type === 'answer') {
      _peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
    } else if (msg.type === 'candidate') {
      var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label,
                                           candidate:msg.candidate});
      _peerConnection.addIceCandidate(candidate);
    } else if (msg.type === 'bye') {
      onRemoteHangup();
    }
  }
}