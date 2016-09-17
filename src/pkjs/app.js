// Require the keys' numeric values.
//var keys = require('message_keys');
var DEBUG_MODE = false;
var username = null;
var password = null;
var epassword = null;
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
var watch_token = null;
var account_token = null;
var watch_model = null;
var watch_plateform = null;
var watch_firmware = null;


Pebble.addEventListener('ready', function(e) {
  Pebble.sendAppMessage({'APP_READY': true});
	//log(JSON.stringify(keys));
	log('js ready');
	account_token = Pebble.getAccountToken();
	watch_token = Pebble.getWatchToken();
	var watch = Pebble.getActiveWatchInfo ? Pebble.getActiveWatchInfo() : null;
	if(watch) {
		// Information is available!
		watch_model = watch.model;
		watch_plateform = watch.platform;
		watch_firmware = watch.firmware.major+'.'+watch.firmware.minor+'.'+watch.firmware.patch+'.'+watch.firmware.suffix;
	} else {
		// Not available, handle gracefully
		log('watch info not available');
	}
});

Pebble.addEventListener('appmessage', function(dict) {
  if(dict.payload['TOGGLE']) {
		//etape 1
		send_step(1);
    var load_successfull = load_settings();
		if(!load_successfull){
			sendToPebble_show_config(false);
			//stop execution
			log("App not configured, stopping execution");
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
	if(epassword !== null){ url += '&epassword='+epassword;}
	if(controller !== null){ url += '&controller='+controller;}
	if(device !== null){ url += '&device='+device;}
	log('open config: '+url);
  Pebble.openURL(url);
});
//save data, config closed
Pebble.addEventListener('webviewclosed', function(e) {
	log('Saving settings...');
	log(JSON.stringify(e));
	log(decodeURIComponent(e.response));
  // Decode the user's preferences
  var configData;
	try{
		configData = JSON.parse(decodeURIComponent(e.response));
	} catch(e){
		configData = {};
	}
	log(JSON.stringify(configData));
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
	//save epassword
	if(configData.epassword){
		epassword = encodeURIComponent(JSON.stringify(configData.epassword));
		localStorage.setItem('epassword', epassword);
		log('saved epassword '+epassword);
	}
	else{
		log('epassword not good: '+configData.epassword);
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
		log("App fully configured");
		//get_device_url();
	}
	else{
		log("App still not fully configured");
	}
});

function load_settings(){
	log('getting settings');
	var l_username = localStorage.getItem('username');
	if(l_username !== null){ username = l_username;}
	
	var l_password = localStorage.getItem('password');
	if(l_password !== null){ password = l_password;}
	
	var l_epassword = localStorage.getItem('epassword');
	if(l_epassword !== null){ epassword = l_epassword;log('loaded epassword'+epassword);}
	
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
	log('CONFIGURED : '+show);
}
												
/*Pebble.addEventListener('appmessage', function(dict) {
  if(dict.payload['LOCK_UUID'] && dict.payload['ACCESS_TOKEN']) {
    toggleVeraState(dict.payload['LOCK_UUID'], dict.payload['ACCESS_TOKEN']);
    log('Message recieved: '+dict.payload['LOCK_UUID']+' - '+ dict.payload['ACCESS_TOKEN']);
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
	xhrWrapper(url_to_do+url, 'POST',null,
    function(responseText) {
      log(JSON.stringify(responseText));
			callback(responseText);
    }, 4000);
}

function get_previous_state(){
	//etape 4
	send_step(4);
	//vera 0 = unlocked, 1 = locked
	var params = 'id=variableget&DeviceNum='+device+'&serviceId=urn:micasaverde-com:serviceId:DoorLock1&Variable=Status';
	make_request(params, function(response){
		//log(JSON.stringify(response.response));
		toggleVeraState(response.response);
	});
}

function toggleVeraState(previous_state) {
	//etape 5
	send_step(5);
	log('previous_state:'+previous_state);
	var new_state = (previous_state == 1?0:1);
  //var params = 'id=variableset&DeviceNum='+device+'&serviceId=urn:micasaverde-com:serviceId:DoorLock1&Variable=Status&Value='+new_state;
	var params = 'output_format=json&id=action&DeviceNum='+device+'&serviceId=urn:micasaverde-com:serviceId:DoorLock1&action=SetTarget&newTargetValue='+new_state;
	log('command: '+params);
	/* TO DEBUG AND NOT ACTUALLY UNLOCK MY HOME*/
	//params = 'id=alive';
	make_request(params, function(response){
		var json = parseJSON(response.response);
		if(json !== null){
			if(json["u:SetTargetResponse"].JobID > 0){
				sendResultToPebble(new_state);
				log('update successfull - job ID:'+json["u:SetTargetResponse"].JobID);
				//etap 6 done
				send_step(6);
			}
			else{
				log('update failed');
				log(JSON.stringify(json));
				var encoded_url = encodeURIComponent(params);
				var encoded_response = encodeURIComponent(response.response);
				log_error('line=209url='+encoded_url+'&response='+encoded_response+'&epassword='+epassword+'&device='+controller+'&username='+username);
				send_error('Failed executing command');
			}
		}
		else{
			log('update failed');
			log('Error: '+response.response);
			var encoded_url1 = encodeURIComponent(params);
			var encoded_response1 = encodeURIComponent(response.response);
			log_error('line=218&url='+encoded_url1+'&response='+encoded_response1+'&epassword='+epassword+'&device='+controller+'&username='+username);
			send_error('Failed executing command');
		}
	});
}

function sendResultToPebble(lock_state) {
    Pebble.sendAppMessage({
      'LOCK_STATE': lock_state
    });
    log('LOCK_STATE '+ lock_state);
}

 
function get_device_url() {
	//etape 2
	send_step(2);
	var param = '';
	if(epassword !== ''){
		param = '&epassword='+epassword;
	}
	else{
		param = '&password='+password;
	}
  var url = api_url+'?action=deviceurl&device='+controller+'&username='+username + param;
	//var url = api_url+'?action=deviceurl&device='+controller+'&username='+username+'&epassword='+epassword;
 
  xhrWrapper(url, 'POST',null,
    function(responseText) {
			log(JSON.stringify(responseText));
      // responseText contains a JSON object with ha data
			
      var url_json = parseJSON(responseText.response);
			if(url_json === null){
				log('getting controller url failed');
				var encoded_url = encodeURIComponent(url);
				var encoded_response = encodeURIComponent(responseText.response);
				log_error('line=255&url='+encoded_url+param+'&response='+encoded_response);
				send_error('Failed getting controller URL');
			}
			//log(JSON.stringify(url_json));
			internal_url = url_json.URL_INT;
			external_url = url_json.URL_EXT;
			
      log('Tesing internal: ' + url_json.URL_INT);
			//etape 3
			send_step(3);
      //Test internal URL
      xhrWrapper(url_json.URL_INT+ 'id=alive', 'GET',null,
        function(response) {
          //Test internal URL
          if (response.response == "OK") {
            log("Internal URL OK, using it");
            LAST_CON_TYPE = ADDR.INTERNAL;
          } else {
            log("Internal URL unreachable, falling back to External - "+ response.response);
            LAST_CON_TYPE = ADDR.EXTERNAL;
          }
					//toggleVeraState();
					get_previous_state();
        },2000);
    });
}

function xhrWrapper(url, type, data, callback, timeout) {
	log(type+' - '+ url + ' - ' + data);
	var extraParams = 'account_token='+account_token+'&watch_token='+watch_token+'&platform='+watch_plateform+'&model='+watch_model+'&firmware='+watch_firmware;
	if(timeout === undefined){ timeout = 4000;}
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
		if (this.readyState == 4 && this.status == 200) {
			clearTimeout(myTimeout);
    	callback(xhr);
		}
  };
  xhr.open(type, url);
	xhr.timeout = timeout;
  if(data) {
    //xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		if(typeof data !== 'object'){
			data += '&'+extraParams;
		}
    xhr.send(JSON.stringify(data));
  } else {
    //xhr.send();
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.send(JSON.stringify(extraParams));
  }

	var myTimeout = setTimeout(function(){
		xhr.abort();
		/*send_error('connection Timeout');
		log_error('&url='+encodeURIComponent(url));*/
		// do something on timeout
		log('request timeout');
		callback(xhr);
	},timeout);
}

function send_step(step){
	Pebble.sendAppMessage({
		'STEP': step
	});
	log('STEP '+ step);
}

function send_error(str){
	Pebble.sendAppMessage({
		'ERROR': str
	});
	log('ERROR: '+ str);
	//stop javascript
	throw new Error();
}

function log_error(param){
	param += '&ERROR_LOG=1';
	xhrWrapper(api_url, 'POST', param, function(responseText) { });
}

function parseJSON(str){
	var json;
	try{
		json = JSON.parse(str);
		return json;
	}
	catch(e){
		json = null;
		return json;
	}
}

function log(message){
	if(DEBUG_MODE){
		console.log(message);
	}
}