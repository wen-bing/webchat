$(function(){
	var _joinButton = $("#join_button");
	var _roomName = $("roome_name").val();

	var _socket = io.connect('http://localhost');

	_joinButton.click = function(){
		_socket.emit('join_room', _roomName);
	}

	_socket.on('ready', function(){
		// enable joinbutton
		//_joinButton
		//
	});

	_socket.on('joined', function(){
		//disable joinbutton
		$publish('joined_room');
	});

	_socket.on('message', function(msg){
		var str = $("#chat_history").val();
		str = str + "\n" + msg;
		$("#chat_history").val(str);
	});
})