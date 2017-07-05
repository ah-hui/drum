// inner variables
var fgCanvas, fgCacheCanvas, fgCacheCtx, fgCtx;
var gameStart, gameTimer, anime, elapsed = ceil = min = sec = 0;

var CANVAS_WIDTH, CANVAS_HEIGHT, DRAW_INTERVAL = 1000 / 60,
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

var ANIME_DY = 2;

var barLine;

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

function clear() {
    // clear fg
    fgCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // fill fg background - 全透明
    fgCtx.fillStyle = "rgba(0,0,0,0)";
    fgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawScene() {
    clear();

    // test draw a line
    fgCtx.fillStyle = 'white';
    fgCtx.fillRect(barLine.x, barLine.y, barLine.w, barLine.h);
    barLine.y += barLine.dy;

    if (barLine.y > REMOVE_HEIGHT) {
        cancelAnimationFrame(gameStart);
        clearInterval(gameTimer);
        clearInterval(anime);
    } else {
        // 循环重绘
        requestAnimationFrame(drawScene);
    }
}

function clearCache() {
    // clear fg
    fgCacheCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 前景舞台缓冲区 - 绘制背景
    // fill fg background - 全透明
    fgCacheCtx.fillStyle = "rgba(0,0,0,0)";
    fgCacheCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function renderCache() {
    fgCtx.drawImage(fgCacheCanvas, 0, 0);
}

function drawSceneCache() {
    clearCache();

    // test draw a line
    fgCacheCtx.fillStyle = 'white';
    fgCacheCtx.fillRect(barLine.x, barLine.y, barLine.w, barLine.h);
    barLine.y += barLine.dy;

    if (barLine.y > REMOVE_HEIGHT) {
        clearInterval(gameStart);
        clearInterval(gameTimer);
        clearInterval(anime);
    }

    // 将缓冲区绘制到前景层

    // fgCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    fgCtx.drawImage(fgCacheCanvas, 0, 0);

}

//init
$(function() {
    initGame();
});

function initGame() {
    // 前景层 - 舞台
    fgCanvas = $("#fg")[0];
    fgCtx = fgCanvas.getContext("2d");
    CANVAS_WIDTH = fgCanvas.width;
    CANVAS_HEIGHT = fgCanvas.height;
    // 前景层缓冲区 - 离屏缓冲区防闪烁
    fgCacheCanvas = document.createElement("canvas");
    fgCacheCtx = fgCanvas.getContext("2d");
    fgCacheCanvas.width = CANVAS_WIDTH;
    fgCacheCanvas.height = CANVAS_HEIGHT;

    // testNote = new Note(10, 20, 80, 20, 0, 1, null);
    barLine = new BarLine(0, 2 * SPACING + NOTE_HEIGHT / 2, LAND_WIDTH, 2, 0, ANIME_DY, null);

    // 开始重绘
    gameStart = requestAnimationFrame(drawScene);
    // gameStart = setInterval(drawScene, DRAW_INTERVAL); // loop drawScene
    // gameStart = setInterval(drawSceneCache, DRAW_INTERVAL); // loop drawScene
    // gameStart = setInterval(renderCache, DRAW_INTERVAL); // loop drawScene
    gameTimer = setInterval(countTimer, 1000); // inner game timer
}

function countTimer() {
    elapsed++;
}