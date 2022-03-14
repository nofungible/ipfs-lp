'use strict';

const fs = require('fs');
const util = require('util');

const {
    checkExists,
    deleteDirectory,
    templateString,
} = require('../utils');

module.exports = async function albumFactory(config) {
    // Provide helpful errors and warnings for common formatting issues.
    validateConfig(config);

    const [css, html, js] = await Promise.all([
        // Generate styles.css.
        templateCss(config),
        // Generate index.html.
        templateHtml(config),
        // Generate script.js.
        templateJs(config),
        // Create output directory if it doesn't exist.
        (async () => {
            // The output directory for all albums to be placed into.
            const outputDirExists = await checkExists(config.outputPath); 

            // Create the output gallery if it doesn't exist.
            if (!outputDirExists) {
                await util.promisify(fs.mkdir)(config.outputPath);
            }
        })(),
    ]);

    // The directory for the album being built. We use a timestamp prefix to keep names unique.
    const albumDirPath = `${config.outputPath}/${Date.now()}_${config.album.title || 'album'}`;

    // Create album directory.
    await util.promisify(fs.mkdir)(albumDirPath);

    // Create files
    await Promise.all(
        [
            util.promisify(fs.writeFile)(`${albumDirPath}/index.html`, html),
            util.promisify(fs.writeFile)(`${albumDirPath}/script.js`, js),
            util.promisify(fs.writeFile)(`${albumDirPath}/styles.css`, css),
            copyAssets(albumDirPath)
        ]
    );
};

async function copyAssets(albumDirPath) {
    const assetDir = `${__dirname}/../../assets`;
    const assetDirExists = await checkExists(assetDir);

    if (!assetDirExists) {
        return false;
    }

    const assets = await util.promisify(fs.readdir)(assetDir);

    if (!assets.length) {
        return false;
    }

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];

        if (asset.charAt(0) !== '.') {
            await util.promisify(fs.copyFile)(`${assetDir}/${asset}`, `${albumDirPath}/${asset}`, fs.constants.COPYFILE_EXCL);
        }
    }
}

async function templateCss(config) {
    /**
     * Read and hydrate template.
     */

    const css = await util.promisify(fs.readFile)(`${__dirname}/../../templates/styles.css`, 'utf8');

    return templateString(css, {});
}

async function templateHtml(config) {
    const templateData = {
        // Cover asset HTML.
        albumCoverAsset: '',
        // Gateway track HTML.
        gatewayTracks: '',
        // Native track HTML.
        nativeTracks: '',
        // Title tag.
        title: '',
        // Tracklist HTML.
        tracklist: '',
    };

    /**
     * Add img tag for album cover if the cover is derived from a file in assets/.
     */

    const albumArtworkAsset = config.album.cover_asset;

    if (albumArtworkAsset) {
        templateData.albumCoverAsset = ''
            + `\n<img id="album-artwork-asset" class="layer bottom hidden" src="./${albumArtworkAsset}" alt="Album Cover">`;
    }

    /**
     * Generate audio tags from list of IPFS cid's.
     */

    const tracklist = config.album.tracklist;

    if (tracklist && tracklist.length) {
        for (let i = 0; i < tracklist.length; i++) {
            const track = tracklist[i];

            templateData.nativeTracks += ''
                + `\n<audio id="audio-track-native-${i}" class="native-track"  preload="auto">`
                + `\n\t<source src="ipfs://${track.cid}" type="${track.mime}">`
                + `\n</audio>${i < tracklist.length - 1 ? '\n' : ''}`;

            const gatewaySourceTags = config.ipfs.gateways.reduce((acc, g, k) => {
                return `${acc}\t<source src="${g}/ipfs/${track.cid}" type="${track.mime}">${k < config.ipfs.gateways.length - 1 ? '\n\t' : ''}`;
            }, '');

            templateData.gatewayTracks += ''
                + `\n<audio id="audio-track-gateway-${i}" class="gateway-track"  preload="auto">`
                + `\n\t${gatewaySourceTags}`
                + `\n</audio>${i < tracklist.length - 1 ? '\n' : ''}`;

            templateData.tracklist += ''
                + `\n<div class="tracklist-track layer top interactive" data-track-index="${i}">`
                + '\n\t<div class="table">'
                + '\n\t\t<div class="table-cell">'
                + '\n\t\t\t<p class="track-metadata text large">'
                + `\n\t\t\t\t<span class="track-number">${i + 1}.</span>`
                + `\n\t\t\t\t<span class="track-title">${track.title}</span>`
                + '\n\t\t\t</p>'
                + '\n\t\t</div>'
                + '\n\t</div>'
                + `\n</div>${i < tracklist.length - 1 ? '\n' : ''}`;
        }

        if (config.album.title) {
            templateData.title = `\n<title>${config.album.title}</title>`;
        } else {
            templateData.title = '\n<title>IPFS LP</title>';
        }
    }

    /**
     * Read and hydrate template.
     */

    const html = await util.promisify(fs.readFile)(`${__dirname}/../../templates/index.html`, 'utf8');

    return templateString(html, templateData);
}

async function templateJs(config) {
    const templateData = {
        // The album config is placed into the script.js file for internal use.
        albumConfig: `\nvar ALBUM_CONFIG = ${JSON.stringify(config.album, null, '\t')};`,
        // Provide empty public gateway list to script.js.
        gatewayList: '\nvar PUBLIC_GATEWAY_URLS = [];'
    };

    // Override empty gateway list with gateway list from config.js.
    if (Array.isArray(config.ipfs.gateways)) {
        templateData.gatewayList = `\nvar PUBLIC_GATEWAY_URLS = ${JSON.stringify(config.ipfs.gateways)};`;
    }

    /**
     * Read and hydrate template.
     */

    const js = await util.promisify(fs.readFile)(`${__dirname}/../../templates/script.js`, 'utf8');

    return templateString(js, templateData);
}

// Throw errors/warnings for common formatting issues.
function validateConfig(config) {
    if (!config.ipfs) {
        throw new Error('Config is missing IPFS configuration.');
    }

    if (!config.ipfs.gateways) {
        throw new Error('No IPFS gateways provided.');
    }

    if (!config.album.tracklist || !config.album.tracklist.length) {
        throw new Error('No tracks provided for album.');
    }

    if (config.album.cover_asset && config.album.cover_cid) {
        console.warn('Warning: cover_asset and cover_cid are both set.'
            + ' This will result in loading two album covers. Select cover_asset or cover_cid.');
    }

    if (!config.album.title) {
        console.warn('Warning: No album title provided.');
    }
}
