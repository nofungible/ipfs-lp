'use strict';

const fs = require('fs');
const config = require('../config.js');

try {
    // Provide helpful errors and warnings for common formatting issues.
    validateConfig(config);

    // The output directory for all albums to be placed into.
    const outputDir = `${__dirname}/../output`;

    // Create the output gallery if it doesn't exist.
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // The directory for the album being built. We use a timestamp prefix to keep names unique.
    const albumDir = `${outputDir}/${Date.now()}_${config.album.title || 'album'}`;

    // Create album directory.
    fs.mkdirSync(albumDir);

    // Generate index.html.
    const html = templateHtml(config);

    // Create index.html.
    fs.writeFileSync(`${albumDir}/index.html`, html);

    // Generate script.js.
    const js = templateJs(config);

    // Create script.js.
    fs.writeFileSync(`${albumDir}/script.js`, js);

    // Generate styles.css.
    const css = templateCss(config);

    // Create styles.css.
    fs.writeFileSync(`${albumDir}/styles.css`, css);

    // Copy all non-private files from assets/ to the album root.
    copyAssets(albumDir);
} catch (err) {
    console.error(err)
}

function copyAssets(albumDir) {
    const assetDir = `${__dirname}/../assets`;
    const assets = fs.readdirSync(assetDir);

    if (!assets.length) {
        return false;
    }

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];

        if (asset.charAt(0) !== '.') {
            fs.copyFileSync(`${assetDir}/${asset}`, `${albumDir}/${asset}`, fs.constants.COPYFILE_EXCL);
        }
    }
}

function templateJs(config) {
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

    const js = fs.readFileSync(`${__dirname}/../templates/script.js`, 'utf8');

    return templateString(js, templateData);
}

function templateCss(config) {
    /**
     * Read and hydrate template.
     */

    const css = fs.readFileSync(`${__dirname}/../templates/styles.css`, 'utf8');

    return templateString(css, {});
}

function templateHtml(config) {
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

    const html = fs.readFileSync(`${__dirname}/../templates/index.html`, 'utf8');

    return templateString(html, templateData);
}

// Hydrate simple template files via template data and tag comments.
function templateString(str, data) {
    // Only supports top level template parameters from template data.
    return Object.entries(data).reduce((acc, [k, v]) => {
        return acc
            .replace(new RegExp(`<!--{{${k}}}-->`,'g'), v)
            .replace(new RegExp(`//{{${k}}}`,'g'), v)
            .replace(new RegExp(`/*{{${k}}}*/`,'g'), v);
    }, str);
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