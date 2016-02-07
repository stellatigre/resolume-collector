#!/usr/bin/env node
var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var cli = require('commander');
var xml2js = require('xml2js');
var zipFolder = require('./zipFolder');
var config = require('./config.json');

// so we don't copy the same clip in compositions that re-use
var copiedClips = [];

var composition, newRootFolder;

cli.option('-c, --composition <file>', config.describe.composition)
    .option('-o, --outputDir <directory>', config.describe.outputDir)
    .option('-r, --refresh', config.describe.refresh)
    .option('-z, --zip', config.describe.zip)
    .parse(process.argv);

var log = fs.createWriteStream('cliplog2.json');

// all the [0]s and ['$']s are because of the xml parsing
function clipHasFile(clip) {
    var videoFile, audioFile;
    if (clip.videoClip[0]) {
        videoFile = clip.videoClip[0].source[0]['$'].type === 'file';
    }
    if (clip.audioClip[0]) {
        audioFile = clip.audioClip[0].source[0]['$'].type === 'file';
    }
    return (audioFile || videoFile);
}

function setClipPaths(clip, paths) {
    if (clip.videoClip[0]) clip.videoClip[0].source[0]['$'].name = paths.video;
    if (clip.audioClip[0]) clip.audioClip[0].source[0]['$'].name = paths.audio;
}

function oldPaths(clip) {
    var video, audio;
    if (clip.videoClip[0]) {
        video = clip.videoClip[0].source[0]['$'].name;
    }
    if (clip.audioClip[0]) {
        audio = clip.audioClip[0].source[0]['$'].name;
    }
    return {video: video || '' , audio: audio || ''};
}

function getNewPaths(newRootFolder, oldPaths) {
    if (oldPaths.video) {
        video = path.join(newRootFolder, 'video', path.basename(oldPaths.video));
    }
    else video = ''

    if (oldPaths.audio) {
        audio = path.join(newRootFolder, 'audio', path.basename(oldPaths.audio));
    }
    else audio = ''

    return {video: video, audio: audio};
}

function defaultError(err, cb) {
    if (cb) cb(err, null);
    console.error(err);
}

function copyClip(clip, callback) {
    // make sure to exclude FX / non-file clips
    if (!clipHasFile(clip))  {
        return callback(null, clip);
    }

    var paths = oldPaths(clip);
    var newPaths = getNewPaths(newRootFolder, paths);

    // handle when we want to just use a moved archive + update paths
    if (cli.refresh || copiedClips.indexOf(clip) != -1) {
        setClipPath(clip, newPath);
        return callback(null, clip);
    }

    copiedClips.push(clip);

    async.each(['audio', 'video'], (type, cb) => {
        var file = paths[type];
        if (!file) return cb();
        fs.copy(file, newPaths[type], (err) => {
            if (!err) {
                console.log(`copied ${path.basename(file)} ${type} to ${newRootFolder}`);
                setClipPaths(clip, newPaths);
                cb();
            }
            else defaultError(err, cb)
        });
    }, () => callback(null, clip));
}

function parseDeck(deckWrapper, cb) {
    var deck = deckWrapper.deck[0];

    async.mapLimit(deck.clip, 2, copyClip, (err, clips) => {
        if(!err) {
            newDeck = deck;
            newDeck.clip = clips;
            cb(null, {deck: newDeck});
        }
        else defaultError(err, cb);
    });
}

function handleZips(compName) {
    if (cli.zip) {
        var zipPath = path.join(newRootFolder, '..', `${compName}.zip`);
        zipFolder(newRootFolder, zipPath, (err) => {
            console.log(`\n ${compName}.zip is done!`);
        })
    }
}

function saveComposition(compName, data, callback) {
    var xml = new xml2js.Builder().buildObject(data);
    var compFile = path.join(newRootFolder, `${compName}.avc`);
    fs.writeFile(compFile, xml, (err) => {
        console.log(`saved composition: ${path.basename(compFile)}`);
        handleZips(compName);
        if (callback) callback(err);
    });
}

// cli tool mode
if (!module.parent) {
    xml2js.parseString(fs.readFileSync(cli.composition), (err, data)=> {
        composition = data.composition;
        var compName = composition.generalInfo[0]['$'].name;
        var out = cli.outputDir || process.cwd();
        newRootFolder = path.join(out, compName);
        console.log(`processing ${composition.decks.length} deck(s) of clips`);

        async.mapSeries(composition.decks, parseDeck, (err, newDecks) => {
            console.log('all decks done.');
            composition.decks = newDecks;
            data.composition = composition;
            saveComposition(compName, data);
        });
    });
} else {
    newRootFolder = process.cwd();
}

exports.saveComposition = saveComposition;
exports.copyClip    = copyClip;
exports.clipHasFile = clipHasFile;
exports.getNewPaths = getNewPaths;
exports.oldPaths    = oldPaths;
