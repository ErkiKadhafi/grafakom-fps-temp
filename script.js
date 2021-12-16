import * as THREE from "https://threejsfundamentals.org/threejs/resources/threejs/r132/build/three.module.js";
import { FBXLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/FBXLoader.js";
import { OBJLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/MTLLoader.js";
import { clone } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/utils/SkeletonUtils.js";

// container state  html
const canvas = document.querySelector("#myCanvas");
const preGameplayContainer = document.querySelector(".bg-idle");
const gameplayContainer = document.querySelector(".bg-start");
const loseContainer = document.querySelector(".bg-lose");

// button container
const startBtn = document.querySelector("#startGame");
const startAgainBtn = document.querySelector("#startAgainBtn");
const quitBtn = document.querySelector("#quitBtn");

// audio game
const gunShotHit = new Audio("./Sounds/gunshot_hit.mp3");
const gunShot = new Audio("./Sounds/gunshot.mp3");

const heartContainer = document.querySelector(".container");
const hearts = document.querySelectorAll(".container img");
const scoreBoard = document.querySelector("#scoreValue");
const crosshair = document.querySelector(".crosshair");

let scene, camera, renderer, clock;
let meshFloor;
let meshFloorOutside;

let mixer = [];

let score = 0;
let liveHeart = 4;

let crateTexture, crateNormalMap, crateBumpMap;

let keyboard = {};
let player = {
    height: 1.7,
    speed: 0.2,
    turnSpeed: Math.PI * 0.02,
    canShoot: 0,
};

let loadingScreen = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(90, 1200 / 720, 0.1, 1000),
    box: new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x4444ff })
    ),
};
let loadingManager = null;
let RESOURCES_LOADED = false;

// models index
let models = {
    tent: {
        obj: "./Models/models/Tent_Poles_01.obj",
        mtl: "./Models/models/Tent_Poles_01.mtl",
        mesh: null,
    },
    campfire: {
        obj: "./Models/models/Campfire_01.obj",
        mtl: "./Models/models/Campfire_01.mtl",
        mesh: null,
    },
    pirateship: {
        obj: "./Models/models/Pirateship.obj",
        mtl: "./Models/models/Pirateship.mtl",
        mesh: null,
    },
    uzi: {
        obj: "./Models/models/uziGold.obj",
        mtl: "./Models/models/uziGold.mtl",
        mesh: null,
        castShadow: false,
    },
};
// objects
let objects = {
    enemy: {
        obj: "./Object/enemy.fbx",
        anim: "./Object/running2.fbx",
        mesh: null,
    },
};
// meshes index
let meshes = {};

//bullets array
let bullets = [];

//enemy array
let enemies = [];
let enemySpawnInterval = 5;

// game state
let GAME_STATE = "IDLE";

function init() {
    // init camera and scene
    {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x88ccff);
        camera = new THREE.PerspectiveCamera(
            90,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
    }

    // clock for gun motion
    clock = new THREE.Clock();

    // loader display
    {
        loadingScreen.box.position.set(0, 0, 5);
        loadingScreen.camera.lookAt(loadingScreen.box.position);
        loadingScreen.scene.add(loadingScreen.box);
    }

    // loading manager
    {
        loadingManager = new THREE.LoadingManager();
        loadingManager.onProgress = function (item, loaded, total) {
            // console.log(item, loaded, total);
        };
        loadingManager.onLoad = function () {
            // console.log("loaded all the resources");
            RESOURCES_LOADED = true;
            onResourcesLoaded();
        };
    }

    // plane geometry
    {
        const textureLoader = new THREE.TextureLoader(loadingManager);
        var floorTexture = textureLoader.load("texture/grass1.jpg");
        meshFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 30, 30, 10), //20, 30, 30, 10
            new THREE.MeshPhongMaterial({ map: floorTexture, wireframe: false })
        );
        meshFloor.rotation.x -= Math.PI / 2; // Rotate the floor 90 degrees
        meshFloor.receiveShadow = true;
        scene.add(meshFloor);
    }

    // water texture
    {
        const textureLoader = new THREE.TextureLoader(loadingManager);
        var floorTexture = textureLoader.load("texture/water.jpg");
        meshFloorOutside = new THREE.Mesh(
            new THREE.PlaneGeometry(70, 70, 10, 6), //20, 30, 30, 10
            new THREE.MeshPhongMaterial({ map: floorTexture, wireframe: false })
        );

        meshFloorOutside.rotation.x -= Math.PI / 2; // Rotate the floor 90 degrees
        meshFloorOutside.position.set(0, -0.1, 0);
        meshFloorOutside.receiveShadow = true;
        scene.add(meshFloorOutside);
    }

    // load all the models
    Object.keys(models).forEach((key) => {
        // load material
        const mtlLoader = new MTLLoader(loadingManager);
        mtlLoader.load(models[key].mtl, function (materials) {
            materials.preload();
            // load objects
            const objLoader = new OBJLoader(loadingManager);
            objLoader.setMaterials(materials);
            objLoader.load(models[key].obj, function (mesh) {
                // add shadow
                mesh.traverse(function (node) {
                    if (node.isMesh) {
                        if ("castShadow" in models[key])
                            node.castShadow = models[key].castShadow;
                        else node.castShadow = true;

                        if ("receiveShadow" in models[key])
                            node.receiveShadow = models[key].receiveShadow;
                        else node.receiveShadow = true;
                    }
                });
                models[key].mesh = mesh;
            });
        });
    });

    // load objects
    const objLoader = new FBXLoader(loadingManager);
    objLoader.load("./Object/enemy.fbx", (fbx) => {
        fbx.scale.setScalar(0.02);
        // fbx.position.z = -10;
        fbx.rotation.y -= Math.PI;
        fbx.traverse((c) => {
            c.castShadow = true;
        });
        objects["enemy"].mesh = fbx;
        // scene.add(fbx);
        // console.log(fbx);
    });

    // lighting
    {
        const ambientlight = new THREE.AmbientLight(0x6688cc);
        scene.add(ambientlight);

        // const fillLight1 = new THREE.DirectionalLight(0xff9999, 0.5);
        // fillLight1.position.set(-1, 1, 2);
        // scene.add(fillLight1);

        const fillLight2 = new THREE.DirectionalLight(0x8888ff, 0.2);
        fillLight2.position.set(2, 1, 1);
        scene.add(fillLight2);

        const directionalLight = new THREE.DirectionalLight(0xffffaa, 1.2);
        directionalLight.position.set(-5, 25, -1);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.01;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.radius = 4;
        directionalLight.shadow.bias = -0.00006;
        scene.add(directionalLight);
    }

    // set camera
    {
        camera.position.set(0, player.height, -15);
        camera.lookAt(new THREE.Vector3(0, player.height, 0));
    }

    // render
    {
        renderer = new THREE.WebGLRenderer({
            canvas,
            logarithmicDepthBuffer: true,
            antialias: true,
            powerPreference: "high-performance",
            alpha: false,
        });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.BasicShadowMap;
    }

    animate();
}

// get random integer in interval
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

// resize render automatically
function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

// runs when all resources loaded
function onResourcesLoaded() {
    // Clone models into meshes.
    meshes["tent1"] = models.tent.mesh.clone();
    meshes["tent2"] = models.tent.mesh.clone();
    meshes["tent3"] = models.tent.mesh.clone();
    meshes["campfire1"] = models.campfire.mesh.clone();
    meshes["campfire2"] = models.campfire.mesh.clone();
    meshes["campfire3"] = models.campfire.mesh.clone();
    meshes["pirateship"] = models.pirateship.mesh.clone();
    meshes["pirateship2"] = models.pirateship.mesh.clone();
    meshes["pirateship3"] = models.pirateship.mesh.clone();
    meshes["pirateship4"] = models.pirateship.mesh.clone();
    meshes["enemy"] = objects.enemy.mesh.clone();

    // Reposition individual meshes, then add meshes to scene
    meshes["tent1"].position.set(8, 0, 4);
    scene.add(meshes["tent1"]);

    meshes["tent2"].position.set(-8, 0, 4);
    scene.add(meshes["tent2"]);

    meshes["tent3"].position.set(0, 0, 4);
    scene.add(meshes["tent3"]);

    meshes["campfire1"].position.set(8, 0, 1);
    meshes["campfire2"].position.set(-8, 0, 1);
    meshes["campfire3"].position.set(0, 0, 1);

    scene.add(meshes["campfire1"]);
    scene.add(meshes["campfire2"]);
    scene.add(meshes["campfire3"]);

    meshes["pirateship"].position.set(-15, -1, -5);
    meshes["pirateship"].rotation.set(0, Math.PI, 0); // Rotate it to face the other way.
    scene.add(meshes["pirateship"]);

    meshes["pirateship4"].position.set(-6, -1, 20);
    meshes["pirateship4"].rotation.set(0, Math.PI, 0); // Rotate it to face the other way.
    scene.add(meshes["pirateship4"]);

    meshes["pirateship3"].position.set(6, -1, 20);
    meshes["pirateship3"].rotation.set(0, Math.PI, 0); // Rotate it to face the other way.
    scene.add(meshes["pirateship3"]);

    meshes["pirateship2"].position.set(20, -1, 3);
    meshes["pirateship2"].rotation.set(0, -2, 0); // Rotate it to face the other way.
    scene.add(meshes["pirateship2"]);

    meshes["playerWeapon"] = models.uzi.mesh.clone();
    meshes["playerWeapon"].position.set(0, 2, 0);
    meshes["playerWeapon"].scale.set(10, 10, 10);
    scene.add(meshes["playerWeapon"]);
}

// random object
function generateEnemy() {
    let mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 2, 2),
        new THREE.MeshPhongMaterial({ opacity: 0, transparent: true })
    );
    // mesh.model = models["tent"].mesh.clone();
    mesh.model = clone(objects["enemy"].mesh);
    // const anim = new FBXLoader(loadingManager);
    // anim.load("./Object/running6.fbx", (anim) => {
    //     // console.log(anim)
    //     mixerTemp = new THREE.AnimationMixer(mesh.model);
    //     const running = mixer.clipAction(anim.animations[0]);
    //     mesh.mixer = mixerTemp;
    //     mixer.push(mixerTemp);
    //     running.play();
    // });

    // mesh = models["tent"].mesh.clone();
    // console.log(mesh.model);
    const positionX = getRandomInt(-8, 8);
    mesh.position.x = positionX;
    mesh.model.position.x = positionX;

    //position
    mesh.position.y += 1;
    mesh.isHit = false;

    // speed
    mesh.velocity = new THREE.Vector3(0, 0, -0.1);
    mesh.model.velocity = mesh.velocity;

    //lifespan
    mesh.alive = true;
    mesh.model.alive = true;
    setTimeout(function () {
        mesh.alive = false;
        mesh.model.alive = false;
        // new THREE.AnimationAction.stop(mesh.mixer);
        scene.remove(mesh);
        scene.remove(mesh.model);
        // mesh.model.position.y -= 3;
        if (!mesh.isHit) {
            const img = hearts[liveHeart - 1];
            if (img) {
                img.src = "./Images/heart_empty.png";
            }
            liveHeart--;
            if (liveHeart == 0) loseState();
        }
    }, 2100);
    scene.add(mesh);
    scene.add(mesh.model);
    enemies.push(mesh);
    enemySpawnInterval = 100;
}

// check collision
function detectCollisionCubes(object1, object2) {
    object1.geometry.computeBoundingBox(); //not needed if its already calculated
    object2.geometry.computeBoundingBox();
    object1.updateMatrixWorld();
    object2.updateMatrixWorld();

    var box1 = object1.geometry.boundingBox.clone();
    box1.applyMatrix4(object1.matrixWorld);

    var box2 = object2.geometry.boundingBox.clone();
    box2.applyMatrix4(object2.matrixWorld);

    if (box1.intersectsBox(box2)) {
        gunShotHit.play();
    }

    return box1.intersectsBox(box2);
}

function animate() {
    // responsive scaling
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    // show loading screen if not all resources is loaded
    if (RESOURCES_LOADED === false) {
        requestAnimationFrame(animate);

        loadingScreen.box.position.x -= 0.05;
        if (loadingScreen.box.position.x < -10)
            loadingScreen.box.position.x = 10;
        loadingScreen.box.position.y = Math.sin(loadingScreen.box.position.x);

        renderer.render(loadingScreen.scene, loadingScreen.camera);
        return;
    }
    if (GAME_STATE == "START") {
        requestAnimationFrame(animate);
    }

    // bullet projectile
    for (let index = 0; index < bullets.length; index++) {
        if (bullets[index] === undefined) continue;
        if (bullets[index].alive == false) {
            bullets.splice(index, 1);
            continue;
        }
        bullets[index].position.add(bullets[index].velocity);
    }

    // enemy movement
    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i] === undefined) continue;
        if (enemies[i].alive === false) {
            enemies.splice(i, 1);
            mixer.splice(i, 1);
            continue;
        }
        let collision = false;
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (detectCollisionCubes(enemies[i], bullets[j])) {
                enemies[i].isHit = true;
                scene.remove(enemies[i].model);
                // enemies[i].model.position.y -= 3;
                scene.remove(enemies[i]);
                scene.remove(bullets[j]);
                bullets.splice(j, 1);
                enemies.splice(i, 1);
                collision = true;
                score++;
                scoreBoard.innerHTML = score;
            }
        }
        if (collision) continue;
        enemies[i].position.add(enemies[i].velocity);
        enemies[i].model.position.add(enemies[i].model.velocity);
    }
    // gun motion
    const time = Date.now() * 0.0005;
    const delta = clock.getDelta();

    //mixer animation render
    if (mixer) {
        mixer.forEach((e) => {
            e.update(delta);
        });
    }

    // walking event
    if (keyboard[65] && camera.position.x <= 9) {
        // A key
        // Redirect motion by 90 degrees
        camera.position.x +=
            Math.sin(camera.rotation.y + Math.PI / 2) * player.speed;
        camera.position.z +=
            -Math.cos(camera.rotation.y + Math.PI / 2) * player.speed;
    }
    if (keyboard[68] && camera.position.x >= -9) {
        // D key
        camera.position.x +=
            Math.sin(camera.rotation.y - Math.PI / 2) * player.speed;
        camera.position.z +=
            -Math.cos(camera.rotation.y - Math.PI / 2) * player.speed;
    }

    // escape game
    if (keyboard[27]) {
        idleState();
    }

    // bullets listener
    if ((keyboard[32] || keyboard[13]) && player.canShoot <= 0) {
        //space key
        // gun sound
        gunShot.play();

        //bullet object
        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0xffcd01 })
        );
        // const bullet = models["tent"].mesh.clone();

        bullet.castShadow = true;
        bullet.receiveShadow = true;

        //bullet posiiton
        bullet.position.set(
            meshes["playerWeapon"].position.x,
            meshes["playerWeapon"].position.y + 0.15,
            meshes["playerWeapon"].position.z
        );

        // bullet speed
        bullet.velocity = new THREE.Vector3(
            -Math.sin(camera.rotation.y),
            0,
            0.5
        );

        //bullet lifespan
        bullet.alive = true;
        setTimeout(function () {
            bullet.alive = false;
            scene.remove(bullet);
        }, 1000);

        bullets.push(bullet);
        scene.add(bullet);
        player.canShoot = 50;
    }
    if (player.canShoot > 0) player.canShoot -= 1;
    if (enemySpawnInterval <= 0) generateEnemy();

    enemySpawnInterval--;

    // position the gun in front of the camera
    meshes["playerWeapon"].position.set(
        camera.position.x - Math.sin(camera.rotation.y + Math.PI / 6) * 0.75,
        camera.position.y -
            0.5 +
            Math.sin(time * 4 + camera.position.x + camera.position.z) * 0.01,
        camera.position.z + Math.cos(camera.rotation.y + Math.PI / 6) * 0.75
    );
    meshes["playerWeapon"].rotation.set(
        camera.rotation.x,
        camera.rotation.y - Math.PI,
        camera.rotation.z
    );
    renderer.render(scene, camera);
}

// event listener
function keyDown(event) {
    keyboard[event.keyCode] = true;
    // console.log(event.keyCode)
}
function keyUp(event) {
    keyboard[event.keyCode] = false;
}
window.addEventListener("keydown", keyDown);
window.addEventListener("keyup", keyUp);

let currentRunningProgram = null;

// changing state
function resetGameComponents() {
    score = 0;
    liveHeart = 5;
    scoreBoard.innerHTML = 0;

    GAME_STATE = "IDLE";
    hearts.forEach((heart) => {
        heart.src = "./Images/heart.png";
    });
    // document.exitPointerLock();
    scene.clear();
}
function idleState() {
    preGameplayContainer.style.display = "block";
    gameplayContainer.style.display = "none";
    loseContainer.style.display = "none";

    resetGameComponents();
    return;
}
function gameplayState() {
    preGameplayContainer.style.display = "none";
    gameplayContainer.style.display = "block";
    loseContainer.style.display = "none";

    GAME_STATE = "START";
    currentRunningProgram = init();
    // document.body.requestPointerLock();
}
function loseState() {
    loseContainer.style.display = "block";
    gameplayContainer.style.display = "none";

    resetGameComponents();
    return;
}

startBtn.addEventListener("click", function () {
    gameplayState();
});
startAgainBtn.addEventListener("click", function () {
    gameplayState();
});
quitBtn.addEventListener("click", function () {
    location.href = "index.html";
});

// window.onload = init;
