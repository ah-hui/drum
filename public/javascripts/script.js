/**
 * Drum H5 Ver. 版本1.0.0：
 *  -支持5鼓3镲；
 *  -支持最细十六分音符，更细音符将自动算法转换；可以读取更细音符的dtx，算法完成不完全转换（(音符位置/总长度)*16注意查重）
 *  -非垂直同步-每首歌可能fps不同
 * 注：1.如果连接电子鼓请自行解决按键映射问题
 */

/**
 * 游戏设计原理:
 * 1.每个音符所走的高度h1;
 * 2.规定h1=3.3*h2,其中h2为每个拍子的高度;视觉上更好;
 * 3.setInterval(drawScene, t1);-每t1毫秒重绘;
 * 4.setInterval(generateNote, t2);-每t2毫秒(拍子)产生音符;
 * 5.每拍子的速度=h2/t2=音符下落速度=dy/t1;所以t1=(dy*t2)/h2,dy固定为1;
 */

// inner variables
var dtx, dtxStack;
var bgCanvas, bgCtx, fgCanvas, fgCacheCanvas, fgCacheCtx, fgCtx, efCanvas, efCtx;
var gameStatus;
var gameStart, gameTimer, anime, elapsed = ceil = min = sec = 0;
var points = perfectHits = goodHits = missHits = 0;

var CANVAS_WIDTH, CANVAS_HEIGHT, DRAW_INTERVAL = 1000 / 120,
    GENERATE_INTERVAL,
    SPACING = 5,
    NOTE_WIDTH = LANE_WIDTH = 80,
    NOTE_HEIGHT = 20,
    LANE_HEIGHT = 600,
    ROUND_RADIUS = 5,
    REMOVE_HEIGHT = 550,
    INSTRUMENT_HEIGHT = 525,
    LAND_HEIGHT = 500,
    LAND_WIDTH = 695,
    BAR_HEIGHT;

var crash, ride, hi_hat, snare, tom1, tom2, tom3, kick;
var crashAnime, rideAnime, hi_hatAnime, snareAnime, tom1Anime, tom2Anime, tom3Anime, kickAnime;
var sounds = [];
var ANIME_DY = 1;
var hi_hatStatus = false; // false:open,true:close

var lastHit; // 最后一次敲击的乐器

var land;
var lanes = {};
var barLen = 0;
var barLines = [];
var background;
// var testNote;

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
// 辅助线 - 四分音符为一拍,一拍一线
function BarLine(x, y, w, h, dx, dy, img) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.dx = dx;
    this.dy = dy;
    this.img = img;
}
// 音符泳道
function Lane(type, code, vicecode, x, y, color) {
    this.isEmpty = true;
    this.type = type;
    this.code = code;
    this.vicecode = vicecode; // 副音色code
    this.x = x;
    this.y = y;
    this.color = color;
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
    this.types = ["Crash", "Hi-hat", "Snare", "Kick", "Tom1", "Tom2", "Tom3", "Ride"]; // all types
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
    // this.fillRect(x, y, w, h);
    // return this;
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

    // 绘制辅助线
    var barRemove = []; // 记录消失的辅助线index以便删除
    fgCtx.fillStyle = "white";
    barLines.forEach(function(e, index) {
        fgCtx.fillRect(e.x, e.y, e.w, e.h);
        e.x += e.dx;
        e.y += e.dy;
        if (e.y > LAND_HEIGHT) { // 消失
            barRemove.push(index);
        }
    });
    if (barRemove.length > 0) {
        barRemove.reverse().forEach(function(e) { // 反转后顺序为大->小,无压力删除
            barLines.splice(e, 1); // 从index开始删除1个-splice第三个参数为要添加的元素s
        });
    }
    // draw lanes
    for (var prop in lanes) {
        if (prop === "18") { // 忽略副音色
            continue;
        }
        var lane = lanes[prop];
        if (!lane.isEmpty) {
            var toRemove = []; // 记录消失的音符index以便删除
            fgCtx.fillStyle = lane.color;
            lane.notes.forEach(function(e, index) {
                fgCtx.fillRoundRect(e.x, e.y, e.w, e.h, ROUND_RADIUS).fill();
                e.x += e.dx;
                e.y += e.dy;
                if (e.y > REMOVE_HEIGHT) { // 消失
                    toRemove.push(index);
                }
            });
            if (toRemove.length > 0) {
                toRemove.reverse().forEach(function(e) { // 反转后顺序为大->小,无压力删除
                    lane.notes.splice(e, 1); // 从index开始删除1个-splice第三个参数为要添加的元素s
                });
            }
        }
    }
    // test draw a note
    // fgCtx.fillStyle = 'white';
    // fgCtx.fillRoundRect(testNote.x, testNote.y, testNote.w, testNote.h, ROUND_RADIUS).fill();
    // testNote.x += testNote.dx;
    // testNote.y += testNote.dy;

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

    // if (testNote.y > REMOVE_HEIGHT) {
    //     clearInterval(gameStart);
    //     clearInterval(gameTimer);
    //     clearInterval(anime);
    // }

    // 循环重绘
    // requestAnimationFrame(drawScene);
}

function clearCache() {
    // clear fg
    fgCacheCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 前景舞台缓冲区 - 绘制背景
    // fill fg background - 全透明
    fgCacheCtx.fillStyle = "rgba(0,0,0,0)";
    fgCacheCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // draw fg background img - 半透明
    fgCacheCtx.globalAlpha = 0.2;
    fgCacheCtx.drawImage(background.img, background.x, background.y, background.w, background.h);
    fgCacheCtx.drawImage(background.img, background.x, background.y - background.h, background.w, background.h);
    fgCacheCtx.globalAlpha = 1;

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

function renderCache() {
    fgCtx.drawImage(fgCacheCanvas, 0, 0);
}

function drawSceneCache() {
    clearCache();

    // 绘制辅助线
    var barRemove = []; // 记录消失的辅助线index以便删除
    barLines.forEach(function(e, index) {
        fgCacheCtx.fillStyle = "white";
        fgCacheCtx.fillRect(e.x, e.y, e.w, e.h);
        e.x += e.dx;
        e.y += e.dy;
        if (e.y > LAND_HEIGHT) { // 消失
            barRemove.push(index);
        }
    });
    if (barRemove.length > 0) {
        barRemove.reverse().forEach(function(e) { // 反转后顺序为大->小,无压力删除
            barLines.splice(e, 1); // 从index开始删除1个-splice第三个参数为要添加的元素s
        });
    }
    // draw lanes
    for (var prop in lanes) {
        if (prop === "18") { // 忽略副音色
            continue;
        }
        var lane = lanes[prop];
        if (!lane.isEmpty) {
            var toRemove = []; // 记录消失的音符index以便删除
            lane.notes.forEach(function(e, index) {
                fgCacheCtx.fillStyle = lane.color;
                fgCacheCtx.fillRoundRect(e.x, e.y, e.w, e.h, ROUND_RADIUS).fill();
                e.x += e.dx;
                e.y += e.dy;
                if (e.y > REMOVE_HEIGHT) { // 消失
                    toRemove.push(index);
                }
            });
            if (toRemove.length > 0) {
                toRemove.reverse().forEach(function(e) { // 反转后顺序为大->小,无压力删除
                    lane.notes.splice(e, 1); // 从index开始删除1个-splice第三个参数为要添加的元素s
                });
            }
        }
    }

    fgCacheCtx.font = '16px Verdana';
    fgCacheCtx.fillStyle = '#fff';
    min = Math.floor(elapsed / 60);
    sec = elapsed % 60;
    if (min < 10) min = "0" + min;
    if (sec < 10) sec = "0" + sec;
    fgCacheCtx.fillText('Time: ' + min + ':' + sec, 720, 70);
    fgCacheCtx.fillText('Points: ' + points, 720, 100);

    // show last hit
    fgCacheCtx.fillText('last hit: ' + (lastHit ? lastHit : ""), 720, 130);

    // if (testNote.y > REMOVE_HEIGHT) {
    //     clearInterval(gameStart);
    //     clearInterval(gameTimer);
    //     clearInterval(anime);
    // }

    // 将缓冲区绘制到前景层

    // fgCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    fgCtx.drawImage(fgCacheCanvas, 0, 0);

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
        if (crash.y > INSTRUMENT_HEIGHT + 10) {
            crashAnime = false;
            crash.y = INSTRUMENT_HEIGHT;
        }
    }
    if (hi_hatAnime) {
        hi_hat.y += ANIME_DY;
        if (hi_hat.y > INSTRUMENT_HEIGHT + 10) {
            hi_hatAnime = false;
            hi_hat.y = INSTRUMENT_HEIGHT;
        }
    }
    if (snareAnime) {
        snare.y += ANIME_DY;
        if (snare.y > INSTRUMENT_HEIGHT + 10) {
            snareAnime = false;
            snare.y = INSTRUMENT_HEIGHT;
        }
    }
    if (tom1Anime) {
        tom1.y += ANIME_DY;
        if (tom1.y > INSTRUMENT_HEIGHT + 10) {
            tom1Anime = false;
            tom1.y = INSTRUMENT_HEIGHT;
        }
    }
    if (tom2Anime) {
        tom2.y += ANIME_DY;
        if (tom2.y > INSTRUMENT_HEIGHT + 10) {
            tom2Anime = false;
            tom2.y = INSTRUMENT_HEIGHT;
        }
    }
    if (tom3Anime) {
        tom3.y += ANIME_DY;
        if (tom3.y > INSTRUMENT_HEIGHT + 10) {
            tom3Anime = false;
            tom3.y = INSTRUMENT_HEIGHT;
        }
    }
    if (kickAnime) {
        kick.y += ANIME_DY;
        if (kick.y > INSTRUMENT_HEIGHT + 10) {
            kickAnime = false;
            kick.y = INSTRUMENT_HEIGHT;
        }
    }
    if (rideAnime) {
        ride.y += ANIME_DY;
        if (ride.y > INSTRUMENT_HEIGHT + 10) {
            rideAnime = false;
            ride.y = INSTRUMENT_HEIGHT;
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
    efCtx.drawImage(kick.img, kick.x, kick.y, kick.w, kick.h);
    efCtx.drawImage(tom1.img, tom1.x, tom1.y, tom1.w, tom1.h);
    efCtx.drawImage(tom2.img, tom2.x, tom2.y, tom2.w, tom2.h);
    efCtx.drawImage(tom3.img, tom3.x, tom3.y, tom3.w, tom3.h);
    efCtx.drawImage(ride.img, ride.x, ride.y, ride.w, ride.h);
}

function crashHit() {
    lastHit = "crash hit !";
    // 绘制动画
    if (crashAnime) { // 重置动画
        crash.y = INSTRUMENT_HEIGHT;
    }
    crashAnime = true;
    // 判断得分
}

function rideHit() {
    lastHit = "ride hit !";
    if (rideAnime) { // 重置动画
        ride.y = INSTRUMENT_HEIGHT;
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
        hi_hat.y = INSTRUMENT_HEIGHT;
    }
    hi_hatAnime = true;

}

function snareHit() {
    lastHit = "snare hit !";
    if (snareAnime) { // 重置动画
        snare.y = INSTRUMENT_HEIGHT;
    }
    snareAnime = true;
}

function tom1Hit() {
    lastHit = "tom1 hit !";
    if (tom1Anime) { // 重置动画
        tom1.y = INSTRUMENT_HEIGHT;
    }
    tom1Anime = true;
}

function tom2Hit() {
    lastHit = "tom2 hit !";
    if (tom2Anime) { // 重置动画
        tom2.y = INSTRUMENT_HEIGHT;
    }
    tom2Anime = true;
}

function tom3Hit() {
    lastHit = "tom3 hit !";
    if (tom3Anime) { // 重置动画
        tom3.y = INSTRUMENT_HEIGHT;
    }
    tom3Anime = true;
}

function kickHit() {
    lastHit = "kick hit !";
    if (kickAnime) { // 重置动画
        kick.y = INSTRUMENT_HEIGHT;
    }
    kickAnime = true;
}

// function check() {
//     testNote.y = 0;
// }

//init
$(function() {

    // 读取dtx文件
    readDtx(function() {
        // 加载图片
        // 加载声音
        // sounds[0] = new Audio();
        // sounds[0].volume = 0.9;

        // 初始化游戏
        // var crotchet = 60000 / bpm; // 四分音符
        // var quaver = crotchet / 2; // 八分音符
        // var semiquaver = quaver / 2; // 十六分音符
        // var duration = null; // 时值
        initGame();
    });
});

function readDtx(callback) {
    // 发送ajax,请求dtx文件信息
    $.ajax({
        url: "parseDtx.do",
        type: "POST",
        dataType: "json",
        data: {
            path: $("#dtx").text()
        },
        success: function(data) {
            if (!data) {
                alert("读取歌曲内容(DTX)失败！请重试。");
                return;
            }
            console.log("==========dtx==========");
            console.log(data);
            console.log("==========dtx==========");
            dtx = data;
            dtxStack = new Stack();
            dtxStack.initFromArray(dtx.notes.sort(function(a, b) {
                return b.pos - a.pos; // pos从小到大
            }));
            if (typeof callback === "function") { callback(); }
        }
    });
}

function initGame() {

    // 三种取整方法
    // rounded1 = (0.5 + somenum) | 0;
    // rounded2 = ~~(0.5 + somenum);
    // rounded3 = (0.5 + somenum) << 0;
    // console.log(rounded1 + "--" + rounded2 + "--" + rounded3);

    // 准备初始化所需数据
    GENERATE_INTERVAL = 60000 / dtx.bpm / 4; // 十六分音符时值
    // DRAW_INTERVAL = (ANIME_DY * GENERATE_INTERVAL) / ((LAND_HEIGHT - 10) / 3.3);
    ANIME_DY = (LAND_HEIGHT - 10) * DRAW_INTERVAL / (3.3 * 4 * GENERATE_INTERVAL);
    console.log("GENERATE_INTERVAL=" + GENERATE_INTERVAL);
    console.log("DRAW_INTERVAL=" + DRAW_INTERVAL);
    console.log("ANIME_DY=" + ANIME_DY);

    // 像素级别操作尽量用整数
    ANIME_DY = (0.5 + ANIME_DY) | 0;
    console.log("ANIME_DY=" + ANIME_DY);

    // 背景层 - 不重绘
    bgCanvas = $("#bg")[0];
    bgCtx = bgCanvas.getContext("2d");
    // 前景层 - 舞台
    fgCanvas = $("#fg")[0];
    fgCtx = fgCanvas.getContext("2d");
    // 前景层缓冲区 - 离屏缓冲区防闪烁
    fgCacheCanvas = document.createElement("canvas");
    fgCacheCtx = fgCanvas.getContext("2d");
    // 效果层
    efCanvas = $("#ef")[0];
    efCtx = efCanvas.getContext("2d");

    CANVAS_WIDTH = bgCanvas.width;
    CANVAS_HEIGHT = bgCanvas.height;

    // console.log("width:" + CANVAS_WIDTH + "-height:" + CANVAS_HEIGHT);

    // 图片加载和对应对象声明
    var bkImg = new Image();
    bkImg.src = 'public/images/play/background.jpg';
    background = new Background(0, 0, LAND_WIDTH, 600, 0, ANIME_DY, bkImg);
    var crashImg = new Image();
    crashImg.src = 'public/images/play/crash.png';
    crash = new Instrument(0, 1 * SPACING + SPACING + 0 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, crashImg);
    var hi_hatImg = new Image();
    hi_hatImg.src = 'public/images/play/hi_hat.png';
    hi_hat = new Instrument(1, 2 * SPACING + SPACING + 1 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, hi_hatImg);
    var snareImg = new Image();
    snareImg.src = 'public/images/play/snare.png';
    snare = new Instrument(2, 3 * SPACING + SPACING + 2 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, snareImg);
    var kickImg = new Image();
    kickImg.src = 'public/images/play/kick.png';
    kick = new Instrument(3, 4 * SPACING + SPACING + 3 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, kickImg);
    var tom1Img = new Image();
    tom1Img.src = 'public/images/play/tom.png';
    tom1 = new Instrument(4, 5 * SPACING + SPACING + 4 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, tom1Img);
    var tom2Img = new Image();
    tom2Img.src = 'public/images/play/tom.png';
    tom2 = new Instrument(5, 6 * SPACING + SPACING + 5 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, tom2Img);
    var tom3Img = new Image();
    tom3Img.src = 'public/images/play/tom.png';
    tom3 = new Instrument(6, 7 * SPACING + SPACING + 6 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, tom3Img);
    var rideImg = new Image();
    rideImg.src = 'public/images/play/ride.png';
    ride = new Instrument(7, 8 * SPACING + SPACING + 7 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, rideImg);

    // 声音加载
    sounds[0] = new Audio();
    sounds[0].volume = 0.9;

    // testNote = new Note(10, 20, 80, 20, 0, 1, null);
    land = new Land(0, 0, LAND_HEIGHT, LAND_WIDTH, 20); // 判定的bar

    // 初始化通道 - 8个通道
    // LC HH SD BD HT LT FT RD
    // 1A 11 12 13 14 15 17 19
    lanes["1A"] = (new Lane(0, "1A", null, 1 * SPACING + SPACING + 0 * LANE_WIDTH, 2 * SPACING, "#016AFF"));
    var hh_lane = new Lane(1, "11", "18", 2 * SPACING + SPACING + 1 * LANE_WIDTH, 2 * SPACING, "#00D5FF");
    lanes["11"] = (hh_lane);
    lanes["18"] = (hh_lane);
    lanes["12"] = (new Lane(2, "12", null, 3 * SPACING + SPACING + 2 * LANE_WIDTH, 2 * SPACING, "#FF0204"));
    lanes["13"] = (new Lane(3, "13", null, 4 * SPACING + SPACING + 3 * LANE_WIDTH, 2 * SPACING, "#FF9EE9"));
    lanes["14"] = (new Lane(4, "14", null, 5 * SPACING + SPACING + 4 * LANE_WIDTH, 2 * SPACING, "#F2FA0F"));
    lanes["15"] = (new Lane(5, "15", null, 6 * SPACING + SPACING + 5 * LANE_WIDTH, 2 * SPACING, "#2853FA"));
    lanes["17"] = (new Lane(6, "17", null, 7 * SPACING + SPACING + 6 * LANE_WIDTH, 2 * SPACING, "#39A923"));
    lanes["19"] = (new Lane(7, "19", null, 8 * SPACING + SPACING + 7 * LANE_WIDTH, 2 * SPACING, "#016AFF"));

    // 开始重绘
    gameStatus = false; // 目前只用来做不重绘部分的渲染
    // gameStart = requestAnimationFrame(drawScene);
    // gameStart = setInterval(drawScene, DRAW_INTERVAL); // loop drawScene
    gameStart = setInterval(drawSceneCache, DRAW_INTERVAL); // loop drawScene
    // gameStart = setInterval(renderCache, DRAW_INTERVAL); // loop drawScene
    gameTimer = setInterval(countTimer, 1000); // inner game timer
    waterfall = setInterval(notePapa, GENERATE_INTERVAL); // 音乐瀑布-音符产生者
    anime = setInterval(drawAnime, DRAW_INTERVAL); // ef anime loop

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
}

function countTimer() {
    elapsed++;
}

function notePapa() {
    ceil++;
    // 产生辅助线 - 四分音符为一拍,一拍一线
    if (barLen % 4 === 0) {
        barLines.push(new BarLine(0, 2 * SPACING + NOTE_HEIGHT / 2, LAND_WIDTH, 2, 0, ANIME_DY, null));
    }
    barLen++;
    // 产生音符
    if (dtxStack.peek() && dtxStack.peek().pos === ceil) { // 位置对齐
        // console.log(dtxStack.peek().pos);
        var current = dtxStack.pop();
        current.beats.forEach(function(e) {
            // lane:"01"
            // src:"./public/so...e.mp3"
            // tone:"01"
            // type:8
            var lane = lanes[e.lane];
            if (lane) {
                lane.notes.push(new Note(lane.x, lane.y, NOTE_WIDTH, NOTE_HEIGHT, 0, ANIME_DY, null));
                lane.isEmpty = false;
            }
        });
    }
}