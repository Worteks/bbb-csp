'use strict';

const config = {
	bbbStreamImage: process.env.BBBLIVESTREAM_IMAGE || 'aauzid/bigbluebutton-livestreaming',
	//bbbStreamImagePrePull: false, // do not define unless there's a good reason not to pull the image defined above
	bbbApiUrl: process.env.BIGBLUEBUTTON_API_URL || 'https://scalelite.app.wopla.io/bigbluebutton/api',
	bbbApiSecret: process.env.BIGBLUEBUTTON_API_SECRET,
	// bbbVerifyTls: false, //do not define unless you want to skip tls verification with BigBlueButton
	containerDriver: process.env.CONTAINERS_DRIVER || 'docker',
	kubernetesApiUrl: process.env.KUBERNETES_API_URL || 'https://kubernetes.default.svc.cluster.local',
	kubernetesCpuLimit: process.env.KUBERNETES_STREAM_CPU_LIMIT || false,
	kubernetesCpuRequest: process.env.KUBERNETES_STREAM_CPU_REQUEST || false,
	kubernetesLabelName: process.env.KUBERNETES_LABEL_NAME || 'managedby',
	kubernetesLabelValue: process.env.KUBERNETES_LABEL_VALUE || 'bbb-csp',
	kubernetesMemoryLimit: process.env.KUBERNETES_STREAM_MEMORY_LIMIT || false,
	kubernetesMemoryRequest: process.env.KUBERNETES_STREAM_MEMORY_REQUEST || false,
	kubernetesNamespace: process.env.KUBERNETES_NAMESPACE || 'default',
	// kubernetesVerifyTls: false, //do not define unless you want to skip tls verification with BigBlueButton
	listenAddr: process.env.BIND_ADDR || '0.0.0.0',
	listenPort: process.env.BIND_PORT || '8080',
	peertubeApiUrl: process.env.PEERTUBE_API_URL || 'https://peertube.intra.worteks.com',
	peertubePassword: process.env.PEERTUBE_PASSWORD,
	peertubeUsername: process.env.PEERTUBE_USERNAME || 'root',
	//peertubeVerifyTls: false, //do not define unless you want to skip tls verification with peerTube
	rtmpServerUrlPrefix: process.env.RTMP_PREFIX || false
    };

module.exports = config;
