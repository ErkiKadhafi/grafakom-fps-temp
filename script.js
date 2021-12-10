import * as THREE from "https://threejsfundamentals.org/threejs/resources/threejs/r132/build/three.module.js";
import { FBXLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/FBXLoader.js";
import { OBJLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/MTLLoader.js";
import { clone } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/utils/SkeletonUtils.js";

const canvas = document.querySelector("#myCanvas");

let scene, camera, renderer, clock, mixer;
let meshFloor;

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

function init() {
    // init camera and scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        90,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    // clock for gun motion
    clock = new THREE.Clock();

    // loader display
    loadingScreen.box.position.set(0, 0, 5);
    loadingScreen.camera.lookAt(loadingScreen.box.position);
    loadingScreen.scene.add(loadingScreen.box);

    // loading manager
    loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = function (item, loaded, total) {
        // console.log(item, loaded, total);
    };
    loadingManager.onLoad = function () {
        // console.log("loaded all the resources");
        RESOURCES_LOADED = true;
        onResourcesLoaded();
    };

    // plane geometry
    meshFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 30, 30, 10),
        new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: false })
    );
    meshFloor.rotation.x -= Math.PI / 2; // Rotate the floor 90 degrees
    meshFloor.receiveShadow = true;
    scene.add(meshFloor);

    // add textured geometry
    const textureLoader = new THREE.TextureLoader(loadingManager);
    crateTexture = textureLoader.load("crate0/crate0_diffuse.png");
    crateBumpMap = textureLoader.load("crate0/crate0_bump.png");
    crateNormalMap = textureLoader.load("crate0/crate0_normal.png");

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
        //load animation
        // const anim = new FBXLoader(loadingManager);
        // anim.load("./Object/running6.fbx", (anim) => {
        //     // console.log(anim)
        //     mixer = new THREE.AnimationMixer(fbx);
        //     const running = mixer.clipAction(anim.animations[0]);
        //     running.play();
        // });
        objects["enemy"].mesh = fbx;
        // scene.add(fbx);
        // console.log(fbx);
    });

    // lighting
    {
        let ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);

        let pointLight = new THREE.PointLight(0xffffff, 0.8, 18);
        pointLight.position.set(-3, 6, -3);
        pointLight.castShadow = true;
        pointLight.shadow.camera.near = 0.1;
        pointLight.shadow.camera.far = 25;
        scene.add(pointLight);
    }

    // set camera
    camera.position.set(0, player.height, -15);
    camera.lookAt(new THREE.Vector3(0, player.height, 0));

    // render
    renderer = new THREE.WebGLRenderer({
        canvas,
        logarithmicDepthBuffer: true,
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;

    // document.body.requestPointerLock();
    // console.log(document.pointerLockElement);
    animate();
}
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}
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
    meshes["campfire1"] = models.campfire.mesh.clone();
    meshes["campfire2"] = models.campfire.mesh.clone();
    meshes["pirateship"] = models.pirateship.mesh.clone();
    meshes["enemy"] = objects.enemy.mesh.clone();

    // Reposition individual meshes, then add meshes to scene
    meshes["tent1"].position.set(-5, 0, 4);
    scene.add(meshes["tent1"]);

    meshes["tent2"].position.set(-8, 0, 4);
    scene.add(meshes["tent2"]);

    meshes["campfire1"].position.set(-5, 0, 1);
    meshes["campfire2"].position.set(-8, 0, 1);

    scene.add(meshes["campfire1"]);
    scene.add(meshes["campfire2"]);

    meshes["pirateship"].position.set(-5, 0, -5);
    meshes["pirateship"].rotation.set(0, Math.PI, 0); // Rotate it to face the other way.
    // scene.add(meshes["pirateship"]);

    // player weapon
    meshes["playerWeapon"] = models.uzi.mesh.clone();
    meshes["playerWeapon"].position.set(0, 2, 0);
    meshes["playerWeapon"].scale.set(10, 10, 10);
    scene.add(meshes["playerWeapon"]);
}

// random object
function generateEnemy() {
    let mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshPhongMaterial({ opacity: 0, transparent: true })
    );
    // mesh.model = models["tent"].mesh.clone();
    mesh.model = clone(objects["enemy"].mesh);
    // const anim = new FBXLoader(loadingManager);
    // anim.load("./Object/running6.fbx", (anim) => {
    //     // console.log(anim)
    //     mixer = new THREE.AnimationMixer(mesh.model);
    //     const running = mixer.clipAction(anim.animations[0]);
    //     running.play();
    // });

    // mesh = models["tent"].mesh.clone();
    // console.log(mesh.model);
    const positionX = getRandomInt(-8, 8);
    mesh.position.x = positionX;
    mesh.model.position.x = positionX;

    //position
    mesh.position.y += 1;
    // mesh.receiveShadow = true;
    // mesh.castShadow = true;

    // speed
    mesh.velocity = new THREE.Vector3(0, 0, -0.1);
    mesh.model.velocity = mesh.velocity;

    //lifespan
    mesh.alive = true;
    mesh.model.alive = true;
    setTimeout(function () {
        mesh.alive = false;
        mesh.model.alive = false;
        scene.remove(mesh);
        scene.remove(mesh.model);
    }, 5000);
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

    return box1.intersectsBox(box2);
}

function animate() {
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
    // responsive scaling
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    requestAnimationFrame(animate);
    // objects["enemy"].mesh.position.z -= 0.06

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
            continue;
        }
        bullets.forEach((bullet) => {
            if (detectCollisionCubes(enemies[i], bullet)) {
                scene.remove(enemies[i].model);
                scene.remove(bullet);
            }
        });

        enemies[i].position.add(enemies[i].velocity);
        enemies[i].model.position.add(enemies[i].model.velocity);
    }

    // gun motion
    const time = Date.now() * 0.0005;
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

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

    // bullets listener
    if ((keyboard[32] || keyboard[13]) && player.canShoot <= 0) {
        //space key
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

window.onload = init;
