$(function(){
  var URL = window.URL || window.webkitURL || window.msURL || window.oURL;
  var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  if(!getUserMedia){
    alert("Sorry, Your browser cannot support this app.");
    return false;
  }

  var _localStream;
  //should not be a jquery object.
  var _localVideo = $("#selfView").get(0);
  var _remoteVideo = $("#remoteView").get(0);

  var onFailed = function(e){
    alert("Sorry cannot get your webcam & microphone");
    return false;
  }

  var onStream = function(localStream) {
    _video.src = URL.createObjectURL(localStream);
    _video.control = true;
  }

  getUserMedia.call(navigator, {
    video: true,
    audio: true
  }, onStream, onFailed);

  $.subscribe('joined_room', function(){
    //create peer connection here.
    
  })
})