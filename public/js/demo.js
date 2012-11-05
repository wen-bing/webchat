$(function(){
	var _nickName = $("#nickName").val();
	var _socketServer = $("#socketServer").val();
	var _socketClient = new SocketClient(_socketServer);
	var _webRtcClient = new WebRTCClient(_nickName, _socketClient.getSocket());

	var _textChatContainer = $("#textChatContainer");
	var _onlineUserList = $("#onlineUserList");
	var _onlineUserItemTemplate = $("#onlineUserItemTemplate");
	var _textChatTitle = $("#textChatTitle");
	var _chatInput = $("#chatInput");
	var _chatHistoryItemTemplate = $("#chatHistoryItemTemplate");
	var _textChatHistory = $("#textChatHistory");
	
	var _videoChatContainer = $("#videoChatContainer");
	var _videoTitle = $("#videoTitle");

	$.subscribe('event_online', function(){
		//TODO:
		//show online flags	
	});

	$.subscribe('event_get_online_users', function(event, data){
		_onlineUserList.empty();
		for(var i = 0; i < data.users.length; i++){
			if(data.users[i].name == _nickName) continue;
			var onlineItem = _onlineUserItemTemplate.clone();
			onlineItem.removeAttr("id");
			onlineItem.find('a').attr("id", data.users[i].name);
			onlineItem.find('.userName').find('a').html(data.users[i].name);
			if(_webRtcClient.supportVideoCall() && data.users[i].video){
				onlineItem.find('.videoIcon').find('a').removeClass('hide');
			}
			onlineItem.appendTo(_onlineUserList);
		}
	});

	$.subscribe('event_user_online', function(event, data){
		var item = _onlineUserList.find("#"+data.onlineUser.name);
		if(item.length > 0)
			return;
		var onlineItem = _onlineUserItemTemplate.clone();
		onlineItem.removeAttr("id");
		onlineItem.find('a').attr("id", data.onlineUser.name);
		onlineItem.find('.userName').find('a').html(data.onlineUser.name);
		if(_webRtcClient.supportVideoCall() && data.onlineUser.video){
			onlineItem.find('.videoIcon').find('a').removeClass('hide');	
		}
		onlineItem.appendTo(_onlineUserList);
	});

	$.subscribe('msg_user_offline', function(event, data){
		var item = _onlineUserList.find("#"+data.offlineUser);
        if(item.length > 0) item.remove();
	});

	_onlineUserList.find('.userName').find('a').live("click", function() {
		_textChatContainer.show();
		_textChatContainer.removeClass('hide');
        var user = $(this).attr("id"); 
        _textChatTitle.html("Text chatting with: " + user);
    });

    _onlineUserList.find('.videoIcon').find('a').live('click', function() {
    	_videoChatContainer.show();
    	_videoChatContainer.removeClass('hide');
    	var user = $(this).attr('id');
    	_videoTitle.html('Video Chat with: ' + user);

    	_webRtcClient.startCall(user);
    });

    _chatInput.keypress(function(event) {
        if(event.which === 13 && _chatInput.val().trim() != "") {
            var msg = _chatInput.val();
            _socketClient.sendChatMsg(msg, _nickName);
            _chatInput.val("");
        }
    });

    $.subscribe('event_chat_msg', function(event, chatMsg){
    	var html = _textChatTitle.html().trim();
    	if(html == ""){
    		_textChatTitle.html("Text chatting with: " + chatMsg.from);
    	}
    	var chatHistoryItem = _chatHistoryItemTemplate.clone();
        chatHistoryItem.find(".msgSender").html(chatMsg.from);
        chatHistoryItem.find(".msgSendTime").html(chatMsg.time.toString());
        chatHistoryItem.find("div").html(chatMsg.msg);
        chatHistoryItem.removeAttr("id");
        _textChatHistory.prepend(chatHistoryItem);
    })


    //login after all registered
	_socketClient.joinRoom(_nickName, _webRtcClient.supportVideoCall());

})