var url = 'speaking_gently.mp3';
var audio = new Audio(url);
audio.play();
console.log("playing");
var request = new XMLHttpRequest();
request.open("GET", url, true);
request.responseType = "arraybuffer";
request.onload = function() {
    console.log("here");
    console.log(request.response);
}
request.send()

var context = new AudioContext()

