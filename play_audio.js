var options = {
  // this option is not actually in the UI
  fireEmitPositionSpread: {x:1,y:0},

  fireEmitRate: 256,
  fireEmitRateSlider: {min:1,max:5000},

  fireSize: 10.0,
  fireSizeSlider: {min:2.0,max:100.0},

  fireSizeVariance:  100.0,
  fireSizeVarianceSlider: {min:0.0,max:100.0},

  fireEmitAngleVariance: 0,
  fireEmitAngleVarianceSlider: {min:0.0,max:Math.PI/2},

  fireSpeed: 500.0,
  fireSpeedSlider: {min:20.0,max:500},

  fireSpeedVariance: 80.0,
  fireSpeedVarianceSlider: {min:0.0,max:100.0},

  fireDeathSpeed: 0.003,
  fireDeathSpeedSlider: {min: 0.001, max: 0.05},

  fireTriangleness: 0.000,
  fireTrianglenessSlider: {min:0.0, max:0.0003},

  fireTextureHue: 25.0,
  fireTextureHueSlider: {min:-180,max:180},

  fireTextureHueVariance: 15.0,
  fireTextureHueVarianceSlider: {min:0.0,max:180},

  fireTextureColorize: true,
  wind: false,
  omnidirectionalWind:false,

  windStrength:0.0,
  windStrengthSlider:{min:0.0,max:60.0},

  windTurbulance:0.000,
  windTurbulanceSlider:{min:0.0,max:0.001},

  sparks: true,

  // some of these options for sparks are not actually available in the UI to save UI space
  sparkEmitRate: 6.0,
  sparkEmitSlider: {min:0.0,max:10.0},

  sparkSize: 10.0,
  sparkSizeSlider: {min:5.0,max:100.0},

  sparkSizeVariance: 20.0,
  sparkSizeVarianceSlider: {min:0.0,max:100.0},

  sparkSpeed: 400.0,
  sparkSpeedSlider: {min:20.0, max:700.0},

  sparkSpeedVariance: 80.0,
  sparkSpeedVarianceSlider: {min:0.0, max:100.0},

  sparkDeathSpeed: 0.0085,
  sparkDeathSpeedSlider: {min: 0.002, max: 0.05},

};

textureList = ["rectangle.png","circle.png","gradient.png","thicker_gradient.png","explosion.png","flame.png","smilie.png","heart.png"];
images = [];
textures = [];
currentTextureIndex = 2;

function loadTexture(textureName,index) {
  textures[index] = gl.createTexture();
  images[index] = new Image();
  images[index].onload = function() {handleTextureLoaded(images[index],index,textureName)};
  images[index].onerror = function() {alert("ERROR: texture " + textureName + " can't be loaded!"); console.error("ERROR: texture " + textureName + " can't be loaded!");};
  images[index].src = textureName;
}

function handleTextureLoaded(image,index,textureName) {
  console.log("loaded texture " + textureName);
  gl.bindTexture(gl.TEXTURE_2D, textures[index]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);

  // load the next texture
  if (index < textureList.length-1)
    loadTexture("textures/" + textureList[index+1],index+1);
  //texturesLoadedCount += 1;

}

function loadAllTextures() {
  var fireTextureCombobox = document.getElementById("fireTexture");
  fireTextureCombobox.onchange = function() {
    var image = document.getElementById("fireTextureVal");
    var newIndex = fireTextureCombobox.selectedIndex;
    image.src = "textures/" + textureList[newIndex];
    currentTextureIndex = newIndex;
  }
  for (var i = 0; i < textureList.length; i++) {
    fireTextureCombobox.options.add(new Option(textureList[i],i));
  }
  fireTextureCombobox.selectedIndex = 2;
  loadTexture("textures/" + textureList[0],0);

}

fireParticles = [];
sparkParticles = [];

function createFireParticle(emitCenter, mag, volume, left) {
  var size = randomSpread(options.fireSize,options.fireSize*(options.fireSizeVariance/100.0));
  var speed = randomSpread(options.fireSpeed,options.fireSpeed*options.fireSpeedVariance/100.0);
  var color = {};
  if (!options.fireTextureColorize)
    color = {r:1.0,g:1.0,b:1.0,a:0.5};
  else {
    if (left)
      var hue = randomSpread(-180 + (mag/volume)*180 ,options.fireTextureHueVariance);
    else
      var hue = randomSpread((mag/volume)*180 ,options.fireTextureHueVariance);
    color = HSVtoRGB(convertHue(hue),1.0,1.0);
    color.a = 0.5;
  }
  var particle = {
    pos: random2DVec(emitCenter,options.fireEmitPositionSpread),
    vel: scaleVec(randomUnitVec(Math.PI/2,options.fireEmitAngleVariance),speed),
    size: {width: (mag/256) * 20,
           height: (mag/256) * 20},
    color: color,
    mag: mag,
    vol: volume
  };
  fireParticles.push(particle);
}

// initialze the scene
function setupWebGL() {
  // Get A WebGL context
  canvas = document.getElementById("canvas");
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;
  gl = getWebGLContext(canvas);
  if (!gl) {
    return;
  }

  loadAllTextures();

  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([255, 0, 0, 255])); // red

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  vertexBuffer = gl.createBuffer();
  colorBuffer = gl.createBuffer();
  squareTextureCoordinateVertices = gl.createBuffer();

  vertexShader = createShaderFromScriptElement(gl, "2d-vertex-shader");
  fragmentShader = createShaderFromScriptElement(gl, "2d-fragment-shader");
  program = createProgram(gl, [vertexShader, fragmentShader]);
  gl.useProgram(program);
  positionAttrib = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionAttrib);
  colorAttrib = gl.getAttribLocation(program, "a_color");
  gl.enableVertexAttribArray(colorAttrib);
  textureCoordAttribute = gl.getAttribLocation(program, "a_texture_coord");
  gl.enableVertexAttribArray(textureCoordAttribute);

  resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  cameraLocation = gl.getUniformLocation(program, "cam_position");
  textureSamplerLocation = gl.getUniformLocation(program, "u_sampler")

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.enable(gl.BLEND);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating).
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating).
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function animloop(frequencies, left_vol, right_vol) {
  computeNewPositions(frequencies, left_vol, right_vol);
  render();
}

frameTime = 18;
lastTime = time();
lastFPSDivUpdate = time();
function timing() {
  currentTime = time();
  frameTime = frameTime * 0.9 + (currentTime - lastTime) * 0.1;
  fps = 1000.0/frameTime;
  if (currentTime - lastFPSDivUpdate > 100) {
    document.getElementById("fps").innerHTML = "FPS: " + Math.round(fps);
    lastFPSDivUpdate = currentTime;
  }
  lastTime = currentTime;
}

function time() {
  var d = new Date();
  var n = d.getTime();
  return n;
}

var particleDiscrepancy = 0;
var lastParticleTime = time();


noise.seed(Math.random());

// calculate new positions for all the particles
function computeNewPositions(frequencies, left_vol, right_vol) {
  var currentParticleTime = time();
  var timeDifference = currentParticleTime - lastParticleTime;

  // we don't want to generate a ton of particles if the browser was minimized or something
  if (timeDifference > 100)
    timeDifference = 100;

  // update fire particles
  var left_bins = [];
  var right_bins = [];
  particleDiscrepancy += options.fireEmitRate*(timeDifference)/1000.0;
  for (var i = 0; i < frequencies.length; i+=8) {  
    var magnitude = 0;  
    for (var j = 0; j < 8; j++) {
      magnitude += frequencies[i+j];
    }
    magnitude /= 8;
    if (i < 128) {
      left_bins.push(magnitude);
    } else {
      right_bins.push(magnitude);
    }
  }

  while (particleDiscrepancy > 0) {
    var w = Math.floor(canvas.width / 2 / 16);
    for (var i = 0; i < left_bins.length; i++) {
      var pos = w*i;
      createFireParticle({x:20+pos,y:canvas.height}, left_bins[i], left_vol, true);
    }
    for (var i = 0; i < right_bins.length; i++) {
      var pos = w*i;
      createFireParticle({x:20+pos+canvas.width/2,y:canvas.height}, right_bins[i], right_vol, false);
    }
    particleDiscrepancy -= 1.0;
  }

  particleAverage = {x:0,y:0};
  var numParts = fireParticles.length;
  for (var i = 0; i < numParts; i++) {
    particleAverage.x += fireParticles[i].pos.x/numParts;
    particleAverage.y += fireParticles[i].pos.y/numParts;
  }

  for (var i = 0; i < fireParticles.length; i++) {
    var x = fireParticles[i].pos.x;
    var y = fireParticles[i].pos.y;

    // move the particle
    fireParticles[i].pos = addVecs(fireParticles[i].pos,scaleVec(fireParticles[i].vel,timeDifference/1000.0));


    //fireParticles[i].color.a -= options.fireDeathSpeed+Math.abs(particleAverage.x-fireParticles[i].pos.x)*options.fireTriangleness;

    if (fireParticles[i].pos.y <= canvas.height - canvas.height*(fireParticles[i].mag/256))
      markForDeletion(fireParticles,i);
  }
  fireParticles = deleteMarked(fireParticles);

  document.getElementById("numParticles").innerHTML = "# particles: " + (fireParticles.length + sparkParticles.length);

  lastParticleTime = currentParticleTime;

}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
  gl.uniform1i(textureSamplerLocation, 0);
  drawRects(fireParticles);
  if (options.sparks)
      drawRects(sparkParticles);
}

rectArray = [];
colorArray = [];
rects = [];

function concat_inplace(index,arr1,arr2) {
  for (var i = 0; i < arr2.length; i++) {
    arr1[index] = arr2[i];
    index += 1;
  }
  return index;
}

function drawRects(rects,textureIndex) {
  var index = 0;
  var colorIndex = 0;
  var texIndex = 0;
  rectArray = [];
  colorArray = [];
  textureCoordinates = [];
  for (var i = 0; i < rects.length; i++) {
      var x1 = rects[i].pos.x - rects[i].size.width/2;
      var x2 = rects[i].pos.x + rects[i].size.width/2;
      var y1 = rects[i].pos.y - rects[i].size.height/2;
      var y2 = rects[i].pos.y + rects[i].size.height/2;
      index = concat_inplace(index,rectArray,[
         x1, y1,
         x2, y1,
         x1, y2,
         x1, y2,
         x2, y1,
         x2, y2]);
      texIndex = concat_inplace(texIndex,textureCoordinates,[
         0.0, 0.0,
         1.0, 0.0,
         0.0, 1.0,
         0.0, 1.0,
         1.0, 0.0,
         1.0, 1.0
      ]);
      for (var ii = 0; ii < 6; ii++) {
        colorIndex = concat_inplace(colorIndex,colorArray,[
            rects[i].color.r,
            rects[i].color.g,
            rects[i].color.b,
            rects[i].color.a
          ]);
      }
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures[currentTextureIndex]);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareTextureCoordinateVertices);
  gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectArray), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(colorAttrib, 4, gl.FLOAT, false, 0, 0);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray), gl.STATIC_DRAW);

  gl.drawArrays(gl.TRIANGLES, 0, rects.length*6);
}

// AUDIO CODE STARTS HERE

var url = 'such_great_heights.mp3';
var context = new AudioContext();
var left_freqs = new Array();
var right_freqs = new Array();

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
    // var left_canvas = document.getElementById("left");
    // var right_canvas = document.getElementById("right");
    // var left_ctx = left_canvas.getContext("2d");
    // var right_ctx = right_canvas.getContext("2d");
    // var volume_canvas = document.getElementById("volume");
    // var vol_ctx = volume_canvas.getContext("2d");
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
        source.loop = false;

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
            left_freqs = new Uint8Array(left_analyser.frequencyBinCount);
            right_freqs = new Uint8Array(right_analyser.frequencyBinCount);
            left_analyser.getByteFrequencyData(left_freqs);
            right_analyser.getByteFrequencyData(right_freqs);
            var left_volume = getAverageVolume(left_freqs);
            var right_volume = getAverageVolume(right_freqs);
            var merged_freqs = new Uint8Array(2*left_freqs.length);
            left_freqs = left_freqs.reverse();
            for (var i = 0; i < left_freqs.length; i++) {
              merged_freqs[i] = left_freqs[i];
            }
            for (var i = left_freqs.length; i < merged_freqs.length; i++) {
              merged_freqs[i] = right_freqs[i-left_freqs.length];
            }

            animloop(merged_freqs, left_volume, right_volume);
            // vol_ctx.clearRect(30, 0, 130, 200);
            // left_ctx.clearRect(0, 0, 512, 600);
            // var gradient_l = left_ctx.createLinearGradient(0,0,0,512);
            // gradient_l.addColorStop(1,'#000000');
            // gradient_l.addColorStop(0.3,'#ff0000');
            // gradient_l.addColorStop(0.7,'#ffff00');
            // gradient_l.addColorStop(0,'#ffff00');
            //
            //
            // left_freqs = left_freqs.reverse();
            // left_ctx.fillStyle = gradient_l;
            // for (var i = 0; i < left_freqs.length; i++){
            //     var value = left_freqs[i];
            //     left_ctx.fillRect(40 + i * 2, 512 - (2 * value), 1, (2 * value));
            // }
            // vol_ctx.fillStyle = gradient_l;
            // vol_ctx.fillRect(30, 200 - left_volume, 50, 200);
            //
            // right_ctx.clearRect(0, 0, 512, 600);
            // var gradient_r = right_ctx.createLinearGradient(0,0,0,512);
            // gradient_r.addColorStop(1,'#000000');
            // gradient_r.addColorStop(0.3,'#0000ff');
            // gradient_r.addColorStop(0.7,'#00ff00');
            // gradient_r.addColorStop(0,'#00ff00');
            // right_ctx.fillStyle = gradient_r;
            // for (var i = 0; i < right_freqs.length; i++){
            //     var value = right_freqs[i];
            //     right_ctx.fillRect(i * 2, 512 - (2 * value), 1, (2 * value));
            // }
            // vol_ctx.fillStyle = gradient_r;
            // vol_ctx.fillRect(80, 200 - right_volume, 50, 200);
        };

        var offset = pausedAt;
        startedAt = context.currentTime - offset;
        pausedAt = 0;
        playing = true;
        source.start(0, offset);
    }
    function getAverageVolume(array) {
        var total_freq = 0;

        for (var i = 0; i < array.length; ++i) {
            total_freq += array[i];
        }

        return total_freq / array.length;
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

    setupWebGL()
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
