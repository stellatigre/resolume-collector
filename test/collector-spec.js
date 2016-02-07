var fs = require('fs');
var assert = require('chai').assert;
var collector = require('../collector');

var clips = fs.readdirSync('test/data/clips')
                .map((file) => `./data/clips/${file}`).map(require);

describe('#getNewPaths', () => {

    var videoOnly = {
        video : '/Users/stella/material/Pure Moods.mov',
        audio : ''
    }
    var audioOnly = {
        video : '',
        audio : '/Users/stella/material/music/coolparty.mp3'
    };

    var newVideoPaths = collector.getNewPaths(process.cwd(), videoOnly);
    var newAudioPaths = collector.getNewPaths(process.cwd(), audioOnly);

    it('should return the output dir + "video/<filename>" for video clip if present', () => {
        var expected = process.cwd() + '/video/Pure Moods.mov';
        assert.equal(newVideoPaths.video, expected);
    });

    it('should return \'\' for audio if there\'s no input audio clip', () => {
        assert.equal(newVideoPaths.audio, '');
    });

    it('should return the output dir + "audio/<filename>" for audio clip if present', () => {
        var expected = process.cwd() + '/audio/coolparty.mp3';
        assert.equal(newAudioPaths.audio, expected);
    });

    it('should return \'\' for video if there\'s no input video clip', () => {
        assert.equal(newAudioPaths.video, '');
    });

});


describe('#clipHasFile', () => {

    var audioOnly               = clips[0];
    var neither                 = clips[1];
    var videoWithEmbeddedAudio  = clips[2];
    var videoOnly               = clips[3];

    it('should return true if the clip has video or audio files', () => {
        assert.ok(collector.clipHasFile(videoOnly));
        assert.ok(collector.clipHasFile(videoOnly));
        assert.ok(collector.clipHasFile(videoWithEmbeddedAudio));
    });

    it('should return false if the clip has no video or audio files', () => {
        assert.notOk(collector.clipHasFile(neither));
    });

});
