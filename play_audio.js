var url = 'such_great_heights.mp3';
var context = new AudioContext();

function load(url) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onload = function() {
        context.decodeAudioData(request.response, init, error);
    }
    request.send();
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function createAudioGraph(buffer, context) {
    var source = null
        startedAt = 0,
        pausedAt = 0,
        playing = false, 
        scriptNode = null;
    var left_canvas = document.getElementById("left");
    var right_canvas = document.getElementById("right");
    var left_ctx = left_canvas.getContext("2d");
    var right_ctx = right_canvas.getContext("2d");
    var play = function() {
        // Initializes node to stream in audio data in chunks
        scriptNode = context.createScriptProcessor(2048, 2, 2);
        scriptNode.buffer = buffer;
        scriptNode.connect(context.destination);

        // Creates node to analyze data from the left channel
        var left_analyser = context.createAnalyser();
        left_analyser.smoothingTimeConstant = 0.6;
        left_analyser.fftSize = 256;

        // Creates node to analyze data from the left channel
        var right_analyser = context.createAnalyser();
        right_analyser.smoothingTimeConstant = 0.6;
        right_analyser.fftSize = 256;

        // Initializes source node to play the audio
        source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Creates a splitter node to process multiple channels of audio
        splitter = context.createChannelSplitter(2);

        // Splits audio data into 2 channels
        source.connect(splitter);

        // Each channel is connected to its own analyzer
        splitter.connect(left_analyser, 0);
        splitter.connect(right_analyser, 1);

        // Each analyzer is connected to the script node to receive data
        left_analyser.connect(scriptNode);
        right_analyser.connect(scriptNode);

        // The source is connected to the audio file
        source.connect(context.destination);

        /* 
           Here is where the magic happens. We can now pull in frequency data from
           both channels and do stuff with these arrays. Each array contains the
           magnitudes of the coefficients of the first 256 frequency components of the 
           size 512 DFT. The remaining 256 components are just the reverse of the computed 
           coefficients, as they form complex conjagates with the first 256 coefficients
           (same magnitude).
        */
        
        scriptNode.onaudioprocess = function(e) {
            var left = new Uint8Array(left_analyser.frequencyBinCount);
            var right = new Uint8Array(right_analyser.frequencyBinCount);
            left_analyser.getByteFrequencyData(left);
            right_analyser.getByteFrequencyData(right);
            
            left_ctx.clearRect(0, 0, 512, 600);
            var gradient_l = left_ctx.createLinearGradient(0,0,0,512);
            gradient_l.addColorStop(1,'#000000');
            gradient_l.addColorStop(0.3,'#ff0000');
            gradient_l.addColorStop(0.7,'#ffff00');
            gradient_l.addColorStop(0,'#ffff00');
            

            left = left.reverse();
            for (var i = 0; i < left.length; i++){
                var value = left[i];
                left_ctx.fillStyle = gradient_l;
                left_ctx.fillRect(i*2, 512 - (2*value), 1, (2*value));
            }
            right_ctx.clearRect(0, 0, 512, 600);
            var gradient_r = right_ctx.createLinearGradient(0,0,0,512);
            gradient_r.addColorStop(1,'#000000');
            gradient_r.addColorStop(0.3,'#0000ff');
            gradient_r.addColorStop(0.7,'#00ff00');
            gradient_r.addColorStop(0,'#00ff00');
            right_ctx.fillStyle = gradient_r;
            for (var i = 0; i < right.length; i++){
                var value = right[i];
                right_ctx.fillRect(i*2, 512 - (2*value), 1, (2*value));
            }
        };

        var offset = pausedAt;
        startedAt = context.currentTime - offset;
        pausedAt = 0;
        playing = true;
        source.start(0, offset);
    }

    var pause = function() {
        var elapsed = context.currentTime - startedAt;
        stop();
        pausedAt = elapsed;
    };

    var stop = function() {
        if (source) {          
            if (scriptNode) {
                scriptNode.disconnect(context.destination);
            }
            source.disconnect();
            source.stop(0);
            source = null;
        }
        if (left_ctx) {
            left_ctx.clearRect(0, 0, 512, 600);
        }
        if (right_ctx) {
            right_ctx.clearRect(0, 0, 512, 600);
        }
        pausedAt = 0;
        startedAt = 0;
        playing = false;
    };
  
    var getPlaying = function() {
        return playing;
    };
  
    var getCurrentTime = function() {
        if(pausedAt) {
            return pausedAt;
        }
        if(startedAt) {
            return context.currentTime - startedAt;
        }
        return 0;
    };
  
    var getDuration = function() {
      return buffer.duration;
    };

    return {
        getCurrentTime: getCurrentTime,
        getDuration: getDuration,
        getPlaying: getPlaying,
        play: play,
        pause: pause,
        stop: stop
    };
}

function init(buffer) {
    var graph = createAudioGraph(buffer, context);
    var play = document.querySelector('[data-js="play"]'),
        stop = document.querySelector('[data-js="stop"]'),
        info = document.querySelector('[data-js="info"]');
    play.addEventListener('click', function() {
        if (graph.getPlaying()) {
            graph.pause();
            play.innerHTML = 'play';
        } else {
            graph.play();
            play.innerHTML = 'pause';
        }
    });
    stop.addEventListener('click', function() {
        graph.stop();
        play.innerHTML = 'play';
    });
};

function error(e){
    console.error('ERROR: context.decodeAudioData:', e);
}

load(url);


