# BigBlueButton Conference Streaming Platform

Starts and Stops BigBlueButton LiveStream containers, streaming to PeerTube.

## Usage

Install nodejs dependencies:

```
$ npm install
```

Configure BigBlueButton API URL and corresponding secret, Peertube RTMP
Server Hostname, NodeJS bind address and port in `./config.js.

Start API server:

```
$ node workers/index.js
```

Setup your webserver. DocumentRoot should point to the `./static` subdir.
Webserver should deal with authenticating users.

Edit `./static/js/backend.js` `API_HOST`, `API_PORT` and `API_PROTO`,
pointing to your API server address.

```
$ cat <<EOF >./static/js/backend.js
var API_HOST = 'abc.example.com';
var API_PORT = 443;
var API_PROTO = 'https';
EOF
```

See https://github.com/Worteks/bbb-ansible for playbooks deploying
BigBlueButton, Peertube, and BigBlueButton Conferences Streaming Platform.
