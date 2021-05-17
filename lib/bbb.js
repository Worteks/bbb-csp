'use strict';

// see:
// https://docs.bigbluebutton.org/dev/api.html#api-calls

const config = require('../config.js');

let globalopts = {};
if (config.bbbCaFile !== undefined
	&& config.bbbCaFile !== false) {
    const fs = require('fs');
    globalopts = { ca : fs.readFileSync(config.bbbCaFile) };
} else if (config.bbbVerifyTls !== undefined
	&& config.bbbVerifyTls === false) {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

const { execSync } = require('child_process');
const http = require('http');
const https = require('https');
const parseString = require('xml2js').parseString;

const getShaSum = (cmd, call, secret) => {
	let data = execSync(
		`echo -n "${cmd}${call}${secret}" | shasum | awk '{print $1}'`,
		{ encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
	return data.toString().replace(/\n/g, '');
    };

let bbbApiArray = config.bbbApiUrl.split('/').filter((el) => { return el.length > 0; });
const bbbHostname = bbbApiArray[1];
const bbbMethod = require(bbbApiArray[0].indexOf('https:') === 0 ? 'https' : 'http');

bbbApiArray.shift();
bbbApiArray.shift();
const bbbApiRoot = bbbApiArray.join('/');

const bbbCommand = (cmd, call) => {
	return new Promise((resolve, reject) => {
		let sum = getShaSum(cmd, call, config.bbbApiSecret);
		let opts = {
			hostname: bbbHostname,
			method: 'GET',
			path: `/${bbbApiRoot}/${cmd}?${call}&checksum=${sum}`
		    };
		try {
		    bbbMethod.request(Object.assign({}, opts, globalopts), (res) => {
					  let data = '';
					  res.on('data', (d) => { data += d; });
					  res.on('end', () => resolve(data));
				      }).end();
		} catch(e) {
		    console.log(`failed querying bbb (command=${cmd} args=${call})`);
		    console.log(e);
		    reject(false);
		}
	    });
    };

module.exports = {
	createRoom: (rootName, meetingId) => {
		let call = `name=${roomName}&meetingID=${meetingId}&isBreakout=false`,
		    cmd = 'create';
		return bbbCommand(cmd, call);
	    },
	getRooms: () => {
	    return new Promise((resolve, reject) => {
		    let call = '',
			cmd = 'getMeetings';
		    bbbCommand(cmd, call)
			.then((d) => {
				parseString(d, (e, r) => {
					if (r !== undefined && r.response !== undefined
						&& r.response.meetings !== undefined
						&& r.response.meetings[0] !== undefined
						&& r.response.meetings[0].meeting !== undefined) {
					    resolve(r.response.meetings[0].meeting);
					} else if (r !== undefined && r.response !== undefined
						&& r.response.messageKey !== undefined
						&& r.response.messageKey[0] !== undefined
						&& r.response.messageKey[0].indexOf('noMeetings') === 0) {
					    console.log('no meetings currently running on bbb');
					    resolve([]);
					} else {
					    console.log('got unexpected response from bbb');
					    console.log(d);
					    console.log('xml parser error');
					    console.log(e);
					    console.log('xml parser output');
					    console.log(r);
					    resolve([]);
					}
				    });
			    })
			.catch((e) => {
				console.log('caught error listing meetings');
				console.log(e);
				resolve([]);
			    });
		});
	    },
	getRoom: (meetingId) => {
		let call = `meetingID=${meetingId}`,
		    cmd = 'getMeetingInfo';
		return bbbCommand(cmd, call);
	    }
    };
