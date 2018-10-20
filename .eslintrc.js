module.exports = {
    extends: "eslint:recommended",

    env: {
        browser: true,
        es6: true,
        node: true
    },

    globals: {
        pskl: true,
        phantom: true
    },

    rules: {
        "no-console": "off",
        "quotes": ["error", "single"],
        "semi": ["error", "always"]
    }
};