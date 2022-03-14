'use strict';

const fs = require('fs');
const util = require('util');

module.exports = {
    checkExists,
    templateString
};

async function checkExists(path) {
    try {
        await util.promisify(fs.stat)(path);

        return true;
    } catch(err) {
        if (err.code === 'ENOENT') {
            return false;
        }

        throw err;
    }
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
