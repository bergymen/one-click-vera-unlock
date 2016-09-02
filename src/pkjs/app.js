// Require the keys' numeric values.
//var keys = require('message_keys');

var username = null;
var password = null;
var controller = null;
var device = null;
var api_url = 'https://api.ism-mtl.com/vera_api/v1/';
var settings_url = api_url+'settings/index.html';
/*enum pour savoir quel était la derniere connection*/
var ADDR = {INTERNAL:1, EXTERNAL:2, UNKNOWN:null};
var LAST_CON_TYPE = ADDR.UNKNOWN;
/**/
var internal_url = null;
var external_url = null;


Pebble.addEventListener('ready', function(e) {
  Pebble.sendAppMessage({'APP_READY': true});
	//console.log(JSON.stringify(keys));
	console.log('js ready');
});

Pebble.addEventListener('appmessage', function(dict) {
  if(dict.payload['TOGGLE']) {
    var load_successfull = load_settings();
		if(!load_successfull){
			sendToPebble_show_config(false);
			//stop execution
			console.log("App not configured, stopping execution");
			return -1;
		}
		//toggleVeraState();
		get_device_url();
  }
});

//open config
Pebble.addEventListener('showConfiguration', function() {
	load_settings();
	var url = settings_url+'?1=1';
	if(username !== null){ url += '&username='+username;}
	if(password !== null){ url += '&password='+password;}
	if(controller !== null){ url += '&controller='+controller;}
	if(device !== null){ url += '&device='+device;}
	console.log('open config: '+url);
  Pebble.openURL(url);
});
//save data, config closed
Pebble.addEventListener('webviewclosed', function(e) {
  // Decode the user's preferences
  var configData;
	try{
		configData = JSON.parse(decodeURIComponent(e.response));
	} catch(e){
		configData = {};
	}
	//save username
	if(configData.username){
		username = configData.username;
		localStorage.setItem('username', username);
	}
	//save password
	if(configData.password){
		password = configData.password;
		localStorage.setItem('password', password);
	}
	//save controller
	if(configData.controller){
		controller = configData.controller;
		localStorage.setItem('controller', controller);
	}
	//save device
	if(configData.device){
		device = configData.device;
		localStorage.setItem('device', device);
	}
	
	//hide config window if everything fine
	var load_successfull = load_settings();
	if(load_successfull){
		sendToPebble_show_config(true);
		console.log("App fully configured");
		//get_device_url();
	}
	else{
		console.log("App still not fully configured");
	}
});

function load_settings(){
	console.log('getting settings');
	var l_username = localStorage.getItem('username');
	if(l_username !== null){ username = l_username;}
	var l_password = localStorage.getItem('password');
	if(l_password !== null){ password = l_password;}
	var l_controler = localStorage.getItem('controller');
	if(l_controler !== null){ controller = l_controler;}
	var l_device = localStorage.getItem('device');
	if(l_device !== null){ device = l_device;}
	return (l_username && l_password && l_controler && l_device);
}

function sendToPebble_show_config(show){
	Pebble.sendAppMessage({
		'CONFIGURED': show
	});
	console.log('CONFIGURED : '+show);
}
												
/*Pebble.addEventListener('appmessage', function(dict) {
  if(dict.payload['LOCK_UUID'] && dict.payload['ACCESS_TOKEN']) {
    toggleVeraState(dict.payload['LOCK_UUID'], dict.payload['ACCESS_TOKEN']);
    console.log('Message recieved: '+dict.payload['LOCK_UUID']+' - '+ dict.payload['ACCESS_TOKEN']);
  }
});*/

function make_request(url, callback){
	//get_device_url();
	var url_to_do;
	if(LAST_CON_TYPE == ADDR.INTERNAL){
		url_to_do = internal_url;
	}
	else{
		url_to_do = external_url;
	}
	xhrWrapper(url_to_do+url, 'post',null,
    function(responseText) {
      console.log(JSON.stringify(responseText));
			callback(responseText);
    }, 2000);
}

function get_previous_state(){
	//vera 0 = unlocked, 1 = locked
	var params = 'id=variableget&DeviceNum='+device+'&serviceId=urn:micasaverde-com:serviceId:DoorLock1&Variable=Status';
	make_request(params, function(response){
		//console.log(JSON.stringify(response.response));
		toggleVeraState(response.response);
	});
}

function toggleVeraState(previous_state) {
	console.log('previous_state:'+previous_state);
	var new_state = (previous_state == 1?0:1);
  //var params = 'id=variableset&DeviceNum='+device+'&serviceId=urn:micasaverde-com:serviceId:DoorLock1&Variable=Status&Value='+new_state;
	var params = 'output_format=json&id=action&DeviceNum='+device+'&serviceId=urn:micasaverde-com:serviceId:DoorLock1&action=SetTarget&newTargetValue='+new_state;
	console.log('command: '+params);
	/* TO DEBUG AND NOT ACTUALLY UNLOCK MY HOME*/
	//params = 'id=alive';
	make_request(params, function(response){
		try{
        var json = JSON.parse(response.response);
				if(json["u:SetTargetResponse"].JobID !== ""){
					sendResultToPebble(new_state);
					console.log('update successfull - job ID:'+json["u:SetTargetResponse"].JobID);
				}
				else{
					console.log('update failed');
				}
    }catch(e){
        console.log('update failed');
    }
		
		
	});
}

function sendResultToPebble(lock_state) {
    Pebble.sendAppMessage({
      'LOCK_STATE': lock_state
    });
    console.log('LOCK_STATE '+ lock_state);
}

 
function get_device_url() {
  var url = api_url+'?action=deviceurl&device='+controller+'&username='+username+'&password='+password;
 
  xhrWrapper(url, 'post',null,
    function(responseText) {
			console.log(JSON.stringify(responseText));
      // responseText contains a JSON object with ha data
      var url_json = JSON.parse(responseText.response);
			//console.log(JSON.stringify(url_json));
			internal_url = url_json.URL_INT;
			external_url = url_json.URL_EXT;
			
      console.log('Tesing internal: ' + url_json.URL_INT);
      //Test internal URL
      xhrWrapper(url_json.URL_INT+ 'id=alive', 'GET',null,
        function(response) {
          //Test internal URL
          if (response.response == "OK") {
            console.log("Internal URL OK, using it");
            LAST_CON_TYPE = ADDR.INTERNAL;
          } else {
            console.log("Internal URL unreachable, falling back to External - "+ response.response);
            LAST_CON_TYPE = ADDR.EXTERNAL;
          }
					//toggleVeraState();
					get_previous_state();
        },2000);
    });
}

function xhrWrapper(url, type, data, callback, timeout) {
	console.log(type+' - '+ url);
	if(timeout === undefined){ timeout = 4000;}
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
		clearTimeout(myTimeout);
    callback(xhr);
  };
  xhr.open(type, url);
	xhr.timeout = timeout;
  if(data) {
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  } else {
    xhr.send();
  }

	var myTimeout = setTimeout(function(){
		xhr.abort();
		// do something on timeout
		console.log('request timeout');
		callback(xhr);
	},timeout);
}
