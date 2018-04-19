var url = 'speaking_gently.mp3';
var context = new AudioContext();
var source;
var splitter;

function load(url) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onload = function() {
        context.decodeAudioData(request.response, init, error);
    }
    request.send();
}

function createAudioGraph(buffer, context) {
    var source = null
        startedAt = 0,
        pausedAt = 0,
        playing = false, 
        scriptNode = null;
    var play = function() {
        // Initializes node to stream in audio data in chunks
        scriptNode = context.createScriptProcessor(2048, 2, 2);
        scriptNode.buffer = buffer;
        scriptNode.connect(context.destination);

        // Creates node to analyze data from the left channel
        var left_analyser = context.createAnalyser();
        left_analyser.smoothingTimeConstant = 0.6;
        left_analyser.fftSize = 512;

        // Creates node to analyze data from the left channel
        var right_analyser = context.createAnalyser();
        right_analyser.smoothingTimeConstant = 0.6;
        right_analyser.fftSize = 512;

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
            var left = new Float32Array(left_analyser.frequencyBinCount);
            var right = new Float32Array(right_analyser.frequencyBinCount);
            left_analyser.getFloatFrequencyData(left);
            right_analyser.getFloatFrequencyData(right);
            console.log("left:", left);
            console.log("right:", right);
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


