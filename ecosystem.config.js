module.exports = {
	apps : [
		{
		    name: 'front',
		    script: 'workers/index.js',
		    instances: 1,
		    env: {
			    'NODE_ENV': 'production',
			    'PORT': '8080'
			}
		}
	    ]
    };
