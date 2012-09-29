$(function() {
  var _selfView = $("#selfView");
  var _remoteView = $("#remoteView");
  var _callButton = $("#call");
  var _localStream;
  var _peerConnection;
  var pc_config = 'STUN stun.l.google.com:19302';
  var _caller = false;
  var iceUfrags = [];
  var icePwds = [];
  var needFormatCandidate = false;

  $.subscribe('call_clicked', function() {
    console.log('Start calling...');
    _caller = true;
    getUserMedia();
  });

  //on received a video call invitation.
  _socket.on('call_invitation', function(data) {
    console.log('received a call invitation');
    var result = window.confirm('You received a video call, do you accept it?');
    if (result) {
      getUserMedia();
    }
  });

  _socket.on('invitation_answer', function(data) {
    if (data.answer) {
      console.log("Creating PeerConnection.");
      createPeerConnection();

      console.log("Adding local stream.");
      _peerConnection.addStream(_localStream);

      //re-confirm the answer
      _socket.emit('invitation_ack', {
        answer: true
      });

      //start ice;
      doCall();
    } else {
      console.log('Your invitation is rejected!');
    }
  });

  _socket.on('invitation_ack', function(data) {
    //if(data.answer){
    console.log('create PeerConnection.')
    createPeerConnection();
    console.log("Adding local stream.");
    _peerConnection.addStream(_localStream);
    //}
  });

  //on receive a signal message
  _socket.on('signal_message', function(message) {
    console.log("Received a message: " + JSON.stringify(message));
    processSignalingMessage(message);
  });

  /**
   * get the media (audio or video) of the user
   * @return {void}
   */
  getUserMedia = function() {
    try {
      navigator.webkitGetUserMedia({
        audio: true,
        video: true
      }, onUserMediaSuccess, onUserMediaError);
      console.log("Requested access to local media with new syntax.");
    } catch (e) {
      try {
        navigator.webkitGetUserMedia("video,audio", onUserMediaSuccess, onUserMediaError);
        console.log("Requested access to local media with old syntax.");
      } catch (e) {
        alert("webkitGetUserMedia() failed. Is the MediaStream flag enabled in about:flags?");
        console.log("webkitGetUserMedia failed with exception: " + e.message);
      }
    }
  }

  /**
   * Callback function for getUserMedia() on success getting the media
   * create an url for the current stream
   * @param  {stream} stream : contains the video and/or audio streams
   * @return {void}
   */
  onUserMediaSuccess = function(stream) {
    console.log("User has granted access to local media.");
    var url = webkitURL.createObjectURL(stream);
    _selfView.attr("src", url);
    _localStream = stream;
    if(!_caller){
       _socket.emit('invitation_answer', {
        answer: true
      });
    }else{
      //send call invitation
      _socket.emit('start_call');
    } 
  }

  /**
   * Callback function for getUserMedia() on fail getting the media
   * @param  {error} error : informations about the error
   * @return {void}
   */
  onUserMediaError = function(error) {
    console.log("Failed to get access to local media. Error code was " + error.code);
    alert("Failed to get access to local media. Error code was " + error.code + ".");
  }

  /**
   * Set parameter for creating a peer connection and add a callback function for messagin by peer connection
   * @return {void}
   */
  createPeerConnection = function() {
  try {
    _peerConnection = new webkitPeerConnection00(pc_config, onIceCandidate);
    console.log("Created webkitPeerConnnection00 with config \""+ pc_config +"\".");
  } catch (e) {
    console.log("Failed to create PeerConnection, exception: " + e.message);
    alert("Cannot create PeerConnection object; Is the 'PeerConnection' flag enabled in about:flags?");
    return;
  }
    _peerConnection.onconnecting = onSessionConnecting;
    _peerConnection.onopen = onSessionOpened;
    _peerConnection.onaddstream = onRemoteStreamAdded;
    _peerConnection.onremovestream = onRemoteStreamRemoved;
  }

  onIceCandidate = function(candidate, moreToFollow) {      
    if (candidate) {
        sendMessage({type: 'candidate',
                     label: candidate.label, candidate: candidate.toSdp()});
    }

    if (!moreToFollow) {
      console.log("End of candidates.");
    }
}

  /**
   * Called when the peer connection is connecting
   * @param  {message} message
   * @return {void}
   */
  onSessionConnecting = function(message) {
    console.log("Session connecting.");
  }

  /**
   * Called when the session between clients is established
   * @param  {message} message
   * @return {void}
   */
  onSessionOpened = function(message) {
    console.log("Session opened.");
  }

  /**
   * Get the remote stream and add it to the page with an url
   * @param  {event} event : event given by the browser
   * @return {void}
   */
  onRemoteStreamAdded = function(event) {
    console.log("Remote stream added.");
    var url = webkitURL.createObjectURL(event.stream);
    console.log("Remote Stream URL: " + url);
    _remoteView.attr("src", url);
  }

  /**
   * Called when the remote stream has been removed
   * @param  {event} event : event given by the browser
   * @return {void}
   */
  onRemoteStreamRemoved = function(event) {
    console.log("Remote stream removed.");
  }

  doCall = function() {
    console.log("Send offer to peer");
    var offer = _peerConnection.createOffer({
      audio: true,
      video: true
    });
    _peerConnection.setLocalDescription(_peerConnection.SDP_OFFER, offer);
    console.log("Send SDP Offer");
    sendMessage({
      type: 'offer',
      sdp: offer.toSdp()
    });
    _peerConnection.startIce();
  }

  doAnswer = function() {
    console.log("Send answer to peer");
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

  sendMessage = function(message) {
    var msgString = JSON.stringify(message);
    console.log('C->S: ' + msgString);
    _socket.emit('signal_message', msgString);
  }

  function processSignalingMessage(message) {
    var msg = JSON.parse(message);
    if (msg.type === 'offer') {
      console.log('received an offer');
      _peerConnection.setRemoteDescription(_peerConnection.SDP_OFFER, new SessionDescription(msg.sdp));
      //checkIceFormat(msg.sdp);
      doAnswer();
    } else if (msg.type === 'answer') {
      _peerConnection.setRemoteDescription(_peerConnection.SDP_ANSWER, new SessionDescription(msg.sdp));
      //checkIceFormat(msg.sdp);
    } else if (msg.type === 'candidate') {
      var candidateString = maybeAddIceCredentials(msg);
      var candidate = new IceCandidate(msg.label, candidateString);
      _peerConnection.processIceMessage(candidate);
    } else if (msg.type === 'bye') {
      onRemoteHangup();
    }
  }

  // Temp solution for compatibility between Chrome 20 and later versions.
  // We need to convert the ICE candidate into old format at Chrome 20 end.
  checkIceFormat = function(msgString) {
    var ua = navigator.userAgent;
    if (ua.substr(ua.lastIndexOf('Chrome/') + 7, 2) === '20') {
      // If the offer/answer is from later Chrome to Chrome 20
      // Save the username and password of both audio and video
      if (msgString.search('ice-ufrag:') !== -1 && msgString.search('ice-pwd:') !== -1) {
        saveIceCredentials(msgString);
        needFormatCandidate = true;
      }
    }
  }

  // Save the ICE credentials in SDP from later Chrome at Chrome 20 end.
  saveIceCredentials = function(msgString) {
    var indexOfAudioSdp = msgString.search('m=audio');
    var indexOfVideoSdp = msgString.search('m=video');

    // Candidate label 0 for audio, 1 for video
    var audioSdp = msgString.substring(indexOfAudioSdp, indexOfVideoSdp);
    iceUfrags[0] = audioSdp.substr(audioSdp.search('ice-ufrag:') + 10, 16);
    icePwds[0] = audioSdp.substr(audioSdp.search('ice-pwd:') + 8, 24);
    var videoSdp = msgString.substring(indexOfVideoSdp);
    iceUfrags[1] = videoSdp.substr(videoSdp.search('ice-ufrag:') + 10, 16);
    icePwds[1] = videoSdp.substr(videoSdp.search('ice-pwd:') + 8, 24);
  }


  // Add saved ICE credentials into candidate from later Chrome at Chrome 20 end.
  maybeAddIceCredentials = function(msg) {
    var candidateString = msg.candidate;
    if (needFormatCandidate) {
      candidateString = msg.candidate.replace('generation', 'username ' + iceUfrags[msg.label] + ' password ' + icePwds[msg.label] + ' generation');
    }
    return candidateString;
  }

  onRemoteHangup = function() {
  console.log('Session terminated.');
  stop();
  initiator = 0;
}

stop = function() {
  needFormatCandidate = false;
  _peerConnection.close();
  _peerConnection = null;
}

})