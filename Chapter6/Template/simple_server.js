var http = require('http'),
    fs = require('fs'),
    url = require('url'),
    path = require('path');

function handle_incoming_request(req, res) {
    // parse the query params into an object and get the path
    // without them. (true for 2nd param means parse the params).
    req.parsed_url = url.parse(req.url, true);
    var core_url = req.parsed_url.pathname;

    // test this updated url to see what they're asking for
    if (core_url.substring(0, 11) == '/pages/') {
        serve_page(req, res);
    } else if (core_url.substring(0, 11) == '/templates/') {
        serve_static_file("templates/" + core_url.substring(11), res);
    } else if (core_url.substring(0, 9) == '/content/') {
        serve_static_file("content/" + core_url.substring(9), res);
    } else if (core_url == 'album.json') {
        handle_list_albums(req, res);
    } else if (core_url.substr(0, 7) == '/albums'
        && core_url.substr(core_url.length - 5) == '.json') {
        handle_get_album(req, res);
    } else {
        send_failure(res, 404, invalid_resource());
    }
}

/**
 * All pages come from the same one skeleton HTML file that 
 * just changes the name of the JavaScript loader that needs to be downloaded 
 */
function serve_page(req, res) {
    var core_url = req.parsed_url.pathname;
    var page = core_url.substring(7); // remove /pages/
    // currently only support home!
    if (page != 'home') {
        send_failure(res, 404, invalid_resource());
        return;
    }

    fs.readFile(
        'basic.html',
        function (err, contents) {
            if (err) {
                send_failure(res, 500, err);
                return;
            }

            contents = contents.toString('utf8');

            // replace page name, and the dump to output
            contents = contents.replace('{{PAGE_NAME}}', page);
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(contents);
        }
    );
}

function load_album_list(callback) {
    fs.readdir(
        "albums",
        function (err, files) {
            if (err) {
                callback(make_error("file_error", JSON.stringify(err)));
                return;
            }

            var only_dirs = [];
            (function iterator(index) {
                if (index == files.length) {
                    callback(null, only_dirs);
                    return;
                }
                fs.stat(
                    "albums/" + files[index],
                    function (err, stats) {
                        if (err) {
                            callback(make_error("file_error", JSON.stringify(err)));
                            return;
                        }
                        if (stats.isDirectory()) {
                            var obj = { name: files[index] };
                            only_dirs.push(obj);
                        }
                        iterator(index + 1);
                    }
                );
            })(0);
        }
    );
}

function load_album(album_name, page, page_size, callback) {
    fs.readdir(
        "albums/" + album_name,
        function (err, files) {
            if (err) {
                if (err.code == "ENOENT") {
                    callback(no_such_album());
                } else {
                    callback(make_error("file_error", JSON.stringify(err)));
                }
                return;
            }

            var only_files = [];
            var path = "albums/" + album_name + "/";

            (function iterator(index) {
                if (index == files.length) {
                    var ps;
                    ps = only_files.splice(page * page_size, page_size);
                    var obj = {
                        short_name: album_name,
                        photos: ps
                    };
                    callback(null, obj);
                    return;
                }
                fs.stat(
                    path + files[index],
                    function (err, stats) {
                        if (err) {
                            callback(make_error("file_error",
                                JSON.stringify(err)));
                            return;
                        }
                        if (stats.isFile()) {
                            var obj = {
                                filename: files[index],
                                desc: files[index]
                            };
                            only_files.push(obj);
                        }
                        iterator(index + 1);
                    }
                );
            })(0);
        }
    );
}

function handle_rename_album(req, res) {
    // 1. Get the album name from the URL
    var core_url = req.parsed_url.pathname;
    var parts = core_url.split("/");
    if (parts.length != 4) {
        send_failure(res, 404, invalid_resource(core_url));
        return;
    }
    var album_name = parts[2];

    // 2. get the post data for the request.
    var json_body = "";
    req.on(
        "readable",
        function () {
            var d = req.read();
            if (d) {
                if (typeof d == "string") {
                    json_body += d;
                } else if (typeof d == 'object' && d instanceof Buffer) {
                    json_body += d.toString('utf8');
                }
            }
        }
    );

    // 3. when we have all the post data, make sure we have valid data and then try to do the rename.
    req.on(
        "end",
        function () {
            // did we get a body?
            if (json_body) {
                try {
                    var album_data = JSON.parse(json_body);
                    if (!album_data.album_name) {
                        send_failure(res, 403, missing_data('album_name'));
                        return;
                    }
                } catch (e) {
                    // got a body, but not valid json
                    send_failure(res, 403, bad_json());
                    return;
                }


                // 4. Perform rename!
                do_rename(
                    album_name,         // old
                    album_data.album_name, // new
                    function (err, results) {
                        if (err && err.code == "ENOENT") {
                            send_failure(res, 403, no_such_album());
                            return;
                        } else if (err) {
                            send_failure(res, 500, file_error(err));
                            return;
                        }
                        send_success(res, null);
                    }
                );
            } else { // didn't get a body
                send_failure(res, 403, bad_json());
                res.end();
            }
        }
    );


}
function serve_static_file(file, res) {
    fs.exists(file, function (exists) {
        if (!exists) {
            res.writeHead(404, { "Content-Type": "application/json" });
            var out = { error: "not_found", message: "'" + file + "' not found" };
            res.end(JSON.stringify(out) + "\n");
            return;
        }
        var rs = fs.createReadStream(file);

        rs.on(
            'error',
            function (e) {
                res.end();
            }
        )

        var ct = content_type_for_path(file);
        res.writeHead(200, { "Content-Type": ct });
        // from one data stream to another data stream
        rs.pipe(res);
    });
}

function content_type_for_path(file) {
    var ext = path.extname(file);
    switch (ext.toLowerCase()) {
        case '.html': return "text/html";
        case '.js': return "text/javascript";
        case '.css': return "text/css";
        case '.jpg': case '.jpeg': return 'image/jpeg';
        default: return 'text/plain';
    }
}

function handle_list_albums(req, res) {
    load_album_list(function (err, albums) {
        if (err) {
            send_failure(res, 500, err);
            return;
        }

        send_success(res, { albums: albums });
    });
}

function handle_get_album(req, res) {
    // get the GET params
    var getp = req.parsed_url.query;
    var page_num = getp.page ? getp.page : 0;
    var page_size = getp.page_size ? getp.page_size : 1000;

    if (isNaN(parseInt(page_num))) page_num = 0;
    if (isNaN(parseInt(page_size))) page_size = 1000;
    var core_url = req.parsed_url.pathname;

    var album_name = core_url.substr(7, core_url.length - 12);
    load_album(
        album_name,
        page_num,
        page_size,
        function (err, album_contents) {
            if (err && err.error == "no_such_album") {
                send_failure(res, 404, err);
            } else if (err) {
                send_failure(res, 500, err);
            } else {
                send_success(res, { album_data: album_contents });
            }
        }
    );
}

function make_error(err, msg) {
    var e = new Error(msg);
    e.code = err;
    return e;
}

function send_success(res, data) {
    res.writeHead(200, { "Content-Type": "application/json" });
    var output = { error: null, data: data };
    res.end(JSON.stringify(output) + "\n");
}

function send_failure(res, code, err) {
    var err_code = (err.code) ? err.code : err.name;
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err_code, message: err.message }) + "\n");
}

function invalid_resource() {
    return make_error("invalid_resource",
        "the requested resource does not exist.");
}

function no_such_album() {
    return make_error("no_such_name",
        "The specified album does not exist");
}
var s = http.createServer(handle_incoming_request);
s.listen(8080);