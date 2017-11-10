module.exports = {
    "plugins":["jquery-1.8.3.js"],
    "env": {
        "node": true,
        "browser":true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4,
            {"SwitchCase":1}
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": "off",
        "semi": "off",
        "no-console": "off",
        "no-unused-vars": "warn",
        "no-undefined": "error",
    }
};