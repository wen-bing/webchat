/*
 * GET home page.
 */

exports.index = function(req, res) {
	res.render('index');
};

exports.demo = function(req, res) {
	var nickName = req.query.nickname;
	console.log(nickName);
	res.render('demo', {
		nickName: nickName,
		socketServer: "http://192.168.1.111:5000"
	});
}