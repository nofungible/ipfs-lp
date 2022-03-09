# ipfs-lp
Create decentralized, full length audio albums. Powered by IPFS.

#### Demo album mirror links
- https://cloudflare-ipfs.com/ipfs/QmaoyZRud34pYuhWuz7rZVjDDvRoSwkZSkbVS1TVwNsuio/
- https://gateway.pinata.cloud/ipfs/QmaoyZRud34pYuhWuz7rZVjDDvRoSwkZSkbVS1TVwNsuio/

Special shoutouts to [FATTIES](https://twitter.com/FATTIES17) allowing use of their album.

Please support them, and please support local music!

## General
ipfs-lp allows you to build a single, interactive, web-based, client utilizing multile audio resources backed by IPFS. This allows for a totally decentralized albums backed by decentralized audio resource.

## How-to
The steps to build your album include gathering your tracks and artwork, uploading tracks and artwork to the IPFS network, completing the framework's configuration file, and running a build command.

### Gather your tracks and artwork
- **What you need to get:**
    - Audio files and album artwork file.

The first thing you will need to do is gather the tracks and album artwork you want to utilize for your album.

#### Collect your tracks
Gather together the audio files that will facilitate your album.

Keep note of the [mime type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types) for each file for completion of the `config.js` file. The ipfs-lp client utilizes HTML5 audio, so be sure to check for general compatibility.

https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Containers#browser_compatibility
- Note: Chrome isn't listed, but it supports most mime types on the chart.

We recommend mp3 as it is a good quality that isn't too large when considering loading times.

#### Collect your artwork
This will be the cover of your album.

It should be:
- A 1:1 square aspect ratio image.
- No smaller than 600 x 600. We recommend anywhere between 600x600 to 1000x1000.

You can utilize an IPFS resource that is already on the network, pin a new resource, or provide image assets to the framework.

We have observed IPFS loading as being faster than asset loading, so it is the recommended approach for the time being.

### Upload your resources to IPFS
- **What you need to get:**
    - IPFS cid's for each audio track, and artwork cid if driven by IPFS.

We will not go into detail about what IPFS is, or how to configure a node or pin provider account. You can follow our short breakdown on IPFS below to get more information.

https://github.com/nofungible/objktiv#what-is-an-ipfs-pinning-service

Pin each track individually, or all of them as a directory. Once your resources are pinned you will need to collect their cid's.

You also need gather the cid of your album artwork if the album cover is driven by IPFS (recommended).

### Complete the framework's configuration file
- **What you need to do:**
    - Complete the `config.js` file and add any assets to the `assets/` directory.

The ipfs-lp framework contains a `config.js` file. This file is utilized by the build process to generate your album files.

The [JSON](https://www.json.org/json-en.html) config file contains comments that will assist in facilitating the necessary metadata for your album.

#### Add assets to assets/ directory (optional)
If you are utilizing a local file for your album artwork you must add it to the `assets/` directory in the root of the framework directory.

Keep note of the file name for completion of the `config.js` file.

Note that all non private files in the `assets/` directory will be added to the final album directory.

### Running the build command
- **What you need to do:**
    - Install nodejs if it isn't already installed.
        - https://nodejs.org/en/download/
    - Open the command line/terminal provided by your OS.
    - Navigate to the ipfs-lp directory.
    - Run the command `npm run build`.

Your new album shoud be in the `output/` directory located at the root of the framework, and in the format `{timestamp}_{album title}`.

Example: `1646794686190_my_album`

You can now apply any necessary customizations.

Once completed you can add the album to the IPFS network as a directory to share it with others, or utilize it as a backing resource for a token.