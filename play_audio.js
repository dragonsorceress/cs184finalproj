var url = 'speaking_gently.mp3';
var audio = new Audio(url);
audio.play();
var context = new AudioContext();
console.log("playing");
var request = new XMLHttpRequest();
var left = [];
var right = [];
var left_freqs = [];
var right_freqs = [];
request.open("GET", url, true);
request.responseType = "arraybuffer";
request.onload = function() {
    console.log(request.response);
    context.decodeAudioData(request.response, 
        function(buffer){
            left = buffer.getChannelData(0);
            right = buffer.getChannelData(1);
            left_freq = fft(left);
            console.log(left_freq);
            console.log(left);
            console.log(right);
        }, 
        function(){
            onError();
        }
    );
}
request.send()

function fft(buffer, size=512) {    
    var spectrums = [];
    for (var i = 0; i < buffer.length; i += size) {

        var segment = buffer.slice(i, i+size);
        if (i+size > buffer.length) {
            var zeros = new Float32Array(i+size-buffer.length).fill(0.0);
            var first = segment.length;
            var result = new Float32Array(512);
            result.set(segment);
            result.set(zeros, first);
            segment = result;
        }
        var spectrum = new FFT(512, 44100);
        var out = spectrum.forward(segment);
        console.log(out);
        spectrums.push(out);
    } 
    return spectrums;
}


