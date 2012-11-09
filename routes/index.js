/*
 * GET home page.
 */
var config = require('../config');

exports.index = function(req, res) {
	res.render('index');
};

exports.demo = function(req, res) {
	var nickName = req.query.nickname;
	console.log(nickName);
	res.render('demo', {
		nickName: nickName,
		socketServer: config.socket_server
	});
}

exports.help = function(req, res){
	res.render('help');
}

exports.about = function(req, res){
	res.render('about');
}