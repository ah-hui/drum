// 请求处理器
var exec = require("child_process").exec, // 执行shell命令-非阻塞
    querystring = require("querystring"), // 
    fs = require("fs"), // 
    path = require("path"); // 

function start(response) {
    console.log("Request handler 'start' was called.");
    var body = '<html>' +
        '<head>' +
        '<meta http-equiv="Content-Type" content="text/html; ' +
        'charset=UTF-8" />' +
        '</head>' +
        '<body>' +
        '<form action="/upload" method="post">' +
        '<textarea name="text" rows="20" cols="60"></textarea>' +
        '<input type="submit" value="Submit text" />' +
        '</form>' +
        '</body>' +
        '</html>';
    // 向浏览器输出html页面
    response.writeHead(200, { "Content-Type": "text/html" });
    response.write(body);
    response.end();

    // 向浏览器输出文本
    // response.writeHead(200, { "Content-Type": "text/plain" });
    // response.write("Hello Start!");
    // response.end();
}

function upload(response, postData) {
    console.log("Request handler 'upload' was called.");

    response.writeHead(200, { "Content-Type": "text/plain" });
    response.write("You've sent: " + querystring.parse(postData).text);
    response.end();

    // 耗时5s的操作 sleep()实现
    // sleep(5000, function(res) {
    //     res.writeHead(200, { "Content-Type": "text/plain" });
    //     res.write("Hello Upload!");
    //     res.end();
    // }, response); //耗时5s的操作

    // 执行cmd命令打开计算器
    // exec("calc", { timeout: 10000, maxBuffer: 20000 * 1024 },
    //     function(error, stdout, stderr) {
    //         response.writeHead(200, { "Content-Type": "text/plain" });
    //         response.write(stdout);
    //         response.end();
    //     });
}

function show(response, postData) {
    console.log("Request handler 'show' was called.");
    // fs.readFile("./tmp/test.png", "binary", function(error, file) // ./表示项目根目录
    fs.readFile(path.resolve(__dirname, "../tmp/test.png"), "binary", function(error, file) {
        if (error) {
            response.writeHead(500, { "Content-Type": "text/plain" });
            response.write(error + "\n");
            response.end();
        } else {
            response.writeHead(200, { "Content-Type": "image/png" });
            response.write(file, "binary");
            response.end();
        }
    });
}

function sleep(milliSeconds, fun, response) { //自定义的“耗时”操作---CPU爆炸的方式实现
    var startTime = new Date().getTime();
    while (new Date().getTime() < startTime + milliSeconds);
    if (typeof fun === 'function') {
        fun(response);
    }
}

exports.start = start;
exports.upload = upload;
exports.show = show;