import { OBJLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/MTLLoader.js";

let scene, camera, renderer, mesh, clock;
let meshFloor;

let crate, crateTexture, crateNormalMap, crateBumpMap;

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
// meshes index
let meshes = {};

//bullets array
let bullets = [];

function init() {
    // init camera and scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(90, 1200 / 720, 0.1, 1000);

    // clock for gun motion
    clock = new THREE.Clock();

    // loader display
    loadingScreen.box.position.set(0, 0, 5);
    loadingScreen.camera.lookAt(loadingScreen.box.position);
    loadingScreen.scene.add(loadingScreen.box);

    // loading manager
    loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = function (item, loaded, total) {
        console.log(item, loaded, total);
    };
    loadingManager.onLoad = function () {
        console.log("loaded all the resources");
        RESOURCES_LOADED = true;
        onResourcesLoaded();
    };

    // add boxes geometry
    mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshPhongMaterial({ color: 0xff9999, wireframe: false })
    );
    mesh.position.y += 1;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    // plane geometry
    meshFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20, 20, 10),
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

    crate = new THREE.Mesh(
        new THREE.BoxGeometry(3, 3, 3),
        new THREE.MeshPhongMaterial({
            color: 0xffffff,
            map: crateTexture,
            bumpMap: crateBumpMap,
            normalMap: crateNormalMap,
        })
    );
    crate.position.set(2.5, 3 / 2, 2.5);
    crate.receiveShadow = true;
    crate.castShadow = true;
    scene.add(crate);

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

    // lighting
    let ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    let pointLight = new THREE.PointLight(0xffffff, 0.8, 18);
    pointLight.position.set(-3, 6, -3);
    pointLight.castShadow = true;
    pointLight.shadow.camera.near = 0.1;
    pointLight.shadow.camera.far = 25;
    scene.add(pointLight);

    // set camera
    camera.position.set(0, player.height, -5);
    camera.lookAt(new THREE.Vector3(0, player.height, 0));

    // render
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(1200, 720);
    // renderer cast shadow
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;

    document.body.appendChild(renderer.domElement);

    animate();
}

// runs when all resources loaded
function onResourcesLoaded() {
    // Clone models into meshes.
    meshes["tent1"] = models.tent.mesh.clone();
    meshes["tent2"] = models.tent.mesh.clone();
    meshes["campfire1"] = models.campfire.mesh.clone();
    meshes["campfire2"] = models.campfire.mesh.clone();
    meshes["pirateship"] = models.pirateship.mesh.clone();

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
    scene.add(meshes["pirateship"]);

    // player weapon
    meshes["playerWeapon"] = models.uzi.mesh.clone();
    meshes["playerWeapon"].position.set(0, 2, 0);
    meshes["playerWeapon"].scale.set(10, 10, 10);
    scene.add(meshes["playerWeapon"]);
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

    requestAnimationFrame(animate);

    // bullet projectile
    for (let index = 0; index < bullets.length; index++) {
        if (bullets[index] === undefined) continue;
        if (bullets[index].alive == false) {
            bullets.splice(index, 1);
            continue;
        }
        bullets[index].position.add(bullets[index].velocity);
    }

    // gun motion
    const time = Date.now() * 0.0005;
    const delta = clock.getDelta();

    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.02;
    crate.rotation.y += 0.02;

    // walking event
    if (keyboard[87]) {
        // W key
        camera.position.x -= Math.sin(camera.rotation.y) * player.speed;
        camera.position.z -= -Math.cos(camera.rotation.y) * player.speed;
    }
    if (keyboard[83]) {
        // S key
        camera.position.x += Math.sin(camera.rotation.y) * player.speed;
        camera.position.z += -Math.cos(camera.rotation.y) * player.speed;
    }
    if (keyboard[65]) {
        // A key
        // Redirect motion by 90 degrees
        camera.position.x +=
            Math.sin(camera.rotation.y + Math.PI / 2) * player.speed;
        camera.position.z +=
            -Math.cos(camera.rotation.y + Math.PI / 2) * player.speed;
    }
    if (keyboard[68]) {
        // D key
        camera.position.x +=
            Math.sin(camera.rotation.y - Math.PI / 2) * player.speed;
        camera.position.z +=
            -Math.cos(camera.rotation.y - Math.PI / 2) * player.speed;
    }

    // camera rotate event
    if (keyboard[37]) {
        //left arrow key
        camera.rotation.y -= player.turnSpeed;
    }
    if (keyboard[39]) {
        //right arrow key
        camera.rotation.y += player.turnSpeed;
    }

    // bullets listener
    if (keyboard[32] && player.canShoot <= 0) {
        //space key

        //bullet object
        const bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        // const bullet = models["tent"].mesh.clone();

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
            Math.cos(camera.rotation.y)
        );

        //bullet lifespan
        bullet.alive = true;
        setTimeout(function () {
            bullet.alive = false;
            scene.remove(bullet);
        }, 1000);

        bullets.push(bullet);
        scene.add(bullet);
        player.canShoot = 10;
    }
    if (player.canShoot > 0) player.canShoot -= 1;

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
}
function keyUp(event) {
    keyboard[event.keyCode] = false;
}
window.addEventListener("keydown", keyDown);
window.addEventListener("keyup", keyUp);

window.onload = init;
