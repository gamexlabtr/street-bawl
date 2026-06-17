import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
75,
window.innerWidth/window.innerHeight,
0.1,
1000
);

const renderer = new THREE.WebGLRenderer({
antialias:true
});

renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);

// Işıklar
const ambient = new THREE.AmbientLight(0xffffff,1.5);
scene.add(ambient);

const light = new THREE.DirectionalLight(0xffffff,2);
light.position.set(5,10,5);
scene.add(light);

// Arena zemini
const floor = new THREE.Mesh(
new THREE.PlaneGeometry(40,40),
new THREE.MeshStandardMaterial({
color:0x333333
})
);

floor.rotation.x = -Math.PI/2;
scene.add(floor);

// Oyuncu
const player = new THREE.Mesh(
new THREE.BoxGeometry(1,2,1),
new THREE.MeshStandardMaterial({color:0x00ffff})
);

player.position.set(-3,1,0);
scene.add(player);

// Rakip
const enemy = new THREE.Mesh(
new THREE.BoxGeometry(1,2,1),
new THREE.MeshStandardMaterial({color:0xff0000})
);

enemy.position.set(3,1,0);
scene.add(enemy);

// Kamera
camera.position.set(0,5,10);

// Kontroller
const keys = {};

window.addEventListener("keydown",(e)=>{
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup",(e)=>{
    keys[e.key.toLowerCase()] = false;
});

function update(){

    if(keys["a"]) player.position.x -= 0.1;
    if(keys["d"]) player.position.x += 0.1;

    // Basit yapay zekâ
    if(enemy.position.x > player.position.x + 2){
        enemy.position.x -= 0.03;
    }

}

function animate(){

    requestAnimationFrame(animate);

    update();

    renderer.render(scene,camera);

}

animate();

window.addEventListener("resize",()=>{

camera.aspect =
window.innerWidth/window.innerHeight;

camera.updateProjectionMatrix();

renderer.setSize(
window.innerWidth,
window.innerHeight
);

});
