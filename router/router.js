//------------------------------------------------ 
// router.js 
// 路由
// 封装router成模块,并暴露给外部使用.
//------------------------------------------------ 

function route(handle, pathname, param, response) {
    // console.log("About to route a request for " + pathname);
    if (typeof handle[pathname] === 'function') {
        return handle[pathname](response, param);
    } else {
        // console.log("No request handler found for " + pathname);
        response.writeHead(404, { "Content-Type": "text/html" });
        response.end("<h1>404 Not Found</h1>");
    }
}

exports.route = route;