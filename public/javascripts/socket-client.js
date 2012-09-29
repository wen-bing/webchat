//global socket variable can be used for webRtc signalling
var _socket = io.connect('http://192.168.1.124:5000');

$(function() {
    var _joinButton = $("#joinButton");
    var _roomName=$("#roomName");
    var _nickName = $("#nickName");
    var _onlineUserContainer = $("#onlineUsersContainer");

    _joinButton.click(function() {
        _socket.emit('join_room', {
            roomName: _roomName.val(),
            nickName: _nickName.val()
        });
    });

    _socket.on('ready', function() {
        _joinButton.attr('disabled', false);
        _nickName.attr('disabled', false);
    });

    _socket.on('joined', function() {
        _joinButton.attr('disabled', true);
        _nickName.attr('disabled', true);
        _socket.emit('get_online_users');
    });

    _socket.on('online', function() {
        _socket.emit('get_online_users')
    });

    _socket.on('online_users', function(data) {
        updateOnlineUserList(data.users);
    });

    _socket.on('offline', function() {
        _socket.emit('get_online_users')
    });

    function updateOnlineUserList(users) {
        _onlineUserContainer.empty();
        for (var i = 0; i < users.length; i++) {
            if(users[i] === _nickName.val()){
                continue;
            }
            var strLi = "<li><div><a id= 'call' class = 'btn btn-small' href='javascript:;'>" + users[i] + "<i class='icon-facetime-video'></i></a></div></li>";
            _onlineUserContainer.append(strLi);
        }
        var _callButton = $("#call");
        _callButton.click(function(){
            $.publish('call_clicked');
        })
    }
})