'use strict';

module.exports = {
    // IPFS Settings.
    ipfs: {
        /**
         * List of IPFS public gateways used to dynamically load content from IPFS. Also used
         * for audio source tag src attribute generation.
         * 
         * The goal is to provide fallback gateways as additional redundancy for future resource loading.
         * If a gateway goes down we can still recover using another gateway, so more is better.
         */
        gateways: [
            // Cloudflare does not allow streaming and does not provide all content/length headers we'd like.
            "https://cloudflare-ipfs.com",
            "https://ipfs.io",
            "https://gateway.pinata.cloud"
        ],
    },
    // Album Settings.
    album: {
        // The title of the album. Used for file/directory generation and applied as HTML title tag inner text.
        title: "",

        /**
         * The name of a file you've added to assets/ that you want to use as the album cover.
         * The framework will add the img tag for you.
         * 
         * All non private files in assets/ will be copied to your album directory for you.
         * 
         * Simply add your file to the assets/ directory in the root of the framework, and add
         * the file name of the cover image here.
         */
        cover_asset: "",

        /**
         * The IPFS cid of the resource you want to use as the cover image, if you don't want to use
         * an asset from the assets/ directory.
         * 
         * This is useful if your cover image is already on the IPFS network. The public gateway
         * list will be utilized to dynamically load the resource associated with the cover_cid.
         * 
         * Simply add the cid of your IPFS resource below.
         */
        cover_cid: "",

        /**
         * Tracklist metadata. This is an array of dictionaries containing your track's metadata.
         * 
         * Required properties are the tracks IPFS cid, the mime type of the file, and the name of the title.
         * 
         * This metadata will be used to populate the HTML with the necessary audio tags, as well as populating the
         * tracklist of the album in the UI.
         */
        tracklist: [
            /**
             * Example track metadata dictionary.
             * 
             * Copy one for each track in your album, and replace the values with the track's metadata.
             * 
             * DO NOT SIMPLY COPY AND PASTE THESE.
             * {
             *   cid: "abc123",
             *   mime: "audio/mp3",
             *   title: "Track Name"
             * }
             */
        ]
    }
};