function Greeter(lang) {
    this.language = lang;
    this.greet = function () {
        switch (this.language) {
            case 'en': return "Hello";
            case 'cn': return "你好";
            default: return "No speak that langua";
        }
    }
}

exports.hello_world = function () {
    console.log("Hello World");
};

exports.goodbye = function () {
    console.log("bye-bye");
}

exports.create_greeter = function (lang) {
    return new Greeter(lang);
}