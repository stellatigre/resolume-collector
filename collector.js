var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var cli = require('commander');
var xml2js = require('xml2js');
var zipFolder = require('./zipFolder.js');
var config = require('./config.json');

var composition, newRootFolder;

cli.option('-c, --composition <file>', config.describe.composition)
    .option('-o, --outputDir <directory>', config.describe.outputDir)
    .option('-r, --refresh', config.describe.refresh)
    .option('-z, --zip', config.describe.zip)
    .parse(process.argv);

// all the [0]s and ['$']s are because of the xml parsing
function clipIsFile(clip) {
    return clip.videoClip[0].source[0]['$'].type === 'file';
}

function setClipPath(clip, path) {
    clip.videoClip[0].source[0]['$'].name = path;
}

function oldPath(clip) {
    return clip.videoClip[0].source[0]['$'].name;
}

function getNewPath(oldPath) {
    return path.join(newRootFolder, 'clips', path.basename(oldPath));
}

function defaultError(err, cb) {
    if (cb) cb(err, null);
    console.error(err);
}

function copyClip(clip, cb) {
    // make sure to exclude FX / non-file clips
    if (!clipIsFile(clip))  {
        cb(null, clip);
        return;
    }

    var location = oldPath(clip);
    var newPath = getNewPath(location);
    // handle when we want to just use a moved archive + update paths
    if (cli.refresh) {
        setClipPath(clip, newPath);
        cb(null, clip);
        return;
    }
    fs.copy(location, newPath, (err) => {
        if (!err) {
            console.log(`copied ${path.basename(location)} to ${newRootFolder}`);
            setClipPath(clip, newPath);
            cb(null, clip);
        }
        else defaultError(err, cb);
    });
}

function parseDeck(deckWrapper, cb) {
    var deck = deckWrapper.deck[0];

    async.mapLimit(deck.clip, 4, copyClip, (err, clips) => {
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

function saveComposition(compName, data) {
    var xml = new xml2js.Builder().buildObject(data);
    var compFile = path.join(newRootFolder, `${compName}.avc`);
    fs.writeFile(compFile, xml, (err) => {
        console.log(`saved composition: ${path.basename(compFile)}`);
        handleZips(compName);
    });
}

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
