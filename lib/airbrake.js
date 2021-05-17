'use strict';

module.exports = (config) => {
	return new Promise((resolve, reject) => {
		if (process.env.AIRBRAKE_ID !== undefined && process.env.AIRBRAKE_ID !== ""
			&& process.env.AIRBRAKE_KEY !== undefined && process.env.AIRBRAKE_KEY !== "") {
		    try {
			let airbrake = require('airbrake').createClient(process.env.AIRBRAKE_ID, process.env.AIRBRAKE_KEY);
			airbrake.handleExceptions();
			if (process.env.AIRBRAKE_HOST !== undefined) {
			    console.log(`exceptions would be sent to ${process.env['AIRBRAKE_HOST']}`);
			} else { console.log(`exceptions would be sent to airbrake.io`); }
			resolve(true);
		    } catch(e) {
			console.log(`failed configuring airbrake, caught:`);
			console.log(e);
			resolve(true);
		    }
		} else {
		    console.log(`airbrake disabled`);
		    resolve(true);
		}
	    });
    };
