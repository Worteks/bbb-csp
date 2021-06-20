'use strict';

const Docker = require('dockerode');
const config = require('../config.js');

if (config.dockerVerifyTls !== undefined
	&& config.dockerVerifyTls === false) {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

let dockerOpts;
let addr = process.env.DOCKER_HOST;
if (addr !== undefined && addr !== '' && addr !== false) {
    let host = (addr.split(':')[1] || 'localhost').replace(/\//g, '');
    let port = parseInt((addr.split(':')[2] || '2375').replace(/\//g, ''));
    let proto = addr.split(':')[0];
    if (process.env.DOCKER_TLS_VERIFY !== undefined) {
	proto = 'https';
    } else if (proto === 'tcp') { proto = 'http'; }
    dockerOpts = { host, port, proto };
} else {
    dockerOpts = { socketPath: '/var/run/docker.sock' };
}
const docker = new Docker(dockerOpts);
/*
 * docs says: ...
 * var docker1 = new Docker();
 * var docker2 = new Docker({host: 'http://192.168.1.10', port: 3000});
 * var docker3 = new Docker({protocol:'http', host: '127.0.0.1', port: 3000});
 * var docker4 = new Docker({host: '127.0.0.1', port: 3000});
 * var docker5 = new Docker({
 *   host: '192.168.1.10',
 *   port: process.env.DOCKER_PORT || 2375,
 *   ca: fs.readFileSync('ca.pem'),
 *   cert: fs.readFileSync('cert.pem'),
 *   key: fs.readFileSync('key.pem'),
 *   version: 'v1.25' // required when Docker >= v1.13, https://docs.docker.com/engine/api/version-history/
 * });
 */

if (config.bbbStreamImagePrePull !== false) {
    docker.pull(config.bbbStreamImage, (e, s) => {
	    if (e) {
		console.log(`FATAL: failed pulling ${config.bbbStreamImage}`);
		console.log(e);
		process.exit(1);
	    }
	    console.log(`downloading ${config.bbbStreamImage}`);
	    if (process.env['DEBUG'] !== undefined) {
		s.on('data', (d) => { console.log(d); });
	    } else {
		s.on('data', (d) => {
			try {
			    let p = JSON.parse(d);
			    if (p.progressDetail !== undefined
				    && p.progressDetail.current !== undefined
				    && p.progressDetail.total !== undefined) {
				let q = Math.round(p.progressDetail.current * 100 / p.progressDetail.total);
				console.log(`${p.status} ${p.id}: ${p.progressDetail.current}/${p.progressDetail.total} - ${q}%`);
			    } else if (p.id !== undefined) { console.log(`${p.status} ${p.id}`); }
			    else { console.log(`${p.status}`); }
			} catch(f) {
			    console.log('caught error parsing docker output');
			    console.log(f);
			}
		    });
	    }
	    s.on('end', () => { console.log(`done downloading ${config.bbbStreamImage}`) });
	});
} else { console.log(`assuming ${config.bbbStreamImage} is already cached`); }

module.exports = {
	create: (params) => {
		return new Promise((resolve, reject) => {
			if (params.rtmpStreamKey === undefined) {
			    reject({code: 500, msg: 'missing rtmp stream key'});
			    return;
			} else if (params.bbbMeetingId === undefined) {
			    reject({code: 500, msg: 'missing bigbluebutton meeting id'});
			    return;
			}
			try {
			    let auxContainer;
			    let containerEnv = [
				    `BBB_DOWNLOAD_MEETING=false`,
				    `BBB_MEETING_ID=${params.bbbMeetingId}`,
				    `BBB_SECRET=${config.bbbApiSecret}`,
				    `BBB_URL=${config.bbbApiUrl}`
				];
			    if (config.rtmpServerUrlPrefix !== undefined && config.rtmpServerUrlPrefix !== false) {
				containerEnv.push(`BBB_STREAM_URL=${config.rtmpServerUrlPrefix}/${params.rtmpStreamKey}`);
			    } else { containerEnv.push(`BBB_STREAM_URL=${params.rtmpServerUrlPrefix}/${params.rtmpStreamKey}`); }
			    if (params.attendeePassword !== undefined && params.attendeePassword !== false) {
				containerEnv.push(`BBB_ATTENDEE_PASSWORD=${params.attendeePassword}`);
			    }
			    if (params.moderatorPassword !== undefined && params.moderatorPassword !== false) {
				containerEnv.push(`BBB_MODERATOR_PASSWORD=${params.moderatorPassword}`);
			    }
			    if (params.showChat === true) { containerEnv.push(`BBB_SHOW_CHAT=true`); }
			    else { containerEnv.push(`BBB_SHOW_CHAT=false`); }
			    if (config.bbbTlsVerify === false || process.env["NODE_TLS_REJECT_UNAUTHORIZED"] !== undefined) {
				containerEnv.push(`SKIP_TLS_VERIFICATION=true`);
			    }
			    console.log('creating container with env:');
			    console.log(containerEnv);
			    docker.createContainer({
					AttachStdin: false,
					AttachStdout: true,
					AttachStderr: true,
					Env: containerEnv,
					HostConfig: { ShmSize: (512 * 1024 * 1024) },
					Image: config.bbbStreamImage,
					name: `livestream-${params.bbbMeetingId}`,
					OpenStdin: false,
					StdinOnce: false,
					Tty: true
				    })
				.then((container) => {
					auxContainer = container;
					console.log('starting container ...');
					return auxContainer.start();
				    })
				.then(() => {
					console.log(`successfully started stream ${params.bbbMeetingId}`);
					resolve();
				    })
				.catch((e) => {
					console.log(`caught error starting stream ${params.bbbMeetingId}`);
					console.log(e);
					reject();
				    });
			} catch(e) {
			    console.log(`caught error starting stream ${params.bbbMeetingId}`);
			    console.log(e);
			    reject();
			}
		    });
	    },

	list: () => {
		return new Promise((resolve, reject) => {
			try {
			    docker.listContainers({ all: true }, (e, c) => {
				    if (e !== undefined && e !== null) {
					console.log('caught error listing containers');
					console.log(e);
					resolve([]);
				    } else { 
					let found = [];
					for (let i = 0; i < c.length; i++) {
					    found.push({
						    created: c[i].Created || 0,
						    id: c[i].Id || 'container ID not found',
						    name: (c[i].Names[0] || '-container Name not found').substring(1),
						    state: c[i].State || 'container state not found',
						    status: c[i].Status || 'container status not found'
						});
					}
					console.log(`docker-list returning ${found.length} containers`);
					resolve(found);
				    }
				});
			} catch(e) {
			    console.log(`caught error listing containers`);
			    console.log(e);
			    resolve([]);
			}
		    });
	    },

	remove: (containerId) => {
		return new Promise((resolve, reject) => {
			try {
			    let container = docker.getContainer(containerId);
			    container.stop()
				.then(() => {
					console.log(`successfully stopped container ${containerId}`);
					container.remove((e, d) => {
						if (e !== undefined && e !== null) {
						    console.log(`caught error removing container ${containerId}`);
						    console.log(e);
						    resolve(false);
						    return;
						} else {
						    console.log(`successfully removed container ${containerId}`);
						    console.log(d);
						    resolve(true);
						    return;
						}
						reject('wtf');
					    });
				    })
				.catch((o) => {
					console.log(`caught error trying stop container ${containerId}`);
					console.log(o);
					console.log(`removing container anyway ...`);
					container.remove((e, d) => {
						if (e !== undefined && e !== null) {
						    console.log(`caught error removing container ${containerId}`);
						    console.log(e);
						    resolve(false);
						    return;
						} else {
						    console.log(`successfully removed container ${containerId}`);
						    console.log(d);
						    resolve(true);
						    return;
						}
						reject('wtf');
					    });
				    });
			} catch(e) {
			    console.log(`caught error removing container ${containerId}`);
			    console.log(e);
			    resolve(false);
			}
		    });
	    }
    };
