var socket_io = require('socket.io');

module.exports.startServer = function(httpServer){
	var socketIO = sockcet_io.listen(httpServer);

	socketIO.on('connection', function(socket){
		socket.emit("ready");

		socket.on('join_room', function(data) {
			socket.room = data.roomName;
			socket.join(data.roomName);
			socket.emit('joined');
		});

		socket.on('leave_room', function(data){
			socket.leave(socket.room);
		});

		socket.on('disconnect', function(){
			socket.leave(socket.room);
		});

		socket.on('message', function(msg){
			socket.broadcast.to(socket.room).emit('message', msg);
		});
	});

}