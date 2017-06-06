//------------------------------------------------ 
// app.js 
// app（启动服务器）
// 依赖其他模块.
//------------------------------------------------ 

var server = require("./server/server");
var router = require("./router/router");
var handler = require("./handler/handler");

var handle = {}; // 路由映射表
handle["/start.do"] = handler.start;

server.start(router.route, handle);