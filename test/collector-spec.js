var fs = require('fs');
var path = require('path');
var assert = require('chai').assert;
var collector = require('../collector');

var clips = fs.readdirSync('test/data/clips')
                .filter((file) => path.extname(file) === '.json')
                .map((file) => require(`./data/clips/${file}`));

var audioOnly               = clips[0];
var nonFile                 = clips[1];
var videoWithAudio          = clips[2];
var videoOnly               = clips[3];

describe('#oldPaths', () => {

    var both = collector.oldPaths(videoWithAudio);
    var audio = collector.oldPaths(audioOnly);
    var video = collector.oldPaths(videoOnly);

    it('should return both paths for a video clip with sound', () => {
        var expected = '/Users/stella/VJ Materials/Moving star field - 720p (colour).mov';
        assert.equal(both.video, expected);
        assert.equal(both.audio, expected);
    });

    it('should return \'\' for video if there\'s no input video file', () => {
        assert.equal(audio.video, '');
    });

    it('should return the existing path for an audio clip if present', () => {
        var expected = '/Users/stella/Love Hz Freq 5 Final.wav';
        assert.equal(audio.audio, expected);
    });

    it('should return \'\' for audio if there\'s no input audio file', () => {
        assert.equal(video.audio, '');
    });

});

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

    it('should return true if the clip has video or audio files', () => {
        assert.ok(collector.clipHasFile(videoOnly));
        assert.ok(collector.clipHasFile(videoOnly));
        assert.ok(collector.clipHasFile(videoWithAudio));
    });

    it('should return false if the clip has no video or audio files', () => {
        assert.notOk(collector.clipHasFile(nonFile));
    });

});
