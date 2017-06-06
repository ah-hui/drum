//------------------------------------------------ 
// handler.js 
// 请求处理器
// 封装handler成模块,并暴露给外部使用.
//------------------------------------------------ 

var fs = require("fs"),
    path = require("path");

function start(response, param) {
    console.log("Request handler 'start' was called.");
    fs.readFile('./views/index.html', 'utf-8', function(err, data) { // 读取内容 
        if (err) throw err;
        response.writeHead(200, { "Content-Type": "text/html" }); // 向浏览器输出html页面
        response.write(data);
        response.end();
    });
}

function sleep(milliSeconds, fun, response) { // 自定义的“耗时”操作---CPU爆炸的方式实现
    var startTime = new Date().getTime();
    while (new Date().getTime() < startTime + milliSeconds);
    if (typeof fun === 'function') {
        fun(response);
    }
}

exports.start = start;