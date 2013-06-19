# AjaxHook
* Author: swe
* Version: 0.1.0.0
* Language: JavaScript

## Short Description:
Hook all functions of the native XMLHttpRequest.


##Example:

    /**
     *	Bind Ajax event
     */
    var counter = 0,
    	aborts = 0;
    
    bindAjaxSuccess(function(){
    	console.log('Request done: '+(++counter));
    });
    
    bindAjaxOnabort(function(){
    	console.log('Request aborted: '+(++aborts));
    });
    
    bindAjaxOpen(function(){
    	console.log('Open');
    });
    
    bindAjaxSend(function(){
    	console.log('Sending');
    });
