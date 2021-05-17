'use strict';

module.exports = {
	getClientAddress: (req) => {
		return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	    },
	getHostHeader: (req) => {
		return req.headers.host || undefined;
	    },
	getParams: (req) => {
		return Object.assign(Object.assign(req.params, req.body), req.query);
	    },
	logpfx: () => {
		if (process.env['DO_NOT_LOG_TIME'] !== undefined) {
		    return '';
		} else {
		    var d = new Date();
		    return '[' + d.toUTCString() + '] %s';
		}
	    }
    };
