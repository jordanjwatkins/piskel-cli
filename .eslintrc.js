module.exports = {
    extends: "eslint:recommended",

    env: {
        browser: true,
        es6: true,
        node: true,
        jest: true
    },

    globals: {
        pskl: true,
        phantom: true
    },

    plugins: ["jest"],

    rules: {
        "no-console": "off",
        "comma-dangle": ["error", "never"],
        "object-curly-spacing": ["error", "always"],
        "quotes": ["error", "single"],
        "semi": ["error", "always"]
    }
};
