var socket_io = require('socket.io');
var util = require('util');

module.exports.startServer = function(httpServer) {
	var socketIO = socket_io.listen(httpServer);
	socketIO.set('transports', ['xhr-polling']);
	socketIO.set('polling duration', 10);
	
	var allOnlineUsers = {};

	socketIO.on('connection', function(socket) {
		socket.on('msg_join_room', function(data) {
			//TODO: check relogin for same user:
			var roomName = data.roomName;
			if(!roomName) roomName = "demoRoom";
			socket.room = roomName;
			socket.nickName = data.nickName;
			socket.supportVideo = data.supportVideo;
			socket.join(roomName);
			storeOnlineUser(socket);
			socket.emit('msg_joined');
			socket.broadcast.to(socket.room).emit('msg_user_online', {name: data.nickName, video: data.supportVideo});
		});

		socket.on('disconnect', function() {
			var joinedSocket = getSocket(socket.room, socket.nickName);
			if(joinedSocket){
				socket.broadcast.to(socket.room).emit('msg_user_offline', socket.nickName);
				removeOnlineUser(socket.room, socket.nickName);
			}
		})

		socket.on('msg_get_online_users', function() {
			var onlineUsers = getOnlineUserByRoom(socket.room);
			socket.emit('msg_get_online_users', {
				users: onlineUsers
			});
		});

		socket.on('msg_chat', function(chatMsg){
			socket.broadcast.to(socket.room).emit('msg_chat', chatMsg);
		})

		//video call only support p2p
		socket.on('msg_start_call', function(data) {
			var remoteSocket = getSocket(socket.room, data.to);
			if(remoteSocket){
				remoteSocket.emit('msg_start_call', data)
			}
		});

		socket.on('msg_call_answer', function(data) {
			var remoteSocket = getSocket(socket.room, data.to);
			if(remoteSocket){
				remoteSocket.emit('msg_call_answer', data);
			}
		});

		socket.on('msg_answer_ack', function(data) {
			var remoteSocket = getSocket(socket.room, data.to);
			if(remoteSocket){
				remoteSocket.emit('msg_answer_ack', data)
			}
		});

		socket.on('msg_signal_msg', function(data) {
			var remoteSocket = getSocket(socket.room, data.to);
			if(remoteSocket){
				remoteSocket.emit('msg_signal_msg', data);
			}
		});
	});

	function getSocket(roomName, nickName) {
		if(allOnlineUsers[roomName])
			return allOnlineUsers[roomName][nickName];
		else return null;
	}

	function getOnlineUserByRoom(roomName) {
		var users=[]
		if(allOnlineUsers[roomName]){
			for(var nick in allOnlineUsers[roomName]){
				users.push({name: nick,
					video: allOnlineUsers[roomName][nick].supportVideo});
			}
		}
		return users;
	}

	function storeOnlineUser(socket) {
		if(!allOnlineUsers[socket.room]) allOnlineUsers[socket.room] = {};
        allOnlineUsers[socket.room][socket.nickName] = socket;
	}

	function removeOnlineUser(roomName, nickName) {
		delete allOnlineUsers[roomName][nickName];
	}
}