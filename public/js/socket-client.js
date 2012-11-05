function SocketClient(serverUrl) {
    var _url = serverUrl;
    var _socket = io.connect(_url);

    this.getSocket = function() {
        return _socket;
    }

    this.joinRoom = function(nickName, supportVideo) {
        _socket.emit('msg_join_room', {
            nickName: nickName,
            supportVideo: supportVideo
        });
    }

    this.sendChatMsg = function(msg, from){
        var chatMsg = {
            from: from,
            msg: msg,
            time: new Date() 
        };
        _socket.emit('msg_chat', chatMsg);
        chatMsg.from = 'me';
        $.publish('event_chat_msg', chatMsg);
    }

    _socket.on('msg_joined', function() {
        $.publish("event_online");
        _socket.emit('msg_get_online_users');
    });

    _socket.on("msg_get_online_users", function(onlineUsers) {
        $.publish("event_get_online_users", onlineUsers);
    });

    _socket.on('msg_user_online', function(user) {
        $.publish("event_user_online", {
            onlineUser: user
        });
    })

    _socket.on('msg_user_offline', function(user) {
        $.publish('event_user_offline', {
            offlineUser: user
        });
    })

    _socket.on('msg_chat', function(chatMsg) {
        $.publish('event_chat_msg', chatMsg);
    })
}