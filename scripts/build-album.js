'use strict';

const {
    ALBUM_CONFIG_JSON: ENV_ALBUM_CONFIG,
    CONFIG_PATH: ENV_CONFIG_PATH,
    OUTPUT_PATH: ENV_OUTPUT_DIR_PATH,
} = process.env;

const CONFIG_PATH = ENV_CONFIG_PATH || `${__dirname}/../config.js`;
const OUTPUT_DIR_PATH = ENV_OUTPUT_DIR_PATH || `${__dirname}/../output`;

const build = require('../src/lib/album-factory');

const {
    checkExists
} = require('../src/lib/utils');

let config;

(async () => {
    const configFileExists = await checkExists(CONFIG_PATH);

    if (configFileExists) {
        config = require(CONFIG_PATH);
    } else if (ENV_ALBUM_CONFIG) {
        try {
            config = JSON.parse(ENV_ALBUM_CONFIG);
        } catch (err) {
            console.error('Failed to parse environmentally derived configuration', err);
        }
    }
    
    if (!config) {
        throw new Error('No config found');
    }

    return {
        ...config,
        outputPath: OUTPUT_DIR_PATH,
    };
})()
.then(build)
.catch(console.error);
