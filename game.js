// ============================================
// STREET BRAWL - Phaser.js — Tam Birleştirilmiş
// ============================================

const GAME_WIDTH  = 800;
const GAME_HEIGHT = 450;

const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
               || (navigator.maxTouchPoints > 1);
const IS_TV = window.innerWidth >= 1920 && !IS_MOBILE;

// ============================================
// 12 KARAKTER VERİSİ
// ============================================
const CHARACTERS = [
  { id:0,  name:'KARACA',       country:'🇹🇷', style:'Boks',       color:'#e63946', hp:100, speed:200, power:15 },
  { id:1,  name:'KOW LOON',     country:'🇭🇰', style:'Kung Fu',    color:'#ffd700', hp:90,  speed:240, power:13 },
  { id:2,  name:'SILVA',        country:'🇧🇷', style:'Jiujitsu',   color:'#2dc653', hp:95,  speed:210, power:14 },
  { id:3,  name:'JAE HOON',     country:'🇰🇷', style:'Taekwondo',  color:'#4895ef', hp:88,  speed:260, power:12 },
  { id:4,  name:'RYO TANAKA',   country:'🇯🇵', style:'Karate',     color:'#ffffff', hp:92,  speed:230, power:13 },
  { id:5,  name:'MARCUS',       country:'🇺🇸', style:'Sokak',      color:'#ff6b35', hp:105, speed:190, power:17 },
  { id:6,  name:'PRIYA DEVI',   country:'🇮🇳', style:'Kalaripay.', color:'#ff9f1c', hp:87,  speed:255, power:12 },
  { id:7,  name:'HASSAN',       country:'🇪🇬', style:'Muay Thai',  color:'#a8dadc', hp:98,  speed:215, power:15 },
  { id:8,  name:'ELENA VOSS',   country:'🇩🇪', style:'Kickboks',   color:'#e63946', hp:91,  speed:235, power:14 },
  { id:9,  name:'ISABEL FUEGO', country:'🇪🇸', style:'Capoeira',   color:'#f4d35e', hp:86,  speed:265, power:11 },
  { id:10, name:'NKECHI STORM', country:'🇳🇬', style:'Dambe',      color:'#06d6a0', hp:100, speed:205, power:16 },
  { id:11, name:'VIKTOR KROV',  country:'🇷🇺', style:'Sambo',      color:'#6c757d', hp:110, speed:180, power:18 },
];

const ARENA_COLORS = [
  0x8B0000, 0x1a0a00, 0x003200, 0x0d0030,
  0x1a0014, 0x0a0a0a, 0x2d1b00, 0x1a1400,
  0x1a0000, 0x1a1500, 0x001a0a, 0x0d0d1a,
];

// ============================================
// TOUCH CONTROLLER
// ============================================
class TouchController {
    constructor(scene) {
        this.scene = scene;
        this.swipeThreshold = 30;
        this.tapThreshold   = 200;
        this.p1 = { left:false, right:false, punch:false, kick:false, special:false };
        this.p2 = { left:false, right:false, punch:false, kick:false, special:false };
        this.touches = {};
        this.setupTouchEvents();
    }

    setupTouchEvents() {
        const canvas = this.scene.sys.game.canvas;
        const w = GAME_WIDTH;

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            Array.from(e.changedTouches).forEach(touch => {
                const gameX = (touch.clientX / canvas.offsetWidth) * w;
                this.touches[touch.identifier] = {
                    startX: gameX,
                    startY: touch.clientY,
                    startTime: Date.now(),
                    isLeft: gameX < w / 2
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
                if (Math.abs(dx) > this.swipeThreshold) {
                    player.left  = dx < 0;
                    player.right = dx > 0;
                } else {
                    player.left  = false;
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

                player.left  = false;
                player.right = false;

                if (dx < 20 && dy < 20 && dt < this.tapThreshold) {
                    const relX = gameX / w;
                    if (t.isLeft) {
                        if      (relX < 0.17) this.triggerAttack(player, 'punch');
                        else if (relX < 0.34) this.triggerAttack(player, 'kick');
                        else                  this.triggerAttack(player, 'special');
                    } else {
                        if      (relX < 0.67) this.triggerAttack(player, 'punch');
                        else if (relX < 0.84) this.triggerAttack(player, 'kick');
                        else                  this.triggerAttack(player, 'special');
                    }
                }

                if (dx > 80 && dt < 300) {
                    this.triggerAttack(player, 'special');
                }

                delete this.touches[touch.identifier];
            });
        }, { passive: false });
    }

    triggerAttack(player, type) {
        player[type] = true;
        setTimeout(() => { player[type] = false; }, 100);
    }

    getState(isP1) {
        return isP1 ? this.p1 : this.p2;
    }
}

// ============================================
// GAMEPAD CONTROLLER
// ============================================
class GamepadController {
    constructor(scene) {
        this.scene = scene;
        this.pads = [null, null];
        this.prevButtons = [[], []];
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
        if (!pad) return {};
        const axes = pad.axes;
        const btns = pad.buttons;
        const prev = this.prevButtons[playerIndex];
        const justPressed = (i) => btns[i]?.pressed && !prev[i];
        this.prevButtons[playerIndex] = btns.map(b => b?.pressed || false);
        return {
            left:    btns[14]?.pressed || axes[0] < -0.5,
            right:   btns[15]?.pressed || axes[0] >  0.5,
            punch:   justPressed(0),
            kick:    justPressed(2),
            special: justPressed(1),
            confirm: justPressed(0),
        };
    }
}

// ============================================
// SCENE 1: MENU
// ============================================
class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }

    create() {
        const w = GAME_WIDTH, h = GAME_HEIGHT;

        this.add.rectangle(w/2, h/2, w, h, 0x0a0a0a);

        const g = this.add.graphics();
        g.lineStyle(1, 0x333333, 0.5);
        for (let i = 0; i < w; i += 40) g.lineBetween(i, 0, i, h);
        for (let i = 0; i < h; i += 40) g.lineBetween(0, i, w, i);

        this.add.text(w/2, h/2 - 80, 'STREET', {
            fontSize: '72px', fontFamily: 'Impact, Arial Black',
            color: '#ffffff', stroke: '#e63946', strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(w/2, h/2 - 10, 'BRAWL', {
            fontSize: '72px', fontFamily: 'Impact, Arial Black',
            color: '#e63946', stroke: '#ffffff', strokeThickness: 4
        }).setOrigin(0.5);

        const blinkText = this.add.text(w/2, h/2 + 80,
            IS_MOBILE ? '▶  EKRANA DOKUN' : '▶  OYNAMAK İÇİN TIKLA', {
            fontSize: '18px', fontFamily: 'Arial', color: '#ffd700'
        }).setOrigin(0.5);

        this.tweens.add({ targets: blinkText, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

        this.add.text(w/2, h - 30, '12 SAVAŞÇI  •  2 ROUND  •  DÜNYA ARENALARI', {
            fontSize: '11px', fontFamily: 'Arial', color: '#666666'
        }).setOrigin(0.5);

        this.input.on('pointerdown', () => this.scene.start('SelectScene', { player: 1, p1char: null }));
        this.input.keyboard.on('keydown', () => this.scene.start('SelectScene', { player: 1, p1char: null }));
    }
}

// ============================================
// SCENE 2: CHARACTER SELECT
// ============================================
class SelectScene extends Phaser.Scene {
    constructor() { super({ key: 'SelectScene' }); }

    init(data) {
        this.selectingPlayer = data.player || 1;
        this.p1char = data.p1char !== undefined ? data.p1char : null;
        this.selected = 0;
    }

    create() {
        const w = GAME_WIDTH, h = GAME_HEIGHT;

        this.add.rectangle(w/2, h/2, w, h, 0x050510);

        const playerColor = this.selectingPlayer === 1 ? '#e63946' : '#4895ef';
        this.add.text(w/2, 25, `PLAYER ${this.selectingPlayer} — SAVAŞÇINI SEÇ`, {
            fontSize: '18px', fontFamily: 'Impact, Arial Black', color: playerColor
        }).setOrigin(0.5);

        this.cards = [];
        const cols = 4;
        const cardW = 160, cardH = 100;
        const startX = (w - cols * cardW) / 2 + cardW / 2;
        const startY = 65;

        CHARACTERS.forEach((char, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * cardW;
            const y = startY + row * cardH;

            const bg = this.add.rectangle(x, y, cardW - 8, cardH - 8, 0x111122)
                .setStrokeStyle(2, 0x333355)
                .setInteractive()
                .on('pointerover',  () => this.selectChar(i))
                .on('pointerdown',  () => this.confirmChar(i));

            this.add.rectangle(x, y - 18, cardW - 16, 40,
                parseInt(char.color.replace('#', '0x'))).setAlpha(0.3);

            this.add.text(x, y - 18, char.name, {
                fontSize: '11px', fontFamily: 'Impact',
                color: char.color, align: 'center'
            }).setOrigin(0.5);

            this.add.text(x, y + 8, `${char.country} ${char.style}`, {
                fontSize: '10px', fontFamily: 'Arial',
                color: '#aaaaaa', align: 'center'
            }).setOrigin(0.5);

            const barW = cardW - 24;
            this.add.rectangle(x, y + 30, barW, 6, 0x222222);
            this.add.rectangle(
                x - barW / 2 + (char.hp / 110 * barW) / 2,
                y + 30,
                char.hp / 110 * barW, 6, 0x2dc653
            );

            this.cards.push({ bg, char, x, y });
        });

        this.selectBox = this.add.rectangle(0, 0, cardW - 4, cardH - 4, 0x000000, 0)
            .setStrokeStyle(3, 0xffd700);

        this.selectChar(0);

        this.add.text(w/2, h - 15,
            IS_MOBILE ? 'Kartına dokun ve seç' : 'MOUSE ile seç ve tıkla  •  Ok tuşları + ENTER', {
            fontSize: '10px', fontFamily: 'Arial', color: '#555555'
        }).setOrigin(0.5);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-ENTER', () => this.confirmChar(this.selected));

        // Ok tuşlarıyla gezinme
        this.input.keyboard.on('keydown-LEFT',  () => this.selectChar(Math.max(0, this.selected - 1)));
        this.input.keyboard.on('keydown-RIGHT', () => this.selectChar(Math.min(11, this.selected + 1)));
        this.input.keyboard.on('keydown-UP',    () => this.selectChar(Math.max(0, this.selected - 4)));
        this.input.keyboard.on('keydown-DOWN',  () => this.selectChar(Math.min(11, this.selected + 4)));
    }

    selectChar(index) {
        this.selected = index;
        const card = this.cards[index];
        this.selectBox.setPosition(card.x, card.y);
    }

    confirmChar(index) {
        if (this.selectingPlayer === 1) {
            this.scene.start('SelectScene', { player: 2, p1char: index });
        } else {
            this.scene.start('FightScene', {
                p1char: this.p1char,
                p2char: index,
                round: 1,
                p1wins: 0,
                p2wins: 0
            });
        }
    }
}

// ============================================
// SCENE 3: FIGHT
// ============================================
class FightScene extends Phaser.Scene {
    constructor() { super({ key: 'FightScene' }); }

    init(data) {
        this.p1Data       = CHARACTERS[data.p1char];
        this.p2Data       = CHARACTERS[data.p2char];
        this.p1charIndex  = data.p1char;
        this.p2charIndex  = data.p2char;
        this.currentRound = data.round  || 1;
        this.p1wins       = data.p1wins || 0;
        this.p2wins       = data.p2wins || 0;
        this.arenaColor   = ARENA_COLORS[data.p1char];
    }

    create() {
        const w = GAME_WIDTH, h = GAME_HEIGHT;
        this.gameOver     = false;
        this.roundStarted = false;
        this.p1cooldown   = 0;
        this.p2cooldown   = 0;

        // --- ARENA ---
        this.add.rectangle(w/2, h/2, w, h, this.arenaColor);
        this.add.rectangle(w/2, h - 40, w, 80, 0x111111);
        this.add.rectangle(w/2, h - 80, w, 4, 0x444444);

        const wallGfx = this.add.graphics();
        wallGfx.fillStyle(0x000000, 0.4);
        wallGfx.fillRect(0, 0, w, h - 84);

        for (let i = 0; i < 5; i++) {
            const nc = [0xe63946, 0xffd700, 0x4895ef, 0x2dc653, 0xff6b35][i];
            const ng = this.add.graphics();
            ng.fillStyle(nc, 0.08);
            ng.fillRect(i * (w / 5), 0, w / 5, h);
        }

        // --- FİGHTERLAR ---
        this.p1 = this.createFighter(150,     h - 85, this.p1Data, true);
        this.p2 = this.createFighter(w - 150, h - 85, this.p2Data, false);

        // --- HUD ---
        this.createHUD();

        // --- MOBİL HİNTLER ---
        this.createMobileHints();

        // --- KONTROLLER ---
        this.keys = this.input.keyboard.addKeys({
            left:     Phaser.Input.Keyboard.KeyCodes.LEFT,
            right:    Phaser.Input.Keyboard.KeyCodes.RIGHT,
            punch:    Phaser.Input.Keyboard.KeyCodes.A,
            kick:     Phaser.Input.Keyboard.KeyCodes.S,
            special:  Phaser.Input.Keyboard.KeyCodes.D,
            p2left:   Phaser.Input.Keyboard.KeyCodes.J,
            p2right:  Phaser.Input.Keyboard.KeyCodes.L,
            p2punch:  Phaser.Input.Keyboard.KeyCodes.Z,
            p2kick:   Phaser.Input.Keyboard.KeyCodes.X,
            p2special:Phaser.Input.Keyboard.KeyCodes.C,
        });

        // --- TOUCH & GAMEPAD INIT ---
        this.touchCtrl  = new TouchController(this);
        this.gamepadCtrl = new GamepadController(this);

        // --- TIMER ---
        this.timeLeft = 60;
        this.timerEvent = this.time.addEvent({
            delay: 1000, loop: true,
            callback: () => {
                if (!this.roundStarted || this.gameOver) return;
                this.timeLeft--;
                this.timerText.setText(this.timeLeft);
                if (this.timeLeft <= 0) this.endRound();
            }
        });

        // --- ROUND ANNOUNCE ---
        this.showRoundAnnounce();
    }

    // ----------------------------------------
    createFighter(x, y, charData, isLeft) {
        const g = this.add.graphics();
        const col = parseInt(charData.color.replace('#', '0x'));

        g.fillStyle(col, 1);
        g.fillRect(-20, -80, 40, 50);
        g.fillStyle(0xf4a261, 1);
        g.fillCircle(0, -95, 18);
        g.fillStyle(col, 0.8);
        g.fillRect(-18, -30, 16, 35);
        g.fillRect(2,   -30, 16, 35);
        g.fillRect(-35, -78, 15, 30);
        g.fillRect(20,  -78, 15, 30);

        const container = this.add.container(x, y, [g]);
        container.setScale(isLeft ? 1 : -1, 1);

        return {
            container,
            hp: charData.hp,
            maxHp: charData.hp,
            speed: charData.speed,
            power: charData.power,
            isLeft,
            data: charData,
        };
    }

    // ----------------------------------------
    createHUD() {
        const w = GAME_WIDTH;

        this.add.rectangle(210,     22, 340, 18, 0x333333).setOrigin(1, 0.5);
        this.p1HpBar = this.add.rectangle(40, 22, 320, 14, 0xe63946).setOrigin(0, 0.5);

        this.add.rectangle(w - 210, 22, 340, 18, 0x333333).setOrigin(0, 0.5);
        this.p2HpBar = this.add.rectangle(w - 40, 22, 320, 14, 0x4895ef).setOrigin(1, 0.5);

        this.add.text(40,     40, this.p1Data.name, {
            fontSize: '12px', fontFamily: 'Impact', color: this.p1Data.color
        });
        this.add.text(w - 40, 40, this.p2Data.name, {
            fontSize: '12px', fontFamily: 'Impact', color: this.p2Data.color
        }).setOrigin(1, 0);

        this.timerText = this.add.text(w/2, 20, '60', {
            fontSize: '28px', fontFamily: 'Impact',
            color: '#ffd700', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);

        this.add.text(w/2, 45, `ROUND ${this.currentRound}`, {
            fontSize: '11px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0.5);

        for (let i = 0; i < this.p1wins; i++)
            this.add.circle(60 + i * 18, 55, 6, 0xe63946);
        for (let i = 0; i < this.p2wins; i++)
            this.add.circle(w - 60 - i * 18, 55, 6, 0x4895ef);

        if (!IS_MOBILE) {
            this.add.text(10, GAME_HEIGHT - 20,
                'P1: ←→ Hareket  A: Yumruk  S: Tekme  D: Özel', {
                fontSize: '9px', fontFamily: 'Arial', color: '#555555'
            });
            this.add.text(w - 10, GAME_HEIGHT - 20,
                'P2: J/L Hareket  Z: Yumruk  X: Tekme  C: Özel', {
                fontSize: '9px', fontFamily: 'Arial', color: '#555555', align: 'right'
            }).setOrigin(1, 1);
        }
    }

    // ----------------------------------------
    createMobileHints() {
        if (!IS_MOBILE) return;

        const w = GAME_WIDTH, h = GAME_HEIGHT;
        const alpha = 0.5;

        const p1Zone = this.add.graphics();
        p1Zone.fillStyle(0xe63946, 0.08);
        p1Zone.fillRect(0, h * 0.55, w * 0.5, h * 0.45);
        p1Zone.lineStyle(1, 0xe63946, 0.3);
        p1Zone.strokeRect(0, h * 0.55, w * 0.5, h * 0.45);

        const p2Zone = this.add.graphics();
        p2Zone.fillStyle(0x4895ef, 0.08);
        p2Zone.fillRect(w * 0.5, h * 0.55, w * 0.5, h * 0.45);
        p2Zone.lineStyle(1, 0x4895ef, 0.3);
        p2Zone.strokeRect(w * 0.5, h * 0.55, w * 0.5, h * 0.45);

        // P1 ikonlar
        this.add.text(w*0.08, h*0.72, '👊', { fontSize:'22px' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.22, h*0.72, '🦵', { fontSize:'22px' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.36, h*0.72, '⚡', { fontSize:'22px' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.08, h*0.85, 'YUM',  { fontSize:'9px', color:'#e63946' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.22, h*0.85, 'TEK',  { fontSize:'9px', color:'#e63946' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.36, h*0.85, 'ÖZEL', { fontSize:'9px', color:'#e63946' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.22, h*0.95, '← Swipe → Hareket', { fontSize:'9px', color:'#888888' }).setOrigin(0.5).setAlpha(alpha);

        // P2 ikonlar
        this.add.text(w*0.64, h*0.72, '👊', { fontSize:'22px' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.78, h*0.72, '🦵', { fontSize:'22px' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.92, h*0.72, '⚡', { fontSize:'22px' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.64, h*0.85, 'YUM',  { fontSize:'9px', color:'#4895ef' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.78, h*0.85, 'TEK',  { fontSize:'9px', color:'#4895ef' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.92, h*0.85, 'ÖZEL', { fontSize:'9px', color:'#4895ef' }).setOrigin(0.5).setAlpha(alpha);
        this.add.text(w*0.78, h*0.95, '← Swipe → Hareket', { fontSize:'9px', color:'#888888' }).setOrigin(0.5).setAlpha(alpha);
    }

    // ----------------------------------------
    showRoundAnnounce() {
        const w = GAME_WIDTH, h = GAME_HEIGHT;

        const overlay   = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.7);
        const roundText = this.add.text(w/2, h/2 - 20, `ROUND ${this.currentRound}`, {
            fontSize: '56px', fontFamily: 'Impact',
            color: '#ffd700', stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5).setAlpha(0);

        const fightText = this.add.text(w/2, h/2 + 50, 'DÖVÜŞ!', {
            fontSize: '32px', fontFamily: 'Impact',
            color: '#e63946', stroke: '#fff', strokeThickness: 3
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: [overlay, roundText], alpha: 1, duration: 400,
            onComplete: () => {
                this.time.delayedCall(800, () => {
                    this.tweens.add({
                        targets: fightText, alpha: 1, scaleX: 1.3, scaleY: 1.3, duration: 300,
                        onComplete: () => {
                            this.time.delayedCall(600, () => {
                                this.tweens.add({
                                    targets: [overlay, roundText, fightText],
                                    alpha: 0, duration: 400,
                                    onComplete: () => {
                                        overlay.destroy();
                                        roundText.destroy();
                                        fightText.destroy();
                                        this.roundStarted = true;
                                    }
                                });
                            });
                        }
                    });
                });
            }
        });
    }

    // ----------------------------------------
    update(time, delta) {
        if (!this.roundStarted || this.gameOver) return;

        const dt = delta / 1000;
        const w  = GAME_WIDTH;

        const touch1 = this.touchCtrl.getState(true);
        const touch2 = this.touchCtrl.getState(false);

        this.gamepadCtrl.update();
        const gp1 = this.gamepadCtrl.getState(0);
        const gp2 = this.gamepadCtrl.getState(1);

        const kb = this.keys;

        // P1 Hareket
        const p1Left  = kb.left.isDown  || touch1.left  || gp1.left;
        const p1Right = kb.right.isDown || touch1.right || gp1.right;
        if (p1Left)  this.p1.container.x = Math.max(50,    this.p1.container.x - this.p1.speed * dt);
        if (p1Right) this.p1.container.x = Math.min(w - 50, this.p1.container.x + this.p1.speed * dt);

        // P2 Hareket
        const p2Left  = kb.p2left.isDown  || touch2.left  || gp2.left;
        const p2Right = kb.p2right.isDown || touch2.right || gp2.right;
        if (p2Left)  this.p2.container.x = Math.max(50,    this.p2.container.x - this.p2.speed * dt);
        if (p2Right) this.p2.container.x = Math.min(w - 50, this.p2.container.x + this.p2.speed * dt);

        // Yön güncelle
        if (this.p1.container.x < this.p2.container.x) {
            this.p1.container.scaleX =  1;
            this.p2.container.scaleX = -1;
        } else {
            this.p1.container.scaleX = -1;
            this.p2.container.scaleX =  1;
        }

        // Cooldown
        if (this.p1cooldown > 0) this.p1cooldown -= delta;
        if (this.p2cooldown > 0) this.p2cooldown -= delta;

        // P1 Saldırı
        if (this.p1cooldown <= 0) {
            if (Phaser.Input.Keyboard.JustDown(kb.punch)   || touch1.punch   || gp1.punch)   { this.attack(this.p1, this.p2, 'punch');   this.p1cooldown = 500;  }
            else if (Phaser.Input.Keyboard.JustDown(kb.kick)    || touch1.kick    || gp1.kick)    { this.attack(this.p1, this.p2, 'kick');    this.p1cooldown = 700;  }
            else if (Phaser.Input.Keyboard.JustDown(kb.special) || touch1.special || gp1.special) { this.attack(this.p1, this.p2, 'special'); this.p1cooldown = 1200; }
        }

        // P2 Saldırı
        if (this.p2cooldown <= 0) {
            if (Phaser.Input.Keyboard.JustDown(kb.p2punch)   || touch2.punch   || gp2.punch)   { this.attack(this.p2, this.p1, 'punch');   this.p2cooldown = 500;  }
            else if (Phaser.Input.Keyboard.JustDown(kb.p2kick)    || touch2.kick    || gp2.kick)    { this.attack(this.p2, this.p1, 'kick');    this.p2cooldown = 700;  }
            else if (Phaser.Input.Keyboard.JustDown(kb.p2special) || touch2.special || gp2.special) { this.attack(this.p2, this.p1, 'special'); this.p2cooldown = 1200; }
        }

        this.updateHPBars();
    }

    // ----------------------------------------
    attack(attacker, defender, type) {
        const dist  = Math.abs(attacker.container.x - defender.container.x);
        const range = type === 'special' ? 160 : type === 'kick' ? 130 : 100;
        if (dist > range) return;

        let dmg = attacker.data.power;
        if (type === 'kick')    dmg = Math.floor(dmg * 1.4);
        if (type === 'special') dmg = Math.floor(dmg * 2.0);
        dmg = Math.floor(dmg * (0.8 + Math.random() * 0.4));

        defender.hp = Math.max(0, defender.hp - dmg);

        this.showHitEffect(defender.container.x, defender.container.y - 60, dmg, type);
        this.cameras.main.shake(80, 0.005 * (type === 'special' ? 3 : 1));

        const pushDir = defender.container.x > attacker.container.x ? 1 : -1;
        defender.container.x = Phaser.Math.Clamp(
            defender.container.x + pushDir * (type === 'special' ? 40 : 20),
            50, GAME_WIDTH - 50
        );

        if (defender.hp <= 0) this.endRound();
    }

    // ----------------------------------------
    showHitEffect(x, y, dmg, type) {
        const colors = { punch: '#ffffff', kick: '#ffd700', special: '#ff6b35' };
        const labels = { punch: 'HIT!',    kick: 'KICK!',   special: '💥 KO!'  };

        const txt = this.add.text(x, y, `${labels[type]} -${dmg}`, {
            fontSize: type === 'special' ? '20px' : '14px',
            fontFamily: 'Impact', color: colors[type],
            stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);

        this.tweens.add({
            targets: txt, y: y - 50, alpha: 0, duration: 800,
            onComplete: () => txt.destroy()
        });
    }

    // ----------------------------------------
    updateHPBars() {
        const p1R = this.p1.hp / this.p1.maxHp;
        const p2R = this.p2.hp / this.p2.maxHp;

        this.p1HpBar.scaleX = p1R;
        this.p2HpBar.scaleX = p2R;

        this.p1HpBar.setFillStyle(p1R < 0.3 ? 0xff0000 : p1R < 0.6 ? 0xff9900 : 0xe63946);
        this.p2HpBar.setFillStyle(p2R < 0.3 ? 0xff0000 : p2R < 0.6 ? 0xff9900 : 0x4895ef);
    }

    // ----------------------------------------
    endRound() {
        if (this.gameOver) return;
        this.gameOver     = true;
        this.roundStarted = false;

        const winner = this.p1.hp <= 0 ? 'p2'
                     : this.p2.hp <= 0 ? 'p1'
                     : this.p1.hp >= this.p2.hp ? 'p1' : 'p2';

        const p1wins = this.p1wins + (winner === 'p1' ? 1 : 0);
        const p2wins = this.p2wins + (winner === 'p2' ? 1 : 0);

        const w = GAME_WIDTH, h = GAME_HEIGHT;
        const isKO = this.p1.hp <= 0 || this.p2.hp <= 0;

        const koText = this.add.text(w/2, h/2, isKO ? 'K.O.!' : 'TIME!', {
            fontSize: '72px', fontFamily: 'Impact',
            color: '#e63946', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: koText, alpha: 1, scaleX: 1.2, scaleY: 1.2, duration: 400,
            onComplete: () => {
                this.time.delayedCall(1200, () => {
                    if (this.currentRound >= 2 || p1wins === 2 || p2wins === 2) {
                        this.scene.start('ResultScene', {
                            p1wins, p2wins,
                            p1char: this.p1charIndex,
                            p2char: this.p2charIndex
                        });
                    } else {
                        this.scene.start('FightScene', {
                            p1char: this.p1charIndex,
                            p2char: this.p2charIndex,
                            round: 2,
                            p1wins, p2wins
                        });
                    }
                });
            }
        });
    }
}

// ============================================
// SCENE 4: RESULT
// ============================================
class ResultScene extends Phaser.Scene {
    constructor() { super({ key: 'ResultScene' }); }

    init(data) {
        this.p1wins  = data.p1wins;
        this.p2wins  = data.p2wins;
        this.p1char  = CHARACTERS[data.p1char];
        this.p2char  = CHARACTERS[data.p2char];
        this.p1charI = data.p1char;
        this.p2charI = data.p2char;
    }

    create() {
        const w = GAME_WIDTH, h = GAME_HEIGHT;
        const winner  = this.p1wins >= this.p2wins ? this.p1char : this.p2char;

        this.add.rectangle(w/2, h/2, w, h, 0x050505);

        const glow = this.add.graphics();
        glow.fillStyle(parseInt(winner.color.replace('#', '0x')), 0.15);
        glow.fillCircle(w/2, h/2, 300);

        this.add.text(w/2, 60, 'KAZANAN!', {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffd700'
        }).setOrigin(0.5);

        const nameText = this.add.text(w/2, h/2 - 30, winner.name, {
            fontSize: '56px', fontFamily: 'Impact',
            color: winner.color, stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0);

        this.add.text(w/2, h/2 + 30, `${winner.country}  ${winner.style}`, {
            fontSize: '20px', fontFamily: 'Arial', color: '#cccccc'
        }).setOrigin(0.5);

        this.add.text(w/2, h/2 + 80,
            `${this.p1char.name}  ${this.p1wins} — ${this.p2wins}  ${this.p2char.name}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#888888'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: nameText, alpha: 1, y: h/2 - 40,
            duration: 600, ease: 'Back.easeOut'
        });

        for (let i = 0; i < 20; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(50, w - 50),
                Phaser.Math.Between(50, h - 50),
                Phaser.Math.Between(2, 5),
                parseInt(winner.color.replace('#', '0x'))
            ).setAlpha(0);

            this.tweens.add({
                targets: star, alpha: { from: 0, to: 0.8 },
                duration: Phaser.Math.Between(300, 800),
                delay: Phaser.Math.Between(0, 1000),
                yoyo: true, repeat: -1
            });
        }

        const replayBtn = this.add.text(w/2, h - 50, '🔄  TEKRAR OYNA', {
            fontSize: '16px', fontFamily: 'Arial',
            color: '#ffd700', backgroundColor: '#222200',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        replayBtn.on('pointerover',  () => replayBtn.setStyle({ color: '#ffffff' }));
        replayBtn.on('pointerout',   () => replayBtn.setStyle({ color: '#ffd700' }));
        replayBtn.on('pointerdown',  () => this.scene.start('MenuScene'));

        this.input.on('pointerdown', () => this.scene.start('MenuScene'));
        this.input.keyboard.on('keydown', () => this.scene.start('MenuScene'));
    }
}

// ============================================
// PHASER BAŞLAT — En sonda olmalı!
// ============================================
const config = {
    type: Phaser.AUTO,
    backgroundColor: '#000000',
    scene: [MenuScene, SelectScene, FightScene, ResultScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        min: { width: 320, height: 180  },
        max: { width: 1920, height: 1080 },
    },
    input: {
        touch:   true,
        mouse:   true,
        keyboard:true,
        gamepad: true,
    }
};

new Phaser.Game(config);
