var fs = require('fs'),
    async = require('async');

function load_file_contents(path, callback) {
    async.waterfall([
        function (callback) {
            fs.open(path, 'r', callback);
        },
        // the f (file handle) was passed to the callback at the end of the fs.open function call. async passed all pararms to us.
        function (f, callback) {
            fs.fstat(f, function (err, stats) {
                if (err) {
                    // abort and go straight to resulting function
                    callback(err);
                } else {
                    callback(null, f, stats);
                }
            });
        },
        function (f, stats, callback) {
            if (stats.isFile()) {
                var b = new Buffer(10000);
                fs.read(f, b, 0, 10000, null, function (err, br, buf) {
                    if (err) {
                        callback(err);
                    } else {
                        // f and string are passed to next in waterfall
                        callback(null, f, b.toString('utf8', 0, br));
                    }
                });
            } else {
                callback({
                    error: "not_file",
                    message: "Can't load directory"
                });
            }
        },
        function (f, contents, callback) {
            fs.close(f, function (err) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, contents);
                }
            });
        }
    ],
    // this is called after all have executed in success case, or as soon as there is an error.
    function (err,file_contents){
        callback(err,file_contents);
    });
}