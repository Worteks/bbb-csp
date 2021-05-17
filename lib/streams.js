'use strict';

const config = require('../config.js');

let ctnr = false;
if ([ 'kubernetes', 'k8s', 'openshift', 'okd', 'ocp' ].indexOf(config.containerDriver) >= 0) {
    ctnr = require('./k8s.js');
} else { ctnr = require('./docker.js'); }

module.exports = {
	getStreams: (withFilter) => {
		return new Promise ((resolve, reject) => {
			let found = [];
			if (withFilter === undefined) { withFilter = "livestream"; }
			ctnr.list()
			    .then((containerList) => {
				    for (let i = 0; i < containerList.length; i++) {
					if (containerList[i].name.indexOf(withFilter) < 0) {
					    if (containerList[i].id.indexOf(withFilter) < 0) {
						if (containerList[i].state.indexOf(withFilter) < 0) {
						    continue;
						}
					    }
					}
					found.push(containerList[i]);
				    }
				    console.log(`streams-list returning ${found.length} containers`);
				    resolve(found);
				})
			    .catch((e) => {
				    console.log('caught error rendering containers list');
				    console.log(e);
				    resolve([]);
				});
		    });
	    },

	startStream: (params) => {
		return new Promise ((resolve, reject) => {
			ctnr.create(params)
			    .then(() => {
				    console.log(`successfully started stream ${params.bbbMeetingId} to ${params.rtmpStreamKey}`);
				    resolve();
				})
			    .catch((e) => {
				    console.log('caught error starting stream');
				    console.log(e);
				    console.log('had parms');
				    console.log(params);
				    reject();
				});
			});
	    },

	stopStream: (containerId) => {
		return new Promise ((resolve, reject) => {
			ctnr.remove(containerId)
			    .then(() => {
				    console.log(`successfully stopped stream ${containerId}`);
				    resolve(true);
				})
			    .catch((e) => {
				    console.log('caught error stopping stream');
				    console.log(e);
				    console.log('containerId');
				    console.log(containerId);
				    reject(true);
				});
			});
	    }
    };
