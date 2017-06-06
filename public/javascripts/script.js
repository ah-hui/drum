/**
 * 电子鼓软件V0.1：
 *  -支持5鼓3镲，共*种音色；
 *  -支持最细十六分音符，更细音符将自动算法转换；可以读取更细音符的dtx，算法完成不完全转换（(音符位置/总长度)*16注意查重）
 *  -
 * 注：1.如果连接电子鼓请自行解决按键映射问题
 */

// inner variables
var bgCanvas, bgCtx, fgCanvas, fgCtx, efCanvas, efCtx;
var gameStatus;
var gameStart, gameTimer, anime, elapsed = min = sec = 0;
var points = perfectHits = goodHits = missHits = 0;

var CANVAS_WIDTH, CANVAS_HEIGHT, FPS = 60,
    SPACING = 5,
    LANE_WIDTH = 80,
    LANE_HEIGHT = 600,
    ROUND_RADIUS = 5;

var crash, ride, hi_hat, snare, tom1, tom2, tom3, kick;
var crashAnime, rideAnime, hi_hatAnime, snareAnime, tom1Anime, tom2Anime, tom3Anime, kickAnime;
var sounds = [];
var ANIME_DY = 4;
var hi_hatStatus = true; // false:open,true:close

var lastHit; // 最后一次敲击的乐器

var land;
var lanes;
var background;
var testNote;

// objects:
// 音符
function Note(x, y, w, h, dx, dy, img) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.dx = dx;
    this.dy = dy;
    this.img = img;
}
// 音符泳道
function Lane(type, x, y, w, h) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.notes = [];
    this.foremost;
}
// 音符hit判定
function Land(type, x, y, w, h) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}
//乐器
function Instrument(type, x, y, w, h, img) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.img = img;
    this.types = ["Crash", "Hi-hat", "Snare", "Tom1", "Tom2", "Tom3", "Kick", "Ride"]; // all types
}
// 背景图
function Background(x, y, w, h, dx, dy, img) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.dx = dx;
    this.dy = dy;
    this.img = img;
}

// functions:

CanvasRenderingContext2D.prototype.fillRoundRect = function(x, y, w, h, r) {
    if (w < 2 * r) { r = w / 2; }
    if (h < 2 * r) { r = h / 2; }
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
}

function clear() {
    // clear fg
    fgCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // fill fg background - 全透明
    fgCtx.fillStyle = "rgba(0,0,0,0)";
    fgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // draw fg background img - 半透明
    fgCtx.globalAlpha = 0.2;
    fgCtx.drawImage(background.img, background.x, background.y, background.w, background.h);
    fgCtx.drawImage(background.img, background.x, background.y - background.h, background.w, background.h);
    fgCtx.globalAlpha = 1;
    // fg background y-scroll
    background.y += background.dy;
    if (background.y > CANVAS_HEIGHT) {
        background.y = background.y - background.h;
    }
    // 游戏开始第一次渲染,渲染不重绘部分
    if (!gameStatus) {
        // fill ef background - 不透明
        bgCtx.fillStyle = "rgb(16,16,16)";
        bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // fill bg lanes background
        for (var i = 0; i < 8; i++) {
            bgCtx.fillStyle = "rgb(215,215,215)";
            bgCtx.fillRoundRect((i + 1) * SPACING + SPACING + i * LANE_WIDTH, 2 * SPACING, LANE_WIDTH, CANVAS_HEIGHT - 4 * SPACING, ROUND_RADIUS).fill();
            bgCtx.font = '16px Verdana';
            bgCtx.fillStyle = '#fff';
            bgCtx.fillText(crash.types[i], (i + 1) * SPACING + SPACING + i * LANE_WIDTH + 3 * SPACING, CANVAS_HEIGHT / 2);
        }
        // fill bg land
        bgCtx.fillStyle = '#666';
        bgCtx.fillRect(land.x, land.y, land.w, land.h);
        bgCtx.fillStyle = '#FFF';
        bgCtx.fillRect(land.x, land.y, land.w, 2);

        // fill ef background - 全透明
        efCtx.fillStyle = "rgba(0,0,0,0)";
        efCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // fill ef
        efCtx.drawImage(crash.img, crash.x, crash.y, crash.w, crash.h);
        efCtx.drawImage(hi_hat.img, hi_hat.x, hi_hat.y, hi_hat.w, hi_hat.h);
        efCtx.drawImage(snare.img, snare.x, snare.y, snare.w, snare.h);
        efCtx.drawImage(tom1.img, tom1.x, tom1.y, tom1.w, tom1.h);
        efCtx.drawImage(tom2.img, tom2.x, tom2.y, tom2.w, tom2.h);
        efCtx.drawImage(tom3.img, tom3.x, tom3.y, tom3.w, tom3.h);
        efCtx.drawImage(kick.img, kick.x, kick.y, kick.w, kick.h);
        efCtx.drawImage(ride.img, ride.x, ride.y, ride.w, ride.h);

        //非重绘部分绘制完毕
        gameStatus = true;
    }
}

function drawScene() {
    clear();

    // draw lanes

    // test draw a note
    fgCtx.fillStyle = 'white';
    fgCtx.fillRoundRect(testNote.x, testNote.y, testNote.w, testNote.h, ROUND_RADIUS).fill();

    testNote.x += testNote.dx;
    testNote.y += testNote.dy;

    fgCtx.font = '16px Verdana';
    fgCtx.fillStyle = '#fff';
    min = Math.floor(elapsed / 60);
    sec = elapsed % 60;
    if (min < 10) min = "0" + min;
    if (sec < 10) sec = "0" + sec;
    fgCtx.fillText('Time: ' + min + ':' + sec, 720, 70);
    fgCtx.fillText('Points: ' + points, 720, 100);

    // show last hit
    fgCtx.fillText('last hit: ' + (lastHit ? lastHit : ""), 720, 130);

    if (testNote.y > (CANVAS_HEIGHT - testNote.h)) {
        clearInterval(gameStart);
        clearInterval(gameTimer);
        clearInterval(anime);
    }

}

function clearAnime() {
    // clear ef
    efCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // fill ef background - 全透明
    efCtx.fillStyle = "rgba(0,0,0,0)";
    efCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawAnime() {
    clearAnime();

    if (crashAnime) {
        crash.y += ANIME_DY;
        if (crash.y > 530) {
            crashAnime = false;
            crash.y = 520;
        }
    }
    if (hi_hatAnime) {
        hi_hat.y += ANIME_DY;
        if (hi_hat.y > 530) {
            hi_hatAnime = false;
            hi_hat.y = 520;
        }
    }
    if (snareAnime) {
        snare.y += ANIME_DY;
        if (snare.y > 530) {
            snareAnime = false;
            snare.y = 520;
        }
    }
    if (tom1Anime) {
        tom1.y += ANIME_DY;
        if (tom1.y > 530) {
            tom1Anime = false;
            tom1.y = 520;
        }
    }
    if (tom2Anime) {
        tom2.y += ANIME_DY;
        if (tom2.y > 530) {
            tom2Anime = false;
            tom2.y = 520;
        }
    }
    if (tom3Anime) {
        tom3.y += ANIME_DY;
        if (tom3.y > 530) {
            tom3Anime = false;
            tom3.y = 520;
        }
    }
    if (kickAnime) {
        kick.y += ANIME_DY;
        if (kick.y > 530) {
            kickAnime = false;
            kick.y = 520;
        }
    }
    if (rideAnime) {
        ride.y += ANIME_DY;
        if (ride.y > 530) {
            rideAnime = false;
            ride.y = 520;
        }
    }
    // fill ef
    efCtx.drawImage(crash.img, crash.x, crash.y, crash.w, crash.h);

    if (hi_hatStatus) { // close
        efCtx.fillStyle = "rgba(0,215,0,0.5)";
        efCtx.fillRoundRect(hi_hat.x, hi_hat.y, hi_hat.w, hi_hat.h, ROUND_RADIUS).fill();
        efCtx.font = '16px Verdana';
        efCtx.fillStyle = '#fff';
        efCtx.fillText('C', hi_hat.x + 5, hi_hat.y + 15);
    } else { // open
        efCtx.font = '16px Verdana';
        efCtx.fillStyle = '#fff';
        efCtx.fillText('O', hi_hat.x + 5, hi_hat.y + 15);
    }
    efCtx.drawImage(hi_hat.img, hi_hat.x, hi_hat.y, hi_hat.w, hi_hat.h);
    efCtx.drawImage(snare.img, snare.x, snare.y, snare.w, snare.h);
    efCtx.drawImage(tom1.img, tom1.x, tom1.y, tom1.w, tom1.h);
    efCtx.drawImage(tom2.img, tom2.x, tom2.y, tom2.w, tom2.h);
    efCtx.drawImage(tom3.img, tom3.x, tom3.y, tom3.w, tom3.h);
    efCtx.drawImage(kick.img, kick.x, kick.y, kick.w, kick.h);
    efCtx.drawImage(ride.img, ride.x, ride.y, ride.w, ride.h);
}

function crashHit() {
    lastHit = "crash hit !";
    if (crashAnime) { // 重置动画
        crash.y = 520;
    }
    crashAnime = true;
}

function rideHit() {
    lastHit = "ride hit !";
    if (rideAnime) { // 重置动画
        ride.y = 520;
    }
    rideAnime = true;
}

function hi_hatHit() {
    if (hi_hatStatus) {
        lastHit = "hi_hat close hit !";
    } else {
        lastHit = "hi_hat open hit !";
    }
    if (hi_hatAnime) { // 重置动画
        hi_hat.y = 520;
    }
    hi_hatAnime = true;

}

function snareHit() {
    lastHit = "snare hit !";
    if (snareAnime) { // 重置动画
        snare.y = 520;
    }
    snareAnime = true;
}

function tom1Hit() {
    lastHit = "tom1 hit !";
    if (tom1Anime) { // 重置动画
        tom1.y = 520;
    }
    tom1Anime = true;
}

function tom2Hit() {
    lastHit = "tom2 hit !";
    if (tom2Anime) { // 重置动画
        tom2.y = 520;
    }
    tom2Anime = true;
}

function tom3Hit() {
    lastHit = "tom3 hit !";
    if (tom3Anime) { // 重置动画
        tom3.y = 520;
    }
    tom3Anime = true;
}

function kickHit() {
    lastHit = "kick hit !";
    if (kickAnime) { // 重置动画
        kick.y = 520;
    }
    kickAnime = true;
}

function check() {
    testNote.y = 0;
}

//init
$(function() {
    // 背景层 - 不重绘
    bgCanvas = $("#bg")[0];
    bgCtx = bgCanvas.getContext("2d");
    // 前景层 - 舞台
    fgCanvas = $("#fg")[0];
    fgCtx = fgCanvas.getContext("2d");
    // 效果层
    efCanvas = $("#ef")[0];
    efCtx = efCanvas.getContext("2d");

    CANVAS_WIDTH = bgCanvas.width;
    CANVAS_HEIGHT = bgCanvas.height;

    console.log("width:" + CANVAS_WIDTH + "-height:" + CANVAS_HEIGHT);

    // 图片加载和对应对象声明
    var bkImg = new Image();
    bkImg.src = 'images/play/background.jpg';
    background = new Background(0, 0, 695, 600, 0, 1, bkImg);
    var crashImg = new Image();
    crashImg.src = 'images/play/crash.png';
    crash = new Instrument(1, 10, 520, 80, 60, crashImg);
    var hi_hatImg = new Image();
    hi_hatImg.src = 'images/play/hi_hat.png';
    hi_hat = new Instrument(3, 15 + 1 * LANE_WIDTH, 520, 80, 60, hi_hatImg);
    var snareImg = new Image();
    snareImg.src = 'images/play/snare.png';
    snare = new Instrument(5, 20 + 2 * LANE_WIDTH, 520, 80, 60, snareImg);
    var tom1Img = new Image();
    tom1Img.src = 'images/play/tom.png';
    tom1 = new Instrument(6, 25 + 3 * LANE_WIDTH, 520, 80, 60, tom1Img);
    var tom2Img = new Image();
    tom2Img.src = 'images/play/tom.png';
    tom2 = new Instrument(7, 30 + 4 * LANE_WIDTH, 520, 80, 60, tom2Img);
    var tom3Img = new Image();
    tom3Img.src = 'images/play/tom.png';
    tom3 = new Instrument(8, 35 + 5 * LANE_WIDTH, 520, 80, 60, tom3Img);
    var kickImg = new Image();
    kickImg.src = 'images/play/kick.png';
    kick = new Instrument(9, 40 + 6 * LANE_WIDTH, 520, 80, 60, kickImg);
    var rideImg = new Image();
    rideImg.src = 'images/play/ride.png';
    ride = new Instrument(2, 45 + 7 * LANE_WIDTH, 520, 80, 60, rideImg);

    // 声音加载
    sounds[0] = new Audio('media/snd1.wav');
    sounds[0].volume = 0.9;

    testNote = new Note(10, 20, 80, 20, 0, 1, null);
    land = new Land(0, 0, 500, 695, 15);

    // 开始重绘
    gameStatus = false; // 目前只用来做不重绘部分的渲染
    gameStart = setInterval(drawScene, 1000 / FPS); // loop drawScene
    gameTimer = setInterval(countTimer, 1000); // inner game timer
    anime = setInterval(drawAnime, 1000 / FPS); // ef anime loop

    // 事件监听
    $(window).keydown(function(event) { // keyboard-down
        switch (event.keyCode) {
            case CONFIG.CRASH_KEY:
                crashHit();
                break;
            case CONFIG.RIDE_KEY:
                rideHit();
                break;
            case CONFIG.HI_HAT_KEY:
                hi_hatHit();
                break;
            case CONFIG.HI_HAT_CTRL_KEY:
                hi_hatStatus = true; // close
                break;
            case CONFIG.SNARE_KEY:
                snareHit();
                break;
            case CONFIG.TOM1_KEY:
                tom1Hit();
                break;
            case CONFIG.TOM2_KEY:
                tom2Hit();
                break;
            case CONFIG.TOM3_KEY:
                tom3Hit();
                break;
            case CONFIG.KICK_KEY:
                kickHit();
                break;
        }
    });

    $(window).keyup(function(event) { // keyboard-up
        switch (event.keyCode) {
            case CONFIG.HI_HAT_CTRL_KEY:
                hi_hatStatus = false; // open
                break;
        }
    });

});

function countTimer() {
    elapsed++;
}