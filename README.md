# BigBlueButton Conference Streaming Platform

Starts and Stops BigBlueButton LiveStream containers.

## Usage

Install nodejs dependencies:

```
$ npm install
```

Configure BigBlueButton API URL and corresponding secret, Peertube RTMP
Server Hostname, NodeJS bind address and port in `./config.js` - use
`./config.js.sample`:

```
$ cp config.js.sample config.js
$ vi config.js
```

Start API server:

```
$ node workers/index.js
```

Setup your webserver. DocumentRoot should point to the `./static` subdir.
Webserver should deal with authenticating users however you would see fit.

Define your own `API_HOST`, `API_PORT` and `API_PROTO` in
`./static/js/backend.js` - use `./static/js/backend.js.sample`. Those would
be loaded by clients, and should point them to our NodeJS API server:

```
$ cat static/js/backend.js.sample
$ cat <<EOF >./static/js/backend.js
var API_HOST = 'abc.example.com';
var API_PORT = 443;
var API_PROTO = 'https';
EOF
```

See https://github.com/Worteks/bbb-ansible for playbooks deploying
BigBlueButton, Peertube, and BigBlueButton Conferences Streaming Platform.
