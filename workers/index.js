'use strict';

const airbrake = require('../lib/airbrake.js');
const bbb = require('../lib/bbb.js');
const bodyParser = require('body-parser');
const config = require('../config.js');
const helpers = require('../lib/helpers.js');
const streams = require('../lib/streams.js');
const pt = require('../lib/pt.js');

require('log-prefix')(helpers.logpfx);
const express = require('express');
const promMid = require('express-prometheus-middleware');
const app = express();

app.use(promMid({
	collectDefaultMetrics: true,
	metricsPath: '/metrics',
	requestDurationBuckets: [0.1, 0.5, 1, 1.5]
    }));

app.use((req, res, next) => {
	res.append('Access-Control-Allow-Origin', '*');
	res.append('Access-Control-Allow-Headers', '*');
	res.append('Access-Control-Allow-Methods', 'GET,POST');
	next();
    });
app.use(bodyParser.text({ type: 'text/html' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

if (process.env.SERVE_STATIC_ASSETS !== undefined) {
    const assets = [
	    'css/dostream.css',
	    'img/loading.gif',
	    'img/reload.png',
	    'index.html',
	    'js/dostream.js',
	    'new.html'
	];
    const fs = require('fs');
    try {
	for (let i = 0; i < assets.length; i++) {
	    let buf = fs.readFileSync(`./static/${assets[i]}`);
	    app.get(`/${assets[i]}`, (req, res) => res.send(buf));
	}
	app.get('/', (req, res) => res.redirect('/index.html'));
    } catch(e) {
	console.log('FATAL: failed initializing static assets');
	console.log(e);
	process.exit(1);
    }
    console.log('NOTICE: NodeJS would serve static assets');
} else {
    app.get('/', (req, res) => res.send('pong'));
}

app.get('/channels', (req, res) => {
	let clt = helpers.getClientAddress(req);
	let token = false;
	console.log(`${clt} received list channels request`);
	pt.doLogin()
	    .then((gotToken) => {
		    token = gotToken;
		    console.log(`${clt} successfully logged in with peertube`);
		    return pt.getChannels(token);
		})
	    .then((r) => {
		    let names = [];
		    for (let i = 0; i < r.length; i++) {
			if (r[i].displayName !== undefined && r[i].id !== undefined) {
			    names.push({ name: r[i].displayName, id: r[i].id });
			} else if (r[i].name !== undefined && r[i].id !== undefined) {
			    names.push({ name: r[i].name, id: r[i].id });
			} else {
			    console.log('skipping malformatted channel');
			    console.log(r[i]);
			}
		    }
		    console.log(`${clt} gets reply with ${names.length} channels`);
		    res.send(names);
		})
	    .catch((e) => {
		    console.log(`${clt} caught error listing channels`);
		    console.log(e);
		    res.status(500);
		    res.send('KO');
		});
    });

app.get('/confs', (req, res) => {
	let clt = helpers.getClientAddress(req);
	console.log(`${clt} received list conferences request`);
        bbb.getRooms()
	    .then((r) => {
		    console.log(`${clt} list conferences returns OK`);
		    let names = []
		    for (let i = 0; i < r.length; i++) {
			if (r[i].meetingName !== undefined
				&& r[i].meetingName[0] !== undefined
				&& r[i].meetingID !== undefined
				&& r[i].meetingID[0] !== undefined) {
			    names.push({
				    meetingid: r[i].meetingID[0],
				    name: r[i].meetingName[0],
				});
			} else {
			    console.log(`${clt} ignoring nameless meeting`);
			    console.log(r[i]);
			}
		    }
		    console.log(`${clt} gets reply with ${names.length} conferences`);
		    res.send(names);
		})
	    .catch((e) => {
		    console.log(`${clt} caught error listing conferences`);
		    console.log(e);
		    res.status(500);
		    res.send('could not list conferences');
		});
    });

app.get('/list', (req, res) => {
	let clt = helpers.getClientAddress(req);
	console.log(`${clt} received list containers request`);
        streams.getStreams()
	    .then((s) => {
		    console.log(`${clt} list containers OK`);
		    res.send(s);
		})
	    .catch((e) => {
		    console.log(`${clt} caught error listing containers`);
		    console.log(e);
		    res.status(500);
		    res.send('could not list containers');
		});
    });

app.post('/start', (req, res) => {
	let clt = helpers.getClientAddress(req);
	let params = helpers.getParams(req);
	if (params.ptChannelId !== undefined) {
	    if (params.bbbMeetingId !== undefined) {
		console.log(`${clt} received start request`);
		let attendeePassword = false,
		    token = false,
		    videoId = false;
		streams.getStreams(`/livestream-${req.params.bbbMeetingId}`)
		    .then((found) => {
			    if (found.length > 0) {
				console.log(`${clt} trying to re-stream a meeting we already have`);
				throw new Error('stream already exists');
			    } else {
				console.log(`${clt} starting stream for ${req.params.bbbMeetingId}`);
				return pt.doLogin();
			    }
			})
		    .then((gotToken) => {
			    token = gotToken;
			    console.log(`${clt} successfully logged in with peertube`);
			    let liveParams = {
				    channelId: params.ptChannelId,
				    description: params.streamDescr || 'BigBlueButton Conference',
				    languageCode: params.languageCode || 'en',
				    licenseCode: params.licenseCode || '7',
				    streamName: params.streamName || 'my-awesome-stream'
				};
			    return pt.createLive(token, liveParams);
			})
		    .then((l) => {
			    videoId = l.videoId;
			    console.log(`${clt} created live in peertube (video id: ${videoId})`);
			    return pt.getStreamKey(token, videoId);
			})
		    .then((k) => {
			    console.log(`${clt} got stream key back from peertube (stream key: ${k.streamKey})`);
			    if (k.rtmpUrl !== undefined && k.streamKey !== undefined) {
				params.rtmpStreamKey = k.streamKey;
				params.rtmpServerUrlPrefix = k.rtmpUrl;
				return bbb.getRooms()
			    } else {
				throw new Error('failed creating stream in PeerTube');
			    }
			})
		    .then((r) => {
			    let found = false;
			    for (let i = 0; i < r.length; i++) {
				if (r[i].meetingID !== undefined
					&& r[i].meetingID[0] !== undefined
					&& r[i].meetingID[0].indexOf(params.bbbMeetingId) === 0) {
				    if (r[i].attendeePW !== undefined
					    && r[i].attendeePW[0] !== undefined
					    && r[i].attendeePW[0].length > 0) {
					params.attendeePassword = r[i].attendeePW[0];
					console.log(`${clt} got attendee password from bbb API`);
				    } else {
					console.log(`${clt} found conference, does not require authentication`);
				    }
				    found = true;
				    break;
				}
			    }
			    if (found) {
				return streams.startStream(params)
			    } else {
				console.log(`${clt} could not find meeting ${params.bbbMeetingId} querying BigBlueButton API`);
				throw new Error('conference does not exist');
			    }
			})
		    .then(() => {
			/*
			 *
			 * pending further investigations
			 * see: https://github.com/Chocobozzz/PeerTube/issues/4115
			 *
			    console.log(`${clt} stream-start returned OK`);
			    if (videoId !== false) {
				return pt.publishLive(token, videoId);
			    } else { console.log('warning: videoId missing'); }
			})
		    .then(() => {
			    if (videoId !== false) { console.log('saveReplay PUT OK'); }
			 *
			 * pending further investigations
			 * see: https://github.com/Chocobozzz/PeerTube/issues/4115
			 *
			 */
			    res.send('OK');
			})
		    .catch((e) => {
			    console.log(`${clt} stream-start failed`);
			    console.log(e);
			    res.status(500);
			    res.send('KO');
			});
	    } else {
		console.log(`${clt} missing BigBlueButton meeting ID`);
		res.status(403);
		res.send('missing BigBlueButton meeting ID');
	    }
	} else {
	    console.log(`${clt} missing PeerTube Channel ID`);
	    res.status(403);
	    res.send('missing PeerTube Channel ID');
	}
    });

app.post('/stop/:containerId', (req, res) => {
	let clt = helpers.getClientAddress(req);
	if (req.params.containerId !== undefined
		&& req.params.containerId.length > 0) {
	    console.log(`${clt} requested stop for ${req.params.containerId}`);
	    streams.getStreams(req.params.containerId)
		.then((found) => {
			if (found.length > 0) {
			    return streams.stopStream(req.params.containerId);
			} else {
			    //console.log('no container found');
			    throw new Error('no containers matching input');
			}
		    })
		.then((stopped) => {
			console.log(`${clt} successfully stopped ${req.params.containerId}`);
			res.send('OK');
		    })
		.catch((e) => {
			console.log(`${clt} - caught error stopping container`);
			console.log(e);
			res.send('errord');
		    })
	} else {
	    console.log(`${clt} - invalid input stopping container`);
	    res.status(403);
	    res.send('invalid input stopping container');
	}
    });

airbrake()
    .then(() => {
	    app.listen(config.listenPort, config.listenAddr, () => {
		    console.log('CSP listening at '
			+ `http://${config.listenAddr}:${config.listenPort}`);
		})
	});
