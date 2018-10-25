// Export for Phantom page context
if (typeof window !== 'undefined') {
    // Setup namespace
    window.piskelCli = window.piskelCli || {};
    window.piskelCli.exportPixiMovie = {};

    // Export
    window.piskelCli.exportPixiMovie.onPageEvaluate = function (pngExportController, options) {
        var piskel = pskl.app.piskelController.getPiskel();

        var defaultGetDescriptor = piskel.getDescriptor;

        // Use output name without path as piskel name instead of descriptor name
        pskl.app.piskelController.getPiskel().getDescriptor = function () {
            var lastIndexOfSlash = options.output.lastIndexOf('/') > -1 ?
                options.output.lastIndexOf('/') + 1 :
                0;

            return { name: options.output.slice(lastIndexOfSlash) };
        };

        // Mock JSZip so we can serialize the commands for later zipping
        window.JSZip = function JSZip() {
            window.mockJSZip = this;

            this.files = [];

            this.file = function (name, data, options) {
                this.files.push({
                    name: name,
                    data: data,
                    options: options
                });
            };

            // No-op
            this.generate = function () {};
        };

        // No-op
        pskl.utils.FileUtils.downloadAsFile = function () {};

        // Mock the inline data-uri as image checkbox
        pngExportController.pixiInlineImageCheckbox = { checked: false };

        // Run the export
        pngExportController.onPixiDownloadClick_();

        piskel.getDescriptor = defaultGetDescriptor;

        return JSON.stringify(window.mockJSZip);
    };
}

// Export for non-browser import
if (typeof require !== 'undefined') {
    module.exports = {
        // Runs in phantom script context
        onPageExit: function (page, options, data) {
            var fs = require('fs');

            // Get pixi movie json file info
            const movieJson = JSON.parse(data.pixiMovieZip).files[1];

            // Write pixi movie json file
            fs.write(movieJson.name, movieJson.data, 'w');

            // Create zip manifest
            const zipManifest = JSON.stringify(JSON.parse(data.pixiMovieZip).files.map(function (file) {
                return file.name;
            }));

            fs.write('zip-manifest.json', zipManifest, 'w');

            console.log(' ' + options.output + '.zip');
        },

        // Runs in node context
        onPhantomExit: function (options) {
            const fs = require('fs');
            const path = require('path');
            const JSZip = require('JSZip');

            // Create final zip for PixiJS Movie export
            const zipManifest = JSON.parse(fs.readFileSync('zip-manifest.json', 'utf-8'));

            const zip = new JSZip();

            zipManifest.forEach(function (filename) {
                if (filename.indexOf('.png') > -1) {
                    zip.file(path.basename(filename), fs.readFileSync(filename), { binary: true });
                } else {
                    zip.file(path.basename(filename), fs.readFileSync(filename));

                    fs.unlinkSync(filename);
                }
            });

            zip.generateAsync({
                type : 'nodebuffer'
            }).then(function (zipped) {
                fs.writeFileSync(options.output.replace('.png', '') + '.zip', zipped, 'utf-8');
            });

            fs.unlinkSync('zip-manifest.json');
        }
    };
}
