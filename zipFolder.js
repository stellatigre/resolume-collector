// modified from https://github.com/sole/node-zip-folder/blob/master/index.js

var fs = require('fs');
var archiver = require('archiver');
var progressStream = require('progress-stream');
var ProgressBar = require('progressbar').ProgressBar;
var getSize = require('get-folder-size');

function Mb(bytes) {
	return (bytes / 1024 / 1024).toFixed(2) + ' Mb'
}

function zipFolder(srcFolder, zipFilePath, callback) {
	var output = fs.createWriteStream(zipFilePath);
	var zipArchive = archiver('zip');

	getSize(srcFolder, (err, size) => {
		var bar = new ProgressBar();
		console.log(`${Mb(size)} in project folder, zipping...`);
		bar.step('zipping project folder').setTotal(size);

		var zipProgress = progressStream({
			length: size,
		});
		zipProgress.on('progress', (progress) => {
			 // always seems about 7 percent slow, so ...
			bar.setTick(progress.transferred * 1.0666);
		});

		output.on('close', function() {
			bar.setTick(size);
			callback();
		});

		zipArchive.pipe(zipProgress).pipe(output);

		zipArchive.bulk([
			{ cwd: srcFolder, src: ['**/*'], expand: true }
		]);

		zipArchive.finalize(function(err, bytes) {
			if(err) {
				callback(err);
			}
		});
	})
}

module.exports = zipFolder;
