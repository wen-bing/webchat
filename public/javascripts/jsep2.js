$(function() {
    var signalingChannel = createSignalingChannel();
    var pc = null;
    var hasCandidates = false;
    var selfView = $("#selfView").get(0);
    var remoteView = $("#remoteView").get(0);

    function start(isCaller) {
        // create a PeerConnection and hook up the IceCallback
        pc = new webkitPeerConnection("STUN:stun1.voiceeclipse.net", function(candidate, moreToFollow) {
            if (!moreToFollow) {
                hasCandidates = true;
                maybeSignal(isCaller);
            }
        });

        // get the local stream and show it in the local video element
        navigator.webkitGetUserMedia({
            "audio": true,
            "video": true
        }, function(localStream) {
            selfView.src = webkitURL.createObjectURL(localStream);
            pc.addStream(localStream);
            maybeSignal(isCaller);
        }

        // once remote stream arrives, show it in the remote video element
        pc.onaddstream = function(evt) {
            remoteView.src = webkitURL.createObjectURL(evt.stream);
        };

        // if we're the caller, create and install our offer,
        // and start candidate generation
        if (isCaller) {
            offer = pc.createOffer(null);
            pc.setLocalDescription(SDP_OFFER, offer);
            pc.startIce();
        }
    }

    function maybeSignal(isCaller) {
        // only signal once we have a local stream and local candidates
        if (localStreams.size() == 0 || !hasCandidates) return;
        if (isCaller) {
            offer = pc.localDescription;
            signalingChannel.send(
            JSON.stringify({
                "type": "offer",
                "sdp": offer
            }));
        } else {
            // if we're the callee, generate, apply, and send the answer
            answer = pc.createAnswer(pc.remoteDescription, null);
            pc.setLocalDescription(SDP_ANSWER, answer);
            signalingChannel.send(
            JSON.stringify({
                "type": "answer",
                "sdp": answer
            }));
        }
    }

    signalingChannel.onmessage = function(evt) {
        var msg = JSON.parse(evt.data);
        if (msg.type == "offer") {
            // create the PeerConnection
            start(false);
            // feed the received offer into the PeerConnection and
            // start candidate generation
            pc.setRemoteDescription(PeerConnection.SDP_OFFER, msg.sdp);
            pc.startIce();
        } else if (msg.type == "answer") {
            // feed the answer into the PeerConnection to complete setup
            pc.setRemoteDescription(PeerConnection.SDP_ANSWER, msg.sdp);
        }
    }

})