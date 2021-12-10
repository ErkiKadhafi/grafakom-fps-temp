import * as THREE from "https://threejsfundamentals.org/threejs/resources/threejs/r132/build/three.module.js";
import { OBJLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/MTLLoader.js";

function main() {
    let scene, camera, renderer, clock;
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
    let loadingManager = null,
        RESOURCES_LOADED = false;

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

    const canvas = document.querySelector("#myCanvas");
    const renderer = new THREE.WebGLRenderer({ canvas });

    //set scene
    const fov = 70;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

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
}
