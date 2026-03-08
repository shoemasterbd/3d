import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // <-- NEW: The 3D Loader

// 1. Scene Setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting (Crucial to see the details of the shoe)
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);
const backLight = new THREE.DirectionalLight(0xffffff, 1);
backLight.position.set(-5, 5, -5);
scene.add(backLight);

// 2. LOAD THE REAL SHOE (.glb file)
let shoeModel;
const loader = new GLTFLoader();

loader.load('shoe.glb', function (gltf) {
    shoeModel = gltf.scene;
    
    // Adjust the size and position of the shoe to fit the screen
    shoeModel.scale.set(10,10, 10); // Make it bigger
    shoeModel.position.set(0, -0.05, 0); // Move it down slightly
    
    // Log the names of the shoe parts to the developer console!
    shoeModel.traverse((child) => {
        if (child.isMesh) {
            console.log("Found Shoe Part:", child.name);
            // Optional: reset material so color changes work easily
            child.material = child.material.clone(); 
        }
    });

    scene.add(shoeModel);
}, undefined, function (error) {
    console.error('Error loading the shoe model. Make sure shoe.glb is in your folder!', error);
});

// 3. Handle Color Changes
function changeColor(hexColor) {
    if (!shoeModel) return;
    
    shoeModel.traverse((child) => {
        if (child.isMesh) {
            // This applies the color to EVERY part of the shoe for now
            child.material.color.set(hexColor);
        }
    });
}

// Listen to your HTML color picker
document.getElementById('color-upper').addEventListener('input', (e) => changeColor(e.target.value));

// 4. Handle Drag & Drop Stickers (Exactly the same as the box!)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.allowDrop = function(ev) {
    ev.preventDefault();
}

window.drag = function(ev) {
    ev.dataTransfer.setData("text", ev.target.id); 
}

window.drop = function(ev) {
    ev.preventDefault();
    if(!shoeModel) return;

    const data = ev.dataTransfer.getData("text");
    const droppedImg = document.getElementById(data);

    const rect = container.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(shoeModel, true);

    if (intersects.length > 0) {
        const intersectionPoint = intersects[0].point;
        const intersectionNormal = intersects[0].face.normal;
        applyDecal(intersects[0].object, intersectionPoint, intersectionNormal, droppedImg.src);
    }
}

const textureLoader = new THREE.TextureLoader();
function applyDecal(mesh, position, normal, imgSrc) {
    const decalMaterial = new THREE.MeshBasicMaterial({
        map: textureLoader.load(imgSrc),
        transparent: true,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4
    });

    // We made the sticker smaller (0.05) because the real shoe uses real-world scale
    const decalSize = new THREE.Vector3(0.5, 0.5, 0.5);
    const decalOrientation = new THREE.Euler().setFromVector3(normal); 
    
    const decalGeometry = new DecalGeometry(mesh, position, decalOrientation, decalSize);
    const decalMesh = new THREE.Mesh(decalGeometry, decalMaterial);
    
    scene.add(decalMesh);
}

// 5. Animation Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update(); 
    renderer.render(scene, camera);
}
animate();

// Handle Window Resizing
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});