var options = {
  fireEmitPositionSpread: {x:2, y:30},
  fireSpeed: 800.0,
  fireDeathSpeed: 100.0
};
window.onload = setupWebGL;

textureList = ["rectangle.png", "circle.png", "gradient.png", "explosion.png", "flame.png"];
images = [];
textures = [];
currentTextureIndex = 2;

function loadTexture(textureName,index) {
  textures[index] = gl.createTexture();
  images[index] = new Image();
  images[index].onload = function() {handleTextureLoaded(images[index], index, textureName)};
  images[index].onerror = function() {alert("ERROR: texture " + textureName + " can't be loaded!"); console.error("ERROR: texture " + textureName + " can't be loaded!");};
  images[index].src = textureName;
}

function handleTextureLoaded(image,index,textureName) {
  gl.bindTexture(gl.TEXTURE_2D, textures[index]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);

  // load the next texture
  if (index < textureList.length - 1) {
    loadTexture("textures/" + textureList[index + 1], index + 1);
  }
}

function loadAllTextures() {
  var fireTextureCombobox = document.getElementById("fireTexture");
  fireTextureCombobox.onchange = function() {
    var image = document.getElementById("fireTextureVal");
    var newIndex = fireTextureCombobox.selectedIndex;
    image.src = "textures/" + textureList[newIndex];
    currentTextureIndex = newIndex;
  }
  for (var i = 0; i < textureList.length; ++i) {
    fireTextureCombobox.options.add(new Option(textureList[i], i));
  }
  fireTextureCombobox.selectedIndex = 2;
  loadTexture("textures/" + textureList[0], 0);
}

fireParticles = [];

function createFireParticle(emitCenter, decibels, distFromCenter, volume, isLeft) {
  var speed = randomSpread(options.fireSpeed, volume);
  var color = {};
  var hue = randomSpread(-180 + distFromCenter * 180, 8);
  if (isLeft) {
    hue = -hue;
  }
  color = HSVtoRGB(convertHue(hue), 1.0, 1.0);
  color.a = 0.5;
  var particle = {
    pos: random2DVec(emitCenter, options.fireEmitPositionSpread),
    velocity: scaleVec(randomUnitVec(Math.PI / 2, 0), speed),
    size: {width: decibels / 256 * 40,
           height: decibels / 256 * 40},
    color: color,
    magnitude: decibels,
    volume: volume,
    isLeft: isLeft
    };
  return particle;
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
  var red = new Uint8Array([255, 0, 0, 255]);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, red);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  vertexBuffer = gl.createBuffer();
  colorBuffer = gl.createBuffer();
  squareTextureCoordinateVertices = gl.createBuffer();

  vertexShader = createShaderFromScriptElement(gl, "2d-vertex-shader");
  fragmentShader = createShaderFromScriptElement(gl, "2d-fragment-shader");
  shaderProgram = createProgram(gl, [vertexShader, fragmentShader]);
  gl.useProgram(shaderProgram);
  positionAttrib = gl.getAttribLocation(shaderProgram, "a_position");
  gl.enableVertexAttribArray(positionAttrib);
  colorAttrib = gl.getAttribLocation(shaderProgram, "a_color");
  gl.enableVertexAttribArray(colorAttrib);
  textureCoordAttribute = gl.getAttribLocation(shaderProgram, "a_texture_coord");
  gl.enableVertexAttribArray(textureCoordAttribute);

  resolutionLocation = gl.getUniformLocation(shaderProgram, "u_resolution");
  cameraLocation = gl.getUniformLocation(shaderProgram, "cam_position");
  textureSamplerLocation = gl.getUniformLocation(shaderProgram, "u_sampler")

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.enable(gl.BLEND);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating).
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating).
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function animationLoop(leftBins, rightBins, leftVolume, rightVolume) {
  computeNewPositions(leftBins, rightBins, leftVolume, rightVolume);
  render();
}

function time() {
  var d = new Date();
  var n = d.getTime();
  return n;
}

var numParticlesToCreate = 0;
var lastParticleTime = time();

// calculate new positions for all the particles
function computeNewPositions(leftBins, rightBins, leftVolume, rightVolume) {
  // Generate new fire particles
  var currentParticleTime = time();
  var timeDifference = currentParticleTime - lastParticleTime;
  if (timeDifference > 100) {
    timeDifference = 100;
  }
  numParticlesToCreate += 128 * timeDifference / 1000.0;
  while (numParticlesToCreate > 0) {
    var w = Math.floor(canvas.width / 2 / 32);
    for (var i = 0; i < leftBins.length; ++i) {
      var center = {x:20 + w * i, y:canvas.height};
      fireParticles.push(createFireParticle(center, leftBins[i], i / leftBins.length, leftVolume, true));
    }
    for (var i = 0; i < rightBins.length; ++i) {
      var center = {x:20 + w * i + canvas.width / 2, y:canvas.height};
      fireParticles.push(createFireParticle(center, rightBins[i], (rightBins.length - i) / rightBins.length, rightVolume, false));
    }
    numParticlesToCreate -= 1.0;
  }

  // Updates positions for all fire particles and marks particles for deletion
  for (var i = 0; i < fireParticles.length; ++i) {
    var x = fireParticles[i].pos.x;
    var y = fireParticles[i].pos.y;

    // move the particle
    fireParticles[i].pos = addVecs(fireParticles[i].pos, scaleVec(fireParticles[i].velocity, timeDifference / 1000.0));
    var channelVolume = fireParticles[i].isLeft ? leftVolume : rightVolume;
    fireParticles[i].color.a -= options.fireDeathSpeed / channelVolume / fireParticles[i].magnitude;

    if (fireParticles[i].pos.y <= canvas.height - canvas.height * (fireParticles[i].magnitude / 256) || fireParticles[i].color.a <= 0) {
      markForDeletion(fireParticles, i);
    }
  }

  // Deletes marked particles
  fireParticles = deleteMarked(fireParticles);
  //lastParticleTime = currentParticleTime;
  document.getElementById("numParticles").innerHTML = "# particles: " + fireParticles.length;
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

function concatInPlace(index, arr1, arr2) {
  for (var i = 0; i < arr2.length; ++i) {
    arr1[index] = arr2[i];
    index += 1;
  }
  return index;
}

function drawRects(rects, textureIndex) {
  var index = 0;
  var colorIndex = 0;
  var texIndex = 0;
  rectArray = [];
  colorArray = [];
  textureCoordinates = [];
  for (var i = 0; i < rects.length; ++i) {
    var x1 = rects[i].pos.x - rects[i].size.width / 2;
    var x2 = rects[i].pos.x + rects[i].size.width / 2;
    var y1 = rects[i].pos.y - rects[i].size.height / 2;
    var y2 = rects[i].pos.y + rects[i].size.height / 2;
    index = concatInPlace(index, rectArray, [
       x1, y1,
       x2, y1,
       x1, y2,
       x1, y2,
       x2, y1,
       x2, y2]);
    texIndex = concatInPlace(texIndex, textureCoordinates, [
       0.0, 0.0,
       1.0, 0.0,
       0.0, 1.0,
       0.0, 1.0,
       1.0, 0.0,
       1.0, 1.0
    ]);
    for (var ii = 0; ii < 6; ++ii) {
      colorIndex = concatInPlace(colorIndex, colorArray, [
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

var url = './someday_my_prince.mp3';

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

var numDisplayBuckets = 32;

function createAudioGraph(buffer, context) {
  var source = null
      startedAt = 0,
      pausedAt = 0,
      playing = false,
      scriptNode = null;
  var play = function() {
    if (source) {
      if (scriptNode) {
          scriptNode.disconnect(context.destination);
      }
      source.disconnect();
      source.stop(0);
      source = null;
    }
    // Initializes node to stream in audio data in chunks
    scriptNode = context.createScriptProcessor(2048, 2, 2);
    scriptNode.buffer = buffer;
    scriptNode.connect(context.destination);

    // Creates node to analyze data from the left channel
    var leftAnalyser = context.createAnalyser();
    leftAnalyser.smoothingTimeConstant = 0.0;
    leftAnalyser.fftSize = 256;

    // Creates node to analyze data from the left channel
    var rightAnalyser = context.createAnalyser();
    rightAnalyser.smoothingTimeConstant = 0.0;
    rightAnalyser.fftSize = 256;

    // Initializes source node to play the audio
    source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = false;

    // Creates a splitter node to process multiple channels of audio
    splitter = context.createChannelSplitter(2);

    // Splits audio data into 2 channels
    source.connect(splitter);

    // Each channel is connected to its own analyzer
    splitter.connect(leftAnalyser, 0);
    splitter.connect(rightAnalyser, 1);

    // Each analyzer is connected to the script node to receive data
    leftAnalyser.connect(scriptNode);
    rightAnalyser.connect(scriptNode);

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
      var leftFreqs = new Uint8Array(leftAnalyser.frequencyBinCount);
      var rightFreqs = new Uint8Array(rightAnalyser.frequencyBinCount);
      leftAnalyser.getByteFrequencyData(leftFreqs);
      rightAnalyser.getByteFrequencyData(rightFreqs);
      var leftVolume = getAverageVolume(leftFreqs);
      var rightVolume = getAverageVolume(rightFreqs);
      var mergedFreqs = new Uint8Array(2 * leftFreqs.length);
      leftFreqs = convertFftToDisplay(leftFreqs);
      leftFreqs = leftFreqs.reverse();
      rightFreqs = convertFftToDisplay(rightFreqs);
      animationLoop(leftFreqs, rightFreqs, leftVolume, rightVolume);
    };

    var offset = pausedAt;
    startedAt = context.currentTime - offset;
    pausedAt = 0;
    playing = true;
    source.start(0, offset);
  }

  function convertFftToDisplay(frequencyBins) {
    var span = Math.log2(frequencyBins.length);
    var widthPerDisplayBucket = span / numDisplayBuckets;
    var currentBin = 0;
    var displayBins = [];
    for (var i = 0; i < numDisplayBuckets; ++i) {
      var magnitude = 0;
      var binCount = 0;
      do {
        magnitude += frequencyBins[currentBin];
        ++currentBin;
        ++binCount;
      } while (Math.log2(currentBin) < i * widthPerDisplayBucket);
      magnitude /= binCount;
      displayBins.push(magnitude);
    }
    return displayBins;
  }

  function getAverageVolume(frequencies) {
    var totalFreq = 0;

    for (var i = 0; i < frequencies.length; ++i) {
      totalFreq += frequencies[i];
    }

    return totalFreq / frequencies.length;
  }

  var pause = function() {
    var elapsed = context.currentTime - startedAt;
    stop();
    pausedAt = elapsed;
  };

  var stop = function() {
    if (source) {
      source.stop(0);
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
