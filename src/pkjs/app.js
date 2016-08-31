var username = null;
var password = null;
var controller = null;
var device = null;


Pebble.addEventListener('ready', function(e) {
  Pebble.sendAppMessage({'APP_READY': true});
});

Pebble.addEventListener('appmessage', function(dict) {
  if(dict.payload['LOCK_UUID'] && dict.payload['ACCESS_TOKEN']) {
    toggleLockitronState(dict.payload['LOCK_UUID'], dict.payload['ACCESS_TOKEN']);
    console.log('Message recieved: '+dict.payload['LOCK_UUID']+' - '+ dict.payload['ACCESS_TOKEN']);
  }
});

function get_previous_state(){
  
  return false;
}

function toggleLockitronState(lock_uuid, access_token) {
  var previous_state = get_previous_state();
  var url = 'https://api.lockitron.com/v2/locks/' + lock_uuid +
              '?access_token=' + access_token;

  /*xhrWrapper(url, 'post', null, function(req) {
    if(req.status == 200) {
      sendResultToPebble(JSON.parse(req.response));
    }
    console.log(JSON.stringify(req));
  });*/
  var rand = Math.random() >= 0.5;
  var json = {state:true};  
  sendResultToPebble(json);
}

function sendResultToPebble(json) {
  if(json.state) {
    var lockState = json.state == 'lock' ? 1 : 0;
    Pebble.sendAppMessage({
      'LOCK_STATE': lockState
    });
    console.log('LOCK_STATE '+ lockState);
  }
}

function xhrWrapper(url, type, data, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(xhr);
  };
  xhr.open(type, url);
  if(data) {
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  } else {
    xhr.send();
  }
}
