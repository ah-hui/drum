//------------------------------------------------ 
// server.js 
// Web服务器
// 封装server成模块,并暴露给外部使用.
//------------------------------------------------ 

console.time("[WebSvr][Start]"); // 开始服务启动计时器

var http = require("http"), // HTTP协议模块
    url = require("url"), // URL解析模块
    fs = require("fs"), // 文件系统模块
    path = require("path"), // 路径解析模块
    querystring = require("querystring"), // 对http请求所带的数据进行解析
    extend = require('util')._extend, // 深度拷贝方法
    conf = require("../config/system"); // 服务器参数;

function start(route, handle) {
    'use strict';

    http.createServer().on('request', function(req, res) {
        req.setEncoding("utf8"); // 设置接收数据的编码格式为utf8
        var param = url.parse(req.url, true).query; // 请求参数
        var postData = ""; // post数据
        var pathname = url.parse(req.url, true).pathname;
        console.log((new Date()).toLocaleString() + " [WebSvr][Start] Request for " + pathname + " received. Params(GET): " + JSON.stringify(param));
        if ('' === pathname || '/' === pathname) {
            pathname = '/index.html';
        }
        // 不允许请求其他路径的文件
        pathname = pathname.replace(/\.\//g, '').replace(/\..\//g, '');
        // 处理post请求-start-node默认不处理
        req.addListener("data", function(postDataChunk) { // 注册data事件-收集每次收到的新数据块-大段内容时会触发多次
            postData += postDataChunk;
            // for debug - 数据块到达时输出日志不妥（数据量可能巨大）-仅开发阶段使用
            // console.log("Receiverd POST data chunk '" + postDataChunk + "'");
        });
        req.addListener("end", function() { // 注册end事件-确保所有数据接收完毕后触发一次end
            // 合并get和post参数-经javaWeb项目测试用get参数覆盖合并post参数
            param = extend(querystring.parse(postData), param); //GET & POST
            // console.log("After merge POST parms:" + JSON.stringify(param));
            if (conf.view_ext.indexOf(path.extname(pathname)) >= 0) {
                // 获取视图资源
                var filePath = path.join(conf.viewroot, pathname);
                fs.exists(filePath, function(exists) {
                    if (exists) {
                        readFile(req, res, filePath);
                    } else {
                        notFound(res, filePath);
                    }
                });
            } else if (conf.res_ext.indexOf(path.extname(pathname)) >= 0) {
                // 获取静态资源
                var filePath = pathname.substring(1, pathname.length); // 去掉首个斜线
                filePath = querystring.unescape(filePath); // 此处直接unesc是否会有安全漏洞
                // console.log("============" + filePath);
                fs.exists(filePath, function(exists) {
                    if (exists) {
                        readFile(req, res, filePath);
                    } else {
                        notFound(res, filePath);
                    }
                });
            } else if (conf.bus_ext.indexOf(path.extname(pathname)) >= 0) {
                /**
                 * 非阻塞的方式-将服务器“传递”给内容
                 * 就是将response对象（从服务器的回调函数onRequest()获取）通过请求路由传递给请求处理程序。 随后，处理程序就可以采用该对象上的函数来对请求作出响应
                 */
                route(handle, pathname, param, res);
            } else {
                notFound(res, pathname);
            }
        });
        // 处理post请求-end-node默认不处理
    }).on("error", function() {
        console.error(error); // 在控制台中输出错误信息
    }).listen(conf.port, function() {
        // 向控制台输出服务启动的信息 
        console.log((new Date()).toLocaleString() + " [WebSvr][Start] running at http://127.0.0.1:8888/");
        console.timeEnd("[WebSvr][Start]"); // 结束服务启动计时器并输出
    });
}

function readFile(req, res, pathname) {
    fs.stat(pathname, function(err, stat) {
        var lastModified = stat.mtime.toUTCString();
        if (req.headers["if-modified-since"] && lastModified === req.headers["if-modified-since"]) {
            notModified(res);
        } else {
            res.writeHead(200, "ok", { "Last-Modified": lastModified, "Content-Type": getContentType(pathname) });
            var stream = fs.createReadStream(pathname);
            // 指定如果流读取错误,返回404错误 
            stream.on("error", function() {
                res.writeHead(404);
                res.end("<h1>404 Read Error</h1>");
            });
            stream.pipe(res);
        }
    });
}

function notModified(res) {
    res.writeHead(304, "Not Modified");
    res.end();
}

function notFound(res, filePath) {
    // 返回404错误
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>404 Not Found</h1>");
}

// 依据路径获取返回内容类型字符串,用于http返回头 
function getContentType(filePath) {
    var contentType = "";
    // 使用路径解析模块获取文件扩展名 
    var ext = path.extname(filePath);
    switch (ext) {
        case ".html":
            contentType = "text/html";
            break;
        case ".js":
            contentType = "text/javascript";
            break;
        case ".css":
            contentType = "text/css";
            break;
        case ".gif":
            contentType = "image/gif";
            break;
        case ".jpg":
            contentType = "image/jpeg";
            break;
        case ".png":
            contentType = "image/png";
            break;
        case ".ico":
            contentType = "image/icon";
            break;
        case ".mp3":
            contentType = "audio/mp3";
            break;
        case ".wav": // chrome不支持wav格式
            contentType = "audio/wav";
            break;
        case ".avi":
            contentType = "video/x-msvideo";
            break;
        default:
            contentType = "application/octet-stream";
    }
    return contentType; // 返回内容类型字符串 
}

exports.start = start;