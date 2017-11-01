const dateUtils = {
    secondDiff: function(source, point) {
        return Math.floor((source.getTime() - point.getTime())/1000);
    },
    minuteDiff: function(source,point) {
        return Math.floor((source.getTime() - point.getTime())/(1000*60));
    },
    hourDiff: function(source,point) {
        return Math.floor((source.getTime() - point.getTime())/(1000*60*60));
    },
    dayDiff: function(source,point) {
        return Math.floor((source.getTime() - point.getTime()) / (1000 * 60 * 60 * 24));
    }
}

exports.dateUtils = dateUtils;
