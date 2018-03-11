module.exports = {
    "extends": "airbnb-base",
    "plugins": [
        "import",
        "mocha"
    ],

    "rules": {
        "indent": ["error", 4],
        "mocha/valid-suite-description": [2, "^[A-Z]*"]
    }
};