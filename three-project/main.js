import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { WaterShader } from './waterShader.js';

//scene, camera, and renderer setup
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();

// pixel shader
// inspo by: https://threejs.org/examples/#webgl_postprocessing_pixel
const PixelShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "resolution": { value: new THREE.Vector2(w, h) }, //resolution
        "pixelSize": { value: 4 } //pixel size
    },
    vertexShader: `
        varying vec2 vUv; //varying uv
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); //position
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float pixelSize;
        varying vec2 vUv;
        void main() { //main function
            vec2 dxy = pixelSize / resolution; //pixel size 
            vec2 coord = dxy * floor(vUv / dxy); //coordinate
            gl_FragColor = texture2D(tDiffuse, coord); //texture
        }
    `
};

//ui overlay
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.bottom = '20px';
overlay.style.left = '20px';
overlay.style.color = 'white';
overlay.style.fontFamily = 'Arial, sans-serif';
overlay.style.fontSize = '16px';
overlay.style.padding = '10px';
overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
overlay.style.borderRadius = '5px';
overlay.style.userSelect = 'none';
overlay.style.pointerEvents = 'none';
overlay.innerHTML = "'Q' to quack | 'V' to switch camera"; //ui overlay text
document.body.appendChild(overlay);

//add audio setup
const audioListener = new THREE.AudioListener();
const quackSound = new THREE.Audio(audioListener);
const bgMusic = new THREE.Audio(audioListener);
const audioLoader = new THREE.AudioLoader();

// quack sound https://www.myinstants.com/en/instant/quackmp3/
audioLoader.load('resources/ducky/quack_5.mp3', function(buffer) {
    quackSound.setBuffer(buffer);
    quackSound.setVolume(0.5);
});

//background music time lol
//https://ia802203.us.archive.org/0/items/super-mario-sunshine-ost/10.%20Delfino%20Plaza.mp3
audioLoader.load('resources/10. Delfino Plaza.mp3', function(buffer) {
    bgMusic.setBuffer(buffer);
    bgMusic.setVolume(0.2); 
    bgMusic.setLoop(true);  //it loops
    bgMusic.play();         
});

// keyboard event listener
window.addEventListener('keydown', (event) => {
    switch(event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            cameraState.moveForward = true;
            break;
        case 's':
        case 'arrowdown':
            cameraState.moveBackward = true;
            break;
        case 'a':
        case 'arrowleft':
            cameraState.moveLeft = true;
            break;
        case 'd':
        case 'arrowright':
            cameraState.moveRight = true;
            break;
        case 'q': //if q QUACK
            if (quackSound.isPlaying) {
                quackSound.stop();
            }
            quackSound.play();
            break;
        case 'v': // Toggle view
            isOrbitalView = !isOrbitalView;
            orbitalControls.enabled = isOrbitalView;
            if (!isOrbitalView) {
                // Switch back to top-down
                camera.position.set(camera.position.x, topDownHeight, camera.position.z);
                camera.lookAt(camera.position.x, 0, camera.position.z - 10);
            }
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch(event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            cameraState.moveForward = false;
            break;
        case 's':
        case 'arrowdown':
            cameraState.moveBackward = false;
            break;
        case 'a':
        case 'arrowleft':
            cameraState.moveLeft = false;
            break;
        case 'd':
        case 'arrowright':
            cameraState.moveRight = false;
            break;
    }
});

const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
//add audio listener to camera
camera.add(audioListener);
const renderer = new THREE.WebGLRenderer({
    antialias: false  // Disable antialiasing for sharper pixels
});
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

//post processing setup
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const pixelPass = new ShaderPass(PixelShader);
pixelPass.uniforms.resolution.value.x = w;
pixelPass.uniforms.resolution.value.y = h;
composer.addPass(pixelPass); //add pixel 

//window resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);

    pixelPass.uniforms.resolution.value.x = width;
    pixelPass.uniforms.resolution.value.y = height;
});

//lighting setup
const ambientLight = new THREE.AmbientLight(0x99c7f2, 1.0); 
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xbfe6f5, 1.5); 
directionalLight.position.set(10, 100, 10); 
scene.add(directionalLight);

//hemisphere light
const hemisphereLight = new THREE.HemisphereLight(
    0xabadf5, //sky
    0x71b4f0, //ground
    1.0       
);
scene.add(hemisphereLight);

//exponential fog
scene.fog = new THREE.FogExp2(0x596ed9, 0.003); 

//initial camera position
const radius = 100; 
camera.position.set(0, 200, 0);
camera.lookAt(0, 0, 0); 

//camera settings
const cameraSpeed = 2.0;
const topDownHeight = 200;
let isOrbitalView = false; //track current view mode

//create orbital controls but disable them initially
const orbitalControls = new OrbitControls(camera, renderer.domElement);
orbitalControls.enabled = false;
orbitalControls.enableDamping = true;
orbitalControls.dampingFactor = 0.05;
orbitalControls.screenSpacePanning = false;
orbitalControls.minDistance = 50;
orbitalControls.maxDistance = 300;
orbitalControls.maxPolarAngle = Math.PI / 2;

//camera movement setup
const cameraState = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false
};

//skybox setup
const cubeTextureLoader = new THREE.CubeTextureLoader();
const skyboxTexture = cubeTextureLoader.load([
    'resources/skybox/Daylight Box_Right.bmp',
    'resources/skybox/Daylight Box_Left.bmp',
    'resources/skybox/Daylight Box_Top.bmp',
    'resources/skybox/Daylight Box_Bottom.bmp',
    'resources/skybox/Daylight Box_Front.bmp',
    'resources/skybox/Daylight Box_Back.bmp',
]);
scene.background = skyboxTexture;

//water setup with custom shader
const waterGeometry = new THREE.CircleGeometry(1000, 100);

//load texture for water
const textureLoader = new THREE.TextureLoader();
const waterTexture = textureLoader.load('resources/water/watertexture.jpg', (texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
});

//load bump map for waves
//https://www.filterforge.com/filters/940-bump.html
const waterBumpMap = textureLoader.load('resources/water/waterbump.jpg', (texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
});

//create shader material with proper uniforms
const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
        ...WaterShader.uniforms,
        waterTexture: { value: waterTexture },
        bumpTexture: { value: waterBumpMap },
        time: { value: 0 },
        textureScale: { value: 200.0 } 
    },
    vertexShader: WaterShader.vertexShader,
    fragmentShader: WaterShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide
});

const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI / 2;
water.position.y = 40;
scene.add(water);

//ground texture setup
//https://www.filterforge.com/filters/9546.html
const groundTexture = textureLoader.load('resources/water/underwater texture.jpg'); 
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(25, 25);

const groundGeometry = new THREE.CircleGeometry(1000, 100); //circular geometry for ground
const groundMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.5,
    metalness: 0.3,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; //rotate horizontal
ground.position.y = 20; //below water
scene.add(ground);

groundMaterial.map = groundTexture;

//island setup
//made by wren
const domeTexture = textureLoader.load('resources/island/sandtexture.jpg', 
    (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
    }
); 

const gltfLoader = new GLTFLoader();
gltfLoader.load(
    'resources/island/island.glb',
    (gltf) => {
        const island = gltf.scene;
        island.scale.set(2, 2, 2); 
        island.position.set(-200, 15, 50);

        island.traverse((child) => {
            if (child.isMesh) {
                //check if the mesh has uv coordinates, see comment below
                if (!child.geometry.attributes.uv) {
                    console.log('Generating UVs for mesh:', child.name);
                    const positions = child.geometry.attributes.position;
                    const uvs = new Float32Array(positions.count * 2);
                    
                    for (let i = 0; i < positions.count; i++) {
                        const x = positions.array[i * 3];
                        const y = positions.array[i * 3 + 1];
                        
                        //generate uv coordinates, i forgot where i found this from 
                        uvs[i * 2] = (x + 200) / 400;     
                        uvs[i * 2 + 1] = (y + 200) / 400; 
                    }
                    
                    child.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
                    child.geometry.attributes.uv.needsUpdate = true;
                }

                const material = new THREE.MeshStandardMaterial({
                    map: domeTexture,
                    roughness: 0.8,
                    metalness: 0.1,
                });
                child.material = material;
                child.material.map.encoding = THREE.sRGBEncoding;
                child.material.needsUpdate = true;
            }
        });

        scene.add(island);
    }
);

//dock setup
//made by wren
const dockLoader = new GLTFLoader();
dockLoader.load(
    'resources/island/dock.glb',
    (gltf) => {
        const dock = gltf.scene;
        dock.scale.set(0.1, 0.1, 0.1); 
        dock.position.set(-95, 20, -120); 
        dock.rotation.y = Math.PI / 2;  

        //apply wood colour
        dock.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0x8B4513, //brown
                    roughness: 0.8,   
                    metalness: 0.1,   
                });
                child.material.needsUpdate = true;
            }
        });

        scene.add(dock);
    }
);

//palm tree setup
//https://sketchfab.com/3d-models/palm-tree-45a74e13bdcb433fa77a24b7113c189d
const palmLoader = new GLTFLoader();
palmLoader.load(
    'resources/island/palm_tree.glb',
    (gltf) => {
        const palmPositions = [
            { x: 0, y: 100, z: 40 },
            { x: -200, y: 110, z: 40 },
            { x: -250, y: 90, z: 30 }
        ];

        palmPositions.forEach(pos => {
            const palm = gltf.scene.clone(); //clone the loaded model
            palm.scale.set(50, 50, 50);
            palm.position.set(pos.x, pos.y, pos.z);
            palm.rotation.y = Math.random() * Math.PI * 2; //random rotation
            scene.add(palm);
        });
    }
);

//house setup
//https://sketchfab.com/3d-models/low-poly-wooden-cabine-5cb73d080fcb4968b50c6d4b040a04e6#download
const houseLoader = new GLTFLoader();
houseLoader.load(
    'resources/island/low_poly_wooden_cabine.glb',
    (gltf) => {
        const house = gltf.scene;
        house.scale.set(18, 18, 18); 
        house.position.set(-125, 95, -10);  
        house.rotation.y = (Math.PI);  
        scene.add(house);

    }
);

//random coral setup
function placeRandomCoral(count) {
    const gltfLoader = new GLTFLoader();
    
    //loop to place multiple coral
    for (let i = 0; i < count; i++) {
        gltfLoader.load(
            'resources/water/coral.glb',
            (gltf) => {
                const model = gltf.scene;

                //random positions in wider area
                const x = (Math.random() - 0.5) * 800; 
                const z = (Math.random() - 0.5) * 800;
                const y = 20; //align with ground
                
                const scale = Math.random() * 0.02 + 0.02; // super small scale lol

                model.position.set(x, y, z);
                model.scale.set(scale, scale, scale);
                
                //random rotation for variety
                model.rotation.y = Math.random() * Math.PI * 2;

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0xFF69B4,  //hot pink
                            roughness: 0.9,    
                            metalness: 0.1,    
                            emissive: 0xFF1493, //emissive
                            emissiveIntensity: 0.1 
                        });
                        child.material.needsUpdate = true;
                    }
                });

                scene.add(model);
            }
        );
    }
}

//place coral
placeRandomCoral(40); // Added more coral for wider area

//random starfish setup
//https://sketchfab.com/3d-models/starfish-b018478dffa34fd4ab2991d4afedb956#download
function placeRandomStarfish(count) {
    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    
    //load texture
    const starfishTexture = textureLoader.load(
        'resources/starfish/starfishtexture.jpeg',
        (texture) => {
            texture.encoding = THREE.sRGBEncoding;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
        }
    );
    
    //loop to place multiple starfish
    for (let i = 0; i < count; i++) {
        gltfLoader.load(
            'resources/starfish/starfish1.glb',
            (gltf) => {
                const model = gltf.scene;

                //random positions in wider area
                const x = (Math.random() - 0.5) * 800; 
                const z = (Math.random() - 0.5) * 800;
                const y = 20; //align with ground 

                //random scale 
                const scale = Math.random() * 3 + 5;

                model.position.set(x, y, z);
                model.scale.set(scale, scale, scale);

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            map: starfishTexture,
                            color: 0xffffff,  
                            roughness: 0.7,
                            metalness: 0.1
                        });
                        child.material.needsUpdate = true;
                    }
                });

                scene.add(model);
            }
        );
    }
}

//place starfish
placeRandomStarfish(60); // Added more starfish for wider area

//rubber ducky setup
const fbxLoader = new FBXLoader();
let duck; //store duck reference

//https://sketchfab.com/3d-models/ducky-mozillahubs-a4c500d7358a4a199b6a5cd35f416466
fbxLoader.load(
    'resources/ducky/rubberduckmodel.fbx', 
    (fbx) => {
        duck = fbx; // duck reference
        duck.position.set(50, 35, -50); 
        duck.scale.set(1, 1, 1);

        //load textures
        const textureLoader = new THREE.TextureLoader();
        
        //load all textures
        const baseTexture = textureLoader.load('resources/ducky/Ducky_BaseColor.jpeg');
        const normalTexture = textureLoader.load('resources/ducky/Ducky_Normal.png');
        const roughnessTexture = textureLoader.load('resources/ducky/Ducky_Roughness.jpeg');
        const metalnessTexture = textureLoader.load('resources/ducky/Ducky_Metallic.jpeg');
        const aoTexture = textureLoader.load('resources/ducky/Ducky_AmbientOcclusion.jpeg');

        //texture settings 
        [baseTexture, normalTexture, roughnessTexture, metalnessTexture, aoTexture].forEach(texture => {
            texture.encoding = THREE.sRGBEncoding;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
        });
        
        fbx.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({ //apply material
                    map: baseTexture,
                    normalMap: normalTexture,
                    roughnessMap: roughnessTexture,
                    metalnessMap: metalnessTexture,
                    aoMap: aoTexture,
                    aoMapIntensity: 1.0,
                    color: 0xffffff,
                    roughness: 0.5,
                    metalness: 0.2,
                    envMapIntensity: 1.0
                });
                //set uv2 for ambient occlusion
                if (child.geometry && !child.geometry.attributes.uv2) {
                    child.geometry.attributes.uv2 = child.geometry.attributes.uv;
                }
                child.material.needsUpdate = true;
            }
        });

        scene.add(fbx);
    }
);

//clownfish setup
//https://sketchfab.com/3d-models/clown-fish-low-poly-animated-af7ba2aa41d2413098a59b21cfda79c2
function addClownfish() {
    const textureLoader = new THREE.TextureLoader();
    const clownfishTexture = textureLoader.load('resources/clown-fish-low-poly-animated/textures/clownfish.png', (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
    });

    const fbxLoader = new FBXLoader();
    fbxLoader.load(
        'resources/clown-fish-low-poly-animated/source/fishClown.fbx',
        (fbx) => {
            const fish = fbx;
            //scale
            fish.scale.set(1, 1, 1);
            //position it in the water
            fish.position.set(50, 30, 100);

            //apply texture to the fish
            fish.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: clownfishTexture,
                        roughness: 0.6,
                        metalness: 0.2,
                    });
                    child.material.needsUpdate = true;
                }
            });

            scene.add(fish);

            //swimmmmm
            const radius = 50;
            const height = 5;
            const speed = 0.5;

            function animateFish() {
                const time = Date.now() * 0.001;
                
                //figure 8 swim pattern
                fish.position.x = -90 + Math.sin(time * speed) * radius;
                fish.position.z = -190 + Math.sin(time * speed * 2) * radius * 0.5;
                fish.position.y = 30 + Math.sin(time * speed) * height;
                
                //rotate fish to match
                const angle = Math.atan2(
                    Math.cos(time * speed) * radius,
                    Math.cos(time * speed * 2) * radius * 0.5
                );
                fish.rotation.y = -(angle - Math.PI / 2);
                
                //slight bobbing
                fish.rotation.x = Math.sin(time * speed) * 0.1;
            }

            //add to animation
            animationFunctions.push(animateFish);
        }
    );
}

//array to store animation functions
const animationFunctions = [];

//fish 
addClownfish();

//boat
const boatGeometry = new THREE.BoxGeometry(1, 0.5, 2);
const boatMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
const boat = new THREE.Mesh(boatGeometry, boatMaterial);
boat.position.set(100, 45, 250); 
boat.scale.set(25, 25, 25); 
scene.add(boat);

function animate() {
    requestAnimationFrame(animate);

    if (!isOrbitalView) {
        //top-down movement
        if (cameraState.moveForward) {
            camera.position.z -= cameraSpeed;
            camera.lookAt(camera.position.x, 0, camera.position.z - 10);
        }
        if (cameraState.moveBackward) {
            camera.position.z += cameraSpeed;
            camera.lookAt(camera.position.x, 0, camera.position.z - 10);
        }
        if (cameraState.moveLeft) {
            camera.position.x -= cameraSpeed;
            camera.lookAt(camera.position.x, 0, camera.position.z - 10);
        }
        if (cameraState.moveRight) {
            camera.position.x += cameraSpeed;
            camera.lookAt(camera.position.x, 0, camera.position.z - 10);
        }
        
        //keep y pos
        camera.position.y = topDownHeight;
    } else {
        // update orbital controls
        orbitalControls.update();
    }
    
    //update water shader time
    waterMaterial.uniforms.time.value = performance.now() * 0.001;
    
    //boat animation
    const time = Date.now() * 0.001;
    const radius = 70;
    const speed = 0.5;
    
    //calculate position
    boat.position.x = 100 + Math.cos(time * speed) * radius;
    boat.position.z = 250 + Math.sin(time * speed) * radius;
    
    //boat rotation
    boat.rotation.y = time * speed + Math.PI / 2;

    //duck bobbing animation
    if (duck) {
        const bobHeight = 0.5;
        const bobSpeed = 1.5;
        
        //bobbing motion
        duck.position.y = 35 + Math.sin(time * bobSpeed) * bobHeight;
        
        //gentle rotation 
        duck.rotation.x = Math.sin(time * bobSpeed * 0.5) * 0.05;
        duck.rotation.z = Math.sin(time * bobSpeed * 0.7) * 0.05;
    }

    // Run all registered animation functions
    animationFunctions.forEach(func => func());
    
    // Use composer instead of renderer
    composer.render();
}

animate();