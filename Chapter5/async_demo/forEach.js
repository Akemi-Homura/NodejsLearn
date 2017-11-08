var async = require('async');

async.forEachSeries(
    arr,
    // called for each element in arr
    function (element, callback) {
        // use element
        callback(null); // YOU MUST CALL ME FOR EACH ELEMENT
    },
    // called at the end
    function(err){
        // was there an error? err will be non-null then
    }
);