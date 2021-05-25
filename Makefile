.PHONY: install
install:
	@@npm install

.PHONY: clean
clean:
	rm -fr node_modules

.PHONY: prep-runtime
prep-runtime:
	if test "$$API_HOST"; then \
	    test -z "$$API_PROTO" && API_PROTO=https; \
	    if test -z "$$API_PORT"; then \
		if test "$$API_PROTO" = https; then \
		    API_PORT=443; \
		else \
		    API_PORT=80; \
		fi; \
	    fi; \
	    echo "var API_HOST = '$$API_HOST';" >./static/js/backend.js; \
	    echo "var API_PORT = '$$API_PORT';" >>./static/js/backend.js; \
	    echo "var API_PROTO = '$$API_PROTO';" >>./static/js/backend.js; \
	fi

.PHONY: run
run: prep-runtime
	node ./workers/index.js

.PHONY: run-pm2
run-pm2: prep-runtime
	@@if test -s /var/run/secrets/kubernetes.io/serviceaccount/token; then \
	    pm2 start ecosystem.config.js --no-daemon --no-vizion; \
	else \
	    pm2 start ecosystem.config.js --no-vizion; \
	fi

.PHONY: start
start: run
