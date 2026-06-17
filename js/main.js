import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';

// ================= SCENE =================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// ================= CAMERA =================
const camera = new THREE.PerspectiveCamera(
75,
window.innerWidth/window.innerHeight,
0.1,
1000
);

// ================= RENDERER =================
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ================= LIGHTS =================
scene.add(new THREE.AmbientLight(0xffffff,1.5));

const light = new THREE.DirectionalLight(0xffffff,2);
light.position.set(5,10,5);
scene.add(light);

// ================= FLOOR =================
const floor = new THREE.Mesh(
new THREE.PlaneGeometry(40,40),
new THREE.MeshStandardMaterial({ color:0x333333 })
);
floor.rotation.x = -Math.PI/2;
scene.add(floor);

// ================= LOADER =================
const loader = new GLTFLoader();

let player, enemy;
let gameReady = false;

// ================= LOAD MODELS =================
loader.load("./models/fighter.glb", (gltf)=>{

    player = gltf.scene;
    player.position.set(-3,1,0);
    player.scale.set(1,1,1);
    scene.add(player);

    checkReady();
});

loader.load("./models/fighter.glb", (gltf)=>{

    enemy = gltf.scene;
    enemy.position.set(3,1,0);
    enemy.scale.set(1,1,1);
    scene.add(enemy);

    checkReady();
});

function checkReady(){
    if(player && enemy){
        gameReady = true;
        updateHUD();
    }
}

// ================= GAME STATE =================
let playerHP = 100;
let enemyHP = 100;

let playerRounds = 0;
let enemyRounds = 0;
let round = 1;

// ================= CAMERA =================
camera.position.set(0,5,10);

// ================= HUD =================
function updateHUD(){

    document.getElementById("playerHp").innerText =
    "Oyuncu HP: " + playerHP;

    document.getElementById("enemyHp").innerText =
    "Rakip HP: " + enemyHP;
}

// ================= ATTACK =================
function attack(damage){

    if(!gameReady) return;

    const distance = Math.abs(player.position.x - enemy.position.x);

    if(distance < 2){

        enemyHP -= damage;
        if(enemyHP < 0) enemyHP = 0;

        updateHUD();
        checkRound();
    }
}

// ================= ROUND SYSTEM =================
function checkRound(){

    if(enemyHP <= 0){

        playerRounds++;

        if(playerRounds >= 2){
            alert("KAZANDIN!");
            resetMatch();
            return;
        }

        nextRound();
    }
}

function nextRound(){

    round++;

    playerHP = 100;
    enemyHP = 100;

    player.position.set(-3,1,0);
    enemy.position.set(3,1,0);

    updateHUD();

    alert("ROUND " + round);
}

function resetMatch(){

    round = 1;
    playerRounds = 0;
    enemyRounds = 0;

    playerHP = 100;
    enemyHP = 100;

    player.position.set(-3,1,0);
    enemy.position.set(3,1,0);

    updateHUD();
}

// ================= CONTROLS =================
const keys = {};

window.addEventListener("keydown",(e)=>{

    keys[e.key.toLowerCase()] = true;

    if(e.key.toLowerCase() === "j"){
        attack(10);
    }

    if(e.key.toLowerCase() === "k"){
        attack(20);
    }
});

window.addEventListener("keyup",(e)=>{
    keys[e.key.toLowerCase()] = false;
});

// ================= UPDATE =================
function update(){

    if(!gameReady) return;

    if(keys["a"]) player.position.x -= 0.1;
    if(keys["d"]) player.position.x += 0.1;

    // simple AI
    if(enemy.position.x > player.position.x + 2){
        enemy.position.x -= 0.03;
    }
}

// ================= LOOP =================
function animate(){
    requestAnimationFrame(animate);
    update();
    renderer.render(scene,camera);
}
animate();

// ================= RESIZE =================
window.addEventListener("resize",()=>{

camera.aspect = window.innerWidth/window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth,window.innerHeight);

});
