(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var require = function(name, loaderPath) {
    var path = expand(name, '.');
    if (loaderPath == null) loaderPath = '/';

    if (has(cache, path)) return cache[path].exports;
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex].exports;
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '" from '+ '"' + loaderPath + '"');
  };

  var define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has(bundle, key)) {
          modules[key] = bundle[key];
        }
      }
    } else {
      modules[bundle] = fn;
    }
  };

  var list = function() {
    var result = [];
    for (var item in modules) {
      if (has(modules, item)) {
        result.push(item);
      }
    }
    return result;
  };

  globals.require = require;
  globals.require.define = define;
  globals.require.register = define;
  globals.require.list = list;
  globals.require.brunch = true;
})();
(function(window){ "use strict";

// jsmpeg by Dominic Szablewski - phoboslab.org, github.com/phoboslab
//
// Consider this to be under MIT license. It's largely based an an Open Source
// Decoder for Java under GPL, while I looked at another Decoder from Nokia 
// (under no particular license?) for certain aspects.
// I'm not sure if this work is "derivative" enough to have a different license
// but then again, who still cares about MPEG1?
//
// Based on "Java MPEG-1 Video Decoder and Player" by Korandi Zoltan:
// http://sourceforge.net/projects/javampeg1video/
//
// Inspired by "MPEG Decoder in Java ME" by Nokia:
// http://www.developer.nokia.com/Community/Wiki/MPEG_decoder_in_Java_ME


var requestAnimFrame = (function(){
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		function( callback ){
			window.setTimeout(callback, 1000 / 60);
		};
})();
		
var jsmpeg = window.jsmpeg = function( url, opts ) {
	opts = opts || {};
	this.benchmark = !!opts.benchmark;
	this.canvas = opts.canvas || document.createElement('canvas');
	this.autoplay = !!opts.autoplay;
	this.loop = !!opts.loop;
	this.externalLoadCallback = opts.onload || null;
	this.externalDecodeCallback = opts.ondecodeframe || null;
	this.externalFinishedCallback = opts.onfinished || null;
	this.bwFilter = opts.bwFilter || false;

	this.customIntraQuantMatrix = new Uint8Array(64);
	this.customNonIntraQuantMatrix = new Uint8Array(64);
	this.blockData = new Int32Array(64);

	this.canvasContext = this.canvas.getContext('2d');

	if( url instanceof WebSocket ) {
		this.client = url;
		this.client.onopen = this.initSocketClient.bind(this);
	} 
	else {
		this.load(url);
	}
};



// ----------------------------------------------------------------------------
// Streaming over WebSockets

jsmpeg.prototype.waitForIntraFrame = true;
jsmpeg.prototype.socketBufferSize = 512 * 1024; // 512kb each
jsmpeg.prototype.onlostconnection = null;

jsmpeg.prototype.initSocketClient = function( client ) {
	this.buffer = new BitReader(new ArrayBuffer(this.socketBufferSize));

	this.nextPictureBuffer = new BitReader(new ArrayBuffer(this.socketBufferSize));
	this.nextPictureBuffer.writePos = 0;
	this.nextPictureBuffer.chunkBegin = 0;
	this.nextPictureBuffer.lastWriteBeforeWrap = 0;

	this.client.binaryType = 'arraybuffer';
	this.client.onmessage = this.receiveSocketMessage.bind(this);
};

jsmpeg.prototype.decodeSocketHeader = function( data ) {
	// Custom header sent to all newly connected clients when streaming
	// over websockets:
	// struct { char magic[4] = "jsmp"; unsigned short width, height; };
	if( 
		data[0] == SOCKET_MAGIC_BYTES.charCodeAt(0) && 
		data[1] == SOCKET_MAGIC_BYTES.charCodeAt(1) && 
		data[2] == SOCKET_MAGIC_BYTES.charCodeAt(2) && 
		data[3] == SOCKET_MAGIC_BYTES.charCodeAt(3)
	) {
		this.width = (data[4] * 256 + data[5]);
		this.height = (data[6] * 256 + data[7]);
		this.initBuffers();
	}
};

jsmpeg.prototype.receiveSocketMessage = function( event ) {
	var messageData = new Uint8Array(event.data);

	if( !this.sequenceStarted ) {
		this.decodeSocketHeader(messageData);
	}

	var current = this.buffer;
	var next = this.nextPictureBuffer;

	if( next.writePos + messageData.length > next.length ) {
		next.lastWriteBeforeWrap = next.writePos;
		next.writePos = 0;
		next.index = 0;
	}
	
	next.bytes.set( messageData, next.writePos );
	next.writePos += messageData.length;

	var startCode = 0;
	while( true ) {
		startCode = next.findNextMPEGStartCode();
		if( 
			startCode == BitReader.NOT_FOUND ||
			((next.index >> 3) > next.writePos)
		) {
			// We reached the end with no picture found yet; move back a few bytes
			// in case we are at the beginning of a start code and exit.
			next.index = Math.max((next.writePos-3), 0) << 3;
			return;
		}
		else if( startCode == START_PICTURE ) {
			break;
		}
	}

	// If we are still here, we found the next picture start code!

	
	// Skip picture decoding until we find the first intra frame?
	if( this.waitForIntraFrame ) {
		next.advance(10); // skip temporalReference
		if( next.getBits(3) == PICTURE_TYPE_I ) {
			this.waitForIntraFrame = false;
			next.chunkBegin = (next.index-13) >> 3;
		}
		return;
	}

	// Last picture hasn't been decoded yet? Decode now but skip output
	// before scheduling the next one
	if( !this.currentPictureDecoded ) {
		this.decodePicture(DECODE_SKIP_OUTPUT);
	}

	
	// Copy the picture chunk over to 'this.buffer' and schedule decoding.
	var chunkEnd = ((next.index) >> 3);

	if( chunkEnd > next.chunkBegin ) {
		// Just copy the current picture chunk
		current.bytes.set( next.bytes.subarray(next.chunkBegin, chunkEnd) );
		current.writePos = chunkEnd - next.chunkBegin;
	}
	else {
		// We wrapped the nextPictureBuffer around, so we have to copy the last part
		// till the end, as well as from 0 to the current writePos
		current.bytes.set( next.bytes.subarray(next.chunkBegin, next.lastWriteBeforeWrap) );
		var written = next.lastWriteBeforeWrap - next.chunkBegin;
		current.bytes.set( next.bytes.subarray(0, chunkEnd), written );
		current.writePos = chunkEnd + written;
	}

	current.index = 0;
	next.chunkBegin = chunkEnd;

	// Decode!
	this.currentPictureDecoded = false;
	requestAnimFrame( this.scheduleDecoding.bind(this), this.canvas );
};

jsmpeg.prototype.scheduleDecoding = function() {
	this.decodePicture();
	this.currentPictureDecoded = true;
};



// ----------------------------------------------------------------------------
// Recording from WebSockets

jsmpeg.prototype.isRecording = false;
jsmpeg.prototype.recorderWaitForIntraFrame = false;
jsmpeg.prototype.recordedFrames = 0;
jsmpeg.prototype.recordedSize = 0;
jsmpeg.prototype.didStartRecordingCallback = null;

jsmpeg.prototype.recordBuffers = [];

jsmpeg.prototype.canRecord = function(){
	return (this.client && this.client.readyState == this.client.OPEN);
};

jsmpeg.prototype.startRecording = function(callback) {
	if( !this.canRecord() ) {
		return;
	}
	
	// Discard old buffers and set for recording
	this.discardRecordBuffers();
	this.isRecording = true;
	this.recorderWaitForIntraFrame = true;
	this.didStartRecordingCallback = callback || null;

	this.recordedFrames = 0;
	this.recordedSize = 0;
	
	// Fudge a simple Sequence Header for the MPEG file
	
	// 3 bytes width & height, 12 bits each
	var wh1 = (this.width >> 4),
		wh2 = ((this.width & 0xf) << 4) | (this.height >> 8),
		wh3 = (this.height & 0xff);
	
	this.recordBuffers.push(new Uint8Array([
		0x00, 0x00, 0x01, 0xb3, // Sequence Start Code
		wh1, wh2, wh3, // Width & height
		0x13, // aspect ratio & framerate
		0xff, 0xff, 0xe1, 0x58, // Meh. Bitrate and other boring stuff
		0x00, 0x00, 0x01, 0xb8, 0x00, 0x08, 0x00, // GOP
		0x00, 0x00, 0x00, 0x01, 0x00 // First Picture Start Code
	]));
};

jsmpeg.prototype.recordFrameFromCurrentBuffer = function() {
	if( !this.isRecording ) { return; }
	
	if( this.recorderWaitForIntraFrame ) {
		// Not an intra frame? Exit.
		if( this.pictureCodingType != PICTURE_TYPE_I ) { return; }
	
		// Start recording!
		this.recorderWaitForIntraFrame = false;
		if( this.didStartRecordingCallback ) {
			this.didStartRecordingCallback( this );
		}
	}
	
	this.recordedFrames++;
	this.recordedSize += this.buffer.writePos;
	
	// Copy the actual subrange for the current picture into a new Buffer
	this.recordBuffers.push(new Uint8Array(this.buffer.bytes.subarray(0, this.buffer.writePos)));
};

jsmpeg.prototype.discardRecordBuffers = function() {
	this.recordBuffers = [];
	this.recordedFrames = 0;
};

jsmpeg.prototype.stopRecording = function() {
	var blob = new Blob(this.recordBuffers, {type: 'video/mpeg'});
	this.discardRecordBuffers();
	this.isRecording = false;
	return blob;
};



// ----------------------------------------------------------------------------
// Loading via Ajax
	
jsmpeg.prototype.load = function( url ) {
	this.url = url;

	var request = new XMLHttpRequest();
	var that = this;
	request.onreadystatechange = function() {		
		if( request.readyState == request.DONE && request.status == 200 ) {
			that.loadCallback(request.response);
		}
	};
	request.onprogress = this.updateLoader.bind(this);

	request.open('GET', url);
	request.responseType = "arraybuffer";
	request.send();
};

jsmpeg.prototype.updateLoader = function( ev ) {
	var 
		p = ev.loaded / ev.total,
		w = this.canvas.width,
		h = this.canvas.height,
		ctx = this.canvasContext;

	ctx.fillStyle = '#222';
	ctx.fillRect(0, 0, w, h);
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, h - h*p, w, h*p);
};
	
jsmpeg.prototype.loadCallback = function(file) {
	var time = Date.now();
	this.buffer = new BitReader(file);
	
	this.findStartCode(START_SEQUENCE);
	this.firstSequenceHeader = this.buffer.index;
	this.decodeSequenceHeader();

	// Load the first frame
	this.nextFrame();
	
	if( this.autoplay ) {
		this.play();
	}

	if( this.externalLoadCallback ) {
		this.externalLoadCallback(this);
	}
};

jsmpeg.prototype.play = function(file) {
	if( this.playing ) { return; }
	this.targetTime = Date.now();
	this.playing = true;
	this.scheduleNextFrame();
};

jsmpeg.prototype.pause = function(file) {
	this.playing = false;
};

jsmpeg.prototype.stop = function(file) {
	if( this.buffer ) {
		this.buffer.index = this.firstSequenceHeader;
	}
	this.playing = false;
	if( this.client ) {
		this.client.close();
		this.client = null;
	}
};



// ----------------------------------------------------------------------------
// Utilities

jsmpeg.prototype.readCode = function(codeTable) {
	var state = 0;
	do {
		state = codeTable[state + this.buffer.getBits(1)];
	} while( state >= 0 && codeTable[state] != 0 );
	return codeTable[state+2];
};

jsmpeg.prototype.findStartCode = function( code ) {
	var current = 0;
	while( true ) {
		current = this.buffer.findNextMPEGStartCode();
		if( current == code || current == BitReader.NOT_FOUND ) {
			return current;
		}
	}
	return BitReader.NOT_FOUND;
};

jsmpeg.prototype.fillArray = function(a, value) {
	for( var i = 0, length = a.length; i < length; i++ ) {
		a[i] = value;
	}
};



// ----------------------------------------------------------------------------
// Sequence Layer

jsmpeg.prototype.pictureRate = 30;
jsmpeg.prototype.lateTime = 0;
jsmpeg.prototype.firstSequenceHeader = 0;
jsmpeg.prototype.targetTime = 0;

jsmpeg.prototype.nextFrame = function() {
	if( !this.buffer ) { return; }
	while(true) {
		var code = this.buffer.findNextMPEGStartCode();
		
		if( code == START_SEQUENCE ) {
			this.decodeSequenceHeader();
		}
		else if( code == START_PICTURE ) {
			if( this.playing ) {
				this.scheduleNextFrame();
			}
			this.decodePicture();
			return this.canvas;
		}
		else if( code == BitReader.NOT_FOUND ) {
			this.stop(); // Jump back to the beginning

			if( this.this.externalFinishedCallback ) {
				this.externalFinishedCallback(this);
			}

			// Only loop if we found a sequence header
			if( this.loop && this.sequenceStarted ) {
				this.play();
			}
			return null;
		}
		else {
			// ignore (GROUP, USER_DATA, EXTENSION, SLICES...)
		}
	}
};

jsmpeg.prototype.scheduleNextFrame = function() {
	this.lateTime = Date.now() - this.targetTime;
	var wait = Math.max(0, (1000/this.pictureRate) - this.lateTime);
	this.targetTime = Date.now() + wait;

	if( this.benchmark ) {
		var now = Date.now();
		if(!this.benchframe) {
			this.benchstart = now;
			this.benchframe = 0;
		}
		this.benchframe++;
		var timepassed = now - this.benchstart;
		if( this.benchframe >= 100 ) {
			this.benchfps = (this.benchframe / timepassed) * 1000;
			if( console ) {
				console.log("frames per second: " + this.benchfps);
			}
			this.benchframe = null;
		}
		setTimeout( this.nextFrame.bind(this), 0);
	}
	else if( wait < 18) {
		this.scheduleAnimation();
	}
	else {
		setTimeout( this.scheduleAnimation.bind(this), wait );
	}
};

jsmpeg.prototype.scheduleAnimation = function() {
	requestAnimFrame( this.nextFrame.bind(this), this.canvas );
};
	
jsmpeg.prototype.decodeSequenceHeader = function() {
	this.width = this.buffer.getBits(12);
	this.height = this.buffer.getBits(12);
	this.buffer.advance(4); // skip pixel aspect ratio
	this.pictureRate = PICTURE_RATE[this.buffer.getBits(4)];
	this.buffer.advance(18 + 1 + 10 + 1); // skip bitRate, marker, bufferSize and constrained bit

	this.initBuffers();

	if( this.buffer.getBits(1) ) { // load custom intra quant matrix?
		for( var i = 0; i < 64; i++ ) {
			this.customIntraQuantMatrix[ZIG_ZAG[i]] = this.buffer.getBits(8);
		}
		this.intraQuantMatrix = this.customIntraQuantMatrix;
	}
	
	if( this.buffer.getBits(1) ) { // load custom non intra quant matrix?
		for( var i = 0; i < 64; i++ ) {
			this.customNonIntraQuantMatrix[ZIG_ZAG[i]] = this.buffer.getBits(8);
		}
		this.nonIntraQuantMatrix = this.customNonIntraQuantMatrix;
	}
};

jsmpeg.prototype.initBuffers = function() {	
	this.intraQuantMatrix = DEFAULT_INTRA_QUANT_MATRIX;
	this.nonIntraQuantMatrix = DEFAULT_NON_INTRA_QUANT_MATRIX;
	
	this.mbWidth = (this.width + 15) >> 4;
	this.mbHeight = (this.height + 15) >> 4;
	this.mbSize = this.mbWidth * this.mbHeight;
	
	this.codedWidth = this.mbWidth << 4;
	this.codedHeight = this.mbHeight << 4;
	this.codedSize = this.codedWidth * this.codedHeight;
	
	this.halfWidth = this.mbWidth << 3;
	this.halfHeight = this.mbHeight << 3;
	this.quarterSize = this.codedSize >> 2;
	
	// Sequence already started? Don't allocate buffers again
	if( this.sequenceStarted ) { return; }
	this.sequenceStarted = true;
	
	
	// Manually clamp values when writing macroblocks for shitty browsers
	// that don't support Uint8ClampedArray
	var MaybeClampedUint8Array = window.Uint8ClampedArray || window.Uint8Array;
	if( !window.Uint8ClampedArray ) {
		this.copyBlockToDestination = this.copyBlockToDestinationClamp;
		this.addBlockToDestination = this.addBlockToDestinationClamp;
	}
	
	// Allocated buffers and resize the canvas
	this.currentY = new MaybeClampedUint8Array(this.codedSize);
	this.currentY32 = new Uint32Array(this.currentY.buffer);

	this.currentCr = new MaybeClampedUint8Array(this.codedSize >> 2);
	this.currentCr32 = new Uint32Array(this.currentCr.buffer);

	this.currentCb = new MaybeClampedUint8Array(this.codedSize >> 2);
	this.currentCb32 = new Uint32Array(this.currentCb.buffer);
	

	this.forwardY = new MaybeClampedUint8Array(this.codedSize);
	this.forwardY32 = new Uint32Array(this.forwardY.buffer);

	this.forwardCr = new MaybeClampedUint8Array(this.codedSize >> 2);
	this.forwardCr32 = new Uint32Array(this.forwardCr.buffer);

	this.forwardCb = new MaybeClampedUint8Array(this.codedSize >> 2);
	this.forwardCb32 = new Uint32Array(this.forwardCb.buffer);
	
	this.canvas.width = this.width;
	this.canvas.height = this.height;
	
	this.currentRGBA = this.canvasContext.getImageData(0, 0, this.width, this.height);

	if( this.bwFilter ) {
		// This fails in IE10; don't use the bwFilter if you need to support it.
		this.currentRGBA32 = new Uint32Array( this.currentRGBA.data.buffer );
	}
	this.fillArray(this.currentRGBA.data, 255);
};




// ----------------------------------------------------------------------------
// Picture Layer

jsmpeg.prototype.currentY = null;
jsmpeg.prototype.currentCr = null;
jsmpeg.prototype.currentCb = null;

jsmpeg.prototype.currentRGBA = null;

jsmpeg.prototype.pictureCodingType = 0;

// Buffers for motion compensation
jsmpeg.prototype.forwardY = null;
jsmpeg.prototype.forwardCr = null;
jsmpeg.prototype.forwardCb = null;

jsmpeg.prototype.fullPelForward = false;
jsmpeg.prototype.forwardFCode = 0;
jsmpeg.prototype.forwardRSize = 0;
jsmpeg.prototype.forwardF = 0;


jsmpeg.prototype.decodePicture = function(skipOutput) {
	this.buffer.advance(10); // skip temporalReference
	this.pictureCodingType = this.buffer.getBits(3);
	this.buffer.advance(16); // skip vbv_delay
	
	// Skip B and D frames or unknown coding type
	if( this.pictureCodingType <= 0 || this.pictureCodingType >= PICTURE_TYPE_B ) {
		return;
	}
	
	// full_pel_forward, forward_f_code
	if( this.pictureCodingType == PICTURE_TYPE_P ) {
		this.fullPelForward = this.buffer.getBits(1);
		this.forwardFCode = this.buffer.getBits(3);
		if( this.forwardFCode == 0 ) {
			// Ignore picture with zero forward_f_code
			return;
		}
		this.forwardRSize = this.forwardFCode - 1;
		this.forwardF = 1 << this.forwardRSize;
	}
	
	var code = 0;
	do {
		code = this.buffer.findNextMPEGStartCode();
	} while( code == START_EXTENSION || code == START_USER_DATA );
	
	
	while( code >= START_SLICE_FIRST && code <= START_SLICE_LAST ) {
		this.decodeSlice( (code & 0x000000FF) );
		code = this.buffer.findNextMPEGStartCode();
	}
	
	// We found the next start code; rewind 32bits and let the main loop handle it.
	this.buffer.rewind(32);

	// Record this frame, if the recorder wants it
	this.recordFrameFromCurrentBuffer();
	
	
	if( skipOutput != DECODE_SKIP_OUTPUT ) {
		if( this.bwFilter ) {
			this.YToRGBA();
		}
		else {
			this.YCbCrToRGBA();	
		}
		this.canvasContext.putImageData(this.currentRGBA, 0, 0);

		if(this.externalDecodeCallback) {
			this.externalDecodeCallback(this, this.canvas);
		}
	}
	
	// If this is a reference picutre then rotate the prediction pointers
	if( this.pictureCodingType == PICTURE_TYPE_I || this.pictureCodingType == PICTURE_TYPE_P ) {
		var 
			tmpY = this.forwardY,
			tmpY32 = this.forwardY32,
			tmpCr = this.forwardCr,
			tmpCr32 = this.forwardCr32,
			tmpCb = this.forwardCb,
			tmpCb32 = this.forwardCb32;

		this.forwardY = this.currentY;
		this.forwardY32 = this.currentY32;
		this.forwardCr = this.currentCr;
		this.forwardCr32 = this.currentCr32;
		this.forwardCb = this.currentCb;
		this.forwardCb32 = this.currentCb32;

		this.currentY = tmpY;
		this.currentY32 = tmpY32;
		this.currentCr = tmpCr;
		this.currentCr32 = tmpCr32;
		this.currentCb = tmpCb;
		this.currentCb32 = tmpCb32;
	}
};

jsmpeg.prototype.YCbCrToRGBA = function() {	
	var pY = this.currentY;
	var pCb = this.currentCb;
	var pCr = this.currentCr;
	var pRGBA = this.currentRGBA.data;

	// Chroma values are the same for each block of 4 pixels, so we proccess
	// 2 lines at a time, 2 neighboring pixels each.
	// I wish we could use 32bit writes to the RGBA buffer instead of writing
	// each byte separately, but we need the automatic clamping of the RGBA
	// buffer.

	var yIndex1 = 0;
	var yIndex2 = this.codedWidth;
	var yNext2Lines = this.codedWidth + (this.codedWidth - this.width);

	var cIndex = 0;
	var cNextLine = this.halfWidth - (this.width >> 1);

	var rgbaIndex1 = 0;
	var rgbaIndex2 = this.width * 4;
	var rgbaNext2Lines = this.width * 4;
	
	var cols = this.width >> 1;
	var rows = this.height >> 1;

	var y, cb, cr, r, g, b;

	for( var row = 0; row < rows; row++ ) {
		for( var col = 0; col < cols; col++ ) {
			cb = pCb[cIndex];
			cr = pCr[cIndex];
			cIndex++;
			
			r = (cr + ((cr * 103) >> 8)) - 179;
			g = ((cb * 88) >> 8) - 44 + ((cr * 183) >> 8) - 91;
			b = (cb + ((cb * 198) >> 8)) - 227;
			
			// Line 1
			y = pY[yIndex1++];
			pRGBA[rgbaIndex1] = y + r;
			pRGBA[rgbaIndex1+1] = y - g;
			pRGBA[rgbaIndex1+2] = y + b;
			rgbaIndex1 += 4;
			
			y = pY[yIndex1++];
			pRGBA[rgbaIndex1] = y + r;
			pRGBA[rgbaIndex1+1] = y - g;
			pRGBA[rgbaIndex1+2] = y + b;
			rgbaIndex1 += 4;
			
			// Line 2
			y = pY[yIndex2++];
			pRGBA[rgbaIndex2] = y + r;
			pRGBA[rgbaIndex2+1] = y - g;
			pRGBA[rgbaIndex2+2] = y + b;
			rgbaIndex2 += 4;
			
			y = pY[yIndex2++];
			pRGBA[rgbaIndex2] = y + r;
			pRGBA[rgbaIndex2+1] = y - g;
			pRGBA[rgbaIndex2+2] = y + b;
			rgbaIndex2 += 4;
		}
		
		yIndex1 += yNext2Lines;
		yIndex2 += yNext2Lines;
		rgbaIndex1 += rgbaNext2Lines;
		rgbaIndex2 += rgbaNext2Lines;
		cIndex += cNextLine;
	}
};

jsmpeg.prototype.YToRGBA = function() {	
	// Luma only
	var pY = this.currentY;
	var pRGBA = this.currentRGBA32;

	var yIndex = 0;
	var yNext2Lines = (this.codedWidth - this.width);

	var rgbaIndex = 0;	
	var cols = this.width;
	var rows = this.height;

	var y;

	for( var row = 0; row < rows; row++ ) {
		for( var col = 0; col < cols; col++ ) {
			y = pY[yIndex++];
			pRGBA[rgbaIndex++] = 0xff000000 | y << 16 | y << 8 | y;
		}
		
		yIndex += yNext2Lines;
	}
};




// ----------------------------------------------------------------------------
// Slice Layer

jsmpeg.prototype.quantizerScale = 0;
jsmpeg.prototype.sliceBegin = false;

jsmpeg.prototype.decodeSlice = function(slice) {	
	this.sliceBegin = true;
	this.macroblockAddress = (slice - 1) * this.mbWidth - 1;
	
	// Reset motion vectors and DC predictors
	this.motionFwH = this.motionFwHPrev = 0;
	this.motionFwV = this.motionFwVPrev = 0;
	this.dcPredictorY  = 128;
	this.dcPredictorCr = 128;
	this.dcPredictorCb = 128;
	
	this.quantizerScale = this.buffer.getBits(5);
	
	// skip extra bits
	while( this.buffer.getBits(1) ) {
		this.buffer.advance(8);
	}

	do {
		this.decodeMacroblock();
		// We may have to ignore Video Stream Start Codes here (0xE0)!?
	} while( !this.buffer.nextBytesAreStartCode() );
}


// ----------------------------------------------------------------------------
// Macroblock Layer

jsmpeg.prototype.macroblockAddress = 0;
jsmpeg.prototype.mbRow = 0;
jsmpeg.prototype.mbCol = 0;
	
jsmpeg.prototype.macroblockType = 0;
jsmpeg.prototype.macroblockIntra = false;
jsmpeg.prototype.macroblockMotFw = false;
	
jsmpeg.prototype.motionFwH = 0;
jsmpeg.prototype.motionFwV = 0;
jsmpeg.prototype.motionFwHPrev = 0;
jsmpeg.prototype.motionFwVPrev = 0;

jsmpeg.prototype.decodeMacroblock = function() {
	// Decode macroblock_address_increment
	var 
		increment = 0,
		t = this.readCode(MACROBLOCK_ADDRESS_INCREMENT);
	
	while( t == 34 ) {
		// macroblock_stuffing
		t = this.readCode(MACROBLOCK_ADDRESS_INCREMENT);
	}
	while( t == 35 ) {
		// macroblock_escape
		increment += 33;
		t = this.readCode(MACROBLOCK_ADDRESS_INCREMENT);
	}
	increment += t;

	// Process any skipped macroblocks
	if( this.sliceBegin ) {
		// The first macroblock_address_increment of each slice is relative
		// to beginning of the preverious row, not the preverious macroblock
		this.sliceBegin = false;
		this.macroblockAddress += increment;
	}
	else {
		if( this.macroblockAddress + increment >= this.mbSize ) {
			// Illegal (too large) macroblock_address_increment
			return;
		}
		if( increment > 1 ) {
			// Skipped macroblocks reset DC predictors
			this.dcPredictorY  = 128;
			this.dcPredictorCr = 128;
			this.dcPredictorCb = 128;
			
			// Skipped macroblocks in P-pictures reset motion vectors
			if( this.pictureCodingType == PICTURE_TYPE_P ) {
				this.motionFwH = this.motionFwHPrev = 0;
				this.motionFwV = this.motionFwVPrev = 0;
			}
		}
		
		// Predict skipped macroblocks
		while( increment > 1) {
			this.macroblockAddress++;
			this.mbRow = (this.macroblockAddress / this.mbWidth)|0;
			this.mbCol = this.macroblockAddress % this.mbWidth;
			this.copyMacroblock(this.motionFwH, this.motionFwV, this.forwardY, this.forwardCr, this.forwardCb);
			increment--;
		}
		this.macroblockAddress++;
	}
	this.mbRow = (this.macroblockAddress / this.mbWidth)|0;
	this.mbCol = this.macroblockAddress % this.mbWidth;

	// Process the current macroblock
	this.macroblockType = this.readCode(MACROBLOCK_TYPE_TABLES[this.pictureCodingType]);
	this.macroblockIntra = (this.macroblockType & 0x01);
	this.macroblockMotFw = (this.macroblockType & 0x08);

	// Quantizer scale
	if( (this.macroblockType & 0x10) != 0 ) {
		this.quantizerScale = this.buffer.getBits(5);
	}

	if( this.macroblockIntra ) {
		// Intra-coded macroblocks reset motion vectors
		this.motionFwH = this.motionFwHPrev = 0;
		this.motionFwV = this.motionFwVPrev = 0;
	}
	else {
		// Non-intra macroblocks reset DC predictors
		this.dcPredictorY = 128;
		this.dcPredictorCr = 128;
		this.dcPredictorCb = 128;
		
		this.decodeMotionVectors();
		this.copyMacroblock(this.motionFwH, this.motionFwV, this.forwardY, this.forwardCr, this.forwardCb);
	}

	// Decode blocks
	var cbp = ((this.macroblockType & 0x02) != 0) 
		? this.readCode(CODE_BLOCK_PATTERN) 
		: (this.macroblockIntra ? 0x3f : 0);

	for( var block = 0, mask = 0x20; block < 6; block++ ) {
		if( (cbp & mask) != 0 ) {
			this.decodeBlock(block);
		}
		mask >>= 1;
	}
};


jsmpeg.prototype.decodeMotionVectors = function() {
	var code, d, r = 0;
	
	// Forward
	if( this.macroblockMotFw ) {
		// Horizontal forward
		code = this.readCode(MOTION);
		if( (code != 0) && (this.forwardF != 1) ) {
			r = this.buffer.getBits(this.forwardRSize);
			d = ((Math.abs(code) - 1) << this.forwardRSize) + r + 1;
			if( code < 0 ) {
				d = -d;
			}
		}
		else {
			d = code;
		}
		
		this.motionFwHPrev += d;
		if( this.motionFwHPrev > (this.forwardF << 4) - 1 ) {
			this.motionFwHPrev -= this.forwardF << 5;
		}
		else if( this.motionFwHPrev < ((-this.forwardF) << 4) ) {
			this.motionFwHPrev += this.forwardF << 5;
		}
		
		this.motionFwH = this.motionFwHPrev;
		if( this.fullPelForward ) {
			this.motionFwH <<= 1;
		}
		
		// Vertical forward
		code = this.readCode(MOTION);
		if( (code != 0) && (this.forwardF != 1) ) {
			r = this.buffer.getBits(this.forwardRSize);
			d = ((Math.abs(code) - 1) << this.forwardRSize) + r + 1;
			if( code < 0 ) {
				d = -d;
			}
		}
		else {
			d = code;
		}
		
		this.motionFwVPrev += d;
		if( this.motionFwVPrev > (this.forwardF << 4) - 1 ) {
			this.motionFwVPrev -= this.forwardF << 5;
		}
		else if( this.motionFwVPrev < ((-this.forwardF) << 4) ) {
			this.motionFwVPrev += this.forwardF << 5;
		}
		
		this.motionFwV = this.motionFwVPrev;
		if( this.fullPelForward ) {
			this.motionFwV <<= 1;
		}
	}
	else if( this.pictureCodingType == PICTURE_TYPE_P ) {
		// No motion information in P-picture, reset vectors
		this.motionFwH = this.motionFwHPrev = 0;
		this.motionFwV = this.motionFwVPrev = 0;
	}
};

jsmpeg.prototype.copyMacroblock = function(motionH, motionV, sY, sCr, sCb ) {
	var 
		width, scan, 
		H, V, oddH, oddV,
		src, dest, last;

	// We use 32bit writes here
	var dY = this.currentY32;
	var dCb = this.currentCb32;
	var dCr = this.currentCr32;

	// Luminance
	width = this.codedWidth;
	scan = width - 16;
	
	H = motionH >> 1;
	V = motionV >> 1;
	oddH = (motionH & 1) == 1;
	oddV = (motionV & 1) == 1;
	
	src = ((this.mbRow << 4) + V) * width + (this.mbCol << 4) + H;
	dest = (this.mbRow * width + this.mbCol) << 2;
	last = dest + (width << 2);

	var y1, y2, y;
	if( oddH ) {
		if( oddV ) {
			while( dest < last ) {
				y1 = sY[src] + sY[src+width]; src++;
				for( var x = 0; x < 4; x++ ) {
					y2 = sY[src] + sY[src+width]; src++;
					y = (((y1 + y2 + 2) >> 2) & 0xff);

					y1 = sY[src] + sY[src+width]; src++;
					y |= (((y1 + y2 + 2) << 6) & 0xff00);
					
					y2 = sY[src] + sY[src+width]; src++;
					y |= (((y1 + y2 + 2) << 14) & 0xff0000);

					y1 = sY[src] + sY[src+width]; src++;
					y |= (((y1 + y2 + 2) << 22) & 0xff000000);

					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
		else {
			while( dest < last ) {
				y1 = sY[src++];
				for( var x = 0; x < 4; x++ ) {
					y2 = sY[src++];
					y = (((y1 + y2 + 1) >> 1) & 0xff);
					
					y1 = sY[src++];
					y |= (((y1 + y2 + 1) << 7) & 0xff00);
					
					y2 = sY[src++];
					y |= (((y1 + y2 + 1) << 15) & 0xff0000);
					
					y1 = sY[src++];
					y |= (((y1 + y2 + 1) << 23) & 0xff000000);

					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
	}
	else {
		if( oddV ) {
			while( dest < last ) {
				for( var x = 0; x < 4; x++ ) {
					y = (((sY[src] + sY[src+width] + 1) >> 1) & 0xff); src++;
					y |= (((sY[src] + sY[src+width] + 1) << 7) & 0xff00); src++;
					y |= (((sY[src] + sY[src+width] + 1) << 15) & 0xff0000); src++;
					y |= (((sY[src] + sY[src+width] + 1) << 23) & 0xff000000); src++;
					
					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan;
			}
		}
		else {
			while( dest < last ) {
				for( var x = 0; x < 4; x++ ) {
					y = sY[src]; src++;
					y |= sY[src] << 8; src++;
					y |= sY[src] << 16; src++;
					y |= sY[src] << 24; src++;

					dY[dest++] = y;
				}
				dest += scan >> 2; src += scan;
			}
		}
	}
	
	if( this.bwFilter ) {
		// No need to copy chrominance when black&white filter is active
		return;
	}
	

	// Chrominance
	
	width = this.halfWidth;
	scan = width - 8;
	
	H = (motionH/2) >> 1;
	V = (motionV/2) >> 1;
	oddH = ((motionH/2) & 1) == 1;
	oddV = ((motionV/2) & 1) == 1;
	
	src = ((this.mbRow << 3) + V) * width + (this.mbCol << 3) + H;
	dest = (this.mbRow * width + this.mbCol) << 1;
	last = dest + (width << 1);
	
	var cr1, cr2, cr;
	var cb1, cb2, cb;
	if( oddH ) {
		if( oddV ) {
			while( dest < last ) {
				cr1 = sCr[src] + sCr[src+width];
				cb1 = sCb[src] + sCb[src+width];
				src++;
				for( var x = 0; x < 2; x++ ) {
					cr2 = sCr[src] + sCr[src+width];
					cb2 = sCb[src] + sCb[src+width]; src++;
					cr = (((cr1 + cr2 + 2) >> 2) & 0xff);
					cb = (((cb1 + cb2 + 2) >> 2) & 0xff);

					cr1 = sCr[src] + sCr[src+width];
					cb1 = sCb[src] + sCb[src+width]; src++;
					cr |= (((cr1 + cr2 + 2) << 6) & 0xff00);
					cb |= (((cb1 + cb2 + 2) << 6) & 0xff00);

					cr2 = sCr[src] + sCr[src+width];
					cb2 = sCb[src] + sCb[src+width]; src++;
					cr |= (((cr1 + cr2 + 2) << 14) & 0xff0000);
					cb |= (((cb1 + cb2 + 2) << 14) & 0xff0000);

					cr1 = sCr[src] + sCr[src+width];
					cb1 = sCb[src] + sCb[src+width]; src++;
					cr |= (((cr1 + cr2 + 2) << 22) & 0xff000000);
					cb |= (((cb1 + cb2 + 2) << 22) & 0xff000000);

					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
		else {
			while( dest < last ) {
				cr1 = sCr[src];
				cb1 = sCb[src];
				src++;
				for( var x = 0; x < 2; x++ ) {
					cr2 = sCr[src];
					cb2 = sCb[src++];
					cr = (((cr1 + cr2 + 1) >> 1) & 0xff);
					cb = (((cb1 + cb2 + 1) >> 1) & 0xff);

					cr1 = sCr[src];
					cb1 = sCb[src++];
					cr |= (((cr1 + cr2 + 1) << 7) & 0xff00);
					cb |= (((cb1 + cb2 + 1) << 7) & 0xff00);

					cr2 = sCr[src];
					cb2 = sCb[src++];
					cr |= (((cr1 + cr2 + 1) << 15) & 0xff0000);
					cb |= (((cb1 + cb2 + 1) << 15) & 0xff0000);

					cr1 = sCr[src];
					cb1 = sCb[src++];
					cr |= (((cr1 + cr2 + 1) << 23) & 0xff000000);
					cb |= (((cb1 + cb2 + 1) << 23) & 0xff000000);

					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan-1;
			}
		}
	}
	else {
		if( oddV ) {
			while( dest < last ) {
				for( var x = 0; x < 2; x++ ) {
					cr = (((sCr[src] + sCr[src+width] + 1) >> 1) & 0xff);
					cb = (((sCb[src] + sCb[src+width] + 1) >> 1) & 0xff); src++;

					cr |= (((sCr[src] + sCr[src+width] + 1) << 7) & 0xff00);
					cb |= (((sCb[src] + sCb[src+width] + 1) << 7) & 0xff00); src++;

					cr |= (((sCr[src] + sCr[src+width] + 1) << 15) & 0xff0000);
					cb |= (((sCb[src] + sCb[src+width] + 1) << 15) & 0xff0000); src++;

					cr |= (((sCr[src] + sCr[src+width] + 1) << 23) & 0xff000000);
					cb |= (((sCb[src] + sCb[src+width] + 1) << 23) & 0xff000000); src++;
					
					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan;
			}
		}
		else {
			while( dest < last ) {
				for( var x = 0; x < 2; x++ ) {
					cr = sCr[src];
					cb = sCb[src]; src++;

					cr |= sCr[src] << 8;
					cb |= sCb[src] << 8; src++;

					cr |= sCr[src] << 16;
					cb |= sCb[src] << 16; src++;

					cr |= sCr[src] << 24;
					cb |= sCb[src] << 24; src++;

					dCr[dest] = cr;
					dCb[dest] = cb;
					dest++;
				}
				dest += scan >> 2; src += scan;
			}
		}
	}
};


// ----------------------------------------------------------------------------
// Block layer

jsmpeg.prototype.dcPredictorY;
jsmpeg.prototype.dcPredictorCr;
jsmpeg.prototype.dcPredictorCb;

jsmpeg.prototype.blockData = null;
jsmpeg.prototype.decodeBlock = function(block) {
	
	var
		n = 0,
		quantMatrix;
	
	// Clear preverious data
	this.fillArray(this.blockData, 0);
	
	// Decode DC coefficient of intra-coded blocks
	if( this.macroblockIntra ) {
		var 
			predictor,
			dctSize;
		
		// DC prediction
		
		if( block < 4 ) {
			predictor = this.dcPredictorY;
			dctSize = this.readCode(DCT_DC_SIZE_LUMINANCE);
		}
		else {
			predictor = (block == 4 ? this.dcPredictorCr : this.dcPredictorCb);
			dctSize = this.readCode(DCT_DC_SIZE_CHROMINANCE);
		}
		
		// Read DC coeff
		if( dctSize > 0 ) {
			var differential = this.buffer.getBits(dctSize);
			if( (differential & (1 << (dctSize - 1))) != 0 ) {
				this.blockData[0] = predictor + differential;
			}
			else {
				this.blockData[0] = predictor + ((-1 << dctSize)|(differential+1));
			}
		}
		else {
			this.blockData[0] = predictor;
		}
		
		// Save predictor value
		if( block < 4 ) {
			this.dcPredictorY = this.blockData[0];
		}
		else if( block == 4 ) {
			this.dcPredictorCr = this.blockData[0];
		}
		else {
			this.dcPredictorCb = this.blockData[0];
		}
		
		// Dequantize + premultiply
		this.blockData[0] <<= (3 + 5);
		
		quantMatrix = this.intraQuantMatrix;
		n = 1;
	}
	else {
		quantMatrix = this.nonIntraQuantMatrix;
	}
	
	// Decode AC coefficients (+DC for non-intra)
	var level = 0;
	while( true ) {
		var 
			run = 0,
			coeff = this.readCode(DCT_COEFF);
		
		if( (coeff == 0x0001) && (n > 0) && (this.buffer.getBits(1) == 0) ) {
			// end_of_block
			break;
		}
		if( coeff == 0xffff ) {
			// escape
			run = this.buffer.getBits(6);
			level = this.buffer.getBits(8);
			if( level == 0 ) {
				level = this.buffer.getBits(8);
			}
			else if( level == 128 ) {
				level = this.buffer.getBits(8) - 256;
			}
			else if( level > 128 ) {
				level = level - 256;
			}
		}
		else {
			run = coeff >> 8;
			level = coeff & 0xff;
			if( this.buffer.getBits(1) ) {
				level = -level;
			}
		}
		
		n += run;
		var dezigZagged = ZIG_ZAG[n];
		n++;
		
		// Dequantize, oddify, clip
		level <<= 1;
		if( !this.macroblockIntra ) {
			level += (level < 0 ? -1 : 1);
		}
		level = (level * this.quantizerScale * quantMatrix[dezigZagged]) >> 4;
		if( (level & 1) == 0 ) {
			level -= level > 0 ? 1 : -1;
		}
		if( level > 2047 ) {
			level = 2047;
		}
		else if( level < -2048 ) {
			level = -2048;
		}

		// Save premultiplied coefficient
		this.blockData[dezigZagged] = level * PREMULTIPLIER_MATRIX[dezigZagged];
	};
	
	// Transform block data to the spatial domain
	if( n == 1 ) {
		// Only DC coeff., no IDCT needed
		this.fillArray(this.blockData, (this.blockData[0] + 128) >> 8);
	}
	else {
		this.IDCT();
	}
	
	// Move block to its place
	var
		destArray,
		destIndex,
		scan;
	
	if( block < 4 ) {
		destArray = this.currentY;
		scan = this.codedWidth - 8;
		destIndex = (this.mbRow * this.codedWidth + this.mbCol) << 4;
		if( (block & 1) != 0 ) {
			destIndex += 8;
		}
		if( (block & 2) != 0 ) {
			destIndex += this.codedWidth << 3;
		}
	}
	else {
		destArray = (block == 4) ? this.currentCb : this.currentCr;
		scan = (this.codedWidth >> 1) - 8;
		destIndex = ((this.mbRow * this.codedWidth) << 2) + (this.mbCol << 3);
	}
	
	n = 0;
	
	var blockData = this.blockData;
	if( this.macroblockIntra ) {
		// Overwrite (no prediction)
		this.copyBlockToDestination(this.blockData, destArray, destIndex, scan);
	}
	else {
		// Add data to the predicted macroblock
		this.addBlockToDestination(this.blockData, destArray, destIndex, scan);
	}
};


jsmpeg.prototype.copyBlockToDestination = function(blockData, destArray, destIndex, scan) {
	var n = 0;
	for( var i = 0; i < 8; i++ ) {
		for( var j = 0; j < 8; j++ ) {
			destArray[destIndex++] = blockData[n++];
		}
		destIndex += scan;
	}
};

jsmpeg.prototype.addBlockToDestination = function(blockData, destArray, destIndex, scan) {
	var n = 0;
	for( var i = 0; i < 8; i++ ) {
		for( var j = 0; j < 8; j++ ) {
			destArray[destIndex++] += blockData[n++];
		}
		destIndex += scan;
	}
};

// Clamping version for shitty browsers (IE) that don't support Uint8ClampedArray
jsmpeg.prototype.copyBlockToDestinationClamp = function(blockData, destArray, destIndex, scan) {
	var n = 0;
	for( var i = 0; i < 8; i++ ) {
		for( var j = 0; j < 8; j++ ) {
			var p = blockData[n++];
			destArray[destIndex++] = p > 255 ? 255 : (p < 0 ? 0 : p);
		}
		destIndex += scan;
	}
};

jsmpeg.prototype.addBlockToDestinationClamp = function(blockData, destArray, destIndex, scan) {
	var n = 0;
	for( var i = 0; i < 8; i++ ) {
		for( var j = 0; j < 8; j++ ) {
			var p = blockData[n++] + destArray[destIndex];
			destArray[destIndex++] = p > 255 ? 255 : (p < 0 ? 0 : p);
		}
		destIndex += scan;
	}
};

jsmpeg.prototype.IDCT = function() {
	// See http://vsr.informatik.tu-chemnitz.de/~jan/MPEG/HTML/IDCT.html
	// for more info.
	
	var 
		b1, b3, b4, b6, b7, tmp1, tmp2, m0,
		x0, x1, x2, x3, x4, y3, y4, y5, y6, y7,
		i,
		blockData = this.blockData;
	
	// Transform columns
	for( i = 0; i < 8; ++i ) {
		b1 =  blockData[4*8+i];
		b3 =  blockData[2*8+i] + blockData[6*8+i];
		b4 =  blockData[5*8+i] - blockData[3*8+i];
		tmp1 = blockData[1*8+i] + blockData[7*8+i];
		tmp2 = blockData[3*8+i] + blockData[5*8+i];
		b6 = blockData[1*8+i] - blockData[7*8+i];
		b7 = tmp1 + tmp2;
		m0 =  blockData[0*8+i];
		x4 =  ((b6*473 - b4*196 + 128) >> 8) - b7;
		x0 =  x4 - (((tmp1 - tmp2)*362 + 128) >> 8);
		x1 =  m0 - b1;
		x2 =  (((blockData[2*8+i] - blockData[6*8+i])*362 + 128) >> 8) - b3;
		x3 =  m0 + b1;
		y3 =  x1 + x2;
		y4 =  x3 + b3;
		y5 =  x1 - x2;
		y6 =  x3 - b3;
		y7 = -x0 - ((b4*473 + b6*196 + 128) >> 8);
		blockData[0*8+i] =  b7 + y4;
		blockData[1*8+i] =  x4 + y3;
		blockData[2*8+i] =  y5 - x0;
		blockData[3*8+i] =  y6 - y7;
		blockData[4*8+i] =  y6 + y7;
		blockData[5*8+i] =  x0 + y5;
		blockData[6*8+i] =  y3 - x4;
		blockData[7*8+i] =  y4 - b7;
	}
	
	// Transform rows
	for( i = 0; i < 64; i += 8 ) {
		b1 =  blockData[4+i];
		b3 =  blockData[2+i] + blockData[6+i];
		b4 =  blockData[5+i] - blockData[3+i];
		tmp1 = blockData[1+i] + blockData[7+i];
		tmp2 = blockData[3+i] + blockData[5+i];
		b6 = blockData[1+i] - blockData[7+i];
		b7 = tmp1 + tmp2;
		m0 =  blockData[0+i];
		x4 =  ((b6*473 - b4*196 + 128) >> 8) - b7;
		x0 =  x4 - (((tmp1 - tmp2)*362 + 128) >> 8);
		x1 =  m0 - b1;
		x2 =  (((blockData[2+i] - blockData[6+i])*362 + 128) >> 8) - b3;
		x3 =  m0 + b1;
		y3 =  x1 + x2;
		y4 =  x3 + b3;
		y5 =  x1 - x2;
		y6 =  x3 - b3;
		y7 = -x0 - ((b4*473 + b6*196 + 128) >> 8);
		blockData[0+i] =  (b7 + y4 + 128) >> 8;
		blockData[1+i] =  (x4 + y3 + 128) >> 8;
		blockData[2+i] =  (y5 - x0 + 128) >> 8;
		blockData[3+i] =  (y6 - y7 + 128) >> 8;
		blockData[4+i] =  (y6 + y7 + 128) >> 8;
		blockData[5+i] =  (x0 + y5 + 128) >> 8;
		blockData[6+i] =  (y3 - x4 + 128) >> 8;
		blockData[7+i] =  (y4 - b7 + 128) >> 8;
	}
};


// ----------------------------------------------------------------------------
// VLC Tables and Constants

var
	SOCKET_MAGIC_BYTES = 'jsmp',
	DECODE_SKIP_OUTPUT = 1,
	PICTURE_RATE = [
		0.000, 23.976, 24.000, 25.000, 29.970, 30.000, 50.000, 59.940,
		60.000,  0.000,  0.000,  0.000,  0.000,  0.000,  0.000,  0.000
	],
	ZIG_ZAG = new Uint8Array([
		 0,  1,  8, 16,  9,  2,  3, 10,
		17, 24, 32, 25, 18, 11,  4,  5,
		12, 19, 26, 33, 40, 48, 41, 34,
		27, 20, 13,  6,  7, 14, 21, 28,
		35, 42, 49, 56, 57, 50, 43, 36,
		29, 22, 15, 23, 30, 37, 44, 51,
		58, 59, 52, 45, 38, 31, 39, 46,
		53, 60, 61, 54, 47, 55, 62, 63
	]),
	DEFAULT_INTRA_QUANT_MATRIX = new Uint8Array([
		 8, 16, 19, 22, 26, 27, 29, 34,
		16, 16, 22, 24, 27, 29, 34, 37,
		19, 22, 26, 27, 29, 34, 34, 38,
		22, 22, 26, 27, 29, 34, 37, 40,
		22, 26, 27, 29, 32, 35, 40, 48,
		26, 27, 29, 32, 35, 40, 48, 58,
		26, 27, 29, 34, 38, 46, 56, 69,
		27, 29, 35, 38, 46, 56, 69, 83
	]),
	DEFAULT_NON_INTRA_QUANT_MATRIX = new Uint8Array([
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16,
		16, 16, 16, 16, 16, 16, 16, 16
	]),
	
	PREMULTIPLIER_MATRIX = new Uint8Array([
		32, 44, 42, 38, 32, 25, 17,  9,
		44, 62, 58, 52, 44, 35, 24, 12,
		42, 58, 55, 49, 42, 33, 23, 12,
		38, 52, 49, 44, 38, 30, 20, 10,
		32, 44, 42, 38, 32, 25, 17,  9,
		25, 35, 33, 30, 25, 20, 14,  7,
		17, 24, 23, 20, 17, 14,  9,  5,
		 9, 12, 12, 10,  9,  7,  5,  2
	]),
	
	// MPEG-1 VLC
	
	//  macroblock_stuffing decodes as 34.
	//  macroblock_escape decodes as 35.
	
	MACROBLOCK_ADDRESS_INCREMENT = new Int16Array([
		 1*3,  2*3,  0, //   0
		 3*3,  4*3,  0, //   1  0
		   0,    0,  1, //   2  1.
		 5*3,  6*3,  0, //   3  00
		 7*3,  8*3,  0, //   4  01
		 9*3, 10*3,  0, //   5  000
		11*3, 12*3,  0, //   6  001
		   0,    0,  3, //   7  010.
		   0,    0,  2, //   8  011.
		13*3, 14*3,  0, //   9  0000
		15*3, 16*3,  0, //  10  0001
		   0,    0,  5, //  11  0010.
		   0,    0,  4, //  12  0011.
		17*3, 18*3,  0, //  13  0000 0
		19*3, 20*3,  0, //  14  0000 1
		   0,    0,  7, //  15  0001 0.
		   0,    0,  6, //  16  0001 1.
		21*3, 22*3,  0, //  17  0000 00
		23*3, 24*3,  0, //  18  0000 01
		25*3, 26*3,  0, //  19  0000 10
		27*3, 28*3,  0, //  20  0000 11
		  -1, 29*3,  0, //  21  0000 000
		  -1, 30*3,  0, //  22  0000 001
		31*3, 32*3,  0, //  23  0000 010
		33*3, 34*3,  0, //  24  0000 011
		35*3, 36*3,  0, //  25  0000 100
		37*3, 38*3,  0, //  26  0000 101
		   0,    0,  9, //  27  0000 110.
		   0,    0,  8, //  28  0000 111.
		39*3, 40*3,  0, //  29  0000 0001
		41*3, 42*3,  0, //  30  0000 0011
		43*3, 44*3,  0, //  31  0000 0100
		45*3, 46*3,  0, //  32  0000 0101
		   0,    0, 15, //  33  0000 0110.
		   0,    0, 14, //  34  0000 0111.
		   0,    0, 13, //  35  0000 1000.
		   0,    0, 12, //  36  0000 1001.
		   0,    0, 11, //  37  0000 1010.
		   0,    0, 10, //  38  0000 1011.
		47*3,   -1,  0, //  39  0000 0001 0
		  -1, 48*3,  0, //  40  0000 0001 1
		49*3, 50*3,  0, //  41  0000 0011 0
		51*3, 52*3,  0, //  42  0000 0011 1
		53*3, 54*3,  0, //  43  0000 0100 0
		55*3, 56*3,  0, //  44  0000 0100 1
		57*3, 58*3,  0, //  45  0000 0101 0
		59*3, 60*3,  0, //  46  0000 0101 1
		61*3,   -1,  0, //  47  0000 0001 00
		  -1, 62*3,  0, //  48  0000 0001 11
		63*3, 64*3,  0, //  49  0000 0011 00
		65*3, 66*3,  0, //  50  0000 0011 01
		67*3, 68*3,  0, //  51  0000 0011 10
		69*3, 70*3,  0, //  52  0000 0011 11
		71*3, 72*3,  0, //  53  0000 0100 00
		73*3, 74*3,  0, //  54  0000 0100 01
		   0,    0, 21, //  55  0000 0100 10.
		   0,    0, 20, //  56  0000 0100 11.
		   0,    0, 19, //  57  0000 0101 00.
		   0,    0, 18, //  58  0000 0101 01.
		   0,    0, 17, //  59  0000 0101 10.
		   0,    0, 16, //  60  0000 0101 11.
		   0,    0, 35, //  61  0000 0001 000. -- macroblock_escape
		   0,    0, 34, //  62  0000 0001 111. -- macroblock_stuffing
		   0,    0, 33, //  63  0000 0011 000.
		   0,    0, 32, //  64  0000 0011 001.
		   0,    0, 31, //  65  0000 0011 010.
		   0,    0, 30, //  66  0000 0011 011.
		   0,    0, 29, //  67  0000 0011 100.
		   0,    0, 28, //  68  0000 0011 101.
		   0,    0, 27, //  69  0000 0011 110.
		   0,    0, 26, //  70  0000 0011 111.
		   0,    0, 25, //  71  0000 0100 000.
		   0,    0, 24, //  72  0000 0100 001.
		   0,    0, 23, //  73  0000 0100 010.
		   0,    0, 22  //  74  0000 0100 011.
	]),
	
	//  macroblock_type bitmap:
	//    0x10  macroblock_quant
	//    0x08  macroblock_motion_forward
	//    0x04  macroblock_motion_backward
	//    0x02  macrobkock_pattern
	//    0x01  macroblock_intra
	//
	
	MACROBLOCK_TYPE_I = new Int8Array([
		 1*3,  2*3,     0, //   0
		  -1,  3*3,     0, //   1  0
		   0,    0,  0x01, //   2  1.
		   0,    0,  0x11  //   3  01.
	]),
	
	MACROBLOCK_TYPE_P = new Int8Array([
		 1*3,  2*3,     0, //  0
		 3*3,  4*3,     0, //  1  0
		   0,    0,  0x0a, //  2  1.
		 5*3,  6*3,     0, //  3  00
		   0,    0,  0x02, //  4  01.
		 7*3,  8*3,     0, //  5  000
		   0,    0,  0x08, //  6  001.
		 9*3, 10*3,     0, //  7  0000
		11*3, 12*3,     0, //  8  0001
		  -1, 13*3,     0, //  9  00000
		   0,    0,  0x12, // 10  00001.
		   0,    0,  0x1a, // 11  00010.
		   0,    0,  0x01, // 12  00011.
		   0,    0,  0x11  // 13  000001.
	]),
	
	MACROBLOCK_TYPE_B = new Int8Array([
		 1*3,  2*3,     0,  //  0
		 3*3,  5*3,     0,  //  1  0
		 4*3,  6*3,     0,  //  2  1
		 8*3,  7*3,     0,  //  3  00
		   0,    0,  0x0c,  //  4  10.
		 9*3, 10*3,     0,  //  5  01
		   0,    0,  0x0e,  //  6  11.
		13*3, 14*3,     0,  //  7  001
		12*3, 11*3,     0,  //  8  000
		   0,    0,  0x04,  //  9  010.
		   0,    0,  0x06,  // 10  011.
		18*3, 16*3,     0,  // 11  0001
		15*3, 17*3,     0,  // 12  0000
		   0,    0,  0x08,  // 13  0010.
		   0,    0,  0x0a,  // 14  0011.
		  -1, 19*3,     0,  // 15  00000
		   0,    0,  0x01,  // 16  00011.
		20*3, 21*3,     0,  // 17  00001
		   0,    0,  0x1e,  // 18  00010.
		   0,    0,  0x11,  // 19  000001.
		   0,    0,  0x16,  // 20  000010.
		   0,    0,  0x1a   // 21  000011.
	]),
	
	CODE_BLOCK_PATTERN = new Int16Array([
		  2*3,   1*3,   0,  //   0
		  3*3,   6*3,   0,  //   1  1
		  4*3,   5*3,   0,  //   2  0
		  8*3,  11*3,   0,  //   3  10
		 12*3,  13*3,   0,  //   4  00
		  9*3,   7*3,   0,  //   5  01
		 10*3,  14*3,   0,  //   6  11
		 20*3,  19*3,   0,  //   7  011
		 18*3,  16*3,   0,  //   8  100
		 23*3,  17*3,   0,  //   9  010
		 27*3,  25*3,   0,  //  10  110
		 21*3,  28*3,   0,  //  11  101
		 15*3,  22*3,   0,  //  12  000
		 24*3,  26*3,   0,  //  13  001
		    0,     0,  60,  //  14  111.
		 35*3,  40*3,   0,  //  15  0000
		 44*3,  48*3,   0,  //  16  1001
		 38*3,  36*3,   0,  //  17  0101
		 42*3,  47*3,   0,  //  18  1000
		 29*3,  31*3,   0,  //  19  0111
		 39*3,  32*3,   0,  //  20  0110
		    0,     0,  32,  //  21  1010.
		 45*3,  46*3,   0,  //  22  0001
		 33*3,  41*3,   0,  //  23  0100
		 43*3,  34*3,   0,  //  24  0010
		    0,     0,   4,  //  25  1101.
		 30*3,  37*3,   0,  //  26  0011
		    0,     0,   8,  //  27  1100.
		    0,     0,  16,  //  28  1011.
		    0,     0,  44,  //  29  0111 0.
		 50*3,  56*3,   0,  //  30  0011 0
		    0,     0,  28,  //  31  0111 1.
		    0,     0,  52,  //  32  0110 1.
		    0,     0,  62,  //  33  0100 0.
		 61*3,  59*3,   0,  //  34  0010 1
		 52*3,  60*3,   0,  //  35  0000 0
		    0,     0,   1,  //  36  0101 1.
		 55*3,  54*3,   0,  //  37  0011 1
		    0,     0,  61,  //  38  0101 0.
		    0,     0,  56,  //  39  0110 0.
		 57*3,  58*3,   0,  //  40  0000 1
		    0,     0,   2,  //  41  0100 1.
		    0,     0,  40,  //  42  1000 0.
		 51*3,  62*3,   0,  //  43  0010 0
		    0,     0,  48,  //  44  1001 0.
		 64*3,  63*3,   0,  //  45  0001 0
		 49*3,  53*3,   0,  //  46  0001 1
		    0,     0,  20,  //  47  1000 1.
		    0,     0,  12,  //  48  1001 1.
		 80*3,  83*3,   0,  //  49  0001 10
		    0,     0,  63,  //  50  0011 00.
		 77*3,  75*3,   0,  //  51  0010 00
		 65*3,  73*3,   0,  //  52  0000 00
		 84*3,  66*3,   0,  //  53  0001 11
		    0,     0,  24,  //  54  0011 11.
		    0,     0,  36,  //  55  0011 10.
		    0,     0,   3,  //  56  0011 01.
		 69*3,  87*3,   0,  //  57  0000 10
		 81*3,  79*3,   0,  //  58  0000 11
		 68*3,  71*3,   0,  //  59  0010 11
		 70*3,  78*3,   0,  //  60  0000 01
		 67*3,  76*3,   0,  //  61  0010 10
		 72*3,  74*3,   0,  //  62  0010 01
		 86*3,  85*3,   0,  //  63  0001 01
		 88*3,  82*3,   0,  //  64  0001 00
		   -1,  94*3,   0,  //  65  0000 000
		 95*3,  97*3,   0,  //  66  0001 111
		    0,     0,  33,  //  67  0010 100.
		    0,     0,   9,  //  68  0010 110.
		106*3, 110*3,   0,  //  69  0000 100
		102*3, 116*3,   0,  //  70  0000 010
		    0,     0,   5,  //  71  0010 111.
		    0,     0,  10,  //  72  0010 010.
		 93*3,  89*3,   0,  //  73  0000 001
		    0,     0,   6,  //  74  0010 011.
		    0,     0,  18,  //  75  0010 001.
		    0,     0,  17,  //  76  0010 101.
		    0,     0,  34,  //  77  0010 000.
		113*3, 119*3,   0,  //  78  0000 011
		103*3, 104*3,   0,  //  79  0000 111
		 90*3,  92*3,   0,  //  80  0001 100
		109*3, 107*3,   0,  //  81  0000 110
		117*3, 118*3,   0,  //  82  0001 001
		101*3,  99*3,   0,  //  83  0001 101
		 98*3,  96*3,   0,  //  84  0001 110
		100*3,  91*3,   0,  //  85  0001 011
		114*3, 115*3,   0,  //  86  0001 010
		105*3, 108*3,   0,  //  87  0000 101
		112*3, 111*3,   0,  //  88  0001 000
		121*3, 125*3,   0,  //  89  0000 0011
		    0,     0,  41,  //  90  0001 1000.
		    0,     0,  14,  //  91  0001 0111.
		    0,     0,  21,  //  92  0001 1001.
		124*3, 122*3,   0,  //  93  0000 0010
		120*3, 123*3,   0,  //  94  0000 0001
		    0,     0,  11,  //  95  0001 1110.
		    0,     0,  19,  //  96  0001 1101.
		    0,     0,   7,  //  97  0001 1111.
		    0,     0,  35,  //  98  0001 1100.
		    0,     0,  13,  //  99  0001 1011.
		    0,     0,  50,  // 100  0001 0110.
		    0,     0,  49,  // 101  0001 1010.
		    0,     0,  58,  // 102  0000 0100.
		    0,     0,  37,  // 103  0000 1110.
		    0,     0,  25,  // 104  0000 1111.
		    0,     0,  45,  // 105  0000 1010.
		    0,     0,  57,  // 106  0000 1000.
		    0,     0,  26,  // 107  0000 1101.
		    0,     0,  29,  // 108  0000 1011.
		    0,     0,  38,  // 109  0000 1100.
		    0,     0,  53,  // 110  0000 1001.
		    0,     0,  23,  // 111  0001 0001.
		    0,     0,  43,  // 112  0001 0000.
		    0,     0,  46,  // 113  0000 0110.
		    0,     0,  42,  // 114  0001 0100.
		    0,     0,  22,  // 115  0001 0101.
		    0,     0,  54,  // 116  0000 0101.
		    0,     0,  51,  // 117  0001 0010.
		    0,     0,  15,  // 118  0001 0011.
		    0,     0,  30,  // 119  0000 0111.
		    0,     0,  39,  // 120  0000 0001 0.
		    0,     0,  47,  // 121  0000 0011 0.
		    0,     0,  55,  // 122  0000 0010 1.
		    0,     0,  27,  // 123  0000 0001 1.
		    0,     0,  59,  // 124  0000 0010 0.
		    0,     0,  31   // 125  0000 0011 1.
	]),
	
	MOTION = new Int16Array([
		  1*3,   2*3,   0,  //   0
		  4*3,   3*3,   0,  //   1  0
		    0,     0,   0,  //   2  1.
		  6*3,   5*3,   0,  //   3  01
		  8*3,   7*3,   0,  //   4  00
		    0,     0,  -1,  //   5  011.
		    0,     0,   1,  //   6  010.
		  9*3,  10*3,   0,  //   7  001
		 12*3,  11*3,   0,  //   8  000
		    0,     0,   2,  //   9  0010.
		    0,     0,  -2,  //  10  0011.
		 14*3,  15*3,   0,  //  11  0001
		 16*3,  13*3,   0,  //  12  0000
		 20*3,  18*3,   0,  //  13  0000 1
		    0,     0,   3,  //  14  0001 0.
		    0,     0,  -3,  //  15  0001 1.
		 17*3,  19*3,   0,  //  16  0000 0
		   -1,  23*3,   0,  //  17  0000 00
		 27*3,  25*3,   0,  //  18  0000 11
		 26*3,  21*3,   0,  //  19  0000 01
		 24*3,  22*3,   0,  //  20  0000 10
		 32*3,  28*3,   0,  //  21  0000 011
		 29*3,  31*3,   0,  //  22  0000 101
		   -1,  33*3,   0,  //  23  0000 001
		 36*3,  35*3,   0,  //  24  0000 100
		    0,     0,  -4,  //  25  0000 111.
		 30*3,  34*3,   0,  //  26  0000 010
		    0,     0,   4,  //  27  0000 110.
		    0,     0,  -7,  //  28  0000 0111.
		    0,     0,   5,  //  29  0000 1010.
		 37*3,  41*3,   0,  //  30  0000 0100
		    0,     0,  -5,  //  31  0000 1011.
		    0,     0,   7,  //  32  0000 0110.
		 38*3,  40*3,   0,  //  33  0000 0011
		 42*3,  39*3,   0,  //  34  0000 0101
		    0,     0,  -6,  //  35  0000 1001.
		    0,     0,   6,  //  36  0000 1000.
		 51*3,  54*3,   0,  //  37  0000 0100 0
		 50*3,  49*3,   0,  //  38  0000 0011 0
		 45*3,  46*3,   0,  //  39  0000 0101 1
		 52*3,  47*3,   0,  //  40  0000 0011 1
		 43*3,  53*3,   0,  //  41  0000 0100 1
		 44*3,  48*3,   0,  //  42  0000 0101 0
		    0,     0,  10,  //  43  0000 0100 10.
		    0,     0,   9,  //  44  0000 0101 00.
		    0,     0,   8,  //  45  0000 0101 10.
		    0,     0,  -8,  //  46  0000 0101 11.
		 57*3,  66*3,   0,  //  47  0000 0011 11
		    0,     0,  -9,  //  48  0000 0101 01.
		 60*3,  64*3,   0,  //  49  0000 0011 01
		 56*3,  61*3,   0,  //  50  0000 0011 00
		 55*3,  62*3,   0,  //  51  0000 0100 00
		 58*3,  63*3,   0,  //  52  0000 0011 10
		    0,     0, -10,  //  53  0000 0100 11.
		 59*3,  65*3,   0,  //  54  0000 0100 01
		    0,     0,  12,  //  55  0000 0100 000.
		    0,     0,  16,  //  56  0000 0011 000.
		    0,     0,  13,  //  57  0000 0011 110.
		    0,     0,  14,  //  58  0000 0011 100.
		    0,     0,  11,  //  59  0000 0100 010.
		    0,     0,  15,  //  60  0000 0011 010.
		    0,     0, -16,  //  61  0000 0011 001.
		    0,     0, -12,  //  62  0000 0100 001.
		    0,     0, -14,  //  63  0000 0011 101.
		    0,     0, -15,  //  64  0000 0011 011.
		    0,     0, -11,  //  65  0000 0100 011.
		    0,     0, -13   //  66  0000 0011 111.
	]),
	
	DCT_DC_SIZE_LUMINANCE = new Int8Array([
		  2*3,   1*3, 0,  //   0
		  6*3,   5*3, 0,  //   1  1
		  3*3,   4*3, 0,  //   2  0
		    0,     0, 1,  //   3  00.
		    0,     0, 2,  //   4  01.
		  9*3,   8*3, 0,  //   5  11
		  7*3,  10*3, 0,  //   6  10
		    0,     0, 0,  //   7  100.
		 12*3,  11*3, 0,  //   8  111
		    0,     0, 4,  //   9  110.
		    0,     0, 3,  //  10  101.
		 13*3,  14*3, 0,  //  11  1111
		    0,     0, 5,  //  12  1110.
		    0,     0, 6,  //  13  1111 0.
		 16*3,  15*3, 0,  //  14  1111 1
		 17*3,    -1, 0,  //  15  1111 11
		    0,     0, 7,  //  16  1111 10.
		    0,     0, 8   //  17  1111 110.
	]),
	
	DCT_DC_SIZE_CHROMINANCE = new Int8Array([
		  2*3,   1*3, 0,  //   0
		  4*3,   3*3, 0,  //   1  1
		  6*3,   5*3, 0,  //   2  0
		  8*3,   7*3, 0,  //   3  11
		    0,     0, 2,  //   4  10.
		    0,     0, 1,  //   5  01.
		    0,     0, 0,  //   6  00.
		 10*3,   9*3, 0,  //   7  111
		    0,     0, 3,  //   8  110.
		 12*3,  11*3, 0,  //   9  1111
		    0,     0, 4,  //  10  1110.
		 14*3,  13*3, 0,  //  11  1111 1
		    0,     0, 5,  //  12  1111 0.
		 16*3,  15*3, 0,  //  13  1111 11
		    0,     0, 6,  //  14  1111 10.
		 17*3,    -1, 0,  //  15  1111 111
		    0,     0, 7,  //  16  1111 110.
		    0,     0, 8   //  17  1111 1110.
	]),
	
	//  dct_coeff bitmap:
	//    0xff00  run
	//    0x00ff  level
	
	//  Decoded values are unsigned. Sign bit follows in the stream.
	
	//  Interpretation of the value 0x0001
	//    for dc_coeff_first:  run=0, level=1
	//    for dc_coeff_next:   If the next bit is 1: run=0, level=1
	//                         If the next bit is 0: end_of_block
	
	//  escape decodes as 0xffff.
	
	DCT_COEFF = new Int32Array([
		  1*3,   2*3,      0,  //   0
		  4*3,   3*3,      0,  //   1  0
		    0,     0, 0x0001,  //   2  1.
		  7*3,   8*3,      0,  //   3  01
		  6*3,   5*3,      0,  //   4  00
		 13*3,   9*3,      0,  //   5  001
		 11*3,  10*3,      0,  //   6  000
		 14*3,  12*3,      0,  //   7  010
		    0,     0, 0x0101,  //   8  011.
		 20*3,  22*3,      0,  //   9  0011
		 18*3,  21*3,      0,  //  10  0001
		 16*3,  19*3,      0,  //  11  0000
		    0,     0, 0x0201,  //  12  0101.
		 17*3,  15*3,      0,  //  13  0010
		    0,     0, 0x0002,  //  14  0100.
		    0,     0, 0x0003,  //  15  0010 1.
		 27*3,  25*3,      0,  //  16  0000 0
		 29*3,  31*3,      0,  //  17  0010 0
		 24*3,  26*3,      0,  //  18  0001 0
		 32*3,  30*3,      0,  //  19  0000 1
		    0,     0, 0x0401,  //  20  0011 0.
		 23*3,  28*3,      0,  //  21  0001 1
		    0,     0, 0x0301,  //  22  0011 1.
		    0,     0, 0x0102,  //  23  0001 10.
		    0,     0, 0x0701,  //  24  0001 00.
		    0,     0, 0xffff,  //  25  0000 01. -- escape
		    0,     0, 0x0601,  //  26  0001 01.
		 37*3,  36*3,      0,  //  27  0000 00
		    0,     0, 0x0501,  //  28  0001 11.
		 35*3,  34*3,      0,  //  29  0010 00
		 39*3,  38*3,      0,  //  30  0000 11
		 33*3,  42*3,      0,  //  31  0010 01
		 40*3,  41*3,      0,  //  32  0000 10
		 52*3,  50*3,      0,  //  33  0010 010
		 54*3,  53*3,      0,  //  34  0010 001
		 48*3,  49*3,      0,  //  35  0010 000
		 43*3,  45*3,      0,  //  36  0000 001
		 46*3,  44*3,      0,  //  37  0000 000
		    0,     0, 0x0801,  //  38  0000 111.
		    0,     0, 0x0004,  //  39  0000 110.
		    0,     0, 0x0202,  //  40  0000 100.
		    0,     0, 0x0901,  //  41  0000 101.
		 51*3,  47*3,      0,  //  42  0010 011
		 55*3,  57*3,      0,  //  43  0000 0010
		 60*3,  56*3,      0,  //  44  0000 0001
		 59*3,  58*3,      0,  //  45  0000 0011
		 61*3,  62*3,      0,  //  46  0000 0000
		    0,     0, 0x0a01,  //  47  0010 0111.
		    0,     0, 0x0d01,  //  48  0010 0000.
		    0,     0, 0x0006,  //  49  0010 0001.
		    0,     0, 0x0103,  //  50  0010 0101.
		    0,     0, 0x0005,  //  51  0010 0110.
		    0,     0, 0x0302,  //  52  0010 0100.
		    0,     0, 0x0b01,  //  53  0010 0011.
		    0,     0, 0x0c01,  //  54  0010 0010.
		 76*3,  75*3,      0,  //  55  0000 0010 0
		 67*3,  70*3,      0,  //  56  0000 0001 1
		 73*3,  71*3,      0,  //  57  0000 0010 1
		 78*3,  74*3,      0,  //  58  0000 0011 1
		 72*3,  77*3,      0,  //  59  0000 0011 0
		 69*3,  64*3,      0,  //  60  0000 0001 0
		 68*3,  63*3,      0,  //  61  0000 0000 0
		 66*3,  65*3,      0,  //  62  0000 0000 1
		 81*3,  87*3,      0,  //  63  0000 0000 01
		 91*3,  80*3,      0,  //  64  0000 0001 01
		 82*3,  79*3,      0,  //  65  0000 0000 11
		 83*3,  86*3,      0,  //  66  0000 0000 10
		 93*3,  92*3,      0,  //  67  0000 0001 10
		 84*3,  85*3,      0,  //  68  0000 0000 00
		 90*3,  94*3,      0,  //  69  0000 0001 00
		 88*3,  89*3,      0,  //  70  0000 0001 11
		    0,     0, 0x0203,  //  71  0000 0010 11.
		    0,     0, 0x0104,  //  72  0000 0011 00.
		    0,     0, 0x0007,  //  73  0000 0010 10.
		    0,     0, 0x0402,  //  74  0000 0011 11.
		    0,     0, 0x0502,  //  75  0000 0010 01.
		    0,     0, 0x1001,  //  76  0000 0010 00.
		    0,     0, 0x0f01,  //  77  0000 0011 01.
		    0,     0, 0x0e01,  //  78  0000 0011 10.
		105*3, 107*3,      0,  //  79  0000 0000 111
		111*3, 114*3,      0,  //  80  0000 0001 011
		104*3,  97*3,      0,  //  81  0000 0000 010
		125*3, 119*3,      0,  //  82  0000 0000 110
		 96*3,  98*3,      0,  //  83  0000 0000 100
		   -1, 123*3,      0,  //  84  0000 0000 000
		 95*3, 101*3,      0,  //  85  0000 0000 001
		106*3, 121*3,      0,  //  86  0000 0000 101
		 99*3, 102*3,      0,  //  87  0000 0000 011
		113*3, 103*3,      0,  //  88  0000 0001 110
		112*3, 116*3,      0,  //  89  0000 0001 111
		110*3, 100*3,      0,  //  90  0000 0001 000
		124*3, 115*3,      0,  //  91  0000 0001 010
		117*3, 122*3,      0,  //  92  0000 0001 101
		109*3, 118*3,      0,  //  93  0000 0001 100
		120*3, 108*3,      0,  //  94  0000 0001 001
		127*3, 136*3,      0,  //  95  0000 0000 0010
		139*3, 140*3,      0,  //  96  0000 0000 1000
		130*3, 126*3,      0,  //  97  0000 0000 0101
		145*3, 146*3,      0,  //  98  0000 0000 1001
		128*3, 129*3,      0,  //  99  0000 0000 0110
		    0,     0, 0x0802,  // 100  0000 0001 0001.
		132*3, 134*3,      0,  // 101  0000 0000 0011
		155*3, 154*3,      0,  // 102  0000 0000 0111
		    0,     0, 0x0008,  // 103  0000 0001 1101.
		137*3, 133*3,      0,  // 104  0000 0000 0100
		143*3, 144*3,      0,  // 105  0000 0000 1110
		151*3, 138*3,      0,  // 106  0000 0000 1010
		142*3, 141*3,      0,  // 107  0000 0000 1111
		    0,     0, 0x000a,  // 108  0000 0001 0011.
		    0,     0, 0x0009,  // 109  0000 0001 1000.
		    0,     0, 0x000b,  // 110  0000 0001 0000.
		    0,     0, 0x1501,  // 111  0000 0001 0110.
		    0,     0, 0x0602,  // 112  0000 0001 1110.
		    0,     0, 0x0303,  // 113  0000 0001 1100.
		    0,     0, 0x1401,  // 114  0000 0001 0111.
		    0,     0, 0x0702,  // 115  0000 0001 0101.
		    0,     0, 0x1101,  // 116  0000 0001 1111.
		    0,     0, 0x1201,  // 117  0000 0001 1010.
		    0,     0, 0x1301,  // 118  0000 0001 1001.
		148*3, 152*3,      0,  // 119  0000 0000 1101
		    0,     0, 0x0403,  // 120  0000 0001 0010.
		153*3, 150*3,      0,  // 121  0000 0000 1011
		    0,     0, 0x0105,  // 122  0000 0001 1011.
		131*3, 135*3,      0,  // 123  0000 0000 0001
		    0,     0, 0x0204,  // 124  0000 0001 0100.
		149*3, 147*3,      0,  // 125  0000 0000 1100
		172*3, 173*3,      0,  // 126  0000 0000 0101 1
		162*3, 158*3,      0,  // 127  0000 0000 0010 0
		170*3, 161*3,      0,  // 128  0000 0000 0110 0
		168*3, 166*3,      0,  // 129  0000 0000 0110 1
		157*3, 179*3,      0,  // 130  0000 0000 0101 0
		169*3, 167*3,      0,  // 131  0000 0000 0001 0
		174*3, 171*3,      0,  // 132  0000 0000 0011 0
		178*3, 177*3,      0,  // 133  0000 0000 0100 1
		156*3, 159*3,      0,  // 134  0000 0000 0011 1
		164*3, 165*3,      0,  // 135  0000 0000 0001 1
		183*3, 182*3,      0,  // 136  0000 0000 0010 1
		175*3, 176*3,      0,  // 137  0000 0000 0100 0
		    0,     0, 0x0107,  // 138  0000 0000 1010 1.
		    0,     0, 0x0a02,  // 139  0000 0000 1000 0.
		    0,     0, 0x0902,  // 140  0000 0000 1000 1.
		    0,     0, 0x1601,  // 141  0000 0000 1111 1.
		    0,     0, 0x1701,  // 142  0000 0000 1111 0.
		    0,     0, 0x1901,  // 143  0000 0000 1110 0.
		    0,     0, 0x1801,  // 144  0000 0000 1110 1.
		    0,     0, 0x0503,  // 145  0000 0000 1001 0.
		    0,     0, 0x0304,  // 146  0000 0000 1001 1.
		    0,     0, 0x000d,  // 147  0000 0000 1100 1.
		    0,     0, 0x000c,  // 148  0000 0000 1101 0.
		    0,     0, 0x000e,  // 149  0000 0000 1100 0.
		    0,     0, 0x000f,  // 150  0000 0000 1011 1.
		    0,     0, 0x0205,  // 151  0000 0000 1010 0.
		    0,     0, 0x1a01,  // 152  0000 0000 1101 1.
		    0,     0, 0x0106,  // 153  0000 0000 1011 0.
		180*3, 181*3,      0,  // 154  0000 0000 0111 1
		160*3, 163*3,      0,  // 155  0000 0000 0111 0
		196*3, 199*3,      0,  // 156  0000 0000 0011 10
		    0,     0, 0x001b,  // 157  0000 0000 0101 00.
		203*3, 185*3,      0,  // 158  0000 0000 0010 01
		202*3, 201*3,      0,  // 159  0000 0000 0011 11
		    0,     0, 0x0013,  // 160  0000 0000 0111 00.
		    0,     0, 0x0016,  // 161  0000 0000 0110 01.
		197*3, 207*3,      0,  // 162  0000 0000 0010 00
		    0,     0, 0x0012,  // 163  0000 0000 0111 01.
		191*3, 192*3,      0,  // 164  0000 0000 0001 10
		188*3, 190*3,      0,  // 165  0000 0000 0001 11
		    0,     0, 0x0014,  // 166  0000 0000 0110 11.
		184*3, 194*3,      0,  // 167  0000 0000 0001 01
		    0,     0, 0x0015,  // 168  0000 0000 0110 10.
		186*3, 193*3,      0,  // 169  0000 0000 0001 00
		    0,     0, 0x0017,  // 170  0000 0000 0110 00.
		204*3, 198*3,      0,  // 171  0000 0000 0011 01
		    0,     0, 0x0019,  // 172  0000 0000 0101 10.
		    0,     0, 0x0018,  // 173  0000 0000 0101 11.
		200*3, 205*3,      0,  // 174  0000 0000 0011 00
		    0,     0, 0x001f,  // 175  0000 0000 0100 00.
		    0,     0, 0x001e,  // 176  0000 0000 0100 01.
		    0,     0, 0x001c,  // 177  0000 0000 0100 11.
		    0,     0, 0x001d,  // 178  0000 0000 0100 10.
		    0,     0, 0x001a,  // 179  0000 0000 0101 01.
		    0,     0, 0x0011,  // 180  0000 0000 0111 10.
		    0,     0, 0x0010,  // 181  0000 0000 0111 11.
		189*3, 206*3,      0,  // 182  0000 0000 0010 11
		187*3, 195*3,      0,  // 183  0000 0000 0010 10
		218*3, 211*3,      0,  // 184  0000 0000 0001 010
		    0,     0, 0x0025,  // 185  0000 0000 0010 011.
		215*3, 216*3,      0,  // 186  0000 0000 0001 000
		    0,     0, 0x0024,  // 187  0000 0000 0010 100.
		210*3, 212*3,      0,  // 188  0000 0000 0001 110
		    0,     0, 0x0022,  // 189  0000 0000 0010 110.
		213*3, 209*3,      0,  // 190  0000 0000 0001 111
		221*3, 222*3,      0,  // 191  0000 0000 0001 100
		219*3, 208*3,      0,  // 192  0000 0000 0001 101
		217*3, 214*3,      0,  // 193  0000 0000 0001 001
		223*3, 220*3,      0,  // 194  0000 0000 0001 011
		    0,     0, 0x0023,  // 195  0000 0000 0010 101.
		    0,     0, 0x010b,  // 196  0000 0000 0011 100.
		    0,     0, 0x0028,  // 197  0000 0000 0010 000.
		    0,     0, 0x010c,  // 198  0000 0000 0011 011.
		    0,     0, 0x010a,  // 199  0000 0000 0011 101.
		    0,     0, 0x0020,  // 200  0000 0000 0011 000.
		    0,     0, 0x0108,  // 201  0000 0000 0011 111.
		    0,     0, 0x0109,  // 202  0000 0000 0011 110.
		    0,     0, 0x0026,  // 203  0000 0000 0010 010.
		    0,     0, 0x010d,  // 204  0000 0000 0011 010.
		    0,     0, 0x010e,  // 205  0000 0000 0011 001.
		    0,     0, 0x0021,  // 206  0000 0000 0010 111.
		    0,     0, 0x0027,  // 207  0000 0000 0010 001.
		    0,     0, 0x1f01,  // 208  0000 0000 0001 1011.
		    0,     0, 0x1b01,  // 209  0000 0000 0001 1111.
		    0,     0, 0x1e01,  // 210  0000 0000 0001 1100.
		    0,     0, 0x1002,  // 211  0000 0000 0001 0101.
		    0,     0, 0x1d01,  // 212  0000 0000 0001 1101.
		    0,     0, 0x1c01,  // 213  0000 0000 0001 1110.
		    0,     0, 0x010f,  // 214  0000 0000 0001 0011.
		    0,     0, 0x0112,  // 215  0000 0000 0001 0000.
		    0,     0, 0x0111,  // 216  0000 0000 0001 0001.
		    0,     0, 0x0110,  // 217  0000 0000 0001 0010.
		    0,     0, 0x0603,  // 218  0000 0000 0001 0100.
		    0,     0, 0x0b02,  // 219  0000 0000 0001 1010.
		    0,     0, 0x0e02,  // 220  0000 0000 0001 0111.
		    0,     0, 0x0d02,  // 221  0000 0000 0001 1000.
		    0,     0, 0x0c02,  // 222  0000 0000 0001 1001.
		    0,     0, 0x0f02   // 223  0000 0000 0001 0110.
	]),
	
	PICTURE_TYPE_I = 1,
	PICTURE_TYPE_P = 2,
	PICTURE_TYPE_B = 3,
	PICTURE_TYPE_D = 4,
	
	START_SEQUENCE = 0xB3,
	START_SLICE_FIRST = 0x01,
	START_SLICE_LAST = 0xAF,
	START_PICTURE = 0x00,
	START_EXTENSION = 0xB5,
	START_USER_DATA = 0xB2;
	
var MACROBLOCK_TYPE_TABLES = [
	null,
	MACROBLOCK_TYPE_I,
	MACROBLOCK_TYPE_P,
	MACROBLOCK_TYPE_B
];



// ----------------------------------------------------------------------------
// Bit Reader 

var BitReader = function(arrayBuffer) {
	this.bytes = new Uint8Array(arrayBuffer);
	this.length = this.bytes.length;
	this.writePos = this.bytes.length;
	this.index = 0;
};

BitReader.NOT_FOUND = -1;

BitReader.prototype.findNextMPEGStartCode = function() {	
	for( var i = (this.index+7 >> 3); i < this.writePos; i++ ) {
		if(
			this.bytes[i] == 0x00 &&
			this.bytes[i+1] == 0x00 &&
			this.bytes[i+2] == 0x01
		) {
			this.index = (i+4) << 3;
			return this.bytes[i+3];
		}
	}
	this.index = (this.writePos << 3);
	return BitReader.NOT_FOUND;
};

BitReader.prototype.nextBytesAreStartCode = function() {
	var i = (this.index+7 >> 3);
	return (
		i >= this.writePos || (
			this.bytes[i] == 0x00 && 
			this.bytes[i+1] == 0x00 &&
			this.bytes[i+2] == 0x01
		)
	);
};

BitReader.prototype.nextBits = function(count) {
	var 
		byteOffset = this.index >> 3,
		room = (8 - this.index % 8);

	if( room >= count ) {
		return (this.bytes[byteOffset] >> (room - count)) & (0xff >> (8-count));
	}

	var 
		leftover = (this.index + count) % 8, // Leftover bits in last byte
		end = (this.index + count -1) >> 3,
		value = this.bytes[byteOffset] & (0xff >> (8-room)); // Fill out first byte

	for( byteOffset++; byteOffset < end; byteOffset++ ) {
		value <<= 8; // Shift and
		value |= this.bytes[byteOffset]; // Put next byte
	}

	if (leftover > 0) {
		value <<= leftover; // Make room for remaining bits
		value |= (this.bytes[byteOffset] >> (8 - leftover));
	}
	else {
		value <<= 8;
		value |= this.bytes[byteOffset];
	}
	
	return value;
};

BitReader.prototype.getBits = function(count) {
	var value = this.nextBits(count);
	this.index += count;
	return value;
};

BitReader.prototype.advance = function(count) {
	return (this.index += count);
};

BitReader.prototype.rewind = function(count) {
	return (this.index -= count);
};
	
})(window);


;/*!
 * Bootstrap v3.1.1 (http://getbootstrap.com)
 * Copyright 2011-2014 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */
if("undefined"==typeof jQuery)throw new Error("Bootstrap's JavaScript requires jQuery");+function(a){"use strict";function b(){var a=document.createElement("bootstrap"),b={WebkitTransition:"webkitTransitionEnd",MozTransition:"transitionend",OTransition:"oTransitionEnd otransitionend",transition:"transitionend"};for(var c in b)if(void 0!==a.style[c])return{end:b[c]};return!1}a.fn.emulateTransitionEnd=function(b){var c=!1,d=this;a(this).one(a.support.transition.end,function(){c=!0});var e=function(){c||a(d).trigger(a.support.transition.end)};return setTimeout(e,b),this},a(function(){a.support.transition=b()})}(jQuery),+function(a){"use strict";var b='[data-dismiss="alert"]',c=function(c){a(c).on("click",b,this.close)};c.prototype.close=function(b){function c(){f.trigger("closed.bs.alert").remove()}var d=a(this),e=d.attr("data-target");e||(e=d.attr("href"),e=e&&e.replace(/.*(?=#[^\s]*$)/,""));var f=a(e);b&&b.preventDefault(),f.length||(f=d.hasClass("alert")?d:d.parent()),f.trigger(b=a.Event("close.bs.alert")),b.isDefaultPrevented()||(f.removeClass("in"),a.support.transition&&f.hasClass("fade")?f.one(a.support.transition.end,c).emulateTransitionEnd(150):c())};var d=a.fn.alert;a.fn.alert=function(b){return this.each(function(){var d=a(this),e=d.data("bs.alert");e||d.data("bs.alert",e=new c(this)),"string"==typeof b&&e[b].call(d)})},a.fn.alert.Constructor=c,a.fn.alert.noConflict=function(){return a.fn.alert=d,this},a(document).on("click.bs.alert.data-api",b,c.prototype.close)}(jQuery),+function(a){"use strict";var b=function(c,d){this.$element=a(c),this.options=a.extend({},b.DEFAULTS,d),this.isLoading=!1};b.DEFAULTS={loadingText:"loading..."},b.prototype.setState=function(b){var c="disabled",d=this.$element,e=d.is("input")?"val":"html",f=d.data();b+="Text",f.resetText||d.data("resetText",d[e]()),d[e](f[b]||this.options[b]),setTimeout(a.proxy(function(){"loadingText"==b?(this.isLoading=!0,d.addClass(c).attr(c,c)):this.isLoading&&(this.isLoading=!1,d.removeClass(c).removeAttr(c))},this),0)},b.prototype.toggle=function(){var a=!0,b=this.$element.closest('[data-toggle="buttons"]');if(b.length){var c=this.$element.find("input");"radio"==c.prop("type")&&(c.prop("checked")&&this.$element.hasClass("active")?a=!1:b.find(".active").removeClass("active")),a&&c.prop("checked",!this.$element.hasClass("active")).trigger("change")}a&&this.$element.toggleClass("active")};var c=a.fn.button;a.fn.button=function(c){return this.each(function(){var d=a(this),e=d.data("bs.button"),f="object"==typeof c&&c;e||d.data("bs.button",e=new b(this,f)),"toggle"==c?e.toggle():c&&e.setState(c)})},a.fn.button.Constructor=b,a.fn.button.noConflict=function(){return a.fn.button=c,this},a(document).on("click.bs.button.data-api","[data-toggle^=button]",function(b){var c=a(b.target);c.hasClass("btn")||(c=c.closest(".btn")),c.button("toggle"),b.preventDefault()})}(jQuery),+function(a){"use strict";var b=function(b,c){this.$element=a(b),this.$indicators=this.$element.find(".carousel-indicators"),this.options=c,this.paused=this.sliding=this.interval=this.$active=this.$items=null,"hover"==this.options.pause&&this.$element.on("mouseenter",a.proxy(this.pause,this)).on("mouseleave",a.proxy(this.cycle,this))};b.DEFAULTS={interval:5e3,pause:"hover",wrap:!0},b.prototype.cycle=function(b){return b||(this.paused=!1),this.interval&&clearInterval(this.interval),this.options.interval&&!this.paused&&(this.interval=setInterval(a.proxy(this.next,this),this.options.interval)),this},b.prototype.getActiveIndex=function(){return this.$active=this.$element.find(".item.active"),this.$items=this.$active.parent().children(),this.$items.index(this.$active)},b.prototype.to=function(b){var c=this,d=this.getActiveIndex();return b>this.$items.length-1||0>b?void 0:this.sliding?this.$element.one("slid.bs.carousel",function(){c.to(b)}):d==b?this.pause().cycle():this.slide(b>d?"next":"prev",a(this.$items[b]))},b.prototype.pause=function(b){return b||(this.paused=!0),this.$element.find(".next, .prev").length&&a.support.transition&&(this.$element.trigger(a.support.transition.end),this.cycle(!0)),this.interval=clearInterval(this.interval),this},b.prototype.next=function(){return this.sliding?void 0:this.slide("next")},b.prototype.prev=function(){return this.sliding?void 0:this.slide("prev")},b.prototype.slide=function(b,c){var d=this.$element.find(".item.active"),e=c||d[b](),f=this.interval,g="next"==b?"left":"right",h="next"==b?"first":"last",i=this;if(!e.length){if(!this.options.wrap)return;e=this.$element.find(".item")[h]()}if(e.hasClass("active"))return this.sliding=!1;var j=a.Event("slide.bs.carousel",{relatedTarget:e[0],direction:g});return this.$element.trigger(j),j.isDefaultPrevented()?void 0:(this.sliding=!0,f&&this.pause(),this.$indicators.length&&(this.$indicators.find(".active").removeClass("active"),this.$element.one("slid.bs.carousel",function(){var b=a(i.$indicators.children()[i.getActiveIndex()]);b&&b.addClass("active")})),a.support.transition&&this.$element.hasClass("slide")?(e.addClass(b),e[0].offsetWidth,d.addClass(g),e.addClass(g),d.one(a.support.transition.end,function(){e.removeClass([b,g].join(" ")).addClass("active"),d.removeClass(["active",g].join(" ")),i.sliding=!1,setTimeout(function(){i.$element.trigger("slid.bs.carousel")},0)}).emulateTransitionEnd(1e3*d.css("transition-duration").slice(0,-1))):(d.removeClass("active"),e.addClass("active"),this.sliding=!1,this.$element.trigger("slid.bs.carousel")),f&&this.cycle(),this)};var c=a.fn.carousel;a.fn.carousel=function(c){return this.each(function(){var d=a(this),e=d.data("bs.carousel"),f=a.extend({},b.DEFAULTS,d.data(),"object"==typeof c&&c),g="string"==typeof c?c:f.slide;e||d.data("bs.carousel",e=new b(this,f)),"number"==typeof c?e.to(c):g?e[g]():f.interval&&e.pause().cycle()})},a.fn.carousel.Constructor=b,a.fn.carousel.noConflict=function(){return a.fn.carousel=c,this},a(document).on("click.bs.carousel.data-api","[data-slide], [data-slide-to]",function(b){var c,d=a(this),e=a(d.attr("data-target")||(c=d.attr("href"))&&c.replace(/.*(?=#[^\s]+$)/,"")),f=a.extend({},e.data(),d.data()),g=d.attr("data-slide-to");g&&(f.interval=!1),e.carousel(f),(g=d.attr("data-slide-to"))&&e.data("bs.carousel").to(g),b.preventDefault()}),a(window).on("load",function(){a('[data-ride="carousel"]').each(function(){var b=a(this);b.carousel(b.data())})})}(jQuery),+function(a){"use strict";var b=function(c,d){this.$element=a(c),this.options=a.extend({},b.DEFAULTS,d),this.transitioning=null,this.options.parent&&(this.$parent=a(this.options.parent)),this.options.toggle&&this.toggle()};b.DEFAULTS={toggle:!0},b.prototype.dimension=function(){var a=this.$element.hasClass("width");return a?"width":"height"},b.prototype.show=function(){if(!this.transitioning&&!this.$element.hasClass("in")){var b=a.Event("show.bs.collapse");if(this.$element.trigger(b),!b.isDefaultPrevented()){var c=this.$parent&&this.$parent.find("> .panel > .in");if(c&&c.length){var d=c.data("bs.collapse");if(d&&d.transitioning)return;c.collapse("hide"),d||c.data("bs.collapse",null)}var e=this.dimension();this.$element.removeClass("collapse").addClass("collapsing")[e](0),this.transitioning=1;var f=function(){this.$element.removeClass("collapsing").addClass("collapse in")[e]("auto"),this.transitioning=0,this.$element.trigger("shown.bs.collapse")};if(!a.support.transition)return f.call(this);var g=a.camelCase(["scroll",e].join("-"));this.$element.one(a.support.transition.end,a.proxy(f,this)).emulateTransitionEnd(350)[e](this.$element[0][g])}}},b.prototype.hide=function(){if(!this.transitioning&&this.$element.hasClass("in")){var b=a.Event("hide.bs.collapse");if(this.$element.trigger(b),!b.isDefaultPrevented()){var c=this.dimension();this.$element[c](this.$element[c]())[0].offsetHeight,this.$element.addClass("collapsing").removeClass("collapse").removeClass("in"),this.transitioning=1;var d=function(){this.transitioning=0,this.$element.trigger("hidden.bs.collapse").removeClass("collapsing").addClass("collapse")};return a.support.transition?void this.$element[c](0).one(a.support.transition.end,a.proxy(d,this)).emulateTransitionEnd(350):d.call(this)}}},b.prototype.toggle=function(){this[this.$element.hasClass("in")?"hide":"show"]()};var c=a.fn.collapse;a.fn.collapse=function(c){return this.each(function(){var d=a(this),e=d.data("bs.collapse"),f=a.extend({},b.DEFAULTS,d.data(),"object"==typeof c&&c);!e&&f.toggle&&"show"==c&&(c=!c),e||d.data("bs.collapse",e=new b(this,f)),"string"==typeof c&&e[c]()})},a.fn.collapse.Constructor=b,a.fn.collapse.noConflict=function(){return a.fn.collapse=c,this},a(document).on("click.bs.collapse.data-api","[data-toggle=collapse]",function(b){var c,d=a(this),e=d.attr("data-target")||b.preventDefault()||(c=d.attr("href"))&&c.replace(/.*(?=#[^\s]+$)/,""),f=a(e),g=f.data("bs.collapse"),h=g?"toggle":d.data(),i=d.attr("data-parent"),j=i&&a(i);g&&g.transitioning||(j&&j.find('[data-toggle=collapse][data-parent="'+i+'"]').not(d).addClass("collapsed"),d[f.hasClass("in")?"addClass":"removeClass"]("collapsed")),f.collapse(h)})}(jQuery),+function(a){"use strict";function b(b){a(d).remove(),a(e).each(function(){var d=c(a(this)),e={relatedTarget:this};d.hasClass("open")&&(d.trigger(b=a.Event("hide.bs.dropdown",e)),b.isDefaultPrevented()||d.removeClass("open").trigger("hidden.bs.dropdown",e))})}function c(b){var c=b.attr("data-target");c||(c=b.attr("href"),c=c&&/#[A-Za-z]/.test(c)&&c.replace(/.*(?=#[^\s]*$)/,""));var d=c&&a(c);return d&&d.length?d:b.parent()}var d=".dropdown-backdrop",e="[data-toggle=dropdown]",f=function(b){a(b).on("click.bs.dropdown",this.toggle)};f.prototype.toggle=function(d){var e=a(this);if(!e.is(".disabled, :disabled")){var f=c(e),g=f.hasClass("open");if(b(),!g){"ontouchstart"in document.documentElement&&!f.closest(".navbar-nav").length&&a('<div class="dropdown-backdrop"/>').insertAfter(a(this)).on("click",b);var h={relatedTarget:this};if(f.trigger(d=a.Event("show.bs.dropdown",h)),d.isDefaultPrevented())return;f.toggleClass("open").trigger("shown.bs.dropdown",h),e.focus()}return!1}},f.prototype.keydown=function(b){if(/(38|40|27)/.test(b.keyCode)){var d=a(this);if(b.preventDefault(),b.stopPropagation(),!d.is(".disabled, :disabled")){var f=c(d),g=f.hasClass("open");if(!g||g&&27==b.keyCode)return 27==b.which&&f.find(e).focus(),d.click();var h=" li:not(.divider):visible a",i=f.find("[role=menu]"+h+", [role=listbox]"+h);if(i.length){var j=i.index(i.filter(":focus"));38==b.keyCode&&j>0&&j--,40==b.keyCode&&j<i.length-1&&j++,~j||(j=0),i.eq(j).focus()}}}};var g=a.fn.dropdown;a.fn.dropdown=function(b){return this.each(function(){var c=a(this),d=c.data("bs.dropdown");d||c.data("bs.dropdown",d=new f(this)),"string"==typeof b&&d[b].call(c)})},a.fn.dropdown.Constructor=f,a.fn.dropdown.noConflict=function(){return a.fn.dropdown=g,this},a(document).on("click.bs.dropdown.data-api",b).on("click.bs.dropdown.data-api",".dropdown form",function(a){a.stopPropagation()}).on("click.bs.dropdown.data-api",e,f.prototype.toggle).on("keydown.bs.dropdown.data-api",e+", [role=menu], [role=listbox]",f.prototype.keydown)}(jQuery),+function(a){"use strict";var b=function(b,c){this.options=c,this.$element=a(b),this.$backdrop=this.isShown=null,this.options.remote&&this.$element.find(".modal-content").load(this.options.remote,a.proxy(function(){this.$element.trigger("loaded.bs.modal")},this))};b.DEFAULTS={backdrop:!0,keyboard:!0,show:!0},b.prototype.toggle=function(a){return this[this.isShown?"hide":"show"](a)},b.prototype.show=function(b){var c=this,d=a.Event("show.bs.modal",{relatedTarget:b});this.$element.trigger(d),this.isShown||d.isDefaultPrevented()||(this.isShown=!0,this.escape(),this.$element.on("click.dismiss.bs.modal",'[data-dismiss="modal"]',a.proxy(this.hide,this)),this.backdrop(function(){var d=a.support.transition&&c.$element.hasClass("fade");c.$element.parent().length||c.$element.appendTo(document.body),c.$element.show().scrollTop(0),d&&c.$element[0].offsetWidth,c.$element.addClass("in").attr("aria-hidden",!1),c.enforceFocus();var e=a.Event("shown.bs.modal",{relatedTarget:b});d?c.$element.find(".modal-dialog").one(a.support.transition.end,function(){c.$element.focus().trigger(e)}).emulateTransitionEnd(300):c.$element.focus().trigger(e)}))},b.prototype.hide=function(b){b&&b.preventDefault(),b=a.Event("hide.bs.modal"),this.$element.trigger(b),this.isShown&&!b.isDefaultPrevented()&&(this.isShown=!1,this.escape(),a(document).off("focusin.bs.modal"),this.$element.removeClass("in").attr("aria-hidden",!0).off("click.dismiss.bs.modal"),a.support.transition&&this.$element.hasClass("fade")?this.$element.one(a.support.transition.end,a.proxy(this.hideModal,this)).emulateTransitionEnd(300):this.hideModal())},b.prototype.enforceFocus=function(){a(document).off("focusin.bs.modal").on("focusin.bs.modal",a.proxy(function(a){this.$element[0]===a.target||this.$element.has(a.target).length||this.$element.focus()},this))},b.prototype.escape=function(){this.isShown&&this.options.keyboard?this.$element.on("keyup.dismiss.bs.modal",a.proxy(function(a){27==a.which&&this.hide()},this)):this.isShown||this.$element.off("keyup.dismiss.bs.modal")},b.prototype.hideModal=function(){var a=this;this.$element.hide(),this.backdrop(function(){a.removeBackdrop(),a.$element.trigger("hidden.bs.modal")})},b.prototype.removeBackdrop=function(){this.$backdrop&&this.$backdrop.remove(),this.$backdrop=null},b.prototype.backdrop=function(b){var c=this.$element.hasClass("fade")?"fade":"";if(this.isShown&&this.options.backdrop){var d=a.support.transition&&c;if(this.$backdrop=a('<div class="modal-backdrop '+c+'" />').appendTo(document.body),this.$element.on("click.dismiss.bs.modal",a.proxy(function(a){a.target===a.currentTarget&&("static"==this.options.backdrop?this.$element[0].focus.call(this.$element[0]):this.hide.call(this))},this)),d&&this.$backdrop[0].offsetWidth,this.$backdrop.addClass("in"),!b)return;d?this.$backdrop.one(a.support.transition.end,b).emulateTransitionEnd(150):b()}else!this.isShown&&this.$backdrop?(this.$backdrop.removeClass("in"),a.support.transition&&this.$element.hasClass("fade")?this.$backdrop.one(a.support.transition.end,b).emulateTransitionEnd(150):b()):b&&b()};var c=a.fn.modal;a.fn.modal=function(c,d){return this.each(function(){var e=a(this),f=e.data("bs.modal"),g=a.extend({},b.DEFAULTS,e.data(),"object"==typeof c&&c);f||e.data("bs.modal",f=new b(this,g)),"string"==typeof c?f[c](d):g.show&&f.show(d)})},a.fn.modal.Constructor=b,a.fn.modal.noConflict=function(){return a.fn.modal=c,this},a(document).on("click.bs.modal.data-api",'[data-toggle="modal"]',function(b){var c=a(this),d=c.attr("href"),e=a(c.attr("data-target")||d&&d.replace(/.*(?=#[^\s]+$)/,"")),f=e.data("bs.modal")?"toggle":a.extend({remote:!/#/.test(d)&&d},e.data(),c.data());c.is("a")&&b.preventDefault(),e.modal(f,this).one("hide",function(){c.is(":visible")&&c.focus()})}),a(document).on("show.bs.modal",".modal",function(){a(document.body).addClass("modal-open")}).on("hidden.bs.modal",".modal",function(){a(document.body).removeClass("modal-open")})}(jQuery),+function(a){"use strict";var b=function(a,b){this.type=this.options=this.enabled=this.timeout=this.hoverState=this.$element=null,this.init("tooltip",a,b)};b.DEFAULTS={animation:!0,placement:"top",selector:!1,template:'<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',trigger:"hover focus",title:"",delay:0,html:!1,container:!1},b.prototype.init=function(b,c,d){this.enabled=!0,this.type=b,this.$element=a(c),this.options=this.getOptions(d);for(var e=this.options.trigger.split(" "),f=e.length;f--;){var g=e[f];if("click"==g)this.$element.on("click."+this.type,this.options.selector,a.proxy(this.toggle,this));else if("manual"!=g){var h="hover"==g?"mouseenter":"focusin",i="hover"==g?"mouseleave":"focusout";this.$element.on(h+"."+this.type,this.options.selector,a.proxy(this.enter,this)),this.$element.on(i+"."+this.type,this.options.selector,a.proxy(this.leave,this))}}this.options.selector?this._options=a.extend({},this.options,{trigger:"manual",selector:""}):this.fixTitle()},b.prototype.getDefaults=function(){return b.DEFAULTS},b.prototype.getOptions=function(b){return b=a.extend({},this.getDefaults(),this.$element.data(),b),b.delay&&"number"==typeof b.delay&&(b.delay={show:b.delay,hide:b.delay}),b},b.prototype.getDelegateOptions=function(){var b={},c=this.getDefaults();return this._options&&a.each(this._options,function(a,d){c[a]!=d&&(b[a]=d)}),b},b.prototype.enter=function(b){var c=b instanceof this.constructor?b:a(b.currentTarget)[this.type](this.getDelegateOptions()).data("bs."+this.type);return clearTimeout(c.timeout),c.hoverState="in",c.options.delay&&c.options.delay.show?void(c.timeout=setTimeout(function(){"in"==c.hoverState&&c.show()},c.options.delay.show)):c.show()},b.prototype.leave=function(b){var c=b instanceof this.constructor?b:a(b.currentTarget)[this.type](this.getDelegateOptions()).data("bs."+this.type);return clearTimeout(c.timeout),c.hoverState="out",c.options.delay&&c.options.delay.hide?void(c.timeout=setTimeout(function(){"out"==c.hoverState&&c.hide()},c.options.delay.hide)):c.hide()},b.prototype.show=function(){var b=a.Event("show.bs."+this.type);if(this.hasContent()&&this.enabled){if(this.$element.trigger(b),b.isDefaultPrevented())return;var c=this,d=this.tip();this.setContent(),this.options.animation&&d.addClass("fade");var e="function"==typeof this.options.placement?this.options.placement.call(this,d[0],this.$element[0]):this.options.placement,f=/\s?auto?\s?/i,g=f.test(e);g&&(e=e.replace(f,"")||"top"),d.detach().css({top:0,left:0,display:"block"}).addClass(e),this.options.container?d.appendTo(this.options.container):d.insertAfter(this.$element);var h=this.getPosition(),i=d[0].offsetWidth,j=d[0].offsetHeight;if(g){var k=this.$element.parent(),l=e,m=document.documentElement.scrollTop||document.body.scrollTop,n="body"==this.options.container?window.innerWidth:k.outerWidth(),o="body"==this.options.container?window.innerHeight:k.outerHeight(),p="body"==this.options.container?0:k.offset().left;e="bottom"==e&&h.top+h.height+j-m>o?"top":"top"==e&&h.top-m-j<0?"bottom":"right"==e&&h.right+i>n?"left":"left"==e&&h.left-i<p?"right":e,d.removeClass(l).addClass(e)}var q=this.getCalculatedOffset(e,h,i,j);this.applyPlacement(q,e),this.hoverState=null;var r=function(){c.$element.trigger("shown.bs."+c.type)};a.support.transition&&this.$tip.hasClass("fade")?d.one(a.support.transition.end,r).emulateTransitionEnd(150):r()}},b.prototype.applyPlacement=function(b,c){var d,e=this.tip(),f=e[0].offsetWidth,g=e[0].offsetHeight,h=parseInt(e.css("margin-top"),10),i=parseInt(e.css("margin-left"),10);isNaN(h)&&(h=0),isNaN(i)&&(i=0),b.top=b.top+h,b.left=b.left+i,a.offset.setOffset(e[0],a.extend({using:function(a){e.css({top:Math.round(a.top),left:Math.round(a.left)})}},b),0),e.addClass("in");var j=e[0].offsetWidth,k=e[0].offsetHeight;if("top"==c&&k!=g&&(d=!0,b.top=b.top+g-k),/bottom|top/.test(c)){var l=0;b.left<0&&(l=-2*b.left,b.left=0,e.offset(b),j=e[0].offsetWidth,k=e[0].offsetHeight),this.replaceArrow(l-f+j,j,"left")}else this.replaceArrow(k-g,k,"top");d&&e.offset(b)},b.prototype.replaceArrow=function(a,b,c){this.arrow().css(c,a?50*(1-a/b)+"%":"")},b.prototype.setContent=function(){var a=this.tip(),b=this.getTitle();a.find(".tooltip-inner")[this.options.html?"html":"text"](b),a.removeClass("fade in top bottom left right")},b.prototype.hide=function(){function b(){"in"!=c.hoverState&&d.detach(),c.$element.trigger("hidden.bs."+c.type)}var c=this,d=this.tip(),e=a.Event("hide.bs."+this.type);return this.$element.trigger(e),e.isDefaultPrevented()?void 0:(d.removeClass("in"),a.support.transition&&this.$tip.hasClass("fade")?d.one(a.support.transition.end,b).emulateTransitionEnd(150):b(),this.hoverState=null,this)},b.prototype.fixTitle=function(){var a=this.$element;(a.attr("title")||"string"!=typeof a.attr("data-original-title"))&&a.attr("data-original-title",a.attr("title")||"").attr("title","")},b.prototype.hasContent=function(){return this.getTitle()},b.prototype.getPosition=function(){var b=this.$element[0];return a.extend({},"function"==typeof b.getBoundingClientRect?b.getBoundingClientRect():{width:b.offsetWidth,height:b.offsetHeight},this.$element.offset())},b.prototype.getCalculatedOffset=function(a,b,c,d){return"bottom"==a?{top:b.top+b.height,left:b.left+b.width/2-c/2}:"top"==a?{top:b.top-d,left:b.left+b.width/2-c/2}:"left"==a?{top:b.top+b.height/2-d/2,left:b.left-c}:{top:b.top+b.height/2-d/2,left:b.left+b.width}},b.prototype.getTitle=function(){var a,b=this.$element,c=this.options;return a=b.attr("data-original-title")||("function"==typeof c.title?c.title.call(b[0]):c.title)},b.prototype.tip=function(){return this.$tip=this.$tip||a(this.options.template)},b.prototype.arrow=function(){return this.$arrow=this.$arrow||this.tip().find(".tooltip-arrow")},b.prototype.validate=function(){this.$element[0].parentNode||(this.hide(),this.$element=null,this.options=null)},b.prototype.enable=function(){this.enabled=!0},b.prototype.disable=function(){this.enabled=!1},b.prototype.toggleEnabled=function(){this.enabled=!this.enabled},b.prototype.toggle=function(b){var c=b?a(b.currentTarget)[this.type](this.getDelegateOptions()).data("bs."+this.type):this;c.tip().hasClass("in")?c.leave(c):c.enter(c)},b.prototype.destroy=function(){clearTimeout(this.timeout),this.hide().$element.off("."+this.type).removeData("bs."+this.type)};var c=a.fn.tooltip;a.fn.tooltip=function(c){return this.each(function(){var d=a(this),e=d.data("bs.tooltip"),f="object"==typeof c&&c;(e||"destroy"!=c)&&(e||d.data("bs.tooltip",e=new b(this,f)),"string"==typeof c&&e[c]())})},a.fn.tooltip.Constructor=b,a.fn.tooltip.noConflict=function(){return a.fn.tooltip=c,this}}(jQuery),+function(a){"use strict";var b=function(a,b){this.init("popover",a,b)};if(!a.fn.tooltip)throw new Error("Popover requires tooltip.js");b.DEFAULTS=a.extend({},a.fn.tooltip.Constructor.DEFAULTS,{placement:"right",trigger:"click",content:"",template:'<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'}),b.prototype=a.extend({},a.fn.tooltip.Constructor.prototype),b.prototype.constructor=b,b.prototype.getDefaults=function(){return b.DEFAULTS},b.prototype.setContent=function(){var a=this.tip(),b=this.getTitle(),c=this.getContent();a.find(".popover-title")[this.options.html?"html":"text"](b),a.find(".popover-content")[this.options.html?"string"==typeof c?"html":"append":"text"](c),a.removeClass("fade top bottom left right in"),a.find(".popover-title").html()||a.find(".popover-title").hide()},b.prototype.hasContent=function(){return this.getTitle()||this.getContent()},b.prototype.getContent=function(){var a=this.$element,b=this.options;return a.attr("data-content")||("function"==typeof b.content?b.content.call(a[0]):b.content)},b.prototype.arrow=function(){return this.$arrow=this.$arrow||this.tip().find(".arrow")},b.prototype.tip=function(){return this.$tip||(this.$tip=a(this.options.template)),this.$tip};var c=a.fn.popover;a.fn.popover=function(c){return this.each(function(){var d=a(this),e=d.data("bs.popover"),f="object"==typeof c&&c;(e||"destroy"!=c)&&(e||d.data("bs.popover",e=new b(this,f)),"string"==typeof c&&e[c]())})},a.fn.popover.Constructor=b,a.fn.popover.noConflict=function(){return a.fn.popover=c,this}}(jQuery),+function(a){"use strict";function b(c,d){var e,f=a.proxy(this.process,this);this.$element=a(a(c).is("body")?window:c),this.$body=a("body"),this.$scrollElement=this.$element.on("scroll.bs.scroll-spy.data-api",f),this.options=a.extend({},b.DEFAULTS,d),this.selector=(this.options.target||(e=a(c).attr("href"))&&e.replace(/.*(?=#[^\s]+$)/,"")||"")+" .nav li > a",this.offsets=a([]),this.targets=a([]),this.activeTarget=null,this.refresh(),this.process()}b.DEFAULTS={offset:10},b.prototype.refresh=function(){var b=this.$element[0]==window?"offset":"position";this.offsets=a([]),this.targets=a([]);{var c=this;this.$body.find(this.selector).map(function(){var d=a(this),e=d.data("target")||d.attr("href"),f=/^#./.test(e)&&a(e);return f&&f.length&&f.is(":visible")&&[[f[b]().top+(!a.isWindow(c.$scrollElement.get(0))&&c.$scrollElement.scrollTop()),e]]||null}).sort(function(a,b){return a[0]-b[0]}).each(function(){c.offsets.push(this[0]),c.targets.push(this[1])})}},b.prototype.process=function(){var a,b=this.$scrollElement.scrollTop()+this.options.offset,c=this.$scrollElement[0].scrollHeight||this.$body[0].scrollHeight,d=c-this.$scrollElement.height(),e=this.offsets,f=this.targets,g=this.activeTarget;if(b>=d)return g!=(a=f.last()[0])&&this.activate(a);if(g&&b<=e[0])return g!=(a=f[0])&&this.activate(a);for(a=e.length;a--;)g!=f[a]&&b>=e[a]&&(!e[a+1]||b<=e[a+1])&&this.activate(f[a])},b.prototype.activate=function(b){this.activeTarget=b,a(this.selector).parentsUntil(this.options.target,".active").removeClass("active");var c=this.selector+'[data-target="'+b+'"],'+this.selector+'[href="'+b+'"]',d=a(c).parents("li").addClass("active");d.parent(".dropdown-menu").length&&(d=d.closest("li.dropdown").addClass("active")),d.trigger("activate.bs.scrollspy")};var c=a.fn.scrollspy;a.fn.scrollspy=function(c){return this.each(function(){var d=a(this),e=d.data("bs.scrollspy"),f="object"==typeof c&&c;e||d.data("bs.scrollspy",e=new b(this,f)),"string"==typeof c&&e[c]()})},a.fn.scrollspy.Constructor=b,a.fn.scrollspy.noConflict=function(){return a.fn.scrollspy=c,this},a(window).on("load",function(){a('[data-spy="scroll"]').each(function(){var b=a(this);b.scrollspy(b.data())})})}(jQuery),+function(a){"use strict";var b=function(b){this.element=a(b)};b.prototype.show=function(){var b=this.element,c=b.closest("ul:not(.dropdown-menu)"),d=b.data("target");if(d||(d=b.attr("href"),d=d&&d.replace(/.*(?=#[^\s]*$)/,"")),!b.parent("li").hasClass("active")){var e=c.find(".active:last a")[0],f=a.Event("show.bs.tab",{relatedTarget:e});if(b.trigger(f),!f.isDefaultPrevented()){var g=a(d);this.activate(b.parent("li"),c),this.activate(g,g.parent(),function(){b.trigger({type:"shown.bs.tab",relatedTarget:e})})}}},b.prototype.activate=function(b,c,d){function e(){f.removeClass("active").find("> .dropdown-menu > .active").removeClass("active"),b.addClass("active"),g?(b[0].offsetWidth,b.addClass("in")):b.removeClass("fade"),b.parent(".dropdown-menu")&&b.closest("li.dropdown").addClass("active"),d&&d()}var f=c.find("> .active"),g=d&&a.support.transition&&f.hasClass("fade");g?f.one(a.support.transition.end,e).emulateTransitionEnd(150):e(),f.removeClass("in")};var c=a.fn.tab;a.fn.tab=function(c){return this.each(function(){var d=a(this),e=d.data("bs.tab");e||d.data("bs.tab",e=new b(this)),"string"==typeof c&&e[c]()})},a.fn.tab.Constructor=b,a.fn.tab.noConflict=function(){return a.fn.tab=c,this},a(document).on("click.bs.tab.data-api",'[data-toggle="tab"], [data-toggle="pill"]',function(b){b.preventDefault(),a(this).tab("show")})}(jQuery),+function(a){"use strict";var b=function(c,d){this.options=a.extend({},b.DEFAULTS,d),this.$window=a(window).on("scroll.bs.affix.data-api",a.proxy(this.checkPosition,this)).on("click.bs.affix.data-api",a.proxy(this.checkPositionWithEventLoop,this)),this.$element=a(c),this.affixed=this.unpin=this.pinnedOffset=null,this.checkPosition()};b.RESET="affix affix-top affix-bottom",b.DEFAULTS={offset:0},b.prototype.getPinnedOffset=function(){if(this.pinnedOffset)return this.pinnedOffset;this.$element.removeClass(b.RESET).addClass("affix");var a=this.$window.scrollTop(),c=this.$element.offset();return this.pinnedOffset=c.top-a},b.prototype.checkPositionWithEventLoop=function(){setTimeout(a.proxy(this.checkPosition,this),1)},b.prototype.checkPosition=function(){if(this.$element.is(":visible")){var c=a(document).height(),d=this.$window.scrollTop(),e=this.$element.offset(),f=this.options.offset,g=f.top,h=f.bottom;"top"==this.affixed&&(e.top+=d),"object"!=typeof f&&(h=g=f),"function"==typeof g&&(g=f.top(this.$element)),"function"==typeof h&&(h=f.bottom(this.$element));var i=null!=this.unpin&&d+this.unpin<=e.top?!1:null!=h&&e.top+this.$element.height()>=c-h?"bottom":null!=g&&g>=d?"top":!1;if(this.affixed!==i){this.unpin&&this.$element.css("top","");var j="affix"+(i?"-"+i:""),k=a.Event(j+".bs.affix");this.$element.trigger(k),k.isDefaultPrevented()||(this.affixed=i,this.unpin="bottom"==i?this.getPinnedOffset():null,this.$element.removeClass(b.RESET).addClass(j).trigger(a.Event(j.replace("affix","affixed"))),"bottom"==i&&this.$element.offset({top:c-h-this.$element.height()}))}}};var c=a.fn.affix;a.fn.affix=function(c){return this.each(function(){var d=a(this),e=d.data("bs.affix"),f="object"==typeof c&&c;e||d.data("bs.affix",e=new b(this,f)),"string"==typeof c&&e[c]()})},a.fn.affix.Constructor=b,a.fn.affix.noConflict=function(){return a.fn.affix=c,this},a(window).on("load",function(){a('[data-spy="affix"]').each(function(){var b=a(this),c=b.data();c.offset=c.offset||{},c.offsetBottom&&(c.offset.bottom=c.offsetBottom),c.offsetTop&&(c.offset.top=c.offsetTop),b.affix(c)})})}(jQuery);
;require.register("application", function(exports, require, module) {
var Application, Storage, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Storage = require("storage");

module.exports = Application = (function(_super) {
  __extends(Application, _super);

  function Application() {
    _ref = Application.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Application.prototype.start = function() {
    var _this = this;
    return $.get("/api/auth", function(data) {
      if (data.auth) {
        Storage.user = data.user;
      }
      return Application.__super__.start.apply(_this, arguments);
    });
  };

  return Application;

})(Chaplin.Application);
});

;require.register("collections/shotCollection", function(exports, require, module) {
var Shot, ShotsCollection, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Shot = require("models/shot");

module.exports = ShotsCollection = (function(_super) {
  __extends(ShotsCollection, _super);

  function ShotsCollection() {
    _ref = ShotsCollection.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotsCollection.prototype.model = Shot;

  ShotsCollection.prototype.url = "/api/shots";

  ShotsCollection.prototype.forceLoad = function() {
    var _this = this;
    return $.get("" + this.url + "/load").done(function() {
      return _this.fetch();
    }).fail(function() {});
  };

  return ShotsCollection;

})(Chaplin.Collection);
});

;require.register("collections/stationCollection", function(exports, require, module) {
var Station, StationCollection, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Station = require("models/station");

module.exports = StationCollection = (function(_super) {
  __extends(StationCollection, _super);

  function StationCollection() {
    _ref = StationCollection.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  _.extend(StationCollection.prototype, Chaplin.SyncMachine);

  StationCollection.prototype.model = Station;

  StationCollection.prototype.url = "/api/stations";

  return StationCollection;

})(Chaplin.Collection);
});

;require.register("controllers/auth/authController", function(exports, require, module) {
var AuthController, BaseController, Storage, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Storage = require("storage");

BaseController = require("controllers/base/baseController");

module.exports = AuthController = (function(_super) {
  __extends(AuthController, _super);

  function AuthController() {
    _ref = AuthController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  AuthController.prototype.beforeAction = function(params, route) {
    AuthController.__super__.beforeAction.apply(this, arguments);
    if (Storage.user == null) {
      Storage.redirectUrl = window.location.pathname;
      return this.redirectTo('auth_login');
    }
  };

  return AuthController;

})(BaseController);
});

;require.register("controllers/auth/loginController", function(exports, require, module) {
var BaseController, LoginController, LoginView, SiteView, Storage, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

LoginView = require("views/auth/loginView");

SiteView = require("views/site/siteView");

Storage = require("storage");

BaseController = require("controllers/base/baseController");

module.exports = LoginController = (function(_super) {
  __extends(LoginController, _super);

  function LoginController() {
    _ref = LoginController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  LoginController.prototype.login = function() {
    return this.view = new LoginView({
      region: "main",
      autoRender: true
    });
  };

  LoginController.prototype.logout = function() {
    var _this = this;
    return $.post("/api/auth/logout").then(function() {
      Storage.user = null;
      Chaplin.mediator.publish('loginState', null);
      return _this.redirectTo("static#about");
    });
  };

  return LoginController;

})(BaseController);
});

;require.register("controllers/auth/stationAuthController", function(exports, require, module) {
var AuthController, SiteView, Station, StationCreateView, StationEditView, StationRenameView, stationAuthController, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AuthController = require("./authController");

Station = require("models/station");

StationEditView = require("views/station/edit/stationEditView");

StationCreateView = require("views/station/create/stationCreateView");

StationRenameView = require("views/station/rename/stationRenameView");

SiteView = require("views/site/siteView");

module.exports = stationAuthController = (function(_super) {
  __extends(stationAuthController, _super);

  function stationAuthController() {
    _ref = stationAuthController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  stationAuthController.prototype.beforeAction = function() {
    stationAuthController.__super__.beforeAction.apply(this, arguments);
    return this.reuse('site', SiteView);
  };

  stationAuthController.prototype.edit = function(params) {
    var _this = this;
    this.model = new Station({
      name: params.name
    });
    this.view = new StationEditView({
      model: this.model,
      region: "main"
    });
    return this.model.fetch().then(function() {
      return _this.view.render();
    });
  };

  stationAuthController.prototype.create = function(params) {
    return this.view = new StationCreateView({
      region: "main",
      autoRender: true
    });
  };

  stationAuthController.prototype.rename = function(params) {
    var _this = this;
    this.model = new Station({
      name: params.name
    });
    this.view = new StationRenameView({
      model: this.model,
      region: "main"
    });
    return this.model.fetch().then(function() {
      return _this.view.render();
    });
  };

  return stationAuthController;

})(AuthController);
});

;require.register("controllers/base/baseController", function(exports, require, module) {
var BaseController, HeaderView, SiteView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site/siteView");

HeaderView = require("views/site/header/headerView");

module.exports = BaseController = (function(_super) {
  __extends(BaseController, _super);

  function BaseController() {
    _ref = BaseController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  BaseController.prototype.beforeAction = function() {
    BaseController.__super__.beforeAction.apply(this, arguments);
    this.reuse('site', SiteView);
    return this.reuse('header', HeaderView, {
      region: 'header'
    });
  };

  return BaseController;

})(Chaplin.Controller);
});

;require.register("controllers/shotsController", function(exports, require, module) {
var BaseController, Shot, ShotCollection, ShotGridView, ShotView, ShotsController, SiteView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site/siteView");

Shot = require("models/shot");

ShotCollection = require("collections/shotCollection");

ShotGridView = require("views/shot/grid/shotGridView");

ShotView = require("views/shot/show/shotView");

BaseController = require("controllers/base/baseController");

module.exports = ShotsController = (function(_super) {
  __extends(ShotsController, _super);

  function ShotsController() {
    _ref = ShotsController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotsController.prototype.beforeAction = function() {
    return ShotsController.__super__.beforeAction.apply(this, arguments);
  };

  ShotsController.prototype.index = function() {
    this.collection = new ShotCollection;
    this.view = new ShotGridView({
      collection: this.collection,
      region: "main"
    });
    return this.collection.fetch();
  };

  ShotsController.prototype.show = function(params) {
    var _this = this;
    this.model = new Shot({
      "_id": params.id
    });
    this.view = new ShotView({
      model: this.model,
      region: "main"
    });
    return this.model.fetch().then(function() {
      return _this.view.render();
    });
  };

  return ShotsController;

})(BaseController);
});

;require.register("controllers/staticController", function(exports, require, module) {
var AboutView, BaseController, SiteView, StaticController, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site/siteView");

AboutView = require("views/about/aboutView");

BaseController = require("controllers/base/baseController");

module.exports = StaticController = (function(_super) {
  __extends(StaticController, _super);

  function StaticController() {
    _ref = StaticController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StaticController.prototype.beforeAction = function() {
    return StaticController.__super__.beforeAction.apply(this, arguments);
  };

  StaticController.prototype.about = function(params) {
    return this.view = new AboutView({
      autoRender: true,
      region: "main"
    });
  };

  return StaticController;

})(BaseController);
});

;require.register("controllers/stationsController", function(exports, require, module) {
var BaseController, SiteView, Station, StationCollection, StationEditView, StationListView, StationView, StationsController, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SiteView = require("views/site/siteView");

Station = require("/models/station");

StationCollection = require("/collections/stationCollection");

StationListView = require("/views/station/list/stationListView");

StationEditView = require("/views/station/edit/stationEditView");

StationView = require("/views/station/show/stationView");

BaseController = require("controllers/base/baseController");

module.exports = StationsController = (function(_super) {
  __extends(StationsController, _super);

  function StationsController() {
    _ref = StationsController.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationsController.prototype.beforeAction = function() {
    return StationsController.__super__.beforeAction.apply(this, arguments);
  };

  StationsController.prototype.index = function(params) {
    var _this = this;
    this.collection = new StationCollection;
    this.view = new StationListView({
      collection: this.collection,
      region: "main"
    });
    return this.collection.fetch().then(function() {
      return _this.view.render();
    });
  };

  StationsController.prototype.show = function(params) {
    var _this = this;
    this.model = new Station({
      name: params.name
    });
    this.view = new StationView({
      model: this.model,
      region: "main"
    });
    return this.model.fetch().then(function() {
      return _this.view.render();
    });
  };

  return StationsController;

})(BaseController);
});

;require.register("initialize", function(exports, require, module) {
var Application;

require("utils/analytics/yandexMetrika");

Application = require("application");

/*
 Application's initialization routine
*/


$(function() {
  new Application({
    controllerSuffix: 'Controller',
    pushState: true,
    routes: require("routes")
  });
  return $(window).resize(function(e) {
    return Chaplin.mediator.publish('window-resized', $(window).width(), $(window).height());
  });
});
});

;require.register("models/shot", function(exports, require, module) {
var Shot, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = Shot = (function(_super) {
  __extends(Shot, _super);

  function Shot() {
    _ref = Shot.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Shot.prototype.idAttribute = "_id";

  Shot.prototype.urlRoot = "/api/shots";

  Shot.prototype.print = function() {
    var _this = this;
    return $.get("" + (this.url()) + "/queue").done(function() {
      return _this.set("status", "queued");
    });
  };

  return Shot;

})(Chaplin.Model);
});

;require.register("models/station", function(exports, require, module) {
var Station, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = Station = (function(_super) {
  __extends(Station, _super);

  function Station() {
    _ref = Station.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  Station.prototype.idAttribute = "name";

  Station.prototype.urlRoot = "/api/stations";

  Station.prototype.rename = function(name, cb) {
    var _this = this;
    return $.post("" + (this.url()) + "/rename", {
      name: name
    }, function() {
      _this.set("name", name);
      return cb();
    });
  };

  Station.prototype.secret = function(cb) {
    var _this = this;
    return $.get("" + (this.url()) + "/secret", function(data) {
      return cb(data.secret);
    });
  };

  return Station;

})(Chaplin.Model);
});

;require.register("routes", function(exports, require, module) {
module.exports = function(match) {
  match("stations", "stations#index");
  match("stations/create", {
    controller: "auth/stationAuth",
    action: "create",
    name: "station_create"
  });
  match("stations/:name", "stations#show");
  match("stations/:name/edit", {
    controller: "auth/stationAuth",
    action: "edit",
    name: "station_edit"
  });
  match("stations/:name/rename", {
    controller: "auth/stationAuth",
    action: "rename",
    name: "station_rename"
  });
  match("auth/login", {
    controller: "auth/login",
    action: "login",
    name: "auth_login"
  });
  match("auth/logout", {
    controller: "auth/login",
    action: "logout",
    name: "auth_logout"
  });
  match("shots", "shots#index");
  match("shots/:id", "shots#show");
  return match("", "static#about");
};
});

;require.register("storage", function(exports, require, module) {
var Storage;

module.exports = Storage = (function() {
  function Storage() {}

  return Storage;

})();
});

;require.register("utils/analytics/yandexMetrika", function(exports, require, module) {
(function (d, w, c) {
    (w[c] = w[c] || []).push(function() {
        try {
          w.yaCounter24199384 = new Ya.Metrika({
            id: 24199384,
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            trackHash: true
          });
        } catch(e) { }
    });

    var n = d.getElementsByTagName("script")[0],
        s = d.createElement("script"),
        f = function () { n.parentNode.insertBefore(s, n); };
    s.type = "text/javascript";
    s.async = true;
    s.src = (d.location.protocol == "https:" ? "https:" : "http:") + "//mc.yandex.ru/metrika/watch.js";

    if (w.opera == "[object Opera]") {
        d.addEventListener("DOMContentLoaded", f, false);
    } else { f(); }
})(document, window, "yandex_metrika_callbacks");

});

;require.register("views/about/aboutView", function(exports, require, module) {
var AboutView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

module.exports = AboutView = (function(_super) {
  __extends(AboutView, _super);

  function AboutView() {
    _ref = AboutView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  _.extend(AboutView.prototype, Chaplin.EventBroker);

  AboutView.prototype.initialize = function() {
    this.subscribeEvent('window-resized', this.onResize);
    return AboutView.__super__.initialize.apply(this, arguments);
  };

  AboutView.prototype.dispose = function() {
    this.turnSlideshowOff();
    return AboutView.__super__.dispose.apply(this, arguments);
  };

  /*
  # Slideshow-related methods
  */


  AboutView.prototype.numberOfSlides = 5;

  AboutView.prototype.slideshowInterval = 5000;

  AboutView.prototype.slideshowStopped = false;

  AboutView.prototype.slideshowHandler = function() {
    var imageUrl, nextSlide, prevSlide, self;
    if (!this.currentSlide) {
      this.currentSlide = _.sample(_.range(1, this.numberOfSlides + 1));
    } else {
      this.currentSlide = (this.currentSlide + 1) % this.numberOfSlides + 1;
    }
    prevSlide = this.$('.slide.active');
    nextSlide = this.$('.slide:not(.active)');
    imageUrl = "/images/slideshow/landing-bg-" + this.currentSlide + ".png";
    nextSlide.css({
      'background-image': "url('" + imageUrl + "')"
    });
    self = this;
    return $('<img/>').attr('src', imageUrl).load(function() {
      $(this).remove();
      prevSlide.removeClass('active');
      nextSlide.addClass('active');
      if (!self.slideshowStopped) {
        return self.timeoutHandle = setTimeout(_.bind(self.slideshowHandler, self), self.slideshowInterval);
      }
    });
  };

  AboutView.prototype.turnSlideshowOff = function() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.intervalHandle = null;
    }
    return this.slideshowStopped = true;
  };

  AboutView.prototype.turnSlideshowOn = function() {
    this.turnSlideshowOff();
    this.slideshowStopped = false;
    return this.slideshowHandler();
  };

  /*
  # Resize and render
  */


  AboutView.prototype.onResize = function(w, h) {
    return this.$('.full-height').height(h);
  };

  AboutView.prototype.render = function() {
    AboutView.__super__.render.apply(this, arguments);
    this.turnSlideshowOn();
    return this.$('.full-height').height($(window).height());
  };

  AboutView.prototype.template = require("./aboutView_");

  AboutView.prototype.getTemplateData = function() {};

  return AboutView;

})(View);
});

;require.register("views/about/aboutView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"about-view\"><div class=\"fullpage-layer bottommost\"></div><div class=\"fullpage-layer slide first active\"></div><div class=\"fullpage-layer slide second\"></div><div class=\"fullpage-layer fade-overlay\"></div><div class=\"landing text-center\"><div class=\"fake-offset\"></div><div class=\"full-height centered-container\"><div class=\"centered container\"><h1 class=\"big-header\">Снимайте,\nпечатайте,<br/>делитесь!</h1><div class=\"row\"><div class=\"col-md-1\"></div><div class=\"col-md-10\"><div class=\"big-header-subtitle\">Представляем независимый проект по печати фотографий из Instagram\n&mdash; <b>StevieWhale</b></div><a" + (jade.attr("href", "" + (jade.url('shots#index')) + "", true, false)) + " class=\"wow-button btn btn-lg\">Ух ты, как интересно!</a></div><div class=\"col-md-1\"></div></div></div></div></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/auth/loginView", function(exports, require, module) {
var LoginView, Storage, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Storage = require("storage");

module.exports = LoginView = (function(_super) {
  __extends(LoginView, _super);

  function LoginView() {
    _ref = LoginView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  LoginView.prototype.initialize = function() {
    return this.delegate("submit", ".login-form", this.login);
  };

  LoginView.prototype.loginSuccess = function(user) {
    Storage.user = user;
    Chaplin.mediator.publish('loginState', user);
    if (Storage.redirectUrl != null) {
      return Chaplin.utils.redirectTo({
        url: Storage.redirectUrl
      });
    } else {
      return Chaplin.utils.redirectTo("static#about");
    }
  };

  LoginView.prototype.login = function(evt) {
    var data,
      _this = this;
    evt.preventDefault();
    data = {
      username: this.$(".login-field").val(),
      password: this.$(".password-field").val()
    };
    return $.post('/api/auth/login', data).done(function(data) {
      return _this.loginSuccess(data.user);
    }).fail(function() {
      _this.$(".login-form").addClass("animated shake");
      _this.$(".login-form input").prop("disabled", true);
      return setTimeout(function() {
        _this.$(".login-form").removeClass("animated shake");
        return _this.$(".login-form input").prop("disabled", false);
      }, 1000);
    });
  };

  LoginView.prototype.template = require("./loginView_");

  LoginView.prototype.getTemplateData = function() {};

  return LoginView;

})(View);
});

;require.register("views/auth/loginView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<form role=\"form\" class=\"text-center login-form\"><h2>Вумпс! Авторизуйтесь</h2><div class=\"logo-container\"><img src=\"/images/stevie-kid.svg\" class=\"img-responsive\"/></div><form action=\"javascript:void(0)\"><div class=\"form-group form-group-lg\"><input type=\"text\" placeholder=\"Логин\" class=\"login-field form-control\"/><input type=\"password\" placeholder=\"Пароль\" class=\"password-field form-control\"/></div><button type=\"submit\" class=\"login-button btn btn-lg btn-success btn-block\">Войти</button></form></form>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/base/base", function(exports, require, module) {
var Storage, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

jade.url = Chaplin.utils.reverse;

jade.markdown = (function() {
  var converter,
    _this = this;
  converter = new Showdown.converter();
  return function(text) {
    if (text != null) {
      return converter.makeHtml(text);
    }
  };
})();

Storage = require("storage");

jade.auth = function() {
  return Storage.user != null;
};

module.exports = View = (function(_super) {
  __extends(View, _super);

  function View() {
    _ref = View.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  View.prototype.getTemplateFunction = function() {
    return this.template;
  };

  return View;

})(Chaplin.View);
});

;require.register("views/base/collectionView", function(exports, require, module) {
var CollectionView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require('./base');

module.exports = CollectionView = (function(_super) {
  __extends(CollectionView, _super);

  function CollectionView() {
    _ref = CollectionView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  CollectionView.prototype.getTemplateFunction = View.prototype.getTemplateFunction;

  return CollectionView;

})(Chaplin.CollectionView);
});

;require.register("views/shot/grid/item/shotGridItemView", function(exports, require, module) {
var Shot, ShotGridItemView, Storage, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Storage = require("storage");

Shot = require("models/shot");

module.exports = ShotGridItemView = (function(_super) {
  __extends(ShotGridItemView, _super);

  function ShotGridItemView() {
    _ref = ShotGridItemView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotGridItemView.prototype.className = "shot-grid-item col-lg-3 col-md-3 col-sm-4 col-xs-6";

  ShotGridItemView.prototype.initialize = function() {
    ShotGridItemView.__super__.initialize.apply(this, arguments);
    this.delegate("click", ".delete-confirm", this.deleteHandler);
    return this.delegate("click", ".print-button", this.printHandler);
  };

  ShotGridItemView.prototype.deleteHandler = function() {
    return this.model.destroy({
      wait: true
    });
  };

  ShotGridItemView.prototype.printHandler = function() {
    return this.model.print();
  };

  ShotGridItemView.prototype.template = require("./shotGridItemView_");

  ShotGridItemView.prototype.getTemplateData = function() {
    return {
      shot: this.model.attributes
    };
  };

  return ShotGridItemView;

})(View);
});

;require.register("views/shot/grid/item/shotGridItemView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),shot = locals_.shot;
buf.push("<div class=\"polaroid\"><a" + (jade.attr("href", jade.url('shots#show', {id : shot._id}), true, false)) + "><img" + (jade.attr("src", "" + (shot.thumbnail) + "", true, false)) + " class=\"polaroid-photo img-responsive\"/><div class=\"photo-user\"><div class=\"media\"><a" + (jade.attr("href", "http://instagram.com/" + shot.instagram.user.username, true, false)) + " target=\"_blank\" class=\"pull-left\"><img" + (jade.attr("src", shot.instagram.user.profile_picture, true, false)) + " width=\"48\" height=\"48\" class=\"img-circle media-object\"/></a><div class=\"media-body\"><a" + (jade.attr("href", "http://instagram.com/" + shot.instagram.user.username, true, false)) + " target=\"_blank\"><h4 class=\"media-heading\">@" + (jade.escape(null == (jade.interp = shot.instagram.user.username) ? "" : jade.interp)) + "<small> (" + (jade.escape(null == (jade.interp = shot.instagram.user.full_name) ? "" : jade.interp)) + ")</small></h4></a>" + (jade.escape(null == (jade.interp = shot.instagram.caption.text) ? "" : jade.interp)) + "</div></div></div></a></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/shot/grid/shotGridView", function(exports, require, module) {
var CollectionView, ShotGridItemView, ShotGridView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

ShotGridItemView = require("./item/shotGridItemView");

CollectionView = require("views/base/collectionView");

module.exports = ShotGridView = (function(_super) {
  __extends(ShotGridView, _super);

  function ShotGridView() {
    _ref = ShotGridView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotGridView.prototype.animationDuration = 300;

  ShotGridView.prototype.initialize = function() {
    var _this = this;
    ShotGridView.__super__.initialize.apply(this, arguments);
    return this.delegate("click", ".load-button", function() {});
  };

  ShotGridView.prototype.className = "shot-grid-view";

  ShotGridView.prototype.listSelector = ".shot-grid";

  ShotGridView.prototype.itemView = ShotGridItemView;

  ShotGridView.prototype.template = require("./shotGridView_");

  return ShotGridView;

})(CollectionView);
});

;require.register("views/shot/grid/shotGridView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"shot-grid-view\"><div class=\"container\"><div class=\"shot-grid\"></div></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/shot/show/shotView", function(exports, require, module) {
var ShotView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

module.exports = ShotView = (function(_super) {
  __extends(ShotView, _super);

  function ShotView() {
    _ref = ShotView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ShotView.prototype.template = require("./shotView_");

  ShotView.prototype.getTemplateData = function() {
    return {
      shot: this.model.attributes
    };
  };

  return ShotView;

})(View);
});

;require.register("views/shot/show/shotView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),shot = locals_.shot;
buf.push("<div class=\"container\"><div class=\"row shot-single-view\"><div class=\"col-lg-4 col-md-5 col-xs-8\"><div class=\"shot-grid-item\"><div class=\"polaroid\"><a" + (jade.attr("href", shot.instagram.link, true, false)) + " target=\"_blank\"><img" + (jade.attr("src", "" + (shot.image) + "", true, false)) + " class=\"polaroid-photo img-responsive\"/></a><div class=\"photo-user\"><div class=\"media\"><a" + (jade.attr("href", "http://instagram.com/" + shot.instagram.user.username, true, false)) + " target=\"_blank\" class=\"pull-left\"><img" + (jade.attr("src", shot.instagram.user.profile_picture, true, false)) + " width=\"48\" height=\"48\" class=\"img-circle media-object\"/></a><div class=\"media-body\"><a" + (jade.attr("href", "http://instagram.com/" + shot.instagram.user.username, true, false)) + " target=\"_blank\"><h4 class=\"media-heading\">@" + (jade.escape(null == (jade.interp = shot.instagram.user.username) ? "" : jade.interp)) + "<small> (" + (jade.escape(null == (jade.interp = shot.instagram.user.full_name) ? "" : jade.interp)) + ")</small></h4></a>" + (jade.escape(null == (jade.interp = shot.instagram.caption.text) ? "" : jade.interp)) + "</div></div></div></div></div></div><div class=\"col-lg-8 col-md-7 col-xs-12\">");
switch (shot.status){
case "printed":
buf.push("<h3>Как забрать фотографию со станции &laquo;<a" + (jade.attr("href", jade.url('stations#show', { name : shot.printedOn.name}), true, false)) + ">" + (jade.escape(null == (jade.interp = shot.printedOn.title) ? "" : jade.interp)) + "</a>&raquo;?</h3><div class=\"markdown\">" + (null == (jade.interp = jade.markdown(shot.printedOn.instructions)) ? "" : jade.interp) + "</div>");
  break;
default:
buf.push("<h3>Фотография еще не была напечатана</h3>");
  break;
}
buf.push("</div></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/site/header/headerView", function(exports, require, module) {
var HeaderView, View, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require('views/base/base');

module.exports = HeaderView = (function(_super) {
  __extends(HeaderView, _super);

  function HeaderView() {
    this.onDispatch = __bind(this.onDispatch, this);
    this.onLoginChanged = __bind(this.onLoginChanged, this);
    _ref = HeaderView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  HeaderView.prototype.template = require('./headerView_');

  HeaderView.prototype.className = 'header-view-container';

  HeaderView.prototype.initialize = function() {
    Chaplin.mediator.subscribe('dispatcher:dispatch', this.onDispatch);
    Chaplin.mediator.subscribe('loginState', this.onLoginChanged);
    return HeaderView.__super__.initialize.apply(this, arguments);
  };

  HeaderView.prototype.onLoginChanged = function(user) {
    return this.render();
  };

  HeaderView.prototype.onDispatch = function(currentController, params, route, options) {
    var action;
    action = route.controller.split('/')[0];
    this.$('.site-navigation li.selected').removeClass('selected');
    this.$(".site-navigation li.nav-" + action).addClass('selected');
    if (action === 'static') {
      return this.$el.addClass('static-page');
    } else {
      return this.$el.removeClass('static-page');
    }
  };

  return HeaderView;

})(View);
});

;require.register("views/site/header/headerView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<nav class=\"site-navigation navbar navbar-static-top\"><div class=\"container\"><ul class=\"nav navbar-nav navbar-left\"><li class=\"nav-static\"><a" + (jade.attr("href", jade.url("static#about"), true, false)) + "> О проекте</a></li><li class=\"nav-stations\"><a" + (jade.attr("href", "" + (jade.url('stations#index')) + "", true, false)) + "> Печатные станции</a></li><li class=\"nav-shots\"><a" + (jade.attr("href", "" + (jade.url('shots#index')) + "", true, false)) + "> Фотографии</a></li></ul><ul class=\"nav navbar-nav navbar-right\">");
if ( !jade.auth())
{
buf.push("<li><a" + (jade.attr("href", "" + (jade.url('auth_login')) + "", true, false)) + "> войти</a></li>");
}
else
{
buf.push("<li><a" + (jade.attr("href", "" + (jade.url('auth_logout')) + "", true, false)) + "> выйти</a></li>");
}
buf.push("</ul></div></nav>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/site/siteView", function(exports, require, module) {
var SiteView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require('views/base/base');

module.exports = SiteView = (function(_super) {
  __extends(SiteView, _super);

  function SiteView() {
    _ref = SiteView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  SiteView.prototype.container = 'body';

  SiteView.prototype.id = 'site-container';

  SiteView.prototype.regions = {
    main: '#main-container',
    header: '#header-container'
  };

  SiteView.prototype.template = require('./siteView_');

  return SiteView;

})(View);
});

;require.register("views/site/siteView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div id=\"header-container\"></div><div class=\"container-fluid site-container\"><div id=\"main-container\"></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/station/create/stationCreateView", function(exports, require, module) {
var Station, StationCollection, StationCreateView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Station = require("models/station");

StationCollection = require("collections/stationCollection");

module.exports = StationCreateView = (function(_super) {
  __extends(StationCreateView, _super);

  function StationCreateView() {
    _ref = StationCreateView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationCreateView.prototype.initialize = function() {
    return this.delegate("click", ".register-button", this.register);
  };

  StationCreateView.prototype.register = function() {
    var fields, station;
    fields = {
      title: this.$(".title-input").val(),
      subtitle: this.$(".subtitle-input").val()
    };
    station = new Station(fields);
    return station.save(null, {
      success: function() {
        return Chaplin.utils.redirectTo("stations#index");
      }
    });
  };

  StationCreateView.prototype.template = require("./stationCreateView_");

  StationCreateView.prototype.getTemplateData = function() {};

  return StationCreateView;

})(View);
});

;require.register("views/station/create/stationCreateView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"container\"><h1>Регистрация станции</h1><div role=\"form\" class=\"form\"><div class=\"form-group\"><input type=\"text\" placeholder=\"Название\" class=\"title-input form-control\"/></div><div class=\"form-group\"><input type=\"text\" placeholder=\"Подзаголовок\" class=\"subtitle-input form-control\"/></div><div class=\"row\"><div class=\"col-md-4 col-md-offset-4\"><div class=\"register-button btn btn-primary btn-lg btn-block save-button\">Зарегистрировать</div></div></div></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/station/edit/stationEditView", function(exports, require, module) {
var Station, StationEditView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Station = require("models/station");

module.exports = StationEditView = (function(_super) {
  __extends(StationEditView, _super);

  function StationEditView() {
    _ref = StationEditView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationEditView.prototype.model = Station;

  StationEditView.prototype.template = require("./stationEditView_");

  StationEditView.prototype.initialize = function() {
    return this.delegate('click', '.save-button', this.save);
  };

  StationEditView.prototype.save = function() {
    var fields,
      _this = this;
    fields = {
      title: this.$(".title-input").val(),
      subtitle: this.$(".subtitle-input").val(),
      description: this.$(".desc-input").val(),
      instructions: this.$(".instructions-input").val()
    };
    return this.model.save(fields, {
      success: function() {
        return Chaplin.utils.redirectTo("stations#show", {
          name: _this.model.attributes.name
        });
      }
    });
  };

  StationEditView.prototype.getTemplateData = function() {
    return {
      station: this.model.attributes
    };
  };

  return StationEditView;

})(View);
});

;require.register("views/station/edit/stationEditView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),station = locals_.station;
buf.push("<div class=\"container\"><h1>Редактировать станцию</h1><div role=\"form\" class=\"form\">   <div class=\"form-group\"><label>Название</label><input type=\"text\"" + (jade.attr("value", station.title, true, false)) + " class=\"title-input form-control\"/></div><div class=\"form-group\"><label>Подзаголовок</label><input type=\"text\"" + (jade.attr("value", station.subtitle, true, false)) + " class=\"subtitle-input form-control\"/></div><div class=\"form-group\"><label>Как забрать фотографию? <small>(Поддерживает Markdown)</small></label><textarea rows=\"6\"" + (jade.attr("text", station.description, true, false)) + " class=\"instructions-input form-control\">" + (jade.escape(null == (jade.interp = station.instructions) ? "" : jade.interp)) + "</textarea></div><div class=\"form-group\"><label>Описание <small>(Поддерживает Markdown)</small></label><textarea rows=\"12\"" + (jade.attr("text", station.description, true, false)) + " class=\"desc-input form-control\">" + (jade.escape(null == (jade.interp = station.description) ? "" : jade.interp)) + "</textarea></div><div class=\"row\"><div class=\"col-md-4 col-md-offset-4\"><div class=\"login-button btn btn-primary btn-lg btn-block save-button\">Сохранить</div></div></div></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/station/list/stationListItemView", function(exports, require, module) {
var StationListItemView, Storage, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Storage = require("storage");

module.exports = StationListItemView = (function(_super) {
  __extends(StationListItemView, _super);

  function StationListItemView() {
    _ref = StationListItemView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationListItemView.prototype.template = require("./stationListItemView_");

  StationListItemView.prototype.getTemplateData = function() {
    return {
      station: this.model.attributes
    };
  };

  return StationListItemView;

})(View);
});

;require.register("views/station/list/stationListItemView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),station = locals_.station;
buf.push("<div class=\"station-item\"><h3><a" + (jade.attr("href", jade.url('stations#show', { name : station.name }), true, false)) + ">" + (jade.escape(null == (jade.interp = station.title ) ? "" : jade.interp)) + "</a> ");
switch (station.online){
case true :
buf.push("<span class=\"label label-success\">Онлайн</span>");
  break;
default:
buf.push("<span class=\"label label-warning\">Оффлайн</span>");
  break;
}
buf.push("</h3><p class=\"lead\">" + (jade.escape(null == (jade.interp = station.subtitle) ? "" : jade.interp)) + "</p></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/station/list/stationListView", function(exports, require, module) {
var StationListItemView, StationListView, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

StationListItemView = require("./stationListItemView");

module.exports = StationListView = (function(_super) {
  __extends(StationListView, _super);

  function StationListView() {
    _ref = StationListView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationListView.prototype.animationDuration = 300;

  StationListView.prototype.itemView = StationListItemView;

  StationListView.prototype.listSelector = ".station-list";

  StationListView.prototype.loadingSelector = ".loading-container";

  StationListView.prototype.template = require("./stationListView_");

  StationListView.prototype.getTemplateData = function() {};

  StationListView.prototype.getTemplateFunction = function() {
    return this.template;
  };

  return StationListView;

})(Chaplin.CollectionView);
});

;require.register("views/station/list/stationListView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"container navbar-shift\"><div class=\"row\"><div class=\"col-md-12\">");
if ( jade.auth())
{
buf.push("<a" + (jade.attr("href", jade.url("station_create"), true, false)) + " class=\"btn btn-success\"><i class=\"fa fa-plus\"></i> Зарегистрировать</a>");
}
buf.push("<div class=\"loading-container\"><h2>Загрузка</h2></div><div class=\"station-list\"></div></div></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/station/rename/stationRenameView", function(exports, require, module) {
var Station, StationCollection, StationRenameView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Station = require("models/station");

StationCollection = require("collections/stationCollection");

module.exports = StationRenameView = (function(_super) {
  __extends(StationRenameView, _super);

  function StationRenameView() {
    _ref = StationRenameView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationRenameView.prototype.initialize = function() {
    this.delegate("click", ".rename-button", this.rename);
    return this.delegate("click", ".cancel-button", this.cancel);
  };

  StationRenameView.prototype.rename = function() {
    var nameValue,
      _this = this;
    nameValue = $(".name-input").val();
    return this.model.rename(nameValue, function(err) {
      return _this.cancel();
    });
  };

  StationRenameView.prototype.cancel = function() {
    return Chaplin.utils.redirectTo("stations#show", {
      name: this.model.get("name")
    });
  };

  StationRenameView.prototype.template = require("./stationRenameView_");

  StationRenameView.prototype.getTemplateData = function() {
    return {
      station: this.model.attributes
    };
  };

  return StationRenameView;

})(View);
});

;require.register("views/station/rename/stationRenameView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),station = locals_.station;
buf.push("<div class=\"container\"><div class=\"row text-center\"><h1>Сменить URL станции</h1><div class=\"col-md-4 col-md-offset-4\"><div role=\"form\" class=\"form\"><div class=\"form-group\"><input type=\"text\"" + (jade.attr("value", station.name, true, false)) + " placeholder=\"Название\" class=\"name-input form-control\"/></div><div class=\"form-group\"><div class=\"rename-button btn btn-success btn-block btn-lg\">Поменять</div><div class=\"cancel-button btn btn-default btn-block btn-lg\">Отмена</div></div></div></div></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/station/show/stationView", function(exports, require, module) {
var Station, StationView, View, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require("views/base/base");

Station = require("models/station");

module.exports = StationView = (function(_super) {
  __extends(StationView, _super);

  function StationView() {
    _ref = StationView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  StationView.prototype.model = Station;

  StationView.prototype.initialize = function() {
    this.delegate("click", ".delete-confirm-button", this.deleteStation);
    return this.delegate("click", ".secret-button", this.showSecret);
  };

  StationView.prototype.deleteStation = function() {
    var _this = this;
    this.$(".delete-modal").modal("hide");
    return this.model.destroy({
      success: function() {
        return Chaplin.utils.redirectTo("stations#index");
      }
    });
  };

  StationView.prototype.showSecret = function() {
    var _this = this;
    return this.model.secret(function(secret) {
      _this.$(".secret-modal .secret-field").text(secret);
      return _this.$(".secret-modal").modal("show");
    });
  };

  StationView.prototype.template = require("./stationView_");

  StationView.prototype.render = function() {
    var canvas, ctx, streamingText, wsAddress;
    StationView.__super__.render.apply(this, arguments);
    canvas = this.$(".video-canvas")[0];
    ctx = canvas.getContext('2d');
    streamingText = "Прямой эфир выключен";
    if (this.model.get("streaming")) {
      streamingText = "Живая трансляция станции";
    }
    this.$('.tooltip-button').tooltip({
      placement: 'top',
      title: streamingText
    });
    if (this.model.get("streaming")) {
      wsAddress = "ws://" + window.location.hostname + ":3030/" + this.model.attributes.name;
      this.client = new WebSocket(wsAddress);
      return this.player = new jsmpeg(this.client, {
        canvas: canvas
      });
    }
  };

  StationView.prototype.getTemplateData = function() {
    return {
      station: this.model.attributes
    };
  };

  return StationView;

})(View);
});

;require.register("views/station/show/stationView_", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),station = locals_.station;
buf.push("<div class=\"container\"><div class=\"station-item\"><h1>" + (jade.escape(null == (jade.interp = station.title ) ? "" : jade.interp)) + "&nbsp;");
switch (station.online){
case true :
buf.push("<span class=\"label label-success\">Онлайн</span>");
  break;
default:
buf.push("<span class=\"label label-warning\">Оффлайн</span>");
  break;
}
buf.push("<h2>");
if ( jade.auth())
{
buf.push("<div class=\"btn-group btn-group-sm\"><button type=\"button\" data-toggle=\"dropdown\" class=\"btn btn-default dropdown-toggle\"><i class=\"fa fa-gear\"></i> <span class=\"caret\"></span></button><ul role=\"menu\" class=\"dropdown-menu\"><li><a" + (jade.attr("href", jade.url('station_edit', {name : station.name}), true, false)) + " class=\"edit-button\"><i class=\"fa fa-edit\"></i> Редактировать</a></li><li><a" + (jade.attr("href", jade.url('station_rename', {name : station.name}), true, false)) + " class=\"edit-button\"><i class=\"fa fa-cloud\"></i> Сменить URL</a></li><li><a href=\"#\" class=\"secret-button\"><i class=\"fa fa-asterisk\"></i> Показать пароль</a></li><li><a href=\"#\" data-toggle=\"modal\" data-target=\".delete-modal\" class=\"delete-button\"><i class=\"fa fa-trash-o\"></i> Удалить</a></li></ul></div>");
}
buf.push("        <small>" + (jade.escape(null == (jade.interp = station.subtitle) ? "" : jade.interp)) + "</small></h2></h1><div class=\"station-info row\"><div class=\"video-streaming col-md-4\"><canvas width=\"240\" height=\"240\" data-toggle=\"tooltip\" class=\"video-canvas tooltip-button\"></canvas></div><div class=\"station-title col-md-8\"><h3>Как забирать фотографии с этой станции?</h3><div class=\"markdown\">" + (null == (jade.interp = jade.markdown(station.instructions)) ? "" : jade.interp) + "</div></div></div><div class=\"markdown\">" + (null == (jade.interp = jade.markdown(station.description)) ? "" : jade.interp) + "</div></div><div tabindex=\"-1\" role=\"dialog\" aria-labelledby=\"mySmallModalLabel\" aria-hidden=\"true\" class=\"modal delete-modal\"><div class=\"modal-dialog modal-sm\"><div class=\"modal-content\"><div class=\"modal-header\"><h4 class=\"modal-title\">Удалить станцию?</h4></div><div class=\"modal-body\">Внимательно подумайте перед удалением станции, возможно, она вам \nеще пригодится! </div><div class=\"modal-footer text-center\"><button class=\"delete-confirm-button btn btn-primary\">Да!</button><button data-dismiss=\"modal\" class=\"btn btn-default\">Нет, я передумал.</button></div></div></div></div><div class=\"modal secret-modal\"><div class=\"modal-dialog modal-sm\"><div class=\"modal-content\"><div class=\"modal-header\"><h4 class=\"modal-title\">Пароль станции</h4></div><div class=\"modal-body text-center\"><p>Используйте этот пароль для подключения агента печатной станции:</p><h2 class=\"secret-field\"></h2></div><div class=\"modal-footer text-center\"><button data-dismiss=\"modal\" class=\"btn btn-success\">ОК</button></div></div></div></div></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;
//# sourceMappingURL=app.js.map