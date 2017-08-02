/**
 * Drum H5 Ver. 版本1.0.0：
 *  -支持5鼓3镲；
 *  -支持最细十六分音符，更细音符将自动算法转换；可以读取更细音符的dtx，算法完成不完全转换（(音符位置/总长度)*16注意查重）
 *  -非垂直同步-每首歌可能fps不同
 *  -引入新歌时
 * 注：1.如果连接电子鼓请自行解决按键映射问题
 */

/**
 * 开发及发布注意事项
 * 1.游戏最终设计是可暂停,但暂时不做暂停的支持;
 * 2.引入新歌时,请先检查全部wav是否格式正确;
 * 3.暂停可能导致误差或延迟增大？
 */

/**
 * 游戏设计原理:
 * 1.每个音符所走的高度h1;
 * 2.规定h1=3.3*h2,其中h2为每个拍子的高度;视觉上更好;
 * 3.setInterval(draw, t1);-每t1毫秒重绘;
 * 4.setInterval(generateNote, t2);-每t2毫秒(拍子)产生音符;
 * 5.每拍子的速度=h2/t2=音符下落速度=dy/t1;所以t1=(dy*t2)/h2,dy固定为1;
 *      // var crotchet = 60000 / bpm; // 四分音符
        // var quaver = crotchet / 2; // 八分音符
        // var semiquaver = quaver / 2; // 十六分音符
        // var duration = null; // 时值
 * 6.一个通道有两种音色有两种情况会出现：
 *  .1.如踩镲，有开闭两种状态，有两种音色；
 *  .2.为满足低配电鼓（只有2或3个镲），合并两镲为一个通道（理解为共用同一镲表现两种音色）。
 */

// inner variables
// 常量
var CANVAS_WIDTH, CANVAS_HEIGHT,
    SPACING = 5, // 基础间隔
    ANIME_DY = 3, // 乐器打击动画deltaY
    NOTE_WIDTH = LANE_WIDTH = 80,
    NOTE_HEIGHT = 20,
    LANE_HEIGHT = 600,
    ROUND_RADIUS = 5,
    REMOVE_HEIGHT = 550,
    INSTRUMENT_HEIGHT = 525,
    LAND_HEIGHT = 500,
    LAND_WIDTH = 695,
    BAR_HEIGHT = 2;
// dtx/画布/资源加载 - 变量
var dtx, dtxStack, crotchet, semiquaver,
    velocity, // 运动速度(px/ms) - bpm算出一拍持续时间,规定舞台高度=3.3个节拍,就可以算出速度
    currentBeat = -1, // 当前重绘时节拍序号
    currentSemiquaver = -1, // 当前重绘时十六分音符序号
    bgCanvas, bgCtx, fgCanvas, fgCtx, efCanvas, efCtx, background, sounds = {};
// 业务相关变量 - 得分/乐器
var bgm, // 背景音乐
    bgmwav, // 背景音乐通道
    crash, hi_hat, snare, kick, tom1, tom2, tom3, ride, land, lanes = {},
    barLen = 0,
    barLines = [],
    crashAnime, rideAnime, hi_hatAnime, snareAnime, tom1Anime, tom2Anime, tom3Anime, kickAnime, hi_hatStatus = false, // false:open,true:close
    noteAmt = 0, // 音符总数
    points = perfectHits = goodHits = normalHits = missHits = 0,
    lastHit; // 最后一次敲击的乐器;
// 游戏循环核心变量
var gameStart, // 动画循环
    anime, // 效果层打击动画
    paused = true, // 暂停标记
    startTime = 0, // 动画开始时间
    fps = 0, // 刷新率 - 目前的作用是判断是否是第一次重绘
    elapsedTime = 0, // 上次重绘的时间间隔
    lastFpsUpdate = { time: 0, value: 0 }, // 每秒更新实时fps显示（更新时间/fps）
    duration = 0, // 动画持续时间 - 每次重绘都重新计算定时器
    lastTime = 0; // 上次重绘的时间（重绘+暂停）;

$(function() { // 加载完成后执行
    readDtx(function() { // 读取dtx文件并初始化游戏
        initData(); // 准备游戏数据
        initImage(); // 加载图片
        initSound() // 加载声音
        initEvent(); // 事件监听
        initGame(); // 初始化游戏
    });
});
/**
 * 初始化游戏
 */
function initGame() {
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
    // console.log("width:" + CANVAS_WIDTH + "-height:" + CANVAS_HEIGHT);
    // 设置ctx的全局通用状态
    bgCtx.fillStyle = "rgb(16,16,16)"; // 背景层不透明背景
    bgCtx.font = '16px Verdana'; // 背景层字体
    fgCtx.fillStyle = "rgba(0,0,0,0)"; // 前景背景全透明
    fgCtx.font = '16px Verdana'; // 前景层字体
    efCtx.fillStyle = "rgba(0,0,0,0)"; // 前景背景全透明
    efCtx.font = '16px Verdana'; // 前景层字体    
    // fill ef background - 全透明
    efCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // 打击判定的水平位置
    land = new Land(0, 0, LAND_HEIGHT, LAND_WIDTH, 20);
    // 初始化通道 - 8个通道 + BGM通道
    // LC HH SD BD HT LT FT RD
    // 1A 11 12 13 14 15 17 19
    lanes["01"] = (new Lane(101, "01", 1 * SPACING + SPACING + 0 * LANE_WIDTH, 2 * SPACING, "#FFF")); // BGM通道-隐藏
    lanes["1A"] = (new Lane(0, "1A", 1 * SPACING + SPACING + 0 * LANE_WIDTH, 2 * SPACING, "#016AFF"));
    var hh_lane = new Lane(1, "11", 2 * SPACING + SPACING + 1 * LANE_WIDTH, 2 * SPACING, "#00D5FF");
    lanes["11"] = (hh_lane); // 踩镲主音色
    lanes["18"] = (hh_lane); // 踩镲副音色（共用一个对象）
    lanes["12"] = (new Lane(2, "12", 3 * SPACING + SPACING + 2 * LANE_WIDTH, 2 * SPACING, "#FF0204"));
    lanes["13"] = (new Lane(3, "13", 4 * SPACING + SPACING + 3 * LANE_WIDTH, 2 * SPACING, "#FF9EE9"));
    lanes["14"] = (new Lane(4, "14", 5 * SPACING + SPACING + 4 * LANE_WIDTH, 2 * SPACING, "#F2FA0F"));
    lanes["15"] = (new Lane(5, "15", 6 * SPACING + SPACING + 5 * LANE_WIDTH, 2 * SPACING, "#2853FA"));
    lanes["17"] = (new Lane(6, "17", 7 * SPACING + SPACING + 6 * LANE_WIDTH, 2 * SPACING, "#39A923"));
    lanes["19"] = (new Lane(7, "19", 8 * SPACING + SPACING + 7 * LANE_WIDTH, 2 * SPACING, "#016AFF"));
    // 开始重绘
    gameStatus = false; // 目前只用来做不重绘部分的渲染
    startTime = +new Date;
    lastTime = +new Date;
    duration += +new Date - lastTime;
    drawBackground(); // 游戏开始第一次渲染,渲染不重绘部分
    paused = false;
    gameStart = requestAnimationFrame(animate);
}
/**
 * Animation
 */
function animate(time) {
    if (!paused) {
        clear(); // 清除
        draw(); // 重绘
        updateFps(); // 显示fps
        updateTimer(); // 显示计时
        updateHitAndPoint(); // 显示击打和得分
        update(); // 更新运动状态
        gameStart = requestAnimationFrame(animate); // 循环重绘
    }
}

function update() {
    // fg background y-scroll
    background.y += 1;
    if (background.y > CANVAS_HEIGHT) {
        background.y = background.y - background.h;
    }
    // 前景(音符/节拍线)运动状态更新
    // 音符 - 规定整首音乐最小细分单位是十六分音符,每个十六分音符检查是否有新的音符
    // 和 节拍(辅助)线 - 四分音符为一拍,一拍一线
    var semiquaverDivide = duration / semiquaver;
    var semiquaverIntPart = semiquaverDivide | 0;
    var semiquaverFracPart = semiquaverDivide - semiquaverIntPart;
    if (semiquaverIntPart > currentSemiquaver) {
        currentSemiquaver = semiquaverIntPart;
        var semiquaverOffset = semiquaverFracPart * velocity; // 实验值0.000-0.014
        // console.log(semiquaverOffset);
        // 新的辅助线
        var currentCrotchet = semiquaverIntPart / 4;
        if (semiquaverIntPart % 4 === 0 && currentCrotchet > currentBeat) {
            currentBeat = currentCrotchet;
            barLines.push(new BarLine(0, 2 * SPACING + NOTE_HEIGHT / 2, LAND_WIDTH, BAR_HEIGHT, null));
        }
        // 新的音符
        var currentS = forceGetElementFromStack(dtxStack, semiquaverIntPart);
        if (currentS) {
            currentS.beats.forEach(function(e) {
                // lane:"01"
                // src:"./public/so...e.mp3"
                // tone:"01"
                // type:8
                var lane = lanes[e.lane];
                if (lane) {
                    noteAmt++;
                    if (!lane.types.contains(e.tone)) {
                        lane.types.push(e.tone);
                    }
                    lane.notes.push(new Note(lane.x, lane.y, NOTE_WIDTH, NOTE_HEIGHT, e.tone, null));
                    lane.isEmpty = false;
                }
            });
        }
    }
}
/**
 * 强制从栈中取出该位置的元素,递归:如果peek出不是则pop后peek
 * @param {*} stack 栈
 * @param {*} position 大于0的位置
 */
function forceGetElementFromStack(stack, position) {
    if (position < 0) {
        return null;
    }
    var element = stack.peek();
    if (!element) {
        return null;
    }
    if (element.pos === position) {
        return stack.pop();
    }
    if (element.pos > position) {
        return null;
    }
    if (element.pos < position) {
        console.log("ERROR_WHEN_PLAY_STACK_POS_OVER [栈滞后于重绘,错误地过度pop]");
        stack.pop();
        return forceGetElementFromStack(stack, position);
    }
}
/**
 * 重绘 - 清除
 */
function clear() {
    fgCtx.save();
    // clear fg
    fgCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // fill fg background - 全透明
    fgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // draw fg background img - 半透明
    fgCtx.globalAlpha = 0.2;
    fgCtx.drawImage(background.img, background.x, background.y, background.w, background.h);
    fgCtx.drawImage(background.img, background.x, background.y - background.h, background.w, background.h);
    fgCtx.restore();
}
/**
 * 重绘 - 绘制
 */
function draw() {
    var now = +new Date;
    var deltaY = (now - lastTime) * velocity;
    // 绘制辅助线
    var barRemove = []; // 记录消失的辅助线index以便删除
    fgCtx.save();
    fgCtx.fillStyle = "white";
    barLines.forEach(function(e, index) {
        fgCtx.fillRect(e.x, e.y, e.w, e.h);
        e.y += deltaY;
        if (e.y > LAND_HEIGHT) { // 消失
            barRemove.push(index);
        }
    });
    if (barRemove.length > 0) {
        barRemove.reverse().forEach(function(e) { // 反转后顺序为大->小,无压力删除
            barLines.splice(e, 1); // 从index开始删除1个-splice第三个参数为要添加的元素s
        });
    }
    // 绘制音符
    for (var prop in lanes) {
        if (prop === "18") { // 忽略副音色（因为主副音色共用同一个对象）-否则会导致该通道速度加倍
            continue;
        }
        var lane = lanes[prop];
        if (!lane.isEmpty) {
            var toRemove = []; // 记录消失的音符index以便删除
            fgCtx.fillStyle = lane.color;
            lane.notes.forEach(function(e, index) {
                fgCtx.fillRoundRect(e.x, e.y, e.w, e.h, ROUND_RADIUS).fill();
                var noteStyle = lane.styles[lane.types.indexOf(e.tone)];
                switch (noteStyle) {
                    case "none":
                        break;
                    case "circle":
                        fgCtx.strokeCircleStyle(e.x + e.w / 2, e.y + e.h / 2, e.h * 0.8, "white");
                        break;
                    case "dblCircle":
                        fgCtx.strokeDblCircleStyle(e.x + e.w / 2, e.y + e.h / 2, e.h * 0.8, "white");
                        break;
                    default:
                        // 第四种开始不予支持直接使用默认style-none
                }
                e.y += deltaY;
                if (e.y > REMOVE_HEIGHT) {
                    toRemove.push(index); // 音符消失
                }
                // if (!e.played && e.y > LAND_HEIGHT) {
                if (!e.played && Math.abs(e.y - LAND_HEIGHT) < (deltaY / 2)) {
                    e.played = true;
                    if (e.tone === bgmwav) {
                        bgm = sounds[e.tone].audio;
                        // bgm.currentTime = 0.1; // bgm提前0.05秒播放
                    }
                    var gonnaPlay = sounds[e.tone].audio;
                    if (gonnaPlay.paused) { // 暂停中
                        gonnaPlay.play(); // 播放音符声音
                    } else { // 播放中
                        gonnaPlay.currentTime = 0;
                        gonnaPlay.play();
                    }
                }
            });
            if (toRemove.length > 0) {
                toRemove.reverse().forEach(function(e) { // 反转后顺序为大->小,无压力删除
                    lane.notes.splice(e, 1); // 从index开始删除1个-splice第三个参数为要添加的元素s
                });
            }
        }
    }
    fgCtx.restore();
}
/**
 * 显示fps
 */
function updateFps() {
    fgCtx.save();
    var now = (+new Date);
    fps = 1000 / elapsedTime;
    if (now - startTime < 2000) {
        return; // 前两秒不显示帧速
    }
    if (now - lastFpsUpdate.time > 1000) { // 每秒更新fps显示
        lastFpsUpdate.time = now;
        lastFpsUpdate.value = fps;
    }
    fgCtx.fillStyle = 'cornflowerblue';
    fgCtx.fillText(lastFpsUpdate.value.toFixed() + ' fps', 720, 70);
    fgCtx.restore();
}
/**
 * 显示计时
 */
function updateTimer() {
    fgCtx.save();
    var now = (+new Date);
    duration += now - lastTime;
    elapsedTime = now - lastTime;
    lastTime = now;
    fgCtx.fillStyle = 'cornflowerblue';
    fgCtx.fillText(PrefixInteger(Math.floor(duration / 1000 / 60), 2) + ':' + PrefixInteger(Math.floor(duration / 1000 % 60), 2), 720, 100);
    fgCtx.restore();
}
/**
 * 显示击打和得分
 */
function updateHitAndPoint() {
    fgCtx.save();
    fgCtx.fillStyle = '#fff';
    // show points
    fgCtx.fillText('Points: ' + points, 720, 130);
    // show last hit
    fgCtx.fillText('last hit: ' + (lastHit ? lastHit : ""), 720, 160);
    fgCtx.restore();
}
/**
 * 绘制不重绘的背景(和land)
 */
function drawBackground() {
    bgCtx.save();
    // fill ef background - 不透明
    bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // fill bg lanes background
    bgCtx.fillStyle = "rgb(215,215,215)";
    for (var i = 0; i < 8; i++) {
        bgCtx.fillRoundRect((i + 1) * SPACING + SPACING + i * LANE_WIDTH, 2 * SPACING, LANE_WIDTH, CANVAS_HEIGHT - 4 * SPACING, ROUND_RADIUS).fill();
    }
    bgCtx.fillStyle = '#fff';
    for (var i = 0; i < 8; i++) {
        bgCtx.fillText(crash.types[i], (i + 1) * SPACING + SPACING + i * LANE_WIDTH + 3 * SPACING, CANVAS_HEIGHT / 2);
    }
    // fill bg land
    bgCtx.fillStyle = '#666';
    bgCtx.fillRect(land.x, land.y, land.w, land.h);
    bgCtx.fillStyle = '#FFF';
    bgCtx.fillRect(land.x, land.y, land.w, 2);
    bgCtx.restore(); // 绘制完背景层后恢复状态

    // 乐器的初次绘制移动到了图片load时,防止绘制时图片没load
    // // fill ef background - 全透明
    // efCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // // fill ef
    // efCtx.drawImage(crash.img, crash.x, crash.y, crash.w, crash.h);
    // efCtx.drawImage(hi_hat.img, hi_hat.x, hi_hat.y, hi_hat.w, hi_hat.h);
    // efCtx.drawImage(snare.img, snare.x, snare.y, snare.w, snare.h);
    // efCtx.drawImage(tom1.img, tom1.x, tom1.y, tom1.w, tom1.h);
    // efCtx.drawImage(tom2.img, tom2.x, tom2.y, tom2.w, tom2.h);
    // efCtx.drawImage(tom3.img, tom3.x, tom3.y, tom3.w, tom3.h);
    // efCtx.drawImage(kick.img, kick.x, kick.y, kick.w, kick.h);
    // efCtx.drawImage(ride.img, ride.x, ride.y, ride.w, ride.h);
}
// 暂停背景音乐
function stopBgm() {
    if (bgm && !bgm.paused) {
        bgm.pause();
    }
}
// 再开背景音乐
function resumeBgm() {
    if (bgm && bgm.paused) {
        bgm.play();
    }
}
/**
 * 发送ajax,请求dtx文件信息
 */
function readDtx(callback) {
    // testaudio - start
    console.log("===testaudio - start");
    var soundddd = new Audio();
    soundddd.src = "public/sound/Beyond - GuangHuiSuiYue/sounds/bgm.wav";
    // soundddd.src = "public/sound/baby one more time 布兰妮/drum/BD.XA.wav";
    // soundddd.src = "./public/sound/baby one more time 布兰妮/pre.mp3";
    // soundddd.src = "public/sound/baby one more time 布兰妮/drum/SDYOWIE.wav";
    soundddd.currentTime = 0;
    soundddd.loop = true;
    soundddd.volume = 0.01;
    // soundddd.play();
    console.log("===testaudio - end");
    // testaudio - end
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
/**
 * 准备初始化所需数据
 */
function initData() {
    bgmwav = dtx.bgmwav ? dtx.bgmwav : "01";
    crotchet = 60000 / dtx.bpm; // 四分音符时值
    semiquaver = 60000 / dtx.bpm / 4; // 十六分音符时值
    velocity = (LAND_HEIGHT - 2 * SPACING) / (3.3 * crotchet) // 运动速度(px/ms)
    console.log("四分音符 -- " + crotchet);
    console.log("十六分音符 -- " + semiquaver);
    console.log("速度px/ms -- " + velocity);

    // GENERATE_INTERVAL = 60000 / dtx.bpm / 4; // 十六分音符时值
    // DRAW_INTERVAL = (ANIME_DY * GENERATE_INTERVAL) / ((LAND_HEIGHT - 10) / 3.3);
    // ANIME_DY = (LAND_HEIGHT - 10) * DRAW_INTERVAL / (3.3 * 4 * GENERATE_INTERVAL);
    // console.log("GENERATE_INTERVAL=" + GENERATE_INTERVAL);
    // console.log("DRAW_INTERVAL=" + DRAW_INTERVAL);
    // console.log("ANIME_DY=" + ANIME_DY);
    // 像素级别操作尽量用整数
    // ANIME_DY = (0.5 + ANIME_DY) | 0;
    // console.log("ANIME_DY=" + ANIME_DY);
}
/**
 * 图片加载和对应对象声明
 */
function initImage() {
    var bkImg = new Image();
    bkImg.src = 'public/images/play/background.jpg';
    background = new Background(0, 0, LAND_WIDTH, 600, bkImg);

    var crashImg = new Image();
    crashImg.src = 'public/images/play/crash.png';
    crash = new Instrument(0, 1 * SPACING + SPACING + 0 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, crashImg);
    crashImg.onload = function() { efCtx.drawImage(crash.img, crash.x, crash.y, crash.w, crash.h); };
    var hi_hatImg = new Image();
    hi_hatImg.src = 'public/images/play/hi_hat.png';
    hi_hat = new Instrument(1, 2 * SPACING + SPACING + 1 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, hi_hatImg);
    hi_hatImg.onload = function() { efCtx.drawImage(hi_hat.img, hi_hat.x, hi_hat.y, hi_hat.w, hi_hat.h); };
    var snareImg = new Image();
    snareImg.src = 'public/images/play/snare.png';
    snare = new Instrument(2, 3 * SPACING + SPACING + 2 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, snareImg);
    snareImg.onload = function() { efCtx.drawImage(snare.img, snare.x, snare.y, snare.w, snare.h); };
    var kickImg = new Image();
    kickImg.src = 'public/images/play/kick.png';
    kick = new Instrument(3, 4 * SPACING + SPACING + 3 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, kickImg);
    kickImg.onload = function() { efCtx.drawImage(kick.img, kick.x, kick.y, kick.w, kick.h); };
    var tom1Img = new Image();
    tom1Img.src = 'public/images/play/tom.png';
    tom1 = new Instrument(4, 5 * SPACING + SPACING + 4 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, tom1Img);
    tom1Img.onload = function() { efCtx.drawImage(tom1.img, tom1.x, tom1.y, tom1.w, tom1.h); };
    var tom2Img = new Image();
    tom2Img.src = 'public/images/play/tom.png';
    tom2 = new Instrument(5, 6 * SPACING + SPACING + 5 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, tom2Img);
    tom2Img.onload = function() { efCtx.drawImage(tom2.img, tom2.x, tom2.y, tom2.w, tom2.h); };
    var tom3Img = new Image();
    tom3Img.src = 'public/images/play/tom.png';
    tom3 = new Instrument(6, 7 * SPACING + SPACING + 6 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, tom3Img);
    tom3Img.onload = function() { efCtx.drawImage(tom3.img, tom3.x, tom3.y, tom3.w, tom3.h); };
    var rideImg = new Image();
    rideImg.src = 'public/images/play/ride.png';
    ride = new Instrument(7, 8 * SPACING + SPACING + 7 * LANE_WIDTH, INSTRUMENT_HEIGHT, 80, 60, rideImg);
    rideImg.onload = function() { efCtx.drawImage(ride.img, ride.x, ride.y, ride.w, ride.h); };
}
/**
 * 声音加载
 */
function initSound() {
    var wavs = dtx.wav;
    wavs.forEach(function(e) {
        e.audio = new Audio();
        if (e.code === "01") {
            e.audio.volume = 0.1;
        } else {
            e.audio.volume = e.volume ? (e.volume / 100) : 0.9;
        }
        e.audio.src = e.source.substring(0, e.source.lastIndexOf(".")) + e.source.substring(e.source.lastIndexOf("."), e.source.length).toLowerCase(); // 对大写后缀的容错
        // 查重未做
        sounds[e.code] = e;
        delete sounds[e.code].code;
    });
    console.log(sounds);
    // sounds["01"].audio.play();
}
/**
 * 注册事件监听
 */
function initEvent() {
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
    //当前窗口失去焦点 
    window.onblur = function() {
        if (gameStart) { // 游戏开始后失去焦点事件才有用
            //暂停动画
            lastTime = +new Date;
            paused = true;
            $("#playAndPause").html("&nbsp;开始&nbsp;");
            stopBgm();
            // cancelAnimationFrame(gameStart);
        }
    };
    $("#playAndPause").click(function() {
        lastTime = +new Date;
        paused = paused ? false : true;
        if (paused) {
            $(this).html("&nbsp;开始&nbsp;");
            stopBgm();
            // cancelAnimationFrame(gameStart);
        } else {
            if (!gameStart) {
                startTime = +new Date;
            }
            gameStart = requestAnimationFrame(animate);
            resumeBgm();
            $(this).html("&nbsp;暂停&nbsp;");
        }
    });
}

function hitAnimate() {
    updateHitAnime();
    clearHitAnime();
    drawHitAnime();
    // 如果存在需要重绘的乐器,则重绘
    if (crashAnime || rideAnime || hi_hatAnime || snareAnime || tom1Anime || tom2Anime || tom3Anime || kickAnime) {
        requestAnimationFrame(hitAnimate);
    }
}

/**
 * 效果层 - 乐器打击动画清除
 */
function clearHitAnime() {
    // clear ef
    efCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // fill ef background - 全透明
    efCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}
/**
 * 效果层 - 乐器打击动画绘制
 */
function drawHitAnime() {
    efCtx.save();
    // fill ef
    efCtx.drawImage(crash.img, crash.x, crash.y, crash.w, crash.h);
    if (hi_hatStatus) { // close
        efCtx.fillStyle = "rgba(0,215,0,0.5)";
        efCtx.fillRoundRect(hi_hat.x, hi_hat.y, hi_hat.w, hi_hat.h, ROUND_RADIUS).fill();
        efCtx.fillStyle = '#fff';
        efCtx.fillText('C', hi_hat.x + 5, hi_hat.y + 15);
    } else { // open
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
    efCtx.restore();
}
/**
 * 效果层 - 乐器打击动画更新状态
 */
function updateHitAnime() {
    if (crashAnime) {
        crash.y += ANIME_DY;
        if (crash.y > INSTRUMENT_HEIGHT + 10) {
            crashAnime = false; // 动画结束
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
}


function crashHit() {
    lastHit = "crash hit !";
    // 绘制动画
    if (crashAnime) { // 重置动画 - 连续敲击和动画结束
        crash.y = INSTRUMENT_HEIGHT;
    }
    crashAnime = true;
    requestAnimationFrame(hitAnimate);
    // 判断得分
}

function rideHit() {
    lastHit = "ride hit !";
    if (rideAnime) { // 重置动画
        ride.y = INSTRUMENT_HEIGHT;
    }
    rideAnime = true;
    requestAnimationFrame(hitAnimate);
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
    requestAnimationFrame(hitAnimate);
}

function snareHit() {
    lastHit = "snare hit !";
    if (snareAnime) { // 重置动画
        snare.y = INSTRUMENT_HEIGHT;
    }
    snareAnime = true;
    requestAnimationFrame(hitAnimate);
}

function tom1Hit() {
    lastHit = "tom1 hit !";
    if (tom1Anime) { // 重置动画
        tom1.y = INSTRUMENT_HEIGHT;
    }
    tom1Anime = true;
    requestAnimationFrame(hitAnimate);
}

function tom2Hit() {
    lastHit = "tom2 hit !";
    if (tom2Anime) { // 重置动画
        tom2.y = INSTRUMENT_HEIGHT;
    }
    tom2Anime = true;
    requestAnimationFrame(hitAnimate);
}

function tom3Hit() {
    lastHit = "tom3 hit !";
    if (tom3Anime) { // 重置动画
        tom3.y = INSTRUMENT_HEIGHT;
    }
    tom3Anime = true;
    requestAnimationFrame(hitAnimate);
}

function kickHit() {
    lastHit = "kick hit !";
    if (kickAnime) { // 重置动画
        kick.y = INSTRUMENT_HEIGHT;
    }
    kickAnime = true;
    requestAnimationFrame(hitAnimate);
}

// objects:
/**
 * 音符 - 音乐瀑布落下的音符
 */
function Note(x, y, w, h, tone, img) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.tone = tone;
    this.img = img;
}
/**
 * 辅助线 - 四分音符为一拍,一拍一线
 */
function BarLine(x, y, w, h, img) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.img = img;
}
/**
 * 音符泳道
 * 一个通道支持多种音色,不同音色不仅听起来不同,看起来也不同
 */
function Lane(type, code, x, y, color) {
    this.isEmpty = true;
    this.type = this.type; // 通道序号
    this.code = code; // 通道编号
    this.x = x;
    this.y = y;
    this.color = color;
    this.notes = []; // 通道下有效音符（屏幕显示）
    this.types = []; // 支持多种音色
    this.styles = ["none", "circle", "dblCircle"]; // 默认支持最多三种音色样式,可特化修改
}
/**
 * 音符hit判定
 */
function Land(type, x, y, w, h) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}
/**
 * 乐器
 */
function Instrument(type, x, y, w, h, img) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.img = img;
    this.types = ["Crash", "Hi-hat", "Snare", "Kick", "Tom1", "Tom2", "Tom3", "Ride"]; // all types
}
/**
 * 背景图
 */
function Background(x, y, w, h, img) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.img = img;
}

// functions:
/**
 * 绘制圆角矩形 - 2D绘图工具函数
 */
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

/**
 * 绘制附加音色的circle类型
 * x,y,r,color
 */
CanvasRenderingContext2D.prototype.strokeCircleStyle = function(x, y, r, color) {
    this.lineWidth = 2;
    this.strokeStyle = color;
    this.beginPath();
    this.arc(x, y, r, 0, Math.PI * 2, true);
    this.stroke();
    return this;
}

/**
 * 绘制附加音色的dblCircle类型
 * x,y,r,color
 */
CanvasRenderingContext2D.prototype.strokeDblCircleStyle = function(x, y, r, color) {
    this.strokeStyle = color;
    this.lineWidth = 2;
    this.beginPath();
    this.arc(x, y, r, 0, Math.PI * 2, true);
    this.stroke();
    this.beginPath();
    this.arc(x, y, r, 0, Math.PI * 2, true);
    this.stroke();
    return this;
}

/**
 * 数组工具函数 - 数组是否包含元素
 */
Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}

/**
 * 整数前置补0,返回一个字符串
 * 空数组用0join后直接截取后面n位数
 * @param num 整数值 
 * @param n 期望字符串长度
 */
function PrefixInteger(num, n) {
    return (new Array(n).join(0) + num).slice(-n);
}