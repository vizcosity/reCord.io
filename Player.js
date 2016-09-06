function Player(Bot, YTKey, SCInfo, channel) {
	var self = this;
	var queue = [], plQueue = [],
		last, current, next,
		announcementChannel,
		streamReference, ready = false, playing = false, playingPlaylist = false, plRef, encs = ['ffmpeg', 'avconv'], plInterruption = true,
		mods = [], blacklist = [],
		ytdl = require('ytdl-core'),
		request = require('request'),
		childProc = require('child_process'),
		SC = require('node-soundcloud');



	var killing = false;
	var soundlogFile = require('./soundlog.json');
	var holdConversation = false, conversationLog = []; //variables for conversation handler.
	var voiceChannel = channel;
	var editLooper;
	var enc;
	var configFile = require('./config.json');
	var currentStatus = configFile.status;
	var defaultMusicChannel = configFile.defaultMusicChannel;
	var rebuildingPlaylist = false;
	var fs = require('fs');

	//if (announcementChannel !== defaultMusicChannel){notify("I'll take your request fam but please hop on over to #bot-chat so that generalchat doesn't get congested with music requests.")};

	//try {
	//	var serverID = Bot.channels[announcementChannel].guild_id;
	//} catch(e) {err('beginning' + e); };

	var API = {
		Youtube: {
			Snippet: function(id) {
				return "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + id + "&key=" + YTKey;
			},
			ContentDetails: function(id) {
				return "https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=" + id + "&key=" + YTKey;
			},
			GetPlaylist: function(id) {
				return "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=" + id + "&key=" + YTKey;
			},
			PlaylistInfo: function(id){
				return "https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=" + id + "&key=" + YTKey;
			},
			Search: function(q) {
				return "https://www.googleapis.com/youtube/v3/search?part=snippet&q=" + q + "&key=" + YTKey;
			}
		},
		SoundCloud: {
			CheckLink: function(link) {
				return "http://api.soundcloud.com/resolve?url=" + link
			}
		}
	}
	SC.init({
		id: SCInfo.id,
		secret: SCInfo.secret,
		uri: SCInfo.uri,
		accessToken: SCInfo.accessToken
	});
	Bot.joinVoiceChannel(channel, function() {
		Bot.getAudioContext({channel: channel, stereo: true}, function(err, stream) {
			ready = true;
			streamReference = stream;
		});
	});

var duration;
	this.enqueue = function(user, userID, link) {
		var data = parseInput(link);
		var type = data.type,
			title, url, id, uID;
		if (!data) return notify("Link refused, most likely on the blacklist.");
		log("Queueing: " + data.location);

		if (tooManyRequests(userID)) return Bot.fixMessage(notify(user + "(" + userID + ") has too many requests in queue."));

		for (var i=0; i<queue.length; i++) {
			if (queue[i].uID === data.location) return notify("This item is already in queue");
		}

		if (data.type === "YT") {
			request (API.Youtube.ContentDetails(data.location), function(err, res, body) {
				if (err) return log('error', err);
				body = JSON.parse(body);

				//try {
				if (body.items.length === 0) { return log('warn', data.location + " is not a valid YouTube video ID."); }
				//} catch(e) { notify(e); };

				duration = turnStupidAssYoutubeShitIntoActualSeconds(body.items[0].contentDetails.duration);
				if (duration > 480) return notify("The item provided has a duration of over 8 minutes. Ignoring.");
				//console.log(body.items[0]);

				request( API.Youtube.Snippet(data.location) , function(err, res, body) {
					if (err) return log('error', err);
					body = JSON.parse(body);

					ytdl.getInfo( "https://www.youtube.com/watch?v=" + data.location, function(err, info) {
						if (err) return log('error', err);
						//console.log("https://www.youtube.com/watch?v=" + data.location);
						var f = info.formats;
						//console.log(f);
						var selection, hb = 0;
						for (var i=0; i<f.length; i++) {
							var current = f[i];
							//console.log(current);
							if (current.type /*&& current.type.indexOf('audio/') > -1*/) {
								if (Number(current.audioBitrate) > hb) {
									hb = Number(current.audioBitrate);
									selection = current;
									//console.log(current);
								}
							}
						}

						if (!selection) return notify("Unable to get stream information about link: " + data.type);
						try {

							title = body.items[0].snippet.title;
							url = selection.url;
							id = qID();
							uID = data.location;

						} catch(e) {logE(e);};
						queue.push( new MusicItem(type, title, url, id, userID, user, uID, duration) );
						check();

					//	notify(user + " has requested " + title);
						Bot.sendMessage({
							to: announcementChannel,
							message: '**' + user + ' Successfully Queued:** ' + title
						}, function(error, response){
							if (error !== null){console.log(error)};
							if (response !== 'undefined'){
								setTimeout(function(){
									Bot.deleteMessage({
										channelID: announcementChannel,
										messageID: response.id
									});
								}, 3000); //delete notification message.
							}
						});
					});
				});

			});
		} else if (data.type === "SC") {
			SC.get( API.SoundCloud.CheckLink("https://soundcloud.com" + data.location), function(errO, resO) {

				SC.get( resO.location, function(errT, resT) {

					SC.get( resT.stream_url, function(errTH, resTH) {
						if (errTH) return log('error', JSON.stringify(errTH));
						if (resT.duration > 480000) return notify("The item provided has a duration of over 8 minutes. Ignoring.")

						title = resT.title;
						url = resTH.location;
						id = qID();
						uID = data.location;

						queue.push( new MusicItem(type, title, url, id, userID, user, uID) );
						check();
						notify(user + " has requested " + title);
					});
				});
			});
		}

		try {
			//setTimeout(rebuildPlaylist, 5000);
			//rebuildPlaylist();
		} catch(e) { log(e); };

	};

	this.printQueue = function(){
		try {
			console.log(queue);
		} catch(e) {err(e); };
	};

	this.logger = function(){
		try {
			console.log(current);
			console.log(last);
		} catch(e) { err(e); };
	};

	this.deleteSong = function(user, userID, songID) {
		try {
			for (var i=0; i<queue.length; i++) {
				try{
					if (queue[i].id === Number(songID)) {
						try {
							if (queue[i].requesterID === userID || mods.indexOf(userID) > -1 ) {
								notify( user + " has removed the song " + queue[i].title );
								return queue.splice(i, 1);
							}
						} catch(e) {err(e); };
					}
				} catch(e){err(e);};

			}
		} catch(e) {err(e); };
	};

	this.resumePlaylist = function(){
		try {
			var guildID = Bot.channels[announcementChannel].guild_id;
			//console.log('resume called');
			//console.log(guildID);
			//self.enqueue(soundlogFile.servers[guildID].currentSong.requester, soundlogFile.servers[guildID].currentSong.requesterID, soundlogFile.servers[guildID].currentSong.uID)

			current = soundlogFile.servers[guildID].currentSong;
			queue = soundlogFile.servers[guildID].queue;
			//play(current);
			//playing = true;
			//next = queue[0];
			//check();
			setTimeout(check, 1000);

			//console.log(current);
			//playingPlaylist = true;
			//ready = true;
			//check();
		} catch(e){ log(e); };
	}

	this.wrongSong = function(user, userID) {
		for (var i = queue.length - 1; i >= 0; i--) {
			if (queue[i].requesterID === userID) {
				self.deleteSong(user, userID, queue[i].id);
			}
		}
	}

	this.addMods = function(idArr) {
		return idArr.forEach(function(ID) {
			mods.push(ID);
		});
	};

	this.removeMods = function(idArr) {
		return idArr.forEach(function(ID) {
			if (mods.indexOf(ID) > -1) {
				mods.splice( mods.indexOf(ID), 1 );
			}
		});
	};

	this.addToBlacklist = function(ID) {
		if (blacklist.indexOf(ID) > -1) return log('warn', "ID already in blacklist.");
		blacklist.push(ID);
	}

	this.removeFromBlacklist = function(ID) {
		if (blacklist.indexOf(ID) === -1) return log('warn', "ID not in blacklist.");
		blacklist.splice(blacklist.indexOf(ID), 1);
	}

	this.printPlaylist = function(){
		try {
			if (rebuildingPlaylist){notify('Sorry! I was re-organizing the playlist. Try again.')} else {
				if (typeof queue[0] !== 'undefined'){
					try {
						var currentPlayingSong = queue[0].title;
						var output = '**Current Song: ' + current.title + '**\n \n' + queue.length + ' Songs in playlist: \n';
					} catch(e) { err(e); };
				for (var i = 0; i < queue.length; i++){
					try {
						if (typeof queue[i] === 'undefined'){notify("Can't retrieve playlist right now.");} else {

							if (output.length < 1800){
								if (i !== queue.length - 1 ){
									var position = i + 1;
									if (queue[i].itemType === 'playlist'){
										output += '**' + queue[i].id + '.** ' + queue[i].title + ' **(' + queue[i].requester + ')**       [`from: ' + queue[i].playlistName + '`]\n';
									} else {//dont add 'from' for manually added.
									output += '**' + queue[i].id + '.** ' + queue[i].title + ' **(' + queue[i].requester + ')**\n';
									}
									} else {//dont add new line
										if (queue[i].itemType === 'playlist'){
											output += '**' + queue[i].id + '.** ' + queue[i].title + ' **(' + queue[i].requester + ')**     [`from: ' + queue[i].playlistName + '`]';
										} else {//dont add from if item is not part of a playlist.
											output += '**' + queue[i].id + '.** ' + queue[i].title + ' **(' + queue[i].requester + ')**';
										}
									}
							} else {
								var songsRemaining = queue.length - i;
								output += '\n\nAnd **' + songsRemaining + '** more songs.';
								break;
							}

						}
					} catch(e) {err(e); };
				}
				//console.log(output);
				//console.log('attempting to spit playlist to :' + announcementChannel);
				return Bot.sendMessage({
					to: announcementChannel,
					message: output
				}, function(err, response){
					if (err !== null){log(err); };
					setTimeout(function(){
						try {
							Bot.deleteMessage({
								channelID: response.channel_id,
								messageID: response.id
							});
						} catch(e){ log(e); };
					}, 1000 * queue.length);
				});
				//return notify(output);
				} else {//prevent crash if item is not defined.
					notification(current.title + ' requested by **(' + current.requester + ')**')
					//notify("Can't retrieve playlist right now.");
				}
			}

		} catch(e) {err(e); };

	}

	this.queuePlaylist = function(user, userID, ID, playlistName, saveScope) {
		plQueue = [];//legacy
		var playlistName = 'Untitled Playlist';
		var playlistDesc = '-';
		request( API.Youtube.GetPlaylist(ID) , function(err, res, body) {
			if (err || (res.statusCode / 100 | 0) != 2) return log('error', ID + " is not a valid Playlist ID");
			body = JSON.parse(body);
			//console.log(body);
			var items = body.items;
			var originalItemLength = body.items.length;


			//console.log(originalItemLength);
			request(API.Youtube.PlaylistInfo(ID), function(err, res, body){
				try {
					if (err) return log('error', err);
					body = JSON.parse(body);
					playlistName = body.items[0].snippet.title;
					playlistDesc = body.items[0].snippet.description;
					console.log(body.items[0].snippet);
				} catch(e){ log(e); };
				notification('**Detected ' + originalItemLength + ' songs** for playlist: **' + playlistName + '**. Attempting to collect them. This might take a bit.');
				addQItem(items);
			});
		});
		function addQItem(items) {

			if (items.length === 0) {//items have finished being added.
				notification('**Finished grabbing playlist.**');

				return check();
			}
			var ci = items.shift();
			//console.log(items[0]);
			ytdl.getInfo( "https://www.youtube.com/watch?v=" + ci.snippet.resourceId.videoId, function(err, info) {
				//console.log(info);
				if (typeof info !== 'undefined'){
				var f = info.formats;
				var hb = 0;
				var selection;
				for (var i=0; i<f.length; i++) {
					if ( (Number(f[i].audioBitrate)) && Number(f[i].audioBitrate) > hb ) {
						hb = Number(f[i].audioBitrate);
						selection = f[i];
					}
				}

				request (API.Youtube.ContentDetails(ci.snippet.resourceId.videoId), function(err, res, body2) {
					if (err) return log('error', err);
					body2 = JSON.parse(body2);
					//console.log(body2);
					//var duration = body2.items[0].contentDetails.duration;
					var plDuration = turnStupidAssYoutubeShitIntoActualSeconds(body2.items[0].contentDetails.duration);


					var type = 'YT';
					var title = ci.snippet.title;
					var url = selection.url;
					var uID = ci.snippet.resourceId.videoId;
					var id = pqID();
					//var plItemDurr = ci.contentDetails.duration;

					//console.log(ci.length);
					//console.log(items.length);
					try {
				//	var percentageImportedC = originalItemLength / items.length;
				//	var percentageImported = percentageImportedC * 100;

					//notification('**' + percentageImported + '%**' + ' done importing');
				} catch(e){ log(e); };
					queue.push( new PlaylistItem(type, title, url, id, userID, user, uID, plDuration, plName) );
					addQItem(items);
					rebuildPlaylist();
			});

				} else {
				addQItem(items);
			}
			});
		}
	};

	function pqID() {
		return plQueue.length > 0 ? plQueue[plQueue.length - 1].id + 1 : 0;
	}

	this.setAnnouncementChannel = function(ID) {
		try {
			var sID = Bot.channels[ID].guild_id;

			if (!sID) return log('warn', "Cannot find server associated with: " + ID);
			var cList = Bot.servers[sID].channels;
		} catch(e) { err('anouncement set error: ' + e); };
		for (var channel in cList) {
			if (channel === ID && cList[channel].type === "text") {
				return announcementChannel = ID;
			}
		}

	};

	this.setPlaylistInterruption = function(b) {
		if (!!b) {
			log("Songs will interrupt playlist when queued");
		} else {
			log("Songs won't interrupt playlist when queued");
		}
		return plInterruption = !!b;
	}

	this.query = function(what) {
		switch (what) {
				case "last":
					if (last) {
						qResponse(last.title, last.id, last.requesterID, last.requester);
					}
					break;
				case "current":
					if (current) {
						qResponse(current.title, current.id, current.requesterID, current.requester);
					}
					break;
				case "next":
					if (next) {
						qResponse(next.title, next.id, next.requesterID, next.requester);
					}
					break;
				case "all":
					if (queue.length > 0) {
						var message = "```\n";
						queue.forEach(function(song, index, arr) {
							if (index == arr.length - 1) {
								return message += song.id + ") " + song.title + "\n```";
							}
							message += song.id + ") " + song.title + "\n";
						});
						Bot.sendMessage({
							to: announcementChannel,
							message: message
						});
					}
					break;
		}
	};

	this.searchYoutube = function(user, userID, q) {
		q = q.split(" ").join("+");

		request( API.Youtube.Search(q), function(err, res, body) {
			if (err || (res.statusCode / 100 | 0 != 2) ) return log('warn', "Could not execute search");
			body = JSON.parse(body);
			try {
				for (var i=0; i<body.items.length; i++) {
					if (body.items[i].id.kind === "youtube#video") {
						return self.enqueue(user, userID, body.items[i].id.videoId);
					}
				}
			} catch(e){err(e);};
		});
	};


	var activelyCollecting = false;
	var collectedSkips = 0;
	var usersThatHaveSkippedThisSession = {};
	this.skip = function(userID){

		if (hasPowerToSkip(userID) || current.requesterID === userID){
			//immediately skip if has power or requester is requesting skip.
			if (typeof enc !== 'undefined'){
				try {
					enc.kill();
					rebuildPlaylist(queue);
					Bot.sendMessage({
						to: announcementChannel,
						message: '**Successfully skipped current song.**'
					}, function callback(err, response){
						setTimeout(function(){
							Bot.deleteMessage({
							channelID: announcementChannel,
							messageID: response.id
						})}, 3000);
					});
				} catch(e) {
					err(e);
				}
			} else {
				notify("I'm having a little trouble skipping. Might have to leave and rejoin voice. (Working on a fix)");
			}

		} else {
			//voteskip instead.

			//get amount of users from channel;
			try {
				if (activelyCollecting === false){
					collectedSkips = 0;
				}
				var usersInVoiceChannel = Object.keys(Bot.servers[serverID].channels[voiceChannel].members).length - 1; //(bot doesn't count)
				var skipsRequired = Math.floor(usersInVoiceChannel * 0.51); //requires the majority to skip.
				activelyCollecting = true;

				if (typeof usersThatHaveSkippedThisSession[userID] === 'undefined'){
					collectedSkips++;
					usersThatHaveSkippedThisSession[userID] = '';
				} else {
					Bot.sendMessage({
						to: announcementChannel,
						message: '<@' + userID + '> ' + 'You have already voted to skip.'
					}, function callback(err, response){
						setTimeout(function(){
								Bot.deleteMessage({
								channelID: announcementChannel,
								messageID: response.id
							});
						}, 3000);
					});
				}

				var skipsleft = skipsRequired - collectedSkips;

				if (collectedSkips >= skipsRequired){
					//skip
					if (typeof enc !== 'undefined'){

						try {
							enc.kill();
							rebuildPlaylist(queue);
							activelyCollecting = false;
							usersThatHaveSkippedThisSession = {};
							Bot.sendMessage({
								to: announcementChannel,
								message: '**Successfully skipped current song.**'
							}, function callback(err, response){
								setTimeout(function(){
									Bot.deleteMessage({
									channelID: announcementChannel,
									messageID: response.id
								})}, 3000);
							});

						} catch(e) {
							err(e);
						}
					} else {
						notify("I'm having a little trouble skipping. Might have to leave and rejoin voice. (Working on a fix)");
					}

					activelyCollecting = false;
				} else {
					//return skips left;
					//notify('Voted to skip. ' +  skipsleft + ' remaining to skip. [' + collectedSkips + '/' + skipsRequired + ']');
					try {
						Bot.sendMessage({
							to: announcementChannel,
							message: 'Voted to skip. *' +  skipsleft + '* remaining to skip. [' + collectedSkips + '/' + skipsRequired + ']'
						}, function callback(err, response){
							setTimeout(function(){
								Bot.deleteMessage({
								channelID: announcementChannel,
								messageID: response.id
							})}, 3000)
						});
					} catch(e) { err(e); };
				}

			} catch (e){ err(e); };
		}

	};

	this.evaluate = function(input){
		//for debugging purposes.
		try {
			eval(input);
		} catch(e) {err(e); };
	}

	this.kill = function(){

		try {

			killing = true;
			playing = false;
			queue = [];
			plQueue = [];
			//rebuildPlaylist();
			enc.kill();
			playing = false;
			resetStatus();

		} catch(e){

			err(e);

		}

	}

	function parseInput(input) {
		var ret = {
			type: undefined,
			location: undefined
		};

		if (input.indexOf("youtube.com/watch?v=") > -1) {
			ret.type = "YT";
			ret.location = input.substring(input.indexOf("?v=") + 3, input.length);
		} else if (input.indexOf("soundcloud.com/") > -1) {
			ret.type = "SC";
			ret.location = input.substring(input.indexOf(".com/") + 4, input.length);
		} else {
			ret.type = "YT";
			ret.location = input;
		}
		if (blacklist.indexOf(ret.location) > -1) return false;

		return ret;
	}
	function hasPowerToSkip(userID){
		var skipPowerRole = '219486429452042251';
		var output = false;
		try {
			var userRoles = Bot.servers[serverID].members[userID].roles;

			for (var i = 0; i < userRoles.length; i++) {
					if (userRoles[i] === skipPowerRole){
						output = true;
					}
			};

		} catch(e) {  err(e); };
		return output;
	}
	function turnStupidAssYoutubeShitIntoActualSeconds(input) {
		var reptms = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
		var hours = 0, minutes = 0, seconds = 0, totalseconds;
		if (reptms.test(input)) {
			var matches = reptms.exec(input);
			if (matches[1]) hours = Number(matches[1]);
			if (matches[2]) minutes = Number(matches[2]);
			if (matches[3]) seconds = Number(matches[3]);
			totalseconds = hours * 3600  + minutes * 60 + seconds;
		}
		return (totalseconds);
	}
	function tooManyRequests(userID) {
		var a = 0;
		for (var i=0; i<queue.length; i++) {
			if (queue[i].requesterID === userID) {
				a += 1;
			}
		}
		return a >= 40;
	}
	function log() {
		var types = {
			info: "[INFO]",
			warn: "[WARN]",
			error: "[ERROR]",
			sent: "[SENT]",
			received: "[RECEIVED]",
			func: "[FUNCTION STARTED]"
		};
		switch (arguments.length) {
			case 0:
				return false;
				break;
			case 1:
				console.log(types.info + ": " + arguments[0]);
				break;
			case 2:
				if (typeof(window) !== 'undefined') {
					if (window.console[arguments[0].toLowerCase()]) {
						window.console[arguments[0].toLowerCase()](arguments[1]);
					}
				} else {
					console.log(types[arguments[0].toLowerCase()] + ": " + arguments[1]);
				}
				break;
		}
	}
	function qID() {
		return queue.length > 0 ? queue[queue.length - 1].id + 1 : 0;
	}

	function check() {
		if (playing) { next = queue[0]; return log('warn', "Song already playing"); }
		if (!playing && queue[0]) return play(queue[0]);
		if (!playing && plQueue[0]) return playPlaylist(plQueue[0]);
	}
	var currentSongTitle;
	var requesterName;

	//notification
	function notification(message){
		try {
		Bot.sendMessage({
			to: announcementChannel,
			message: message
		}, function(err, response){
			if (err !== null) log(err);

			setTimeout(function(){
				try {
				Bot.deleteMessage({
					channelID: response.channel_id,
					messageID: response.id
				});
			} catch(e){ log(e); };

		}, 5000);
		});
	} catch(e){ log(e); };
	}


	function play(currentSong) {
		try {
			var requester = queue[0].requester;
			var currentPlayingSong = queue[0].title;
		} catch(e) { err(e); };

		if (!plInterruption && playingPlaylist) return;
		if (!ready) return log('warn', "Not ready to play audio");

		if (playingPlaylist) {
			try {
				plRef.kill();
			} catch(e) {err(e); };

		}

		var selection; //removed enc from here

		queue.shift();
		playingPlaylist = false;
		playing = true;

		selection = choosePlayer(encs);
		enc = childProc.spawn(selection, [
			'-loglevel', '0',
			'-i', currentSong.url,
			'-f', 's16le',
			'-ar', '48000',
			'-ac', '2',
			'pipe:1'
		], {stdio: ['pipe', 'pipe', 'ignore']});

		var notificationMsgId;
		enc.stdout.once('readable', function() {
			//secondsLeft = duration;
			streamReference.send(enc.stdout);
			delete currentSong.id;
			current = currentSong;
			next = queue[0];
			currentSongTitle = currentPlayingSong;
			requesterName = requester;
			Bot.setPresence({game: {name: currentPlayingSong}});
			nowPlayingProgressBar();
			rebuildPlaylist(queue);

		});

		enc.stdout.once('end', function() {

			playing = false;
			last = current;
			current = undefined;
			if (typeof enc !== 'undefined'){
				try {
					enc.kill();
				} catch(e) {
					err(e);
				}

			} else {
				notify("I'm having a little trouble changing to the next song. Might need to leave and rejoin (Working on a fix) sorry!");
			}
			check();
			Bot.setPresence({game: {name: currentStatus}});
			Bot.deleteMessage({
				channelID: announcementChannel,
				messageID: notificationMsgId
			});
			editLooper.stop();
			if (!killing){
				rebuildPlaylist(queue);
			}

		});
	}

	var timeLeft = 'Loading';
	function nowPlayingProgressBar(){
		var channel = announcementChannel;
		//convert duration to seconds left;
		var secondsLeft = current.duration;

		function updateTimeLeft(){
				if (playing && secondsLeft > 0){

					secondsLeft--;
					var minutesCalc = Math.floor(secondsLeft / 60);
					var secondsCALC = secondsLeft - minutesCalc * 60;
					var minutesDISPLAY;
					var secondsDISPLAY;
					if (minutesCalc.toString().length === 1){
						minutesDISPLAY = '0' + minutesCalc.toString();
					} else {minutesDISPLAY = minutesCalc.toString()};

					if (secondsCALC.toString().length === 1){
						secondsDISPLAY = '0' + secondsCALC.toString();
					} else {
						secondsDISPLAY = secondsCALC.toString();
					}

					timeLeft = minutesDISPLAY + ':' + secondsDISPLAY;
				}
			}
		//update time every second;
		setInterval(updateTimeLeft, 1000);
		//convert seconds to minutes and seconds format;
		var continueLoop = true;
		//BUDI pre-requisites
		function BUDI(channel){
			var msgID;
			var loaded;
			this.start = function(changingMessage){
				loaded = true;
				Bot.sendMessage({
					to: channel,
					message: changingMessage()
				}, function(err, response){
					if (err !== null){console.log(err)};
					if (response !== 'undefined'){
						try {
							msgID = response.id;
						} catch(e){err(e)};
					} else {console.log('No response.')};

								editMsgLoop(buildProgressBar)

								function editMsgLoop(buildMSG){
									var editMsgToSend = buildProgressBar();
									if (continueLoop){
									//isBUDItheLatestMsg();

									if (loaded !== true){loaded = true};
									Bot.editMessage({
										channelID: channel,
										messageID: msgID,
										message: editMsgToSend
									}, function(error, response){
										if (error !== null){console.log(error)};
										if (typeof response !== 'undefined'){//response recieved
											if (response.content === editMsgToSend){//edited Successfully

												setTimeout(carryOnLoopingEditMsg, 5000);

												function carryOnLoopingEditMsg(){
														editMsgLoop(changingMessage);
												}
											}
										} else {//no response.
											console.log('No response frome edit Msg.')
										}

									});
							} else {
								console.log('Loop cancelled or finished');
								secondsLeft = 0;

							}

							}//end define editmsg loop
				}//end sendmsg callback
				)

			}//end this.start msg loop

			this.stop = function(){
				if (loaded){
					continueLoop = false;
					secondsLeft = 0;
					Bot.deleteMessage({
						channelID: announcementChannel,
						messageID: msgID
					})
				} else {
					console.log('no loop running');
				}
			}

			function isBUDItheLatestMsg(){
				if (loaded){
					//console.log('BUDI Loaded, proceeding to get msg.');
				Bot.getMessages({
					channelID: channel,
					limit: 1
				}, function(error, results){
					var output;
					//console.log(results[0].id);
					if (error !== null){console.log(error)};
					if (results !== 'undefined'){
						if (results[0] !== 'undefined'){
							if(results[0].id === msgID){//id's match, it is latest msg
								return makeBUDILatestMsg(true);
							} else {
								return makeBUDILatestMsg(false);
							}
						} else {console.log('first result item not defined')}
					} else {console.log('results not defined')}
					//console.log(output);
				});} else {
					//not loaded
					console.log('BUDI not loaded. Cannot check if it is latest msg.');
				}

			}
			//end define is latest msg BUDI function

			function makeBUDILatestMsg(trueOrFalse){
				//  while (isBUDItheLatestMsg() === 'undefined'){console.log('waiting for output');/*wait*/}
				//console.log('BUDI result is ' + trueOrFalse);
				if (loaded && trueOrFalse === false){//loaded and budi not latest msg.
					//delete msgID
					Bot.deleteMessage({
						channelID: channel,
						messageID: msgID
					}, function(error){
						if (error !== null){
							console.log(error);
						} else {
						//after message deleted, send new message.
						Bot.sendMessage({
							to: channel,
							message: buildProgressBar()
						}, function(error, response){
							if (error !== null){console.log(error)};
							if (response !== 'undefined'){
								if (response.id !== 'undefined'){
									msgID = response.id;
								}
							}
						});
						}
					});
					//end delete method
					} else {
						var errorMsg = '';
						if (loaded !== true){errorMsg = 'BUDI not loaded\n';};
						if (trueOrFalse){errorMsg = 'BUDI already latest message'}
						//console.log(errorMsg);
						//console.log(loaded);
						//console.log('BUDI:' + trueOrFalse);
					}
			}
			//end reshift BUDI to latest msg method.
		//  makeBUDILatestMsg();

		};
		//end define budi

		//build the progress bar;
		//var incrementer = 0;
		function buildProgressBar(){
			try {
				//if (typeof current === 'undefined'){ duration = 0 } else {duration = current.duration;};
				var outputArray = [];
				var incrementalLoadArray = [["", "────────────"], ["─", "───────────"], ["──", "──────────"], ["───", "─────────"], ["────", "────────"], ["─────", "───────"], ["──────", "──────"], ["───────", "─────"], ["────────", "────"], ["─────────", "───"], ["─────────", "───"], ["──────────", "──"], ["───────────", "─"], ["────────────", ""]];
				var currentPlaceMarker = "🔘";
				var incrementFactor = Math.floor(current.duration / 12);
				//console.log('incrementFactor: ' + incrementFactor);
				var percentageOfSongPlayedCALC = secondsLeft / current.duration;
				//console.log('percentage calculation: ' + percentageOfSongPlayedCALC);
				var percentageOfSongPlayed = 1 - percentageOfSongPlayedCALC;
				var arrayLength = incrementalLoadArray.length - 1;
				var iTPBI = Math.floor(percentageOfSongPlayed * arrayLength);
				//if (secondsLeft !== 0 && secondsLeft % incrementFactor === 0){incrementer += 2};

					return '**Now playing:** ' + currentSongTitle + ' _requested by ' + requesterName + '_' + '\n\n' + "▶ " + incrementalLoadArray[iTPBI][0] + currentPlaceMarker + incrementalLoadArray[iTPBI][1] + ' [' + timeLeft + ']' ;
				} catch(e){ log(e); };

		}

		editLooper = new BUDI(channel);
		editLooper.start(buildProgressBar);


	}
	//end define progress bar func
	function playPlaylist(currentSong) {
		var selection; //removed enc from here.
		if (playing) return log('warn', "Requested song already playing");
		playingPlaylist = true;
		plQueue.shift();
		plQueue.push(currentSong);

		selection = choosePlayer(encs);
		enc = childProc.spawn(selection, [
			'-loglevel', '0',
			'-i', currentSong.url,
			'-f', 's16le',
			'-ar', '48000',
			'-ac', '2',
			'pipe:1'
		], {stdio: ['pipe', 'pipe', 'ignore']});

		plRef = enc;
		enc.stdout.once('readable', function() {
			try {
				streamReference.send(enc.stdout);
				current = currentSong;
				delete currentSong.id;
				current = currentSong;
				next = queue[0];
				currentSongTitle = currentPlayingSong;
				requesterName = requester;
				Bot.setPresence({game: {name: currentPlayingSong}});
				nowPlayingProgressBar();
				rebuildPlaylist(plQueue);
			} catch(e) {err(e);};
		});

		var notificationMsgId;
		enc.stdout.once('end', function() {
			/*current = undefined;
			if (typeof enc !== 'undefined'){
			enc.kill();}
			playingPlaylist = false;
			try {
				editLooper.stop();
			} catch(e){ log(e); };
			check();
			try {
				rebuildPlaylist(plQueue);
			} catch(e) {err(e);}; */



			playingPlaylist = false;
			last = current;
			current = undefined;
			if (typeof enc !== 'undefined'){
				try {
					enc.kill();
				} catch(e) {
					err(e);
				}

			} else {
				notify("I'm having a little trouble changing to the next song. Might need to leave and rejoin (Working on a fix) sorry!");
			}
			try {
				check();
				Bot.setPresence({game: {name: currentStatus}});
				Bot.deleteMessage({
					channelID: announcementChannel,
					messageID: notificationMsgId
				});
				editLooper.stop();
				if (!killing){
					rebuildPlaylist(plQueue);
				}
			} catch(e){ log(e); };
		});

	}
	function choosePlayer(players) {
		players = JSON.parse(JSON.stringify(players));
		var spawn = childProc.spawn, spawnSync = childProc.spawnSync;
		if (players.length > 0) {
			var n = players.shift();
			var s = spawnSync(n);
			if (s.error) {
				return choosePlayer(players);
			} else {
				console.log("Using " + n);
				return n;
			}
		} else {
			console.log("You need either 'ffmpeg' or 'avconv' and they need to be added to PATH");
			return undefined;
		}
	}
	function notify(message) {
		if (!announcementChannel) return log('warn', "No announcement channel selected");

		Bot.sendMessage({
			to: announcementChannel,
			message: message
		});
		return log("Sent: " + message);
	}
	function resetStatus(){
		Bot.setPresence({
			game: {
				name: currentStatus
			}
		});
	}
	function qResponse(title, ID, requesterID, requester) {
		var m = "``\n" +
        	"Title         :  %TITLE%\n" +
        	(ID ? "ID            :  %ID%\n" : "") +
        	(requesterID ? "Requested By  :  %UNAME%\n" : "") +
        	"``";
		m = m.replace("%TITLE%", title)
			.replace("%ID%", ID)
			.replace("%UNAME%", requester + " " + '(' + requesterID + ')');

		notify(m);
	}

	function rebuildPlaylist(playlistQueue){
		try {
			var guildID = Bot.channels[announcementChannel].guild_id;
		} catch(e) { log(e); };

		var plQueueLOG = plQueue;
		//var queueLOG = soundlogFile.queue;
		try {
			rebuildingPlaylist = true;
			for (var i = 0; i < playlistQueue.length; i++){
				playlistQueue[i].id = i + 1;

			}
			rebuildingPlaylist = false;
			try {
				soundlogFile.servers[guildID].queue = playlistQueue;

				if (soundlogFile.servers[guildID].announcementChannel.length === 0){
				soundlogFile.servers[guildID].announcementChannel = announcementChannel;}

				soundlogFile.servers[guildID].currentSong = current;
				fs.writeFile('./soundlog.json', JSON.stringify(soundlogFile, null, 2), function callback(err){
          log('Queue log updated.');
          //respond('New prefix: ' + newPrefix + ' now applied. Changes will take effect on bot reboot. _do ' + prefix + 'restart_', channelID);
        });
			} catch(e){ log(e); };
		} catch(e){ log(e); };
	}



	/* --- Prototypes --- */
	function MusicItem(type, title, url, id, requesterID, requester, uID, duration) {
		this.type = type;
		this.title = title;
		this.url = url;
		this.id = id;
		this.requesterID = requesterID;
		this.requester = requester;
		this.uID = uID;
		this.duration = duration;
		this.itemType = 'manual';
		rebuildPlaylist(queue);
	}
	function PlaylistItem(type, title, url, id, requesterID, requester, uID, duration, plName) {
		this.type = type;
		this.title = title;
		this.url = url;
		this.id = id;
		this.requesterID = requesterID;
		this.requester = requester;
		this.uID = uID;
		this.duration = duration;
		this.itemType = 'playlist';
		this.playlistName = plName;
		rebuildPlaylist(queue);
	}
	function err(error){
		//deals with error msg by logging it to console & responding to user.
		try {
			logE('Error: ' + error);
			notify('Error: ' + error);
		} catch (e){
			console.log('Could not handle error: ' + e);
		}

	}
	//end error handler

	//logging:
	function logE(Message){
		try {
			if (typeof serverID !== 'undefined'){
				var logChannel = configFile.serverSpecific[serverID].logChannel;
			} else { serverID = '128319520497598464'};
			//log('`' + Message + '`', logChannel);
			Bot.sendMessage({
				to: logChannel,
				message: '`' + Message + '`'
			})
			console.log(Message);
		} catch (e) {
			console.log(e);
		}
	}
	//end logging
}




module.exports = Player;
