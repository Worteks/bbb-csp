'use strict';

const config = require('../config.js');
const fs = require('fs');
const k8s = require('@kubernetes/client-node');

if (config.kubernetesVerifyTls !== undefined
	&& config.kubernetesVerifyTls === false) {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
}

let k8sApi = false,
    token = false;
try {
    token = fs.readFileSync('/run/secrets/kubernetes.io/serviceaccount/token');
} catch(e) {
    if (process.env.KUBERNETES_ACCESS_TOKEN !== undefined) {
	token = process.env.KUBERNETES_ACCESS_TOKEN;
    } else {
	console.log('CRITICAL: could not load kubernetes token from runtime');
	console.log(e);
	process.exit(1);
    }
}

try {
    const cluster = {
	    name: 'default',
	    server: config.kubernetesApiUrl
	}, user = {
	    name: 'csp',
	    user: { token }
	};

    const context = {
	    name: 'default',
	    user: user.name,
	    cluster: cluster.name
	};

    const kc = new k8s.KubeConfig();
    kc.loadFromOptions({
	    clusters: [cluster],
	    users: [user],
	    contexts: [context],
	    currentContext: context.name,
	});
    k8sApi = kc.makeApiClient(k8s.CoreV1Api);
} catch(e) {
    console.log('CRITICAL: failed initializing Kubernetes API Client');
    console.log(e);
    process.exit(1);
}

k8sApi.listNamespacedPod(config.kubernetesNamespace)
    .then((res) => {
	    console.log('NOTICE: kubernetes client initialized, '
			+ `found ${res.body.items.length} Pods `
			+ `in ${config.kubernetesNamespace} Namespace`);
	})
    .catch((e) => {
	    console.log(`CRITICAL: failed listing Pods in ${config.kubernetesNamespace}`);
	    console.log(e);
	    process.exit(1);
	});

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
			let containerEnv = [
				{
				    name: 'BBB_DOWNLOAD_MEETING',
				    value: 'false'
				},
				{
				    name: 'BBB_MEETING_ID',
				    value: params.bbbMeetingId,
				},
				{
				    name: 'BBB_SECRET',
				    value: config.bbbApiSecret,
				},
				{
				    name: 'BBB_URL',
				    value: config.bbbApiUrl,
				}
			    ];
			let containerResources = {};
			let thelabels = {};
			if (config.rtmpServerUrlPrefix !== undefined && config.rtmpServerUrlPrefix !== false) {
			    containerEnv.push({ name: 'BBB_STREAM_URL', value: `${config.rtmpServerUrlPrefix}/${params.rtmpStreamKey}` });
			} else { containerEnv.push({ name: 'BBB_STREAM_URL', value: `${params.rtmpServerUrlPrefix}/${params.rtmpStreamKey}` }); }
			if (params.attendeePassword !== undefined && params.attendeePassword !== false) {
			    containerEnv.push({ name: 'BBB_ATTENDEE_PASSWORD', value: `${params.attendeePassword}` });
			}
			if (params.moderatorPassword !== undefined && params.moderatorPassword !== false) {
			    containerEnv.push({ name: 'BBB_MODERATOR_PASSWORD', value: `${params.moderatorPassword}` });
			}
			if (params.showChat === true) { containerEnv.push({ name: 'BBB_SHOW_CHAT', value: 'true' }); }
			else { containerEnv.push({ name: 'BBB_SHOW_CHAT', value: 'false' }); }
			if (config.bbbTlsVerify === false || process.env["NODE_TLS_REJECT_UNAUTHORIZED"] !== undefined) {
			    containerEnv.push(`SKIP_TLS_VERIFICATION=true`);
			}
			thelabels[config.kubernetesLabelName] = config.kubernetesLabelValue;
			if (config.kubernetesCpuLimit !== false || config.kubernetesMemoryLimit !== false) {
			    containerResources['limits'] = {}
			    if (config.kubernetesCpuLimit !== false) { containerResources['limits']['cpu'] = `${config.kubernetesCpuLimit}`; }
			    if (config.kubernetesMemoryLimit !== false) { containerResources['limits']['memory'] = `${config.kubernetesMemoryLimit}`; }
			}
			if (config.kubernetesCpuRequest !== false || config.kubernetesMemoryRequest !== false) {
			    containerResources['requests'] = {}
			    if (config.kubernetesCpuRequest !== false) { containerResources['requests']['cpu'] = `${config.kubernetesCpuRequest}`; }
			    if (config.kubernetesMemoryRequest !== false) { containerResources['requests']['memory'] = `${config.kubernetesMemoryRequest}`; }
			}
			let podData = {
				apiVersion: 'v1',
				kind: 'Pod',
				metadata: {
					labels: thelabels,
					name: 'livestreamtest',
					namespace: 'ci',
				    },
				spec: {
					containers: [
						{
						    env: containerEnv,
						    image: config.bbbStreamImage,
						    name: 'stream',
						    resources: containerResources,
						    securityContext: {
							    allowPrivilegeEscalation: false,
							    capabilities: {
								    drop: [ 'ALL' ]
								}
							},
						    volumeMounts: [
							    {
								mountPath: '/dev/shm',
								name: 'shm'
							    }
							]

						}
					    ],
					restartPolicy: 'Never',
					serviceAccount: 'default',
					serviceAccountName: 'default',
					volumes: [
						{
						    emptyDir: { medium: 'Memory' },
						    name: 'shm'
						}
					    ]
				    }
			    };
			console.log('creating container with env:');
			console.log(containerEnv);
			k8sApi.createNamespacedPod(config.kubernetesNamespace, podData)
				.then(() => {
					console.log(`successfully started stream ${params.bbbMeetingId}`);
					resolve();
				    })
				.catch((e) => {
					console.log(`caught error starting stream ${params.bbbMeetingId}`);
					console.log(e);
					resolve();
				    });
		    });
	    },

	list: () => {
		return new Promise((resolve, reject) => {
			k8sApi.listNamespacedPod(config.kubernetesNamespace, undefined, undefined, undefined,
				undefined, `${config.kubernetesLabelName}=${config.kubernetesLabelValue}`)
			    .then((res) => {
				    console.log('pod-list OK');
				    let found = [];
				    for (let i = 0; i < res.body.items.length; i++) {
					found.push({
						created: res.body.items[i].status.startTime,
						id: res.body.items[i].metadata.name,
						name: res.body.items[i].metadata.name,
						state: res.body.items[i].status.phase,
						status: res.body.items[i].spec.nodeName
					    });
				    }
				    resolve(found);
				})
			    .catch((e) => {
				    console.log(`caught error listing containers`);
				    console.log(e);
				    resolve([]);
				});
		    });
	    },

	remove: (containerId) => {
		return new Promise((resolve, reject) => {
			k8sApi.deleteNamespacedPod(containerId, config.kubernetesNamespace)
			    .then(() => {
				    console.log(`successfully removed container ${containerId}`);
				    resolve(true);
				})
			    .catch((e) => {
				    console.log(`caught error trying remove container ${containerId}`);
				    console.log(e);
				    resolve(false);
				});
		    });
	    }
    };
