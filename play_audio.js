var options = {
  fireEmitPositionSpread: {x:1,y:0},
  fireSpeed: 800.0,
  fireSpeedVariance: 80.0,
  fireDeathSpeed: 800.0,
};
window.onload = setupWebGL

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
    var speed = randomSpread(options.fireSpeed,options.fireSpeed*options.fireSpeedVariance/100.0);
    var color = {};
    if (left)
      var hue = randomSpread(-180 + (mag/volume)*180, 16);
    else
      var hue = randomSpread(180 - (mag/volume)*180, 16);
    color = HSVtoRGB(convertHue(hue),1.0,1.0);
    color.a = 0.5;
    var particle = {
        pos: random2DVec(emitCenter,options.fireEmitPositionSpread),
        vel: scaleVec(randomUnitVec(Math.PI/2, 0),speed),
        size: {width: (mag/256) * 40,
               height: (mag/256) * 40},
        color: color,
        mag: mag,
        vol: volume,
        left: left
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

  if (timeDifference > 100)
    timeDifference = 100;

  // update fire particles
  var left_bins = [];
  var right_bins = [];
  particleDiscrepancy += 256*(timeDifference)/1000.0;
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

  var numParts = fireParticles.length;
  for (var i = 0; i < fireParticles.length; i++) {
    var x = fireParticles[i].pos.x;
    var y = fireParticles[i].pos.y;

    // move the particle
    fireParticles[i].pos = addVecs(fireParticles[i].pos,scaleVec(fireParticles[i].vel,timeDifference/1000.0));
    var scale_volume = fireParticles[i].left ? left_vol : right_vol;
    fireParticles[i].color.a -= options.fireDeathSpeed / scale_volume / fireParticles[i].mag;

    if (fireParticles[i].pos.y <= canvas.height - canvas.height*(fireParticles[i].mag/256) || fireParticles[i].color.a <= 0) {
      markForDeletion(fireParticles,i);
    }
  }
  fireParticles = deleteMarked(fireParticles);

  document.getElementById("numParticles").innerHTML = "# particles: " + (fireParticles.length + sparkParticles.length);
}


function dieOut() {
    while (fireParticles.length > 0) {
        for (var i = 0; i < fireParticles.length; i++) {
            var x = fireParticles[i].pos.x;
            var y = fireParticles[i].pos.y;

            // move the particle
            fireParticles[i].pos = addVecs(fireParticles[i].pos,scaleVec(fireParticles[i].vel, 1/10));
            var scale_volume = fireParticles[i].volume
            fireParticles[i].color.a -= options.fireDeathSpeed / scale_volume / fireParticles[i].mag;
            if (fireParticles[i].pos.y <= canvas.height - canvas.height*(fireParticles[i].mag/256) || fireParticles[i].color.a <= 0) {
              markForDeletion(fireParticles,i);
            }
        }
        fireParticles = deleteMarked(fireParticles);
        setTimeout(function(){
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    drawRects(fireParticles);
                   }, 100);
    }
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
  gl.uniform1i(textureSamplerLocation, 0);
  drawRects(fireParticles);
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

var url = 'jazz.mp3';
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
        dieOut();
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
    //setupWebGL()
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
