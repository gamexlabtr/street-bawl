// ============================================
// DEVICE DETECTION
// ============================================
const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) 
               || (navigator.maxTouchPoints > 1);
const IS_TV = window.innerWidth >= 1920 && !IS_MOBILE;

// ============================================
// PHASER CONFIG — Responsive
// ============================================
const config = {
    type: Phaser.AUTO,
    backgroundColor: '#000000',
    scene: [MenuScene, SelectScene, FightScene, ResultScene],
    
    scale: {
        mode: Phaser.Scale.FIT,          // En-boy oranını koru
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 450,
        // Minimum/maksimum boyut
        min: { width: 320, height: 180 },
        max: { width: 1920, height: 1080 },
    },

    // Dokunmatik
    input: {
        touch: true,
        mouse: true,
        keyboard: true,
        gamepad: true,    // TV Gamepad desteği
    }
};

// ============================================
// SWIPE & TAP — Mobil Kontrol Sistemi
// ============================================
class TouchController {
    constructor(scene) {
        this.scene = scene;
        this.swipeThreshold = 30;  // px
        this.tapThreshold = 200;   // ms
        
        // Durum
        this.p1 = { left: false, right: false, punch: false, kick: false, special: false };
        this.p2 = { left: false, right: false, punch: false, kick: false, special: false };
        
        // Touch başlangıç noktaları
        this.touches = {};

        this.setupTouchEvents();
    }

    setupTouchEvents() {
        const canvas = this.scene.sys.game.canvas;
        const w = 800; // Oyun genişliği

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            Array.from(e.changedTouches).forEach(touch => {
                const gameX = (touch.clientX / canvas.offsetWidth) * w;
                this.touches[touch.identifier] = {
                    startX: gameX,
                    startY: touch.clientY,
                    startTime: Date.now(),
                    isLeft: gameX < w / 2  // Sol yarı = P1, Sağ yarı = P2
                };
            });
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            Array.from(e.changedTouches).forEach(touch => {
                const t = this.touches[touch.identifier];
                if (!t) return;
                const gameX = (touch.clientX / canvas.offsetWidth) * w;
                const dx = gameX - t.startX;
                const player = t.isLeft ? this.p1 : this.p2;

                // Swipe hareketi
                if (Math.abs(dx) > this.swipeThreshold) {
                    player.left = dx < 0;
                    player.right = dx > 0;
                } else {
                    player.left = false;
                    player.right = false;
                }
            });
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            Array.from(e.changedTouches).forEach(touch => {
                const t = this.touches[touch.identifier];
                if (!t) return;
                const gameX = (touch.clientX / canvas.offsetWidth) * w;
                const dx = Math.abs(gameX - t.startX);
                const dy = Math.abs(touch.clientY - t.startY);
                const dt = Date.now() - t.startTime;
                const player = t.isLeft ? this.p1 : this.p2;

                // Hareket sıfırla
                player.left = false;
                player.right = false;

                // TAP tespiti (küçük hareket + kısa süre)
                if (dx < 20 && dy < 20 && dt < this.tapThreshold) {
                    // Ekranın hangi bölgesi tıklandı?
                    const relX = gameX / w;
                    if (t.isLeft) {
                        // P1: Sol %33 = Yumruk, Orta = Tekme, Sağ %33 = Özel
                        if (relX < 0.17) this.triggerAttack(player, 'punch');
                        else if (relX < 0.34) this.triggerAttack(player, 'kick');
                        else this.triggerAttack(player, 'special');
                    } else {
                        // P2: Benzer bölümler sağ yarıda
                        if (relX < 0.67) this.triggerAttack(player, 'punch');
                        else if (relX < 0.84) this.triggerAttack(player, 'kick');
                        else this.triggerAttack(player, 'special');
                    }
                }

                // HIZLI SWIPE = Özel saldırı
                if (dx > 80 && dt < 300) {
                    this.triggerAttack(player, 'special');
                }

                delete this.touches[touch.identifier];
            });
        }, { passive: false });
    }

    triggerAttack(player, type) {
        player[type] = true;
        // 100ms sonra sıfırla (JustDown simülasyonu)
        setTimeout(() => { player[type] = false; }, 100);
    }

    // Her frame'de çağrılır
    getState(isP1) {
        return isP1 ? this.p1 : this.p2;
    }
}

// ============================================
// GAMEPAD (TV + Konsol Kontrolcüsü)
// ============================================
class GamepadController {
    constructor(scene) {
        this.scene = scene;
        this.pads = [null, null];
        this.prevButtons = [[], []];
        
        // Phaser gamepad
        scene.input.gamepad.once('connected', (pad) => {
            console.log('Gamepad bağlandı:', pad.id);
        });
    }

    update() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < Math.min(2, gamepads.length); i++) {
            if (gamepads[i]) this.pads[i] = gamepads[i];
        }
    }

    getState(playerIndex) {
        const pad = this.pads[playerIndex];
        if (!pad) return null;

        const axes = pad.axes;
        const btns = pad.buttons;
        const prev = this.prevButtons[playerIndex];

        const justPressed = (i) => btns[i]?.pressed && !prev[i];

        // Mevcut durumu kaydet
        this.prevButtons[playerIndex] = btns.map(b => b?.pressed || false);

        return {
            // D-Pad veya Sol Analog Stick
            left:    btns[14]?.pressed || axes[0] < -0.5,
            right:   btns[15]?.pressed || axes[0] > 0.5,
            // Butonlar (Xbox: A=0, X=2, B=1 | PS: Cross=0, Square=2, Circle=1)
            punch:   justPressed(0),   // A / Cross
            kick:    justPressed(2),   // X / Square
            special: justPressed(1),   // B / Circle
            // TV Kumandası: OK butonu = yumruk
            confirm: justPressed(0),
        };
    }
}

// ============================================
// FightScene.create() — Mobil Göstergeler Ekle
// ============================================
// FightScene create() fonksiyonunun sonuna ekle:

createMobileHints() {
    if (!IS_MOBILE) return;
    
    const w = GAME_WIDTH, h = GAME_HEIGHT;
    const alpha = 0.5;

    // P1 Swipe bölgesi göstergesi
    const p1Zone = this.add.graphics();
    p1Zone.fillStyle(0xe63946, 0.08);
    p1Zone.fillRect(0, h * 0.55, w * 0.5, h * 0.45);
    p1Zone.lineStyle(1, 0xe63946, 0.3);
    p1Zone.strokeRect(0, h * 0.55, w * 0.5, h * 0.45);

    // P2 Swipe bölgesi göstergesi
    const p2Zone = this.add.graphics();
    p2Zone.fillStyle(0x4895ef, 0.08);
    p2Zone.fillRect(w * 0.5, h * 0.55, w * 0.5, h * 0.45);
    p2Zone.lineStyle(1, 0x4895ef, 0.3);
    p2Zone.strokeRect(w * 0.5, h * 0.55, w * 0.5, h * 0.45);

    // P1 ikonlar
    this.add.text(w * 0.08, h * 0.72, '👊', { fontSize: '22px' }).setOrigin(0.5).setAlpha(alpha);
    this.add.text(w * 0.22, h * 0.72, '🦵', { fontSize: '22px' }).setOrigin(0.5).setAlpha(alpha);
    this.add.text(w * 0.36, h * 0.72, '⚡', { fontSize: '22px' }).setOrigin(0.5).setAlpha(alpha);

    // P1 etiketler
    this.add.text(w * 0.08, h * 0.85, 'YUM', { fontSize: '9px', color: '#e63946' }).setOrigin(0.5).setAlpha(alpha);
    this.add.text(w * 0.22, h * 0.85, 'TEK', { fontSize: '9px', color: '#e63946' }).setOrigin(0.5).setAlpha(alpha);
    this.add.text(w * 0.36, h * 0.85, 'ÖZEL', { fontSize: '9px', color: '#e63946' }).setOrigin(0.5).setAlpha(alpha);

    // P1 swipe göstergesi
    this.add.text(w * 0.22, h * 0.95, '← Swipe → Hareket', { 
        fontSize: '9px', color: '#888888' 
    }).setOrigin(0.5).setAlpha(alpha);

    // P2 ikonlar
    this.add.text(w * 0.64, h * 0.72, '👊', { fontSize: '22px' }).setOrigin(0.5).setAlpha(alpha);
    this.add.text(w * 0.78, h * 0.72, '🦵', { fontSize: '22px' }).setOrigin(0.5).setAlpha(alpha);
    this.add.text(w * 0.92, h * 0.72, '⚡', { fontSize: '22px' }).setOrigin(0.5).setAlpha(alpha);

    this.add.text(w * 0.64, h * 0.85, 'YUM', { fontSize: '9px', color: '#4895ef' }).setOrigin(0.5).setAlpha(alpha);
    this.add.text(w * 0.78, h * 0.85, 'TEK', { fontSize: '9px', color: '#4895ef' }).setOrigin(0.5).setAlpha(alpha);
    this.add.text(w * 0.92, h * 0.85, 'ÖZEL', { fontSize: '9px', color: '#4895ef' }).setOrigin(0.5).setAlpha(alpha);

    this.add.text(w * 0.78, h * 0.95, '← Swipe → Hareket', { 
        fontSize: '9px', color: '#888888' 
    }).setOrigin(0.5).setAlpha(alpha);
}
update(time, delta) {
    if (!this.roundStarted || this.gameOver) return;

    const dt = delta / 1000;
    const w = GAME_WIDTH;

    // Touch state
    const touch1 = this.touchCtrl?.getState(true)  || {};
    const touch2 = this.touchCtrl?.getState(false) || {};

    // Gamepad state
    this.gamepadCtrl?.update();
    const gp1 = this.gamepadCtrl?.getState(0) || {};
    const gp2 = this.gamepadCtrl?.getState(1) || {};

    // Klavye state
    const kb = this.keys;

    // === P1 Hareket (Klavye VEYA Touch VEYA Gamepad) ===
    const p1Left  = kb.left.isDown  || touch1.left  || gp1.left;
    const p1Right = kb.right.isDown || touch1.right || gp1.right;

    if (p1Left)  this.p1.container.x = Math.max(50, this.p1.container.x - this.p1.speed * dt);
    if (p1Right) this.p1.container.x = Math.min(w-50, this.p1.container.x + this.p1.speed * dt);

    // === P2 Hareket ===
    const p2Left  = kb.p2left.isDown  || touch2.left  || gp2.left;
    const p2Right = kb.p2right.isDown || touch2.right || gp2.right;

    if (p2Left)  this.p2.container.x = Math.max(50, this.p2.container.x - this.p2.speed * dt);
    if (p2Right) this.p2.container.x = Math.min(w-50, this.p2.container.x + this.p2.speed * dt);

    // Yön güncelle
    if (this.p1.container.x < this.p2.container.x) {
        this.p1.container.scaleX = 1; this.p2.container.scaleX = -1;
    } else {
        this.p1.container.scaleX = -1; this.p2.container.scaleX = 1;
    }

    // Cooldown
    if (this.p1cooldown > 0) this.p1cooldown -= delta;
    if (this.p2cooldown > 0) this.p2cooldown -= delta;

    // === P1 Saldırı ===
    if (this.p1cooldown <= 0) {
        if (Phaser.Input.Keyboard.JustDown(kb.punch) || touch1.punch || gp1.punch) {
            this.attack(this.p1, this.p2, 'punch'); this.p1cooldown = 500;
        } else if (Phaser.Input.Keyboard.JustDown(kb.kick) || touch1.kick || gp1.kick) {
            this.attack(this.p1, this.p2, 'kick'); this.p1cooldown = 700;
        } else if (Phaser.Input.Keyboard.JustDown(kb.special) || touch1.special || gp1.special) {
            this.attack(this.p1, this.p2, 'special'); this.p1cooldown = 1200;
        }
    }

    // === P2 Saldırı ===
    if (this.p2cooldown <= 0) {
        if (Phaser.Input.Keyboard.JustDown(kb.p2punch) || touch2.punch || gp2.punch) {
            this.attack(this.p2, this.p1, 'punch'); this.p2cooldown = 500;
        } else if (Phaser.Input.Keyboard.JustDown(kb.p2kick) || touch2.kick || gp2.kick) {
            this.attack(this.p2, this.p1, 'kick'); this.p2cooldown = 700;
        } else if (Phaser.Input.Keyboard.JustDown(kb.p2special) || touch2.special || gp2.special) {
            this.attack(this.p2, this.p1, 'special'); this.p2cooldown = 1200;
        }
    }

    this.updateHPBars();
}
