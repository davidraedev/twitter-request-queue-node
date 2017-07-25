const Twitter = require( "twitter" );

function TwitterRequestQueue( credentials ) {
	this.queue = [];
	this.endpoints = {};
	this.client = null;
	if ( credentials )
		this.setCredentials( credentials );
	this.request_delay = 1000;
	this.queue_started = false;
	this.timeout = false;
}

TwitterRequestQueue.prototype.setCredentials = function( credentials ) {
	this.client = new Twitter( credentials );
};

TwitterRequestQueue.prototype.parseResponse = function( response ) {
	console.log( "limit >> ", response.headers[ "x-rate-limit-limit" ] );
	console.log( "remaining >> ", response.headers[ "x-rate-limit-remaining" ] );
	console.log( "reset >> ", new Date( response.headers[ "x-rate-limit-reset" ] * 1000 ) );
	return {
		limit: +response.headers[ "x-rate-limit-limit" ],
		remaining: +response.headers[ "x-rate-limit-remaining" ],
		reset: new Date( response.headers[ "x-rate-limit-reset" ] * 1000 ),
	};
};

TwitterRequestQueue.prototype.saveResponse = function( endpoint, limits ) {
	this.endpoints[ endpoint ] = limits;
};

TwitterRequestQueue.prototype.addToQueue = function( params ) {
	this.queue.push( params );
	this.processQueue();
};

TwitterRequestQueue.prototype.get = function( endpoint, params, callback ) {
	this.addToQueue({
		type: "get",
		endpoint: endpoint,
		params: params,
		callback: callback,
	});
};

TwitterRequestQueue.prototype.post = function( endpoint, params, callback ) {
	this.addToQueue({
		type: "post",
		endpoint: endpoint,
		params: params,
		callback: callback,
	});
};

TwitterRequestQueue.prototype.processGet = function( endpoint, params, callback ) {

	return new Promise( ( resolve ) => {
		if ( params ) {
			this.client.get( endpoint, params, ( error, tweets, response ) => {
				let parsed_response = this.parseResponse( response );
				this.saveResponse( endpoint, parsed_response );
				callback( error, tweets, response );
				resolve();
			});
		}
		else {
			this.client.get( endpoint, ( error, tweets, response ) => {
				let parsed_response = this.parseResponse( response );
				this.saveResponse( endpoint, parsed_response );
				callback( error, tweets, response );
				resolve();
			});
		}
	});
};

TwitterRequestQueue.prototype.processPost = function( endpoint, params, callback ) {

	return new Promise( ( resolve ) => {
		if ( params ) {
			this.client.post( endpoint, params, ( error, tweets, response ) => {
				let parsed_response = this.parseResponse( response );
				this.saveResponse( endpoint, parsed_response );
				callback( error, tweets, response );
				resolve();
			});
		}
		else {
			this.client.post( endpoint, ( error, tweets, response ) => {
				let parsed_response = this.parseResponse( response );
				this.saveResponse( endpoint, parsed_response );
				callback( error, tweets, response );
				resolve();
			});
		}
	});
};

TwitterRequestQueue.prototype.validateRequest = function( request ) {
	if ( typeof request.endpoint !== "string" )
		throw new Error( "request is not a string" );
	if ( typeof request.callback !== "function" )
		throw new Error( "callback is not a function" );
};

TwitterRequestQueue.prototype.processRequest = function( request ) {

	if ( request.type === "get" )
		return this.processGet( request.endpoint, request.params, request.callback );
	else if ( request.type === "post" )
		return this.processPost( request.endpoint, request.params, request.callback );

};

TwitterRequestQueue.prototype.isLimited = function( endpoint ) {
	if ( this.endpoints[ endpoint ] ) {
		let reset_in_millis = ( +this.endpoints[ endpoint ].reset - +new Date() );

		if ( reset_in_millis < 0 )
			this.endpoints[ endpoint ].remaining = Math.max( 1, this.endpoints[ endpoint ].remaining );

		if ( ! this.endpoints[ endpoint ].remaining ) {
			return {
				limited: true,
				reset_in_millis: reset_in_millis,
			};
		}
		else {
			return {
				limited: false,
			};
		}
	}
	else {
		return {
			limited: false,
		};
	}
};

TwitterRequestQueue.prototype.processQueue = function() {
	let self = this;
	console.log( "self.queue.length =", self.queue.length );
	if ( ! self.queue.length ) {
		console.log( "Queue Finished" );
		self.queue_started = false;
		return;
	}
	if ( self.queue_started ) {
		console.log( "Queue Already Started" );
		return;
	}
	clearTimeout( self.timeout );
	self.queue_started = true;
	console.log( "Queue Started" );
	let earliest_reset = Infinity;
	let processing = false;
	self.queue.forEach( ( request, index ) => {

		if ( processing )
			return;

		let limited = self.isLimited( request.endpoint );
		if ( ! limited.limited ) {
			self.queue.splice( index, 1 );
			processing = true;
			self.processRequest( request )
				.then(() => {
					console.log( "Queue Wait" );
					self.timeout = setTimeout( () => {
						console.log( "Queue Callback" );
						self.queue_started = false;
						self.processQueue();
					}, self.request_delay );
				});
		}
		else {
			earliest_reset = Math.min( earliest_reset, limited.reset_in_millis );
		}
	});
	if ( ! processing ) {
		console.log( "Queue Limited Ending" );
		self.queue_started = false;
		if ( earliest_reset < Infinity ) {
			console.log( "Queue Set for next reset ("+ ( earliest_reset / 1000 / 60 ).toFixed(2) +"m)" );
			self.timeout = setTimeout( () => {
				self.processQueue();
			}, earliest_reset );
		}
	}
};

module.exports = TwitterRequestQueue;