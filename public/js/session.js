function WebRtcSession () {
	this.source="";
	this.target="";
	this.isVideoOn=false;
	this.isAudioOn=false;
}

WebRtcSession.prototype.start = function(source, target, isVideo, isAudio) {
	this.source = source;
	this.target = target;
	this.isAudioOn = isAudio;
	this.isVideoOn = isVideo;
};

WebRtcSession.prototype.answer = function(){

}

WebRtcSession.prototype.terminate = function(){

}