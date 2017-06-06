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
    conf = require("../config/system"); // 服务器参数;

function start(route, handle) {
    'use strict';

    http.createServer().on('request', function(req, res) {
        req.setEncoding("utf8"); // 设置接收数据的编码格式为utf8
        var param = url.parse(req.url, true).query;
        var pathname = url.parse(req.url, true).pathname;
        console.log("Request for " + pathname + " received. Params: " + JSON.stringify(param));
        if ('' === pathname || '/' === pathname) {
            pathname = '/index.html';
        }
        // 不允许请求其他路径的文件
        pathname = pathname.replace(/\.\//g, '').replace(/\..\//g, '');
        console.log(pathname);
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
            fs.exists(filePath, function(exists) {
                if (exists) {
                    readFile(req, res, filePath);
                } else {
                    notFound(res, filePath);
                }
            });
        } else if (conf.bus_ext.indexOf(path.extname(pathname)) >= 0) {
            /**
             * 进入路由处理业务逻辑
             * 非阻塞的方式 - 将服务器“ 传递” 给内容
             * 就是将response对象（ 从服务器的回调函数onRequest() 获取）
             * 通过请求路由传递给请求处理程序。
             * 随后，处理程序就可以采用该对象上的函数来对请求作出响应
             */
            route(handle, pathname, param, res);
        } else {
            notFound(res, pathname);
        }
    }).on("error", function() {
        console.error(error); // 在控制台中输出错误信息
    }).listen(conf.port, function() {
        // 向控制台输出服务启动的信息 
        console.log((new Date()).toLocaleString() + "[WebSvr][Start] running at http://127.0.0.1:8888/");
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
        default:
            contentType = "application/octet-stream";
    }
    return contentType; // 返回内容类型字符串 
}

exports.start = start;