const fs = require('fs');

function onPageEvaluate(window, options, piskel) {
    console.log('\nPiskel name: ' + piskel.descriptor.name);

    // Setup piskelController
    var piskelController = new pskl.controller.piskel.PiskelController(piskel);

    pskl.app.piskelController = piskelController;

    piskelController.init();

    // Apply crop if enabled
    if (options.crop) {
        // Mock selection manager to avoid errors during crop
        pskl.app.selectionManager = {};

        // Setup crop tool
        var crop = new pskl.tools.transform.Crop();

        // Perform crop
        crop.applyTransformation();

        // Get cropped piskel
        piskel = piskelController.getPiskel();
    }

    // Use output name without path as piskel name instead of descriptor name
    piskelController.getPiskel().getDescriptor = function () {
        var lastIndexOfSlash = options.output.lastIndexOf('/') > -1 ?
            options.output.lastIndexOf('/') + 1 :
            0;

        return { name: options.output.slice(lastIndexOfSlash) };
    };

    // Mock exportController to provide zoom value based on cli args
    // and to avoid errors and/or unnecessary bootstrapping
    var exportController = {
        getExportZoom: function () {
            var zoom = options.zoom;

            if (options.scaledWidth) {
                zoom = options.scaledWidth / piskel.getWidth();
            } else if (options.scaledHeight) {
                zoom = options.scaledHeight / piskel.getHeight();
            }

            return zoom;
        }
    };

    // Setup pngExportController
    var pngExportController = new pskl.controller.settings.exportimage.PngExportController(piskelController, exportController);

    // Mock getColumns and getRows to use values from cli arguments
    pngExportController.getColumns_ = function () {
        if (options.columns) return options.columns;

        if (options.rows) {
            return Math.ceil(piskelController.getFrameCount() / pngExportController.getRows_());
        } else {
            return pngExportController.getBestFit_();
        }
    };

    pngExportController.getRows_ = function () {
        if (options.columns && !options.rows) {
            return Math.ceil(piskelController.getFrameCount() / pngExportController.getColumns_());
        }

        return options.rows || 1;
    };

    if (options.pixiMovie) window.piskelCli.exportPixiMovie(pngExportController);

    // Render to output canvas
    var canvas;

    if (options.frame > -1) {
        // Render a single frame
        canvas = piskelController.renderFrameAt(options.frame, true);

        var zoom = exportController.getExportZoom();

        if (zoom != 1) {
            // Scale rendered frame
            canvas = pskl.utils.ImageResizer.resize(canvas, canvas.width * zoom, canvas.height * zoom, false);
        }
    } else {
        // Render the sprite sheet
        canvas = pngExportController.createPngSpritesheet_();
    }

    // Add output canvas to DOM
    window.document.body.appendChild(canvas);

    // Prepare return data
    const returnData = {
        width: canvas.width,
        height: canvas.height,
        pixiMovieZip: JSON.stringify(window.mockJSZip)
    };

    // Wait a tick for things to wrap up
    setTimeout(function ()  {
        // Exit and pass data to parent process
        window.callPhantom(returnData);
    }, 0);
}

function onPageExit(page, options, data) {
    // Set clip for output image
    if (data.width && data.height) {
        page.clipRect = { top: 0, left: 0, width: data.width, height: data.height };
    }

    console.log('\n' + 'Generated file(s):');

    const output = options.output + '.png';

    // Render page to the output image
    page.render(output);

    console.log(' ' + output);

    const dataUri = 'data:image/png;base64,' + page.renderBase64('PNG');

    if (options.dataUri) {
        const dataUriPath = options.output + '.datauri';

        // Write data-uri to file
        fs.write(dataUriPath, dataUri, 'w');

        console.log(' ' + dataUriPath);
    }

    if (data.pixiMovieZip) {
         // Get pixi movie json file info
        const fileToZip = JSON.parse(data.pixiMovieZip).files[1];

        // Write pixi movie json file
        fs.write(fileToZip.name, fileToZip.data, 'w');

        // Create zip manifest
        const zipManifest = JSON.stringify(JSON.parse(data.pixiMovieZip).files.map(function (file) {
            return file.name;
        }));

        fs.write('zip-manifest.json', zipManifest, 'w');

        console.log(' ' + options.output + '.zip');
    }
}

module.exports = {
    onPageEvaluate: onPageEvaluate,
    onPageExit: onPageExit
};
