var fs = require('fs-extra');
var path = require('path');
var async = require('async');
var cli = require('commander');
var xml2js = require('xml2js');
var config = require('./config.json');

var composition, newRootFolder;

cli.option('-c, --composition <file>', config.describe.composition)
    .option('-o, --outputDir <directory>', config.describe.outputDir)
    .option('-r, --refresh', config.describe.refresh)
    .parse(process.argv);

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

function copyClip(clip, cb) {
    // make sure to excluse FX clips
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
        } else {
            cb(err, null);
            console.error(err);
        }
    });
}

function parseDeck(deckWrapper, callback) {
    var deck = deckWrapper.deck[0];

    async.mapLimit(deck.clip, 4, copyClip, (err, clips) => {
        if(!err) {
            newDeck = deck;
            newDeck.clip = clips;
            callback(null, {deck: newDeck});
        } else {
            console.error(err);
        }
    });
}

function saveComposition(compName, data) {
    var xml = new xml2js.Builder().buildObject(data);
    var compFile = path.join(newRootFolder, `${compName}.avc`);
    fs.writeFile(compFile, xml, () => {
        console.log(`saved composition, ${compFile}`);
    });
}

xml2js.parseString(fs.readFileSync(cli.composition), (err, data)=> {
    composition = data.composition;
    var compName = composition.generalInfo[0]['$'].name;
    var out = cli.outputDir || process.cwd();
    newRootFolder = path.join(out, compName);
    console.log(`processing ${composition.decks.length} decks of clips`);

    async.mapSeries(composition.decks, parseDeck, (err, newDecks) => {
        console.log('all decks done.');
        composition.decks = newDecks;
        data.composition = composition;
        saveComposition(compName, data);
    });
});
