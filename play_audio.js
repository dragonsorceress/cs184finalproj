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
    console.log("here");
    console.log(request.response);

    context.decodeAudioData(request.response, function(buffer){
        left = buffer.getChannelData(0);
        right = buffer.getChannelData(1);
        do_stuff(left, do_next_stuff)
        console.log(left);
        console.log(right);
        }, function(){
        onError();
    });
}
request.send()

function fft(buffer, callback) {

}

function do_next_stuff()


