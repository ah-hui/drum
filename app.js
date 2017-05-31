/**
 * 服务器index,依赖其他模块.
 */
var server = require("./server/server");
var router = require("./router/router");
var requestHandlers = require("./handler/handler");

var handle = {}; // 路由映射表
handle["/"] = requestHandlers.start;
handle["/start"] = requestHandlers.start;
handle["/upload"] = requestHandlers.upload;
handle["/show"] = requestHandlers.show;

server.start(router.route, handle);