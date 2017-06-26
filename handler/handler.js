//------------------------------------------------ 
// handler.js 
// 请求处理器
// 封装handler成模块,并暴露给外部使用.
//------------------------------------------------ 

var fs = require("fs"),
    util = require("util"),
    libPath = require("path"),
    exec = require("child_process").exec, // 执行shell命令-非阻塞
    querystring = require("querystring"),
    extend = require('util')._extend, // 深度拷贝方法
    conf = require("../config/system");

function list(response, param) { // 后面要做缓存
    // console.log("Request handler 'list' was called. Parms:" + JSON.stringify(param));
    var path = "./" + conf.sound_dir;
    explorer(path, response, function(res, result) {
        res.writeHead(200, { "Content-Type": "text/plain", "charset": "utf-8" });
        res.end(JSON.stringify(result));
    });
}

function detail(response, param) {
    var filePath = param.path;
    readFileInfo(filePath, response, function(res, result) {
        res.writeHead(200, { "Content-Type": "text/plain", "charset": "utf-8" });
        res.end(JSON.stringify(result));
    });
}

function play(response, param) {
    jumpToPage("views/play.html", response, param);
}

function parseDtx(response, param) {
    var path = param.path;
    readWholeFile(path, response, function(res, result) {
        res.writeHead(200, { "Content-Type": "text/plain", "charset": "utf-8" });
        res.end(JSON.stringify(result));
    });
}



function readWholeFile(path, response, callback) {
    var detail = { path: path }; // 基本信息
    var body = {}; // dtx全文件信息
    fs.readFile(path, "utf-8", function(err, data) {
        if (err) {
            console.log("ReadSoundFileErr: File[" + path + "] " + err);
        } else {
            // console.log(data);
            detail = getDtxBaseInfo(data, detail);
            // 多媒体资源

            // DTX主要内容
            var score = getDtxBody(data, detail);
            body = extend(detail, score);
            // 识别所有信息后返回
            callback(response, body);
        }
    });
}

function readFileInfo(path, response, callback) {
    var detail = { path: path };
    fs.readFile(path, "utf-8", function(err, data) {
        if (err) {
            console.log("ReadSoundFileErr: File[" + path + "] " + err);
        } else {
            // console.log(data);
            detail = getDtxBaseInfo(data, detail); // 基本信息
            // 执行耗时的cmd命令测试非阻塞
            // asyncFun(function(res) {
            //     // 识别所有信息后返回
            //     res.writeHead(200, { "Content-Type": "text/plain", "charset": "utf-8" });
            //     res.end(JSON.stringify(detail));
            // }, response);

            // 识别所有信息后返回
            callback(response, detail);
        }
    });
}

function getDtxBaseInfo(data, detail) {
    var dir = detail.path.substring(0, detail.path.lastIndexOf("/"));
    var titleMatch = data.match(/#TITLE:.*\r\n/);
    var artistMatch = data.match(/#ARTIST:.*\r\n/);
    var commentMatch = data.match(/#COMMENT:.*\r\n/);
    var panelMatch = data.match(/#PANEL:.*\r\n/);
    var previewMatch = data.match(/#PREVIEW:.*\r\n/);
    var preimageMatch = data.match(/#PREIMAGE:.*\r\n/);
    var stagefileMatch = data.match(/#STAGEFILE:.*\r\n/);
    var backgroundMatch = data.match(/#BACKGROUND:.*\r\n/);
    var resultimageMatch = data.match(/#RESULTIMAGE:.*\r\n/);
    var bpmMatch = data.match(/#BPM:.*\r\n/);
    var dlevelMatch = data.match(/#DLEVEL:.*\r\n/);
    var dtxvplayspeedMatch = data.match(/#DTXVPLAYSPEED:.*\r\n/);
    if (titleMatch) { // 识别title
        var title = titleMatch[0];
        if (title.indexOf(";") > -1) { // 剔除备注
            title = title.substring(0, title.indexOf(";"));
        }
        detail.title = title.replace("#TITLE:", "").trim();
    }
    if (artistMatch) { // 识别artist
        var artist = artistMatch[0];
        if (artist.indexOf(";") > -1) { // 剔除备注
            artist = artist.substring(0, artist.indexOf(";"));
        }
        detail.artist = artist.replace("#ARTIST:", "").trim();
    }
    if (commentMatch) { // 识别comment
        var comment = commentMatch[0];
        if (comment.indexOf(";") > -1) { // 剔除备注
            comment = comment.substring(0, comment.indexOf(";"));
        }
        detail.comment = comment.replace("#COMMENT:", "").trim();
    }
    if (panelMatch) { // 识别panel
        var panel = panelMatch[0];
        if (panel.indexOf(";") > -1) { // 剔除备注
            panel = panel.substring(0, panel.indexOf(";"));
        }
        detail.panel = panel.replace("#PANEL:", "").trim();
    }
    if (previewMatch) { // 识别preview
        var preview = previewMatch[0];
        if (preview.indexOf(";") > -1) { // 剔除备注
            preview = preview.substring(0, preview.indexOf(";"));
        }
        detail.preview = dir + "/" + preview.replace("#PREVIEW:", "").trim();
        // detail.preview = libPath.join(dir, previewMatch[0].replace("#PREVIEW:", "").trim());
    }
    if (preimageMatch) { // 识别preimage
        var preimage = preimageMatch[0];
        if (preimage.indexOf(";") > -1) { // 剔除备注
            preimage = preimage.substring(0, preimage.indexOf(";"));
        }
        detail.preimage = dir + "/" + preimage.replace("#PREIMAGE:", "").trim();
    }
    if (stagefileMatch) { // 识别stagefile
        var stagefile = stagefileMatch[0];
        if (stagefile.indexOf(";") > -1) { // 剔除备注
            stagefile = stagefile.substring(0, stagefile.indexOf(";"));
        }
        detail.stagefile = dir + "/" + stagefile.replace("#STAGEFILE:", "").trim();
    }
    if (backgroundMatch) { // 识别background
        var background = backgroundMatch[0];
        if (background.indexOf(";") > -1) { // 剔除备注
            background = background.substring(0, background.indexOf(";"));
        }
        detail.background = dir + "/" + background.replace("#BACKGROUND:", "").trim();
    }
    if (resultimageMatch) { // 识别resultimage
        var resultimage = resultimageMatch[0];
        if (resultimage.indexOf(";") > -1) { // 剔除备注
            resultimage = resultimage.substring(0, resultimage.indexOf(";"));
        }
        detail.resultimage = dir + "/" + resultimage.replace("#RESULTIMAGE:", "").trim();
    }
    if (bpmMatch) { // 识别bpm
        var bpm = bpmMatch[0];
        if (bpm.indexOf(";") > -1) { // 剔除备注
            bpm = bpm.substring(0, bpm.indexOf(";"));
        }
        detail.bpm = bpm.replace("#BPM:", "").trim();
    }
    if (dlevelMatch) { // 识别dlevel
        var dlevel = dlevelMatch[0];
        if (dlevel.indexOf(";") > -1) { // 剔除备注
            dlevel = dlevel.substring(0, dlevel.indexOf(";"));
        }
        detail.dlevel = dlevel.replace("#DLEVEL:", "").trim();
    }
    if (dtxvplayspeedMatch) { // 识别dtxvplayspeed
        var dtxvplayspeed = dtxvplayspeedMatch[0];
        if (dtxvplayspeed.indexOf(";") > -1) { // 剔除备注
            dtxvplayspeed = dtxvplayspeed.substring(0, dtxvplayspeed.indexOf(";"));
        }
        detail.dtxvplayspeed = dtxvplayspeed.replace("#DTXVPLAYSPEED:", "").trim();
    }
    return detail;
}

function getDtxBody(data, detail) {
    var dir = detail.path.substring(0, detail.path.lastIndexOf("/"));
    var arr = data.split("\r\n");
    var result = { wav: [], score: [], notes: [] };
    // score:[{barcode:002,lane:[{lanecode:11,beats:"0202"},{lanecode:12...},{}]},{barcode:003...}]
    arr.forEach(function(e) {
        if (e.indexOf(";") > -1) { // 剔除备注
            e = e.substring(0, e.indexOf(";"));
        }
        if (e.match(/^#BGMWAV:/)) { // 匹配多媒体资源 - bgm
            result.bgmwav = e.replace("#BGMWAV:", "").trim();
        }
        if (e.match(/^#WAV[0-9A-Za-z]{2}:/)) { // 匹配多媒体资源 - wav
            var code = e.substring(4, 6);
            var source = dir + "/" + e.replace("#WAV" + code + ":", "").trim();
            var flag = false;
            result.wav.forEach(function(w) {
                if (w.code === code) {
                    flag = true;
                    w.source = source;
                }
            });
            if (!flag) {
                result.wav.push({ code: code, source: source });
            }
        }
        if (e.match(/^#VOLUME[0-9A-Za-z]{2}:/)) { // 匹配多媒体资源 - volume
            var code = e.substring(7, 9);
            var volume = e.replace("#VOLUME" + code + ":", "").trim();
            var flag = false;
            result.wav.forEach(function(w) {
                if (w.code === code) {
                    flag = true;
                    w.volume = volume;
                }
            });
            if (!flag) {
                result.wav.push({ code: code, volume: volume });
            }
        }
        if (e.match(/^#\d{3}[0-9A-Ca-c]{2}:/)) { // 匹配正文开头
            var bar = e.substring(1, 4); // 小节
            var lane = e.substring(4, 6); // 通道
            var beats = e.replace("#" + bar + lane + ":", "").trim();
            var beatsArr = parseDtxLine(detail.bpm, bar, lane, beats);
            beatsArr.forEach(function(e) { // 合并本行的音符到总集合
                var f = false;
                result.notes.forEach(function(note) {
                    if (note.pos === e.pos) {
                        f = true;
                        note.beats.push({ tone: e.tone, type: e.type });
                    }
                });
                if (!f) {
                    result.notes.push({ pos: e.pos, beats: [{ tone: e.tone, type: e.type }] });
                }
            });
            var flag = false;
            result.score.forEach(function(b) {
                if (b.barcode === bar) {
                    flag = true;
                    b.lanes.push({ lanecode: lane, beats: beats });
                }
            });
            if (!flag) {
                result.score.push({ barcode: bar, lanes: [{ lanecode: lane, beats: beats }] });
            }
        }
    });
    // 解析wav到notes---套三层for循环，会不会被打
    result.notes.forEach(function(note) {
        note.beats.forEach(function(beat) {
            result.wav.forEach(function(e) {
                if (e.code === beat.tone) {
                    beat.src = e.source;
                }
            });
        });
    });
    // console.log(result);
    return result;
}

function parseDtxLine(bpm, bar, lane, beats) {
    var beatsArr = [];
    var barcode = Number(bar); // 000为第一小节,即第一小节下标为0
    // if (beats.length % 2 !== 0) { // 不是2的倍数？
    var beatsAmt = beats.length / 2;
    var beats_tmp = beats;
    for (var i = 1; beats_tmp.length > 0; i++) {
        var beat = beats_tmp.substring(0, 2);
        beats_tmp = beats_tmp.substring(2, beats_tmp.length);
        if (beat === "00") {
            continue;
        }
        var pos = (16 * (i - 1) / beatsAmt + 1) + barcode * 16; // 每个小节分为16份
        if ((16 * (i - 1)) % beatsAmt !== 0) { // 除不尽？（失真）
            pos = Math.ceil(16 * (i - 1) / beatsAmt) + 1 + barcode * 16;
            console.log("DTX-Line-Warning[除不尽上取整]: " + bar + lane + ": " + beats + "[" + (Math.ceil(16 * (i - 1) / beatsAmt) + 1) + "]");
        }
        beatsArr.push({ pos: pos, tone: beat, type: beatsAmt });
    }
    // console.log("### bpm===" + bpm + "/bar===" + bar + "/lane===" + lane + "/beats===" + beats);
    return beatsArr;
}

function jumpToPage(path, response, param) { // 跳转页面
    if (libPath.extname(path) !== ".html") {
        console.log("JumpPageErr: URL[" + path + "] is not a html page. ");
        return;
    }
    fs.readFile(path, "utf-8", function(err, data) {
        if (err) {
            console.log("ReadHtmlFileErr: File[" + path + "] " + err);
        } else {
            // 模板引擎处理
            data = templateEngine(data, param);
            // data.replace();
            // 向浏览器输出html页面
            response.writeHead(200, { "Content-Type": "text/html" });
            response.write(data);
            response.end();
        }
    });
}

function templateEngine(data, param) { // 极简的后端模板引擎
    for (var prop in param) {
        data = data.replace("{{" + prop + "}}", param[prop]);
    }
    return data;
}

function explorer(path, response, callback) {
    var result = [];
    fs.readdir(path, function(err, files) {
        // err直接报错
        if (err) { console.log("ReadSoundPathErr: " + err); return; }
        var dirLen = files.length;
        files.forEach(function(file, fileIndex) {
            fs.stat(path + '/' + file, function(err, stat) {
                if (err) { console.log("ReadSoundPathErr: " + err); return; }
                if (stat.isDirectory()) {
                    // 如果是文件夹-再向下遍历一层
                    // explorer(path + '/' + file, result);
                    // console.log('文件名:' + path + '/' + file);
                    var deepPath = path + '/' + file;
                    fs.readdir(deepPath, function(err, deepFiles) {
                        // err直接报错
                        if (err) { console.log("ReadDeepSoundPathErr: " + err); return; }
                        var deepLen = deepFiles.length;
                        deepFiles.forEach(function(deepFile, deepIndex) {
                            fs.stat(deepPath + '/' + deepFile, function(err, stat) {
                                if (err) { console.log("ReadDeepSoundFileErr: " + err); return; }
                                // 读出所有dtx文件
                                if (deepFile.endsWith(".dtx")) {
                                    // console.log('文件名:' + deepPath + '/' + deepFile);
                                    var name = deepPath.replace("./", "").replace(conf.sound_dir + "/", "");
                                    var level = 0; // 0-基础;1-困难;2-非常困难
                                    var flag = true;
                                    if (deepFile.indexOf("adv") > -1) {
                                        level = 1;
                                    }
                                    if (deepFile.indexOf("ext") > -1) {
                                        level = 2;
                                    }
                                    result.forEach(function(e) {
                                        if (e.name === name) {
                                            e.dtxs.push({ file: (deepPath + '/' + deepFile), level: level });
                                            flag = false;
                                        }
                                    });
                                    if (flag) {
                                        result.push({ name: name, dtxs: [{ file: (deepPath + '/' + deepFile), level: level }] });
                                    }
                                }
                                // 执行callback
                                if (result.length === dirLen) { // 此处边界注意-因为如果判断“遍历到最后文件夹的最后文件”时前次遍历的异步操作还未做完-故而不对
                                    callback(response, result);
                                }
                            });
                        });
                    });
                }
            });
        });
    });
}

function start(response, param) {
    console.log("Request handler 'start' was called.");
    fs.readFile('./views/index.html', 'utf-8', function(err, data) { // 读取内容 
        if (err) throw err;
        response.writeHead(200, { "Content-Type": "text/html" }); // 向浏览器输出html页面
        response.write(data);
        response.end();
    });
}

function asyncFun(fun, response) { // “耗时”操作
    exec("for /r d: %i in (*.dtx) do @echo %i", { timeout: 10000, maxBuffer: 20000 * 1024 },
        function(error, stdout, stderr) {
            fun(response);
        });
}

exports.start = start;
exports.list = list;
exports.detail = detail;
exports.play = play;
exports.parseDtx = parseDtx;