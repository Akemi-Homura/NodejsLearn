var async = require("async");

async.auto({
    numbers: function (callback) {
        setTimeout(function () {
            callback(null, [1, 2, 3]);
        }, 1500);
    },
    strings: function (callback) {
        setTimeout(function () {
            callback(null, ["a", "b", "c"]);
        }, 2000);
    },
    /**
     * do not execute this function until numbers and strings are done 
     * thus_far is an object with numbers and strings as arrays
     * @param callback 传递给结果函数的
     * @param thus_far 收集了{@link numbers} 和 {@link @strings} 的结果，并用字典数组存起来
     */
    assemble: ['numbers', 'strings', function (thus_far, callback) {
        callback(null, {
            numbers: thus_far.numbers.join(", "),
            strings: "'" + thus_far.strings.join(", ") + "'"
        });
    }]
},
// this is called at the end when all other functions hava executed. Optional
function (err, results) {
    if (err) {
        console.log(err);
    } else {
        console.log(results);
    }
});