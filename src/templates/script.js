'use strict';

/**
 * Event emitter used to manage UI driven and album driven behavior
 * such as tracks starting/ending, end-users clicking/interacting with a UI element.
 */
(function () {
    function EventEmitter() {
        // Event handlers.
        this._handlers = {};

        // One time event handlers.
        this._oneTimeHandlers = {};
    }

    // Add an event handler for a given event key.
    EventEmitter.prototype.on = function (key, handler) {
        // Add handler array for given handler key.
        this._handlers[key] = this._handlers.hasOwnProperty(key) ? this._handlers[key] : [];
    
        // Add handler to handler array.
        this._handlers[key].push(handler);
    };
    
    EventEmitter.prototype.once = function (key, handler) {
        // Add one time handler array for given handler key.
        this._oneTimeHandlers[key] = this._oneTimeHandlers.hasOwnProperty(key) ? this._oneTimeHandlers[key] : [];

        // Add one time handler to one time handler array.
        this._oneTimeHandlers[key].push(handler);
    };

    // Emit an event for a given event key and pass n arguments to its handlers.
    EventEmitter.prototype.emit = function () {
        var originalArgs = Array.prototype.slice.call(arguments, 0);

        // Get the event key from arguments.
        var key = originalArgs[0];

        // Get the remaining arguments to use as handler arguments.
        var args = originalArgs.slice(1);

        // Call all handlers for the given event key.
        if (this._handlers.hasOwnProperty(key)) {
            for (var i = 0; i < this._handlers[key].length; i++) {
                this._handlers[key][i].apply(this, args);
            }
        }

        // Call all one time handlers for the given key.
        if (this._oneTimeHandlers.hasOwnProperty(key)) {
            // Cache one time handlers for event key.
            var oneTimeHandlers = this._oneTimeHandlers[key];

            // Reset the list of one time handlers for the event key.
            this._oneTimeHandlers[key] = [];

            // Call all one time handlers for given event key.
            for (var i = 0; i < oneTimeHandlers.length; i++) {
                oneTimeHandlers[i].apply(this, args);
            }
        }
    };

    // Attach class to window for use outside of anonymous function.
    window.EventEmitter = EventEmitter;
})();

/**
 * HTMLAudioTagPlayer class acts as an interface for HTML audio tag functionality. Using a wrapper
 * allows us to retain the same interface in our code, so we can easliy replace HTMLAudioTagPlayer if we need to.
 */
(function () {
    function HTMLAudioTagPlayer(trackIndex, eventEmitter, opts) {
        opts = opts || {};

        /**
         * Gather the native driven or gateway driven audio tag element.
         */

        var audioTagElementId = 'audio-track-' + (opts.ipfsNativeSupport ? 'native' : 'gateway') + '-' + trackIndex;
        var audioTagElement = document.getElementById(audioTagElementId);

        if (!audioTagElement) {
            throw new Error('No audio tag exists for given HTMLAudioTagPlayer.trackIndex - trackIndex: ' + trackIndex);
        }

        // HTML audio element used for internal audio playing.
        this.audioTagElement = audioTagElement;

        // Tracklist index of the track.
        this.trackIndex = trackIndex;

        // EventEmitter instance for current play session.
        this.eventEmitter = eventEmitter;

        // Has the track player encountered an error?
        this.isFailed = false;

        // Has the track player loaded?
        this.isLoaded = false;

        // Is the track player playing?
        this.isPlaying = false;

        // Check if the network state of the audio tag is already set to having no usable source elements.
        if (this.audioTagElement.networkState === 3) {
            this.isFailed = true;

            this.eventEmitter.emit('track-player:failed', this.trackIndex, 'no_usable_source');
        } else {
            var sourceTagNodes = this.audioTagElement.getElementsByTagName('source');
            var sourceTags = Array.prototype.slice.call(sourceTagNodes, 0);

            // Check if there are no source tags.
            if (!sourceTags.length) {
                this.isFailed = true;

                this.eventEmitter.emit('track-player:failed', this.trackIndex, 'no_source_detected');

            // Check if the last source tag in the list has encountered an error.
            } else {
                var audioTag = this;
        
                sourceTags[sourceTags.length - 1].addEventListener('error', function () {
                    audioTag.isFailed = true;
    
                    audioTag.eventEmitter.emit('track-player:failed', audioTag.trackIndex, 'no_usable_source');
                });
            }
        }

        // Handle general audio element error events.
        this.audioTagElement.addEventListener('error', (function(evt) {
            this.isFailed = true;

            this.eventEmitter.emit('track-player:failed', this.trackIndex, 'error', evt.target.error);
        }).bind(this));

        // Handle audio element play event.
        this.audioTagElement.addEventListener('play', (function () {
            this.isPlaying = true;

            this.eventEmitter.emit('track-player:started', this.trackIndex);
        }).bind(this));

        // Handle audio element pause event.
        this.audioTagElement.addEventListener('pause', (function () {
            this.isPlaying = false;

            this.eventEmitter.emit('track-player:paused', this.trackIndex);
        }).bind(this));

        // Handle audio element ended event.
        this.audioTagElement.addEventListener('ended', (function () {
            this.isPlaying = false;

            this.eventEmitter.emit('track-player:ended', this.trackIndex);
        }).bind(this));

        // Handle audio element ready to play event.
        this.audioTagElement.addEventListener('canplaythrough', (function () {
            if (this.isLoaded) {
                return false;
            }

            this.isLoaded = true;
            this.trackLength = this.audioTagElement.duration;

            this.eventEmitter.emit('track-player:loaded', this.trackIndex);
        }).bind(this));

        // Force load the audio tag to trigger load events.
        this.audioTagElement.load();
    }

    // Get the progress of the track in seconds.
    HTMLAudioTagPlayer.prototype.getProgress = function () {
        return this.audioTagElement.currentTime;
    }

    // Play the track.
    HTMLAudioTagPlayer.prototype.play = function () {
        // Only play if we aren't playing.
        if (!this.isLoaded || this.isPlaying) {
            return false;
        }

        this.audioTagElement.play();

        return true;
    };

    // Pause the track.
    HTMLAudioTagPlayer.prototype.pause = function () {
        // Only pause if we are playing.
        if (!this.isLoaded || !this.isPlaying) {
            return false;
        }

        this.audioTagElement.pause();

        return true;
    }

    // Seek to specific time in track progress.
    HTMLAudioTagPlayer.prototype.seek = function (seekTime) {
        if (!this.isLoaded) {
            return false;
        }

        this.audioTagElement.currentTime = seekTime;

        this.eventEmitter.emit('track-player:seeked', this.trackIndex, seekTime);

        return true;
    };

    // Pause the track and seek to time zero.
    HTMLAudioTagPlayer.prototype.stop = function () {
        if (!this.isLoaded) {
            return false;
        }

        this.audioTagElement.pause();

        // Set track progress to zero.
        this.audioTagElement.currentTime = 0;

        this.eventEmitter.emit('track-player:stopped', this.trackIndex);

        return true;
    };

    // Attach class to window for use outside of anonymous function.
    window.HTMLAudioTagPlayer = HTMLAudioTagPlayer;
})();

/**
 * Main Logic
 */
(function () {
    /**
     * Album configuration dictionary containing all user defined settings.
     */

    //{{albumConfig}}

    /**
     * The set of public gateways used to load IPFS resources.
     *
     * One gateway will not suffice since we want to ensure security and redundancy
     * when loading IPFS resources far in the future.
     *
     * More gateways added increases future reliability of resource loading.
     *
     * Note; due to inherent browser issues with certain audio functionality we
     * do not load tracks dynamically. See index.html for integration of track audio tags.
     *
     * !!! You MUST ensure that ALBUM_CONFIG.tracklist is in parity with the audio tags you append to index.html !!!
     */

    //{{gatewayList}}

    /**
     * Amount of time in seconds before the previous track button resets the current track progress
     * instead of navigating to the previous track.
     */
    var FIRST_TRACK_RESET_DELTA_IN_SECONDS = 1;

    // EventEmitter instance utilized by the current album play session.
    var eventEmitter = new window.EventEmitter();

    // Dictionary used to maintain the state of the album play session.
    var state = {
        // Index of current track.
        trackIndex: null,
        // Track player for current track.
        trackPlayer: null,
        // List of all track players.
        trackPlayers: [],
        // Recursive setTimeout used to update track progress in UI.
        trackProgressTimeout: null,
        // Flag used to temporarily disable gestures on mobile when opening the UI.
        disableGestures: false
    };

    // Check for IPFS native support and boot up album.
    checkIPFSNativeSupport(function (ipfsNativeSupport) {
        try {
            state.ipfsNativeSupport = ipfsNativeSupport;

            // Load album artwork and reveal.
            loadAlbumArtwork();
    
            // Load track players into state.
            for (var i = 0; i < ALBUM_CONFIG.tracklist.length; i++) {
                state.trackPlayers[i] = new window.HTMLAudioTagPlayer(i, eventEmitter, {ipfsNativeSupport: state.ipfsNativeSupport});
            }
    
            // Bind event emitter events.        
            bindEventHandlers();
    
            // Attach UI gesture handlers.
            attachGestureHandlers();
    
            // Load the first track as the default track
            eventEmitter.emit('media-player:select-track', 0);

            // Attach album components to window for use in browser console.
            window.dAlbum = window.dalbum = window.album = {
                config: ALBUM_CONFIG,
                eventEmitter: eventEmitter,
                state: state,
            };
        } catch (err) {
            console.error('Album failed to initialize', err);
        }
    });

    /**
     * Attach gesture handlers to respective UI elements.
     * Generally speaking, gestures should only emit EventEmitter events. This allows us
     * to continue to facilitate event-driven functionalty.
     */
    function attachGestureHandlers() {
        // Album hover in
        document.getElementById('album').addEventListener('mouseover', function () {
            /**
             * On mobile devices we want the user to be able to tap the album and reveal the UI.
             * To achieve this we will utilize the inherent behavior of a tap on mobile causing a
             * hover + click event combination.
             * 
             * We will reveal the UI on hover, and disable all UI element click event handlers for the remainder
             * of the current JS event loop cycle.
             *
             * This will allow us to show the UI with the hover event, and prevent interaction with UI elements
             * via the click event.
             */

            // @TODO switch to data-attribute instead of class.
            var isUIHidden = (document.getElementById('ui').getAttribute('class') || '').indexOf('hidden') !== -1;

            /**
             * We don't want to do anything if the UI is already revealed since the mouseover event will
             * fire off every mouse movement overlapping the UI.
             */
            if (!isUIHidden) {
                return false;
            }

            // Disable gestures for remainder of current event loop cycle.
            state.disableGestures = true;

            // Re enable gestures at the start of the next event loop cycle.
            setTimeout(function(){
                state.disableGestures = false;
            }, 0);

            // Reveal UI on hover.
            eventEmitter.emit('ui:show');
        });

        // Album hover out
        document.getElementById('album').addEventListener('mouseleave', function () {
            eventEmitter.emit('ui:hide');

            // Close the tracklist so it's hidden the next time the UI is revealed.
            eventEmitter.emit('ui:tracklist:hide');
        });

        // Next track button click
        document.getElementById('next-track-button').addEventListener('click', secureGesture(function () {
            eventEmitter.emit('media-player:select-track:next');
        }));

        // Pause button click
        document.getElementById('pause-button').addEventListener('click', secureGesture(function () {
            eventEmitter.emit('media-player:pause');
        }));

        // Play button click
        document.getElementById('play-button').addEventListener('click', secureGesture(function () {
            eventEmitter.emit('media-player:play');
        }));

        // Previous track button click
        document.getElementById('previous-track-button').addEventListener('click', secureGesture(function () {
            /**
             * If we are within FIRST_TRACK_RESET_DELTA_IN_SECONDS we will go back a track otherwise current track progress.
             */

            if (state.trackPlayer.isPlaying && state.trackPlayer.getProgress() > FIRST_TRACK_RESET_DELTA_IN_SECONDS) {
                eventEmitter.emit('media-player:seek', 0);
            } else {
                eventEmitter.emit('media-player:select-track:previous');
            }
        }));

        // Progress bar click
        document.getElementById('progress-bar').addEventListener('click', secureGesture(function (evt) {
            /**
             * Calculate time based off of percentage on seek bar clicked vs track duration.
             */

            var barMeta = document.getElementById('progress-bar').getBoundingClientRect();
            var xPos = evt.pageX - barMeta.x;
            var percentTarget = xPos / barMeta.width;
            var newSeekTime = state.trackPlayer.trackLength * percentTarget;

            eventEmitter.emit('media-player:seek', newSeekTime);
        }));

        // Tracklist close button click
        document.getElementById('tracklist-close').addEventListener('click', secureGesture(function () {
            eventEmitter.emit('ui:tracklist:hide');
        }));

        // Tracklist open button click
        document.getElementById('tracklist-open').addEventListener('click', secureGesture(function () {
            eventEmitter.emit('ui:tracklist:show');
        }));

        // Attach tracklist track gesture handlers to each tracklist track
        Array.prototype.slice.call(document.getElementsByClassName('tracklist-track'), 0).forEach(function (tracklistTrack) {
            // Tracklist track click
            tracklistTrack.addEventListener('click', secureGesture(function () {
                eventEmitter.emit('media-player:select-track', parseInt(tracklistTrack.getAttribute('data-track-index')));

                // Hide the tracklist after selecting a track.
                eventEmitter.emit('ui:tracklist:hide');
            }));
        });

        // Take in gesture handler and return handler that will execute only when element is allowed to be interacted with.
        function secureGesture(cb) {
            return function (evt) {
                // @TODO switch to data-attribute instead of class.
                var isElementDisabled = (evt.currentTarget.getAttribute('class') || '').indexOf('disabled') !== -1;

                if (state.disableGestures || isElementDisabled) {
                    return false;
                }
    
                cb(evt);
            };
        }
    }

    function bindEventHandlers() {
        /**
         * Track Player Events.
         */

        // Track player track ended.
        eventEmitter.on('track-player:ended', function (trackIndex) {
            // We don't need to do anything if it's not the current track.
            if (trackIndex !== state.trackIndex) {
                return false;
            }

            // Clear the track progress check.
            state.trackProgressTimeout && clearTimeout(state.trackProgressTimeout);

            // Disable auto play if the track that ended was the last track.
            if (state.trackIndex === state.trackPlayers.length - 1) {
                state.isAutoPlaying = false;
            }

            eventEmitter.emit('media-player:select-track:next');
        });

        // Track player encountered an error.
        eventEmitter.on('track-player:failed', function () {
            var args = Array.prototype.slice.call(arguments, 0);

            console.error.apply(
                console,
                ['Problem with track player'].concat(args)
            );

            // Enable track error UI.
            if (state.trackIndex === args[0]) {
                setTrackErrorState();
            }
        });

        // Track player loaded.
        eventEmitter.on('track-player:loaded', function (trackIndex) {
            // We don't need to do anything if it isn't the current track.
            if (state.trackIndex !== trackIndex) {
                return false;
            }

            // Apply the track length to the UI
            updateCurrentTrackLength(state.trackPlayer.trackLength);

            // Set progress bar to zero.
            updateCurrentTrackProgress(0);

            // Hide loading spinner now that track is loaded.
            document.getElementById('loading-spinner').classList.add('hidden');

            /**
             * Remove disabled state from play/pause buttons and progress bar.
             */

            document.getElementById('play-button').classList.remove('disabled');
            document.getElementById('pause-button').classList.remove('disabled');
            document.getElementById('progress-bar').classList.remove('disabled');

            /**
             * Play the track if the player was auto playing and reveal pause button, otherwise just
             * show the play button.
             */

            if (state.isAutoPlaying) {
                document.getElementById('pause-button').classList.remove('hidden');
                eventEmitter.emit('media-player:play');
            } else {
                document.getElementById('play-button').classList.remove('hidden');
            }
        });

        // Track player paused.
        eventEmitter.on('track-player:paused', function (trackIndex) {
            // We don't need to do anything if it isn't the current track.
            if (trackIndex !== state.trackIndex) {
                return false;
            }

            // Clear the track progress check.
            state.trackProgressTimeout && clearTimeout(state.trackProgressTimeout);

            /**
             * Hide the play button and reveal pause button.
             */

            document.getElementById('pause-button').classList.add('hidden');
            document.getElementById('play-button').classList.remove('hidden');
        });

        // Track player seeked
        eventEmitter.on('track-player:seeked', function (trackIndex, seekTime) {
            // We don't need to do anything if it isn't the current track.
            if (trackIndex !== state.trackIndex) {
                return false;
            }

            // Gather the percentage of progress.
            var percentComplete = (seekTime / state.trackPlayer.trackLength) * 100;

            // Apply progress to progress bar.
            updateCurrentTrackProgressBar(percentComplete);

            // If we seeked to zero and we are on track 1 disable the previous track button.
            if (state.trackIndex === 0 && seekTime === 0) {
                document.getElementById('previous-track-button').classList.add('disabled');
            } 
        });

        // Track player started
        eventEmitter.on('track-player:started', function (trackIndex) {
            // We don't need to do anything if it isn't the current track.
            if (trackIndex !== state.trackIndex) {
                return false;
            }

            /**
             * Hide play button and reveal pause button.
             */

            document.getElementById('play-button').classList.add('hidden');
            document.getElementById('pause-button').classList.remove('hidden');

            // Enable track progress check.
            trackProgress();

            function trackProgress() {
                // Clear timeout for re assignment.
                state.trackProgressTimeout && clearTimeout(state.trackProgressTimeout);

                // Create new timeout.
                state.trackProgressTimeout = setTimeout(function () {
                    /**
                     * Calculate the track progress based on time played vs track length and
                     * visually apply to progress bar.
                     */

                    var trackPlayer = state.trackPlayer;
                    var trackProgressTime = trackPlayer.getProgress();
    
                    // Update progress time.
                    updateCurrentTrackProgress(trackProgressTime);

                    // Update progress bar.
                    updateCurrentTrackProgressBar((trackProgressTime / trackPlayer.trackLength) * 100);

                    /**
                     * If we are on the first track and more than FIRST_TRACK_RESET_DELTA_IN_SECONDS has passed
                     * we will un disable the previous track button since it will now only reset the current track.
                     */
                    if (state.trackIndex === 0 && state.trackPlayer.isPlaying && state.trackPlayer.getProgress() > FIRST_TRACK_RESET_DELTA_IN_SECONDS) {
                        document.getElementById('previous-track-button').classList.remove('disabled');
                    } 

                    // Recursively set progress check.
                    trackProgress();
                }, 10);
            }
        });

        /**
         * Media player related events.
         */

        // Media player pause event.
        eventEmitter.on('media-player:pause', function () {
            if (!state.trackPlayer) {
                return false;
            }

            // Disable auto play and pause track player.
            if (state.trackPlayer.isPlaying) {
                state.isAutoPlaying = false;

                state.trackPlayer.pause();
            }    
        });

        // Media player play event.
        eventEmitter.on('media-player:play', function () {
            if (!state.trackPlayer) {
                return false;
            }

            // Enable auto play and play track player.
            if (!state.trackPlayer.isPlaying) {
                state.isAutoPlaying = true;

                state.trackPlayer.play();
            }
        });

        // Media player seek event.
        eventEmitter.on('media-player:seek', function (seekTime) {
            if (!state.trackPlayer) {
                return false;
            }

            // Seek track player.
            state.trackPlayer.seek(seekTime);
        });

        // Media player select track event.
        eventEmitter.on('media-player:select-track', function (trackIndex) {
            // Clear track progress check.
            state.trackProgressTimeout && clearTimeout(state.trackProgressTimeout);

            /**
             * Stop all track players
             */
            for (var i = 0; i < state.trackPlayers.length; i++) {
                /**
                 * If the user selects the same track that is playing we reset the progress instead of stopping.
                 * We want to avoid a pause event being caused by the stop() call because that will make the play/pause
                 * buttons flicker. Resetting progress keeps the play UI clean.
                 */
                if (i === state.trackIndex && trackIndex === state.trackIndex) {
                    state.trackPlayer.seek(0);
                } else {
                    state.trackPlayers[i].stop();
                }
            }

            // Set the index of the state's current track to the given track index.
            state.trackIndex = trackIndex;

            // Select the track player for the new track index.
            state.trackPlayer = state.trackPlayers[trackIndex];

            // Update the current track name to the new track's name.
            updateCurrentTrackMetadata(trackIndex);

            // Reset the track progress bar.
            updateCurrentTrackProgressBar(0);

            // Hide error indicator if previous track failed to load.
            document.getElementById('loading-error').classList.add('hidden');

            /**
             * Update the disabled state for the previous track button.
             */

            var previousTrackButton = document.getElementById('previous-track-button');
    
            if (state.trackIndex === 0) {
                previousTrackButton.classList.add('disabled');
            } else {
                previousTrackButton.classList.remove('disabled');
            }

            /**
             * Update the disabled state for the next track button.
             */

            var nextTrackButton = document.getElementById('next-track-button');

            if (state.trackIndex < ALBUM_CONFIG.tracklist.length - 1) {
                nextTrackButton.classList.remove('disabled');
            } else {
                nextTrackButton.classList.add('disabled');
            }

            // Enable track player error UI if track player is already broken.
            if (state.trackPlayer.isFailed) {
                return setTrackErrorState();
            }

            // Invoke the track player loaded event for the corresponding track player if it is already loaded.
            if (state.trackPlayer.isLoaded) {
                return eventEmitter.emit('track-player:loaded', state.trackIndex);
            }

            /**
             * Hide play/pause buttons.
             */

            document.getElementById('play-button').classList.add('hidden');
            document.getElementById('pause-button').classList.add('hidden');

            /**
             * Set track duration and progress to nullified timers.
             */

            updateCurrentTrackLength(null);
            updateCurrentTrackProgress(null);

            // Disable the seek bar until track is ready.
            document.getElementById('progress-bar').classList.add('disabled');

            // Reveal the loading spinner until the track player loads.
            document.getElementById('loading-spinner').classList.remove('hidden');
        });

        // Media player select next track event.
        eventEmitter.on('media-player:select-track:next', function () {
            // If we are on the last track select the first track.
            var nextTrackIndex = state.trackIndex === ALBUM_CONFIG.tracklist.length - 1 ? 0 : state.trackIndex + 1;

            eventEmitter.emit('media-player:select-track', nextTrackIndex);
        });

        // Media player select previous track event.
        eventEmitter.on('media-player:select-track:previous', function () {
            // If we are on the first track re select it otherwise select the previous track.
            var previousTrackIndex = state.trackIndex === 0 ? 0 : state.trackIndex - 1;

            eventEmitter.emit('media-player:select-track', previousTrackIndex);
        });

        /**
         * UI related events
         */

        // UI reveal event
        eventEmitter.on('ui:show', function () {
            // Reveal the artwork tint to provide a darker UI backdrop.
            document.getElementById('album-artwork-tint').classList.remove('hidden');

            // Reveal the UI.
            document.getElementById('ui').classList.remove('hidden');

            // Hide artwork loading content.
            document.getElementById('album-artwork-loading-content').classList.add('hidden');
        });

        // UI hide event.
        eventEmitter.on('ui:hide', function () {
            // Hide the UI.
            document.getElementById('ui').classList.add('hidden');

            // Hide the artwork tint.
            document.getElementById('album-artwork-tint').classList.add('hidden');

            // Reveal the artwork loading content.
            document.getElementById('album-artwork-loading-content').classList.remove('hidden');
        });

        // Tracklist hide event.
        eventEmitter.on('ui:tracklist:hide', function () {
            // Hide back of album.
            document.getElementById('back').classList.add('hidden');

            // Reveal front of album.
            document.getElementById('front').classList.remove('hidden');
        });

        // Tracklist show event.
        eventEmitter.on('ui:tracklist:show', function () {
            // Hide front of album.
            document.getElementById('front').classList.add('hidden');

            // Reveal back of album.
            document.getElementById('back').classList.remove('hidden');
        });
    }

    function checkIPFSNativeSupport(cb) {
        /**
         * @TODO try to find a better mechanism for checking IPFS support
         *
         * We can't determine if the error was due to lack of IPFS support, so we treat all errors as such.
         * 
         * Media element events, fetch API, and XMLHttpRequest API/response properties/readystate + status all
         * do not yield usable results when trying to determine specifically why a loading failure occured.
         * 
         * Ultimately, we want the ERR_UNKNOWN_URL_SCHEME, but this seems programmatically unattainable, even when
         * utilizing window and document error event handlers.
         */

        /**
         * Create an audio tag with the first track's IPFS cid and load it.
         * If the load succeeds we know IPFS is supported natively. All errors equate to lack of support.
         */
        try {
            /**
             * Create tags.
             */

            var nativeAudioTag = document.createElement('audio');
            var nativeAudioSourceTag = document.createElement('source');

            /**
             * Set tag event handlers.
             */

            nativeAudioSourceTag.onerror = function () {
                console.log('failed to load ipfs native track');
                cb(false);
            };
    
            nativeAudioTag.onloadedmetadata = function () {
                console.log('starting load ipfs native track');
                cb(true);
            };

            /**
             * Get IPFS cid of first native track.
             */

            var firstNativeTrack = document.getElementById('audio-track-native-0');
            var firstNativeSource = firstNativeTrack
                ? firstNativeTrack.getElementsByTagName('source') && firstNativeTrack.getElementsByTagName('source')[0]
                : null;

            if (!firstNativeTrack || !firstNativeSource) {
                console.warn('No native audio/source found for IPFS native support evaluation');

                return cb(false);
            }

            /**
             * Set source of native test track and load to trigger one of the events.
             */

            nativeAudioSourceTag.src = firstNativeSource.src;

            nativeAudioTag.appendChild(nativeAudioSourceTag);
            nativeAudioTag.load();
        } catch (err) {
            console.error('Unable to evaluate native IPFS supprt', err);
        }
    }

    // Handle loading of album artwork.
    function loadAlbumArtwork(gatewayIndex) {
        // If we have no cover CID we will utilize the img tag already embedded in the HTML.
        if (!ALBUM_CONFIG.cover_cid) {
            var artworkAsset = document.getElementById('album-artwork-asset');

            if (!artworkAsset) {
                console.warn('No artwork detected for album');

                return false;
            }

            // Check if the existing img tag already loaded or failed to load.
            if (artworkAsset.complete) {
                // Check if it failed to load (no width or height).
                if (!artworkAsset.naturalHeight && !artworkAsset.naturalWidth) {
                    // Hide the artwork loading spinner.
                    document.getElementById('album-artwork-loading-spinner').classList.add('hidden');

                    // Reveal the artwork loading error icon.
                    document.getElementById('album-artwork-loading-error-icon').classList.remove('hidden');

                // Check if it loaded successfully.
                } else {
                    // Hide entire artwork loading screen.
                    document.getElementById('album-artwork-loading-screen').classList.add('hidden');

                    // Reveal loaded artwork.
                    artworkAsset.classList.remove('hidden');
                }
            // Handle if the img did not load.
            } else {
                // Set an onload handler to let us know that the img loaded.
                artworkAsset.onload = function () {
                    // Hide the artwork loading screen.
                    document.getElementById('album-artwork-loading-screen').classList.add('hidden');

                    // Reveal the loaded artwork.
                    artworkAsset.classList.remove('hidden');
                };
            }

            return true;
        }

        /**
         * Create an img element for dynamic IPFS resource loading.
         */

        var albumArtworkContainer = document.getElementById('album-artwork');
        var imgElement = document.createElement('img');
        var imgElementId = 'album-artwork-asset';

        imgElement.id = imgElementId;
        imgElement.alt = "Album Cover";

        // Hide element until it's fully loaded.
        imgElement.classList.add('hidden');

        // Attach load handler for IPFS resource img tag.
        imgElement.onload = function () {
            // Reveal loaded artwork.
            imgElement.classList.remove('hidden');

            // Hide artwork loading screen
            document.getElementById('album-artwork-loading-screen').classList.add('hidden');
        };

        // Attach native ipfs address and append img to HTML if we don't need any gateway loading.
        if (state.ipfsNativeSupport) {
            imgElement.src = 'ipfs://' + ALBUM_CONFIG.cover_cid;

            albumArtworkContainer.appendChild(imgElement);

            return true;
        }

        // Check for existing img from failed gateway image load.
        var existingImg = document.getElementById(imgElementId);

        // Remove existing img element.
        if (existingImg) {
            existingImg.remove();
        }

        // Set gateway index to beginnning of gateway list if index is not defined.
        if (gatewayIndex === undefined) {
            gatewayIndex = 0;
        }

        // Set img src to next gateway on the list.
        imgElement.src = PUBLIC_GATEWAY_URLS[gatewayIndex] + '/ipfs/' + ALBUM_CONFIG.cover_cid;

        // If we have more gateways on the list after this one we need to queue it with another onerror.
        if (gatewayIndex < PUBLIC_GATEWAY_URLS.length - 1) {
            // This handler will catch load errors for the current gateway and kick off a load for the next gateway.
            imgElement.onerror = function () {
                loadAlbumArtwork(gatewayIndex + 1);
            };
        }

        // Append img to HTML.
        albumArtworkContainer.appendChild(imgElement);
    }

    // Update the UI to reflect that the current track has encountered an error while playing or loading.
    function setTrackErrorState() {
        // Reveal loading icon.
        document.getElementById('loading-error').classList.remove('hidden');

        /**
         * Hide relevant UI elements.
         */

        document.getElementById('loading-spinner').classList.add('hidden');
        document.getElementById('play-button').classList.add('hidden');
        document.getElementById('pause-button').classList.add('hidden');
        document.getElementById('progress-bar').classList.add('disabled');
    }

    // Update the current track number and track title.
    function updateCurrentTrackMetadata(trackIndex) {
        var i = trackIndex === undefined ? state.trackIndex : trackIndex;
        var trackNumber = i + 1 + '.';

        document.getElementById('current-track-number').innerText = trackNumber;

        var trackName = ALBUM_CONFIG.tracklist[i].title;

        document.getElementById('current-track-name').innerText = trackName;
    }

    // Update the current track length in UI.
    function updateCurrentTrackLength(timeInSeconds) {
        return updateCurrentTrackTimeElement(document.getElementById('track-length'), timeInSeconds);
    }

    // Update current track progres time in UI.
    function updateCurrentTrackProgress(timeInSeconds) {
        return updateCurrentTrackTimeElement(document.getElementById('track-progress'), timeInSeconds);
    }

    // Update current track progress bar.
    function updateCurrentTrackProgressBar(percentComplete) {
        document.getElementById('progress-bar-fill').style.width = percentComplete + '%';
    }

    // Generic function to handle formatting of time for UI element.
    function updateCurrentTrackTimeElement(el, timeInSeconds) {
        // Provide blank timers if no time is provided.
        if (!timeInSeconds && timeInSeconds !== 0) {
            el.innerText = '--:--';

            return true;
        }

        /**
         * Break seconds down into minutes or seconds and apply a double digit format.
         */
        var minutes = 0;
        var seconds = 0;

        if (timeInSeconds > 0) {
            minutes = Math.floor(timeInSeconds / 60);
            seconds = Math.floor(timeInSeconds - (60 * minutes));
        }

        el.innerText = (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);

        return true;
    }
})();
