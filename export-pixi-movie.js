// Export exportPixiMovie for Phantom page evaluate context
window.piskelCli = window.piskelCli || {};

window.piskelCli.exportPixiMovie = function (pngExportController) {
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

    pngExportController.pixiInlineImageCheckbox = { checked: false };

    pngExportController.onPixiDownloadClick_();
};