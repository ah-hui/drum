/**
 * 封装server成模块,并暴露给外部使用.
 */
var http = require("http"),
    url = require("url");

function start(route, handle) {
    http.createServer().on('request', function(req, res) {
        //每个请求默认还有一个对favicon.ico资源的请求-屏蔽否则输出2次
        if (req.url != '/favicon.ico') {
            var postData = ""; // post请求正文
            var pathname = url.parse(req.url).pathname;
            console.log("Request for " + pathname + " received.");

            req.setEncoding("utf8"); // 设置接收数据的编码格式为utf8

            // 注册data事件-收集每次收到的新数据块-大段内容时会触发多次
            req.addListener("data", function(postDataChunk) {
                postData += postDataChunk;
                // for debug - 数据块到达时输出日志不妥（数据量可能巨大）-仅开发阶段使用
                console.log("Receiverd POST data chunk '" + postDataChunk + "'");
            });

            // 注册end事件-确保所有数据接收完毕后触发一次end
            req.addListener("end", function() {
                /**
                 * 非阻塞的方式-将服务器“传递”给内容
                 * 就是将response对象（从服务器的回调函数onRequest()获取）通过请求路由传递给请求处理程序。 随后，处理程序就可以采用该对象上的函数来对请求作出响应
                 */
                route(handle, pathname, res, postData);
            });
        }
    }).listen(8888);
    console.log("Server has started. Running at http://localhost:8888/");
}

exports.start = start;