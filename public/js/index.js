$(function(){
    var _nickNameWarning = $("#nickNameWarning");
    var _startDemo = $("#startDemo");
    var _nickName = $("#nickName");

    _startDemo.click(function(){
    	if(_nickName.val().trim() == "") {
            _nickNameWarning.html("please input a nick name");
            _nickNameWarning.show();
            _nickNameWarning.focus();
            return;
        }else{
        	window.location="/demo?nickname="+_nickName.val().trim();
        }
    });
})