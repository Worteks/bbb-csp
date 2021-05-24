var API_URL = API_PROTO + '://' + API_HOST + ':' + API_PORT;

var getJSON = function(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'json';
	xhr.onload = function() {
		var status = xhr.status;
		if (status == 200) {
		    callback(null, xhr.response);
		} else { callback(status); }
	    };
	xhr.send();
    };

var postJSON = function(url, params, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open('POST', url, true);
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhr.responseType = 'json';
	xhr.onreadystatechange = function() {
		if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
		    callback(null, xhr.response);
		} else { callback(status); }
	    };
	if (params.length > 0) {
	    xhr.send(params);
	} else { xhr.send(); }
    };

function renderStopButton(id) {
    return '<input type="button" '
		+ 'value="Stop Streaming" '
		+ `onClick="stopStream('${id}');">`;
}

function listChannels() {
    var reloadbtn = document.getElementById('channel-reload');
    reloadbtn.innerHTML = '<img src="./img/loading.gif" width="32px" height="32px">';
    getJSON(API_URL + '/channels', function(err, data) {
	    if (err != null) {
		console.error(err);
	    } else {
		var content = document.getElementById('peertube-channel');
		for (var k = content.length - 1; k >= 0; k--) {
		    content.remove(k);
		}
		if (data.length > 0) {
		    for (var i = 0; i < data.length; i++) {
			var opt = document.createElement('option');
			opt.text = data[i].name;
			opt.value = data[i].id;
			content.add(opt);
		    }
		} else {
		    var opt = document.createElement('option');
		    opt.text = 'NO CHANNELS - something wrong with PeerTube?';
		    opt.value = '';
		    content.add(opt);
		}
		reloadbtn.innerHTML = '<img src="./img/reload.png" width="32px"'
		    + ' height="32px" onClick="listChannels();">';
	    }
	});
}

function listConferences() {
    var reloadbtn = document.getElementById('meeting-reload');
    reloadbtn.innerHTML = '<img src="./img/loading.gif" width="32px" height="32px">';
    getJSON(API_URL + '/confs', function(err, data) {
	    if (err != null) {
		console.error(err);
	    } else {
		var content = document.getElementById('bbb-meeting-id');
		for (var k = content.length - 1; k >= 0; k--) {
		    content.remove(k);
		}
		if (data.length > 0) {
		    for (var i = 0; i < data.length; i++) {
			var opt = document.createElement('option');
			opt.text = data[i].name;
			opt.value = data[i].meetingid;
			content.add(opt);
		    }
		} else {
		    var opt = document.createElement('option');
		    opt.text = 'NO CONFERENCES - reload page to refresh list';
		    opt.value = '';
		    content.add(opt);
		}
		reloadbtn.innerHTML = '<img src="./img/reload.png" width="32px"'
		    + ' height="32px" onClick="listConferences();">';
	    }
	});
}

function listStreams() {
    getJSON(API_URL + '/list', function(err, data) {
	    if (err != null) {
		console.error(err);
	    } else {
		var content = document.getElementById('main-content');
		var html = '<table><tr><th>Container Name</th><th>State</th>'
			 + '<th>Status</th><th>Action</th></tr>';
		if (data.length > 0) {
		    for (var i = 0; i < data.length; i++) {
			html += '<tr><td>' + data[i].name + '</td><td>'
			     + data[i].state + '</td><td>' + data[i].status
			     + '</td><td align="center" id="stop-' + data[i].id + '">'
			     + renderStopButton(data[i].id) + '</td></tr>';
		    }
		} else {
		    html += '<tr><td colspan="4"><i>No Stream found, you may'
			 + ' create one or <a href="#" onClick="listStreams();">'
			 + ' reload</a></td></tr>';
		}
		html += '</table>';
		content.innerHTML = html;
	    }
	});
}

function stopStream(containerId) {
    if (containerId === 'container ID not found') {
	alert('container ID not found!');
    } else if (containerId !== '') {
	containerId = containerId.replace(/\s/g, '');
	var stopbtncell = document.getElementById(`stop-${containerId}`);
	if (stopbtncell) {
	    stopbtncell.innerHTML = '<img src="./img/loading.gif" width="32px" height="32px">';
	} else {
	    console.log(`could not find stop button for ${containerId}`);
	}
	postJSON(API_URL + '/stop/' + containerId.replace(/\s/g, ''), '',
		 function(err, data) {
		     if (err != null) {
			 console.log(err);
			 //alert('failed stopping container');
			 //warning: seems to fail once, then succeeds ...?!
		     } else { window.location.reload(); }
	    });
    } else { alert('invalid container ID!'); }
}

function createAndStartStream() {
    var bbbMeetingId = document.getElementById('bbb-meeting-id').value;
    var fbcontent = document.getElementById('feedback');
    var languageCode = document.getElementById('language-code').value;
    var licenseCode = document.getElementById('license-code').value;
    var ptChannelId = document.getElementById('peertube-channel').value;
    var streamName = document.getElementById('stream-name').value;
    var streamDescr = document.getElementById('stream-description').value;
    if (ptChannelId !== '' && bbbMeetingId !== '') {
	fbcontent.innerHTML = 'Preparing to stream meeting... please wait';
	postJSON(API_URL + '/start',
		 'ptChannelId='+ptChannelId+'&bbbMeetingId='+bbbMeetingId
	         +'&languageCode='+languageCode+'&licenseCode='+licenseCode
		 +'&streamName='+streamName+'&streamDescr='+streamDescr,
		 function(err, data) {
		     if (err != null) {
			 console.error(err);
			 fbcontent.innerHTML = 'Failed starting stream. Though luck ...';
		     } else {
			 var content = document.getElementById('main-content');
			 fbcontent.innerHTML = '';
			 content.innerHTML = 'Successfully started streaming<br/>'
			     + 'Make sure stream is publicly available on your RTMP server.';
			 // and maybe redirect back to index ...
		     }
	    });
    } else {
	var fbcontent = document.getElementById('feedback');
	fbcontent.innerHTML = 'RTMP Streaming Key and BigBlueButton Meeting ID required';
    }
}

function initStartForm() {
    listConferences();
    listChannels();
}
