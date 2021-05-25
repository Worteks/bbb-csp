'use strict';

// see:
// https://docs.joinpeertube.org/api-rest-reference.html#operation/createLive

const config = require('../config.js');
const request = require('request');

let globalopts = {};
if (config.peertubeCaFile !== undefined
	&& config.peertubeCaFile !== false) {
    const fs = require('fs');
    globalopts = { ca : fs.readFileSync(config.peertubeCaFile) };
} else if (config.peertubeVerifyTls !== undefined
	&& config.peertubeVerifyTls === false) {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

const getOauthData = () => {
	return new Promise((resolve, reject) => {
		let opts = { url: `${config.peertubeApiUrl}/api/v1/oauth-clients/local` };
		request.get(Object.assign({}, opts, globalopts), (e, resp, body) => {
			if (e) {
			    console.log('failed getting oauth2 client data');
			    console.log(e);
			    reject(false);
			} else {
			    console.log(`got response from peertube oauth2 (code: ${resp.statusCode})`);
			    let clientId = false,
				clientSecret = false;
			    try {
				let b = JSON.parse(body);
				clientId = b.client_id;
				clientSecret = b.client_secret;
			    } catch(ne) {
				clientId = body.client_id;
				clientSecret = body.client_secret;
			    }
			    resolve({ clientId, clientSecret });
			}
		    });
	    });
    };

module.exports = {
	doLogin: () => {
		return new Promise((resolve, reject) => {
			getOauthData()
			    .then((r) => {
				    let opts = {
					    form: {
						    client_id: r.clientId,
						    client_secret: r.clientSecret,
						    grant_type: 'password',
						    response_type: 'code',
						    password: config.peertubePassword,
						    username: config.peertubeUsername
						},
					    url: `${config.peertubeApiUrl}/api/v1/users/token`
					};
				    request.post(Object.assign({}, opts, globalopts), (e, resp, body) => {
					    if (e) {
						console.log(`failed logging in as ${config.peertubeUsername}`);
						reject(false);
					    } else {
						console.log(`got response from peertube login (code: ${resp.statusCode})`);
						let token = false;
						try {
						    let b = JSON.parse(body);
						    token = b.access_token;
						} catch(ne) { token = body.access_token; }
						resolve(token);
					    }
					});
				})
			.catch((e) => {
				console.log('caught error logging into peertube');
				console.log(e);
				reject(false);
			    });
		    });
	    },
	createLive: (peertubeBearerToken, params) => {
		return new Promise((resolve, reject) => {
			let opts = {
				auth: { bearer: peertubeBearerToken },
				json: {
					channelId: parseInt(params.channelId || 1),
					name: params.streamName || 'todays stream',
					commentsEnabled: true,
					downloadEnabled: true,
					language: params.languageCode || 'en',
					license: params.licenseCode || 7,
					//nsfw: false,
					//permanentLive: false,
					privacy: 1,
					saveReplay: true
				    },
				url: `${config.peertubeApiUrl}/api/v1/videos/live`
			    };
			if (params.category !== undefined) { opts.json.category = params.category; }
			opts.json.description = params.description || opts.json.name;
			request.post(Object.assign({}, opts, globalopts), (e, resp, body) => {
				if (e) {
				    console.log('failed creating live from input');
				    console.log(opts.json);
				    reject(false);
			        } else {
				    console.log(`live creation request sent (code: ${resp.statusCode})`);
				    console.log(body);
				    let videoId = false,
					videoUuid = false;
				    try {
					let b = JSON.parse(body);
					videoId = b.video.id;
					videoUuid = b.video.uuid;
				    } catch(ne) {
					videoId = body.video.id;
					videoUuid = body.video.uuid;
				    }
				    resolve({ videoId, videoUuid });
				}
			    });
		    });
	    },
	getStreamKey: (peertubeBearerToken, videoId) => {
		return new Promise((resolve, reject) => {
			let opts = {
				auth: { bearer: peertubeBearerToken },
				url: `${config.peertubeApiUrl}/api/v1/videos/live/${videoId}`
			    };
			request.get(Object.assign({}, opts, globalopts), (e, resp, body) => {
				if (e) {
				    console.log('failed resolving video from input');
				    console.log(videoId);
				    reject(false);
			        } else {
				    console.log(`got streamkey back from peertube (code: ${resp.statusCode})`)
				    let rtmpUrl = false,
					streamKey = false;
				    try {
					let b = JSON.parse(body);
					rtmpUrl = b.rtmpUrl;
					streamKey = b.streamKey;
					resolve({ rtmpUrl, streamKey });
				    } catch(ne) {
					console.log('failed parsing response from peertube');
					console.log(ne);
					reject();
				    }
				}
			    });
		    });
	    },
	getChannels: (peertubeBearerToken) => {
		return new Promise((resolve, reject) => {
			let opts = {
				auth: { bearer: peertubeBearerToken },
				url: `${config.peertubeApiUrl}/api/v1/accounts/${config.peertubeUsername}/video-channels`
			    };
			request.get(Object.assign({}, opts, globalopts), (e, resp, body) => {
				if (e) {
				    console.log('failed listing channels');
				    reject(false);
			        } else {
				    console.log(`got channels back from peertube (code: ${resp.statusCode})`)
				    try {
					let b = JSON.parse(body);
					resolve(b.data);
				    } catch(ne) {
					console.log('failed parsing response from peertube');
					console.log(ne);
					resolve(body.data || []);
				    }
				}
			    });
		    });
	    },
	publishLive: (peertubeBearerToken, videoId) => {
		return new Promise((resolve, reject) => {
			let opts = {
				auth: { bearer: peertubeBearerToken },
				json: { saveReplay: true },
				url: `${config.peertubeApiUrl}/api/v1/videos/live/${videoId}`
			    };
			request.put(opts, (e, resp, body) => {
				if (e) {
				    console.log('failed setting live as public');
				    console.log(opts.json);
				    reject(false);
			        } else {
				    console.log(`live publication request sent (code: ${resp.statusCode}) - 204 code should be OK`);
				    console.log(body || 'no body returned / OK');
				    resolve(true);
				}
			    });
		    });
	    }
    };
