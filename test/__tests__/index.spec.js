const fs = require('fs');
const path = require('path');
const pixelmatch = require('pixelmatch');
const PNG = require('pngjs').PNG;

let exit;
let debugLogs = false;
const consoleLog = console.log;

// Extract original argv values for resetting
const argv = [...process.argv];

beforeEach(() => {
    // Only print logs and errors to stdout if log debugging is enabled
    jest.spyOn(console, 'log').mockImplementation((...log) => debugLogs && consoleLog(...log));
    jest.spyOn(console, 'error').mockImplementation((...log) => debugLogs && consoleLog(...log));

    // Throw error when process.exit is called in unit under test
    exit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
    });
});

afterEach(() => {
    // Prepare module(s) to be required fresh in the next test
    jest.resetModules();

    // Reset process.argv with its original values
    process.argv = [...argv];

    // Unlink generated files
    if (fs.existsSync(path.resolve(__dirname, '../out/wheel-shield-2.png'))) {
        fs.unlinkSync(path.resolve(__dirname, '../out/wheel-shield-2.png'));
    }

    if (fs.existsSync(path.resolve(__dirname, '../../wheel-shield-2.png'))) {
        fs.unlinkSync(path.resolve(__dirname, '../../wheel-shield-2.png'));
    }
});

describe('piskel-cli', () => {
    describe('when run with no arguments', () => {
        test('will exit with 1', () => {
            callCli();

            expect(exit).toHaveBeenCalledWith(1);
        });
    });

    describe('when passed a path to a piskel file', () => {
        beforeEach(() => process.argv.push('./test/fixtures/wheel-shield-2'));

        test('will exit with 0', () => {
            callCli();

            expect(exit).toHaveBeenCalledWith(0);
        });

        test('will create a png file in the working directory', () => {
            callCli();

            const pngExists = fs.existsSync(path.resolve(__dirname, '../../wheel-shield-2.png'));

            expect(pngExists).toBe(true);
        });

        test('will create a png file that matches the expected default output', () => {
            callCli();

            expect(imageCompare()).toBe(0);
        });

        describe('when a cli argument should result in non-default output', () => {
            test('will create a png file that does not match the expected default output', () => {
                callCli(['--rows', '1']);

                try {
                    imageCompare();
                } catch (e) {
                    expect(e.message).toBe('Image sizes do not match.');
                }
            });
        });

        describe('when an output argument is provided', () => {
            test('will create a png file at the specified path', () => {
                callCli('--output ./test/out/wheel-shield-2.png');

                const pngExists = fs.existsSync(path.resolve(__dirname, '../out/wheel-shield-2.png'));

                expect(pngExists).toBe(true);
            });
        });
    });
});

function callCli(args) {
    // If a string of args is supplied, split it
    if (typeof args === 'string') {
        args = args.split(' ');
    }

    // Add any passed args onto process.argv
    if (args) {
        process.argv.push(...args);
    }

    // Catch any "exit" errors thrown by mocked process.exit
    try {
        require('../../index.js');
    } catch (e) {
        if (e.message !== 'exit') {
            throw e;
        }
    }
}

function imageCompare({ fixture = 'wheel-shield-2.png', generated = '../../wheel-shield-2.png' } = {}) {
    const snapshotPng =  PNG.sync.read(fs.readFileSync(path.resolve(__dirname, `../fixtures/${fixture}`)));
    const generatedPng =  PNG.sync.read(fs.readFileSync(path.resolve(__dirname, generated)));

    const { width, height } = snapshotPng;

    const diff = new PNG({ width, height });

    return pixelmatch(snapshotPng.data, generatedPng.data, diff.data, width, height);
}
