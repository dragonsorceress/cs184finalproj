var container;
var camera, scene, renderer;
var composer;
var lights = [];
var pointLight;
var controls;
var render_flag = false;
var sphere, material_render, material_wireframe;
var graph;

var params = {
	material: 'wireframe'
};

var url = './songs/fuck_cancer.mp3';
var context = new AudioContext();
var freqs = new Array();

init();


function init() {
    scene = new THREE.Scene();
    container = document.createElement( 'div' );
    document.body.appendChild( container );
    camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( 0, 0, 5 );

    // Materials
    material_render = new THREE.MeshLambertMaterial({color: 0xffffff});
    material_wireframe  = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe:true});

    // var material = new THREE.MeshNormalMaterial();

    // Spheres geometry
    var geometry = new THREE.SphereGeometry( 1, 32, 31 );
    sphere = addMesh( geometry, material_wireframe);
    sphere.geometry.initialVertices = [];
    for (var i = 0; i < sphere.geometry.vertices.length; i++) {
        sphere.geometry.initialVertices.push(sphere.geometry.vertices[i].clone());
    }

    // Lights

    var ambientColor = (0.20) * 0xff00ff;
    var light = new THREE.AmbientLight( ambientColor );
    scene.add( light );
    lights.push(light);

    var light4 = new THREE.DirectionalLight( ambientColor );
    light4.position.set( 0.0, 0.0, 1.0 ).normalize().multiplyScalar(1.2);
    // light4.add( new THREE.Mesh( new THREE.SphereGeometry( 0.03, 8, 8 ), new THREE.MeshBasicMaterial( { color: ambientColor } ) ) );
    scene.add( light4 );
    lights.push(light4);

    var light5 = new THREE.PointLight( 0xff0000 );
    light5.position.set( 1.0, 0.0, 0.8 ).normalize().multiplyScalar(1.2);
    // light5.add( new THREE.Mesh( new THREE.SphereGeometry( 0.03, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xff0000 } ) ) );
    scene.add( light5 );
    lights.push(light5);

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );

    // Controls
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.dampingFactor = 0.95;
    // controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 10;
    // controls.maxPolarAngle = Math.PI / 2;

    composer = new THREE.EffectComposer(renderer);
    renderer.autoClear = false;

    var renderModel = new THREE.RenderPass(scene, camera);
    composer.addPass(renderModel);

    var effectBloom = new THREE.BloomPass(0.8);
    composer.addPass(effectBloom);

    var effectScreen= new THREE.ShaderPass(THREE.ShaderExtras[ "screen" ]);
    effectScreen.renderToScreen = true;
    composer.addPass(effectScreen);


}
function addMesh( geometry, material ) {
    var mesh = new THREE.Mesh( geometry, material );
    mesh.position.y = 0.2;
    mesh.rotation.x = Math.PI;
    scene.add( mesh );
    return mesh
}
function init_music(buffer) {
    // Audio Stuff
    graph = createAudioGraph(buffer, context);
    var play = document.querySelector('[data-js="play"]'),
        stop = document.querySelector('[data-js="stop"]'),
        info = document.querySelector('[data-js="info"]');
    play.addEventListener('click', function() {
        console.log(graph.getPlaying());
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
}
function load_music(url) {
    if (context) {
      context.close().then(function() {
        var play = document.querySelector('[data-js="play"]'),
            stop = document.querySelector('[data-js="stop"]');
        var playClone = play.cloneNode(true);
        play.parentNode.replaceChild(playClone, play);
        var stopClone = stop.cloneNode(true);
        stop.parentNode.replaceChild(stopClone, stop);
      });
    }
    context = new AudioContext();
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    console.log(url);
    request.onload = function() {
        context.decodeAudioData(request.response, init_music, error);
    }
    request.send();
}

function createAudioGraph(buffer, context) {
    console.log("Creating new graph");
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
        var analyser = context.createAnalyser();
        analyser.smoothingTimeConstant = 0.6;
        analyser.fftSize = 256;

        // Initializes source node to play the audio
        source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = false;

        source.connect(analyser);
        // Each analyzer is connected to the script node to receive data
        analyser.connect(scriptNode);

        // The source is connected to the audio file
        source.connect(context.destination);

        scriptNode.onaudioprocess = function(e) {
            freqs = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(freqs);
            var volume = getAverageVolume(freqs);
            render(freqs, volume);
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

function error(e){
    console.error('ERROR: context.decodeAudioData:', e);
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function interpolate(a,b,x,y,t) {
    var source_dist = y - x;
    var dist = (t-x) / source_dist;
    var target_dist = b - a;
    // console.log(dist * target_dist + a);
    return dist * target_dist + a;
}
function render(freqs, volume) {

    if ( sphere ) {
        var material = sphere.material;
        switch ( params.material ) {
            case 'wireframe': material = material_wireframe; break;
            case 'render': material = material_render; break;
        }
        sphere.material = material;
    }
    if (viz_option == "Wings") {
        render_wings(freqs, volume, 0.5, 1.5);
    }
    else if (viz_option == "Rings") {
        render_rings(freqs, volume, 0.2, 1.0);
    } else if (viz_option == "Spiral"){
        render_blob(freqs, volume, 0.2, 1.0);
    }

    sphere.geometry.verticesNeedUpdate = true;
    // sphere.geometry.normalsNeedUpdate = true;
    renderer.render( scene, camera );

    sphere.rotation.x += 0.03;
    sphere.rotation.y += 0.02;
    sphere.rotation.z += 0.02;
    composer.render();
}
function create_buckets(freqs, offset, num) {
    sliced_freqs = freqs.slice(offset, freqs.length);
    var spectrum = [];
    var size = Math.floor(sliced_freqs.length / num);
    for (var i = 0; i < 32; i ++) {
        var sum = 0.0;
        for (var j = 0; j < size; j++) {
            sum += sliced_freqs[i*size + j] / size;
        }
        spectrum.push(sum);
    }
    return spectrum;
}
function render_rings(freqs, volume, lower, higher) {
    spectrum_32 = create_buckets(freqs, 10, 32);
    // first vertex
    var val = interpolate(lower, higher, 0.0, 255.0, spectrum_32[0]);
    var temp = sphere.geometry.initialVertices[0].clone().multiplyScalar(val);
    sphere.geometry.vertices[0].multiplyScalar(0.0);
    sphere.geometry.vertices[0].add(temp);
    for (var i = 1; i < sphere.geometry.vertices.length; i +=1) {
        var index = Math.floor(i / 32) + 1;
        var val = interpolate(lower, higher, 0.0, 255.0, spectrum_32[index]);
        var temp = sphere.geometry.initialVertices[i].clone().multiplyScalar(val);
        sphere.geometry.vertices[i].multiplyScalar(0.0);
        sphere.geometry.vertices[i].add(temp);
    }
}

function render_wings(freqs, volume, lower, higher) {
    spectrum_32 = create_buckets(freqs, 10, 32);
    for (var i = 0; i < sphere.geometry.vertices.length; i ++) {
        var temp = sphere.geometry.initialVertices[i].clone().multiplyScalar(lower);
        sphere.geometry.vertices[i].multiplyScalar(0.0);
        sphere.geometry.vertices[i].add(temp);
    }

    for (var i = 1; i < sphere.geometry.vertices.length; i +=32) {
        var index = Math.floor(i / 32);
        var val = interpolate(lower, higher, 0.0, 255.0, spectrum_32[index]);
        var temp = sphere.geometry.initialVertices[i].clone().multiplyScalar(val);
        sphere.geometry.vertices[i].multiplyScalar(0.0);
        sphere.geometry.vertices[i].add(temp);
        if (i + 16 < sphere.geometry.vertices.length) {
            var temp2 = sphere.geometry.initialVertices[i+16].clone().multiplyScalar(val);
            sphere.geometry.vertices[i+16].multiplyScalar(0.0);
            sphere.geometry.vertices[i+16].add(temp2);
        }
    }
}

function generate_signal(spectrum, new_length) {
    var old_length = spectrum.length;
    var size = Math.floor(new_length / old_length);
    var arr = new Array();
    for (var i = 0; i < old_length-1; i++) {
        fill(spectrum[i], spectrum[i+1], size, arr);
    }
    arr.push(spectrum[old_length - 1]);
    return arr;
}

function fill(val1, val2, num, arr) {
    var inc = (val2 - val1) / num;
    for (var i = 0; i < num; i++) {
        arr.push(val1 + (inc * i));
    }
}

function render_blob(freqs, volume, lower, higher) {
    var new_signal = generate_signal(freqs, sphere.geometry.vertices.length);
    // console.log(new_signal);
    for ( var i = 0 ; i < sphere.geometry.vertices.length; i ++ ) {
        var val = interpolate(lower, higher, 0.0, 255.0, new_signal[i]);
        if (i < new_signal.length) {
            var temp = sphere.geometry.initialVertices[i].clone().multiplyScalar(val);
            sphere.geometry.vertices[i].multiplyScalar(0.0);
            sphere.geometry.vertices[i].add(temp);
        }
        else {
            var temp = sphere.geometry.initialVertices[i].clone().multiplyScalar(lower);
            sphere.geometry.vertices[i].multiplyScalar(0.0);
            sphere.geometry.vertices[i].add(temp);
        }
    }
}
