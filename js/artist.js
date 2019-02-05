$(document).ready(function() {
	(function($){
		// loading
		var $triangles = document.querySelectorAll('.triangle');
		var template = '<svg class="triangle-svg" viewBox="0 0 140 141">\n<g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n<polygon class="triangle-polygon" points="70 6 136 138 4 138"></polygon>\n</g>\n</svg>';

		Array.prototype.forEach.call($triangles, function ($triangle, index) {
			$triangle.innerHTML = template;
		});
		setTimeout(function(){
			$('.triangle-wrapper').addClass('triangle-hide');
			setTimeout(function(){
				$('.loader').addClass('loader-hide');
				setTimeout(function(){
					$('.loader').hide();
					$('body').addClass('show-overflow');
				}, 200);
			}, 300);
		}, 2900);

		var genreName,
			pathname = window.location.href;
		// First time page load execution	
		if (pathname.indexOf("#artist=") >= 0){ // Check if artist
			// gets name of artist from page link
			artistName = pathname.split('#artist=');
			artistName = artistName[1];
			artistName = decodeURI(artistName);
			// new page title / artist - song name
			document.title = artistName + ' | Amplyfm';
			loadArtistOrGenre(artistName);
		} else { // Check if genre
			// gets name of genre from page link
			genreName = pathname.split('#tag=');
			genreName = genreName[1];
			genreName = decodeURI(genreName);
			// new page title / artist - song name
			document.title = genreName + ' | Amplyfm';
			loadGenre(genreName);
		}
	})(jQuery);

    // Preload some icons for later use
	preload([
	    'image/icons/volume-mute-solid.svg',
	    'image/icons/youtube-brands.svg',
	    'image/icons/circle-notch-solid.svg'
	]);
	function preload(arrayOfImages) {
	    $(arrayOfImages).each(function () {
	        $('<img />').attr('src',this).appendTo('body').css('display','none');
	    });
	}
});
var intervalTimer,
	intervalBar,
	time,
	artistName,
	trackName,
	global_volume,
	volume_slider = document.getElementById('volume_slider'),
	duration_slider = document.getElementById('duration_slider'),
	player_error_no_embed = false,
	rankOfTrack,
	pathname = window.location.href,
	executed,
	errorExecuted,
	youtubeUrl;

// Check if mobile
var isMobile = {
    Android: function() {
        return /Android/i.test(navigator.userAgent);
    },
    BlackBerry: function() {
        return /BlackBerry/i.test(navigator.userAgent);
    },
    iOS: function() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    },
    Windows: function() {
        return /IEMobile/i.test(navigator.userAgent);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Windows());
    }
};
// If desktop
if (!isMobile.any()){
	// Set volume to 20 or 1/5
	global_volume = 20;
} else { // if mobile
	global_volume = 100;
	// Removes volume icon
	$('footer .fa-volume-up, footer .fa-redo-alt').remove();
}
// Format time, 360s = 6:00, 3600s = 1:00:00
function formatTime(number){
	var hours	= Math.floor(number / 3600);
	var minutes = Math.floor((number - hours * 3600) / 60);
	var seconds = Math.floor(number - hours * 3600 - minutes * 60);
	if (seconds < 10) {
		seconds = "0" + seconds
	}
	if(hours < 1){
		dur = minutes + ":" + seconds;
	} else {
		if (minutes < 10) {
			minutes = "0" + minutes
		}
		dur = hours + ":" + minutes + ":" + seconds;
	}
	return dur;
}
// Format number, 9999999 = 9.999.999
function formatNumber(number) {
    number += '';
    var x = number.split('.');
    var x1 = x[0];
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + '.' + '$2');
    }
    return x1;
}
// removes duplicates from array
function eliminateDuplicates(arr, obja) {
	var i,
		len = arr.length,
		obj = {};
	for (i = 0; i < len; i++) {
		obj[arr[i]]=0;
	}
	for (i in obj) {
		i = i.replace(/^[\u00C0-\u1FFF\u2C00-\uD7FF\w]|\s[\u00C0-\u1FFF\u2C00-\uD7FF\w]/g, function(e) {
		    return e.toUpperCase();
		});
		obja.push(i);
	}
}
// Plays next track
function nextTrack(){
	rankOfTrack = $('.active').first().text();
	// from string to intriger
	rankOfTrack = parseInt(rankOfTrack); 
	var numberOfListItems = $('.main-tracks li').length;
	$('.track-info').removeClass('active');
	$('.pesma').removeClass('active-list-bg-color');
	// If active track position is less than number of tracks, play next track in order
	if(rankOfTrack < numberOfListItems){
		rankOfTrack = rankOfTrack + 1;
		$('.playlist .track-' + rankOfTrack + ' .track-info').trigger('click');
	// If active track position is number of tracks, play first track	
	} else if (rankOfTrack == numberOfListItems) {
		$('.playlist .track-1 .track-info').trigger('click');
	}
}
// Function that can only fire once
var canOnlyFireOnceStop = (function() {
    executed = false;
    return function() {
        if (!executed) {
            executed = true;
            // Return duration slider to beginning
			duration_slider.noUiSlider.set(0);
			// Reset timer to 0:00
			$('.current').empty().append('0:00');
			// If pause icon is active change it to pause icon
			if($('.plpa').hasClass('pause')) {
				$('.plpa').removeClass('fa-pause-circle pause').addClass('fa-play-circle play');
				$('.plpa').attr('src', 'image/icons/play-circle-solid.svg');
			}
			// Repeat track if repeat icon is activ
          	if($('.fa-redo-alt').hasClass('repeat')) {
          		playVideo();
          	} else { // Or play next track
            	nextTrack();
          	}
        }
    };
})();
// Returns error and loads next video in queue
var errorOnce = (function() {
    errorExecuted = false;
    return function() {
        if (!errorExecuted) {
            errorExecuted = true;
			player_error_no_embed = true;
			$('#player').yt({
				artName: artistName,
				songName: trackName
			});
        }
    };
})();
var player;
// The API will call this function when the video player is ready.
function onPlayerReady() {
	player.unMute();
	if($('.track-info').hasClass('active')){
		setVolume();
		playVideo();
	}
	// Gives time to player parameters to load, then shows player
	if($('.align-items-end').hasClass('click-track') !== false){
		setTimeout(function(){
			$('.align-items-end').addClass('show-pl-controls');
			$('.row-main-second ').addClass('has-margin');
		}, 500);
	}
	// Create volume slider
	if($('#volume_slider').is(':empty')){
		noUiSlider.create(volume_slider, {
		    start: [global_volume],
			connect: "lower",
		    range: {
		        'min': [0],
		        'max': [100]
		    }
		});
	}
	// Create duration slider
	// when page loads
	if($('#duration_slider').is(':empty')){
		time = player.getDuration();
		noUiSlider.create(duration_slider, {
		    start: [0],
			connect: "lower",
		    range: {
		        'min': [0],
		        'max': time
		    }
		});
	} else { // updates slider and other parameters when playing songs
		var newTime = formatTime(player.getDuration());
		var newDur = player.getDuration();
		$('.total').empty().append(newTime);
		$('.current').empty().append('0:00');
		duration_slider.noUiSlider.set(0);
		duration_slider.noUiSlider.updateOptions({
		    range: {
		    	'min': [0],
		        'max': newDur
		    }
		});
	}

	// Listening to slider and changing volume
	if (!isMobile.any()){
		volume_slider.noUiSlider.on('update', function () {
			setVolume();
		});
	}
	// Listening to slider and changing the timestamp of a song
	duration_slider.noUiSlider.on('slide', function () {
		setSongTime();
	});
	// Workaround for youtube on player state change not working properly
	// check the state every 0.1s
    var state = player.getPlayerState();
	playerOnStateChange = setInterval(function(){
	    var state = player.getPlayerState();
	    // vidio ended
		if(state === 0) {
			// when video ends, play next track or repeat
			canOnlyFireOnceStop();
		}
		// vidio is on
		if(state === 1) {
			if($('.loadSpin').hasClass('fa-circle-notch')){
				$('.active .loadSpin').removeClass('fa-circle-notch');
				$('.active .loadSpin').addClass('fa-play').attr('src', 'image/icons/play-solid.svg');
			}
			if($('.plpa').hasClass('play')) {
				$('.plpa').removeClass('fa-play-circle play').addClass('fa-pause-circle pause');
				$('.plpa').attr('src', 'image/icons/pause-circle-solid.svg');
			} else {
				var dur = formatTime(player.getCurrentTime()); 
				duration_slider.noUiSlider.set(player.getCurrentTime());
				$('.current').empty().append(dur);
			}
			executed = false;
		}
		// video pause
		if (state === 2) {
			if($('.plpa').hasClass('pause')) {
				$('.plpa').removeClass('fa-pause-circle pause').addClass('fa-play-circle play');
				$('.plpa').attr('src', 'image/icons/play-circle-solid.svg');
			}
		} 
		// bafering
		if(state === 3 || state === 5) {
			errorExecuted = false;
			if($('.loadSpin').hasClass('fa-play')){
				$('.active .loadSpin').removeClass('fa-play').addClass('fa-circle-notch');
				$('.active .loadSpin').attr('src', 'image/icons/circle-notch-solid.svg');
			}
		}
		// if video not found, or can't be embedded, etc
		// load next in queue
		if (state === -1) {
			errorOnce();
		} else {
			player_error_no_embed = false;
		}
	}, 100);
}

//  This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

//  This function creates an <iframe> (and YouTube player)
//  after the API code downloads.
function onYouTubeIframeAPIReady() {
	player = new YT.Player('player', {
		height: '100%',
		events: {
			'onReady': onPlayerReady
		}
	});
}

function setVolume(){
	if (!isMobile.any()){
		global_volume = volume_slider.noUiSlider.get();
	}
	player.setVolume(global_volume);

	if(global_volume == 0) {
		$('.volume').removeClass('fa-volume-up').addClass('fa-volume-mute');
		$('.volume').attr('src', 'image/icons/volume-mute-solid.svg');
	} else {
		$('.volume').removeClass('fa-volume-mute').addClass('fa-volume-up');
		$('.volume').attr('src', 'image/icons/volume-up-solid.svg');
	}
}
// enables changing song timestamp on click
function setSongTime(){
	time = duration_slider.noUiSlider.get();
	player.seekTo(time);
}
function playVideo() {
	player.playVideo();
}
function pauseVideo() {
	player.pauseVideo();
}
function stopVideo() {
	player.stopVideo();
}

var increment = 0;
$.fn.yt = function(options){
	var settings = $.extend({
		artName: null,
		songName: null
	}, options);
	var imeBenda = settings.artName.replace(/&/g, '%26');
	var imePesme = settings.songName.replace(/&/g, '%26');
	var apikey = ytKey;
	var videos = [];
	var pathnameLink = window.location.href;

	var url = "https://www.googleapis.com/youtube/v3/search?videoDefinition=any&part=snippet&videoEmbeddable=true&q="
			  + imeBenda + "+" + imePesme + "&part=contentDetails&type=video&maxResults=10&key=" + apikey;
	// load new iframe src 		  
	function loadIframe(url) {
	    var $iframe = $('#player');
	    if ( $iframe.length ) {
	        $iframe.attr('src',url);   
	        return false;
	    }
	    return true;
	}
	if (imeBenda.indexOf("%26") >= 0){
		imeBenda = imeBenda.replace(/%26/g, '&');
	}

	if (imePesme.indexOf("%26") >= 0){
		imePesme = imePesme.replace(/%26/g, '&');
	}
	function isLoaded () {
		if(videos.length > 0){
			if(player_error_no_embed){
				// if error load next video in queue
				var ytID = videos[++increment].url;
			} else {
				var ytID = videos[0].url;
				increment = 0;
			}
			// put new youtube id in src
			var id_whole = $('#player').attr("src");
			id_whole = id_whole.split('embed/');
			var check_if_id_exists = id_whole[1].split('?enable');

			if(check_if_id_exists[0].length != 0) {
				check_if_id_exists[0] = ytID;
				var id_new = id_whole[0] + 'embed/' + check_if_id_exists[0] + '?enable' + check_if_id_exists[1];
			} else {
				var id_new = id_whole[0] + 'embed/' + ytID + id_whole[1];
			}			
			// put new src in iframe without loading new iframe
			loadIframe(id_new);
			// put src in href of currently playing artist
			pathnameLink = pathnameLink.split('#artist=');
			pathnameLink = pathnameLink[0] + "#artist=" + imeBenda;
			if (pathnameLink.indexOf("#tag=") >= 0){
				pathnameLink = pathnameLink.split('#');
				pathnameLink = pathnameLink[0] + '#' + pathnameLink[2];
			}
			if (pathname.indexOf("#artist=") >= 0){
				var markup = '<div><a href="' + pathnameLink + '">' + imeBenda + '</a><p>' + imePesme + '</p></div>'
				$('.currently-playing').empty().append(markup);
			} else {
				var markup = '<div><a href="' + pathnameLink + '">' + imeBenda + '</a><p>' + imePesme + '</p></div>'
				$('.currently-playing').empty().append(markup);
			}

			if (isMobile.any()){
				$('.currently-playing a').addClass('currently-playing-mobile');
			}

			var newTitle = imeBenda + ' - ' + imePesme + ' | Amplyfm'

			if (document.title != newTitle) {
			    document.title = newTitle;
			}

			youtubeUrl = 'https://youtu.be/' + ytID;

			new ShareButton({
			  	networks: {
					reddit: {
						url: youtubeUrl
					},
					twitter: {
						url: youtubeUrl,
						description: imeBenda + " - " + imePesme
					},
					facebook: {
						url: youtubeUrl
					},
					pinterest: {
						enabled: false
					},
					linkedin: {
						enabled: false
					},
					googlePlus: {
						enabled: false
					}
				}
			});	

			$(function () {
				$('.email').popover({
					container: 'body',
					offset: -30
				});
			});

			$('.email').html('<svg aria-hidden="true" data-prefix="fas" data-icon="link" class="svg-inline--fa fa-link fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M326.612 185.391c59.747 59.809 58.927 155.698.36 214.59-.11.12-.24.25-.36.37l-67.2 67.2c-59.27 59.27-155.699 59.262-214.96 0-59.27-59.26-59.27-155.7 0-214.96l37.106-37.106c9.84-9.84 26.786-3.3 27.294 10.606.648 17.722 3.826 35.527 9.69 52.721 1.986 5.822.567 12.262-3.783 16.612l-13.087 13.087c-28.026 28.026-28.905 73.66-1.155 101.96 28.024 28.579 74.086 28.749 102.325.51l67.2-67.19c28.191-28.191 28.073-73.757 0-101.83-3.701-3.694-7.429-6.564-10.341-8.569a16.037 16.037 0 0 1-6.947-12.606c-.396-10.567 3.348-21.456 11.698-29.806l21.054-21.055c5.521-5.521 14.182-6.199 20.584-1.731a152.482 152.482 0 0 1 20.522 17.197zM467.547 44.449c-59.261-59.262-155.69-59.27-214.96 0l-67.2 67.2c-.12.12-.25.25-.36.37-58.566 58.892-59.387 154.781.36 214.59a152.454 152.454 0 0 0 20.521 17.196c6.402 4.468 15.064 3.789 20.584-1.731l21.054-21.055c8.35-8.35 12.094-19.239 11.698-29.806a16.037 16.037 0 0 0-6.947-12.606c-2.912-2.005-6.64-4.875-10.341-8.569-28.073-28.073-28.191-73.639 0-101.83l67.2-67.19c28.239-28.239 74.3-28.069 102.325.51 27.75 28.3 26.872 73.934-1.155 101.96l-13.087 13.087c-4.35 4.35-5.769 10.79-3.783 16.612 5.864 17.194 9.042 34.999 9.69 52.721.509 13.906 17.454 20.446 27.294 10.606l37.106-37.106c59.271-59.259 59.271-155.699.001-214.959z"></path></svg>');
			$('.email').attr({
				'data-clipboard-text': youtubeUrl,
				'data-placement': 'top',
				'role': 'button',
				'data-toggle': 'popover',
				'data-content': 'Link copied'
			});
			$('.twitter').attr({
				'title': 'Twitter'
			});
			$('.facebook').attr({
				'title': 'Facebook'
			});
			$('.reddit').attr({
				'title': 'Reddit'
			});

			$('.whatsapp').remove();

			$("share-button").contents().filter(function () {
			     return this.nodeType === 3; 
			}).remove();

			$('.fa-share-alt').removeClass('share');
			$('.sb-social').removeClass('sb-social-active');
		}
	}

	$.getJSON(url, function(data) {
		$(data.items).each(function(){
			videos.push ({
				url: this["id"]["videoId"],
				title: this["snippet"]["title"]
			});
		});
		isLoaded();
	});
}
// Loads recommended dropdown when searching artist
$.fn.lfmSearchArt = function(options){
	var settings = $.extend({
		APIkey:	 lfKey,
		limit:	 10,
		artName: null
	}, options);
	var url = "https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=" 
			  + settings.artName + 
			  "&api_key=" 
			  + settings.APIkey + 
			  "&format=json&limit=" 
			  + settings.limit;
	var search = [];
	var ime = settings.artName.toLowerCase();

	function isLoaded () {
		$('.artist-search').empty();
		for(var i = 0; i < settings.limit && i < search[0].name["artist"].length; i++){
			var str = search[0].name["artist"][i]["name"].toLowerCase();
			// Filters out some recommendations
			if (str.indexOf(",") < 0 
				&& str.indexOf("feat.") < 0 
				&& str.length < 50 
				&& str.indexOf("ft.") < 0
				&& str.indexOf("/") < 0
				&& str.indexOf(".com") < 0
				&& str.indexOf(".net") < 0){
				var markup = $("<li class='dropdown-item artist-search-name'><a href='#'>" + str + "</a></li>");
				$('.artist-search').append(markup);
			}
		}
	}
	$.when(
		$.getJSON(url, function (data) {
			if(data.results !== undefined){
				$(data.results["artistmatches"]).each(function(){
					search.push ({
						name: this
					});
				});
			}
		})
	).then(function() {
		if(search[0] !== undefined && search[0].name["artist"][0] !== undefined && search[0].name["artist"][0]["mbid"].length > 0){
			isLoaded();
		}
	});
};
var artInfoLoaded = false,
	artSimLoaded = false,
	artTracksLoaded = false;
// Load artist info
$.fn.lfmInfo = function(options){
	var settings = $.extend({
		APIkey:	lfKey,
		ime:    null
	}, options);
	var imeBenda = settings.ime.replace(/&/g, '%26').replace(/\+/g, '%2B').replace(/ /g, '%20');
	imeBenda = imeBenda.trim();
	var url = "https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=" 
			  + imeBenda + 
			  "&api_key=" 
			  + settings.APIkey +
			  "&format=json";
	var artists = [];
	var tags = [];
	var postojanje;
	artists.push(tags);
	var pathnameLink = window.location.href;

	if (pathnameLink.indexOf("#artist=") >= 0){
		pathnameLink = pathnameLink.split('#artist=');
	} else {
		pathnameLink = pathnameLink.split('#tag=');
	}
	pathnameLink = pathnameLink[0] + "#tag=";

	function isLoaded (artistElement) {
		if (postojanje){
			stuffHappeningWhenLoadingArtistOrGenre();
			window.history.pushState("", "", "info.html#artist=" + imeBenda);

			setTimeout(function(){
				$('.info-1, .tags, .info-3, .rowds, .main-tracks, .expendBio').empty();
				$('.input-choice').removeClass('input-choice-expend');
				var art = artists[1];

				// set name
				var markupName = art.name.replace(/\+/g, '&#43;');
				$('.info-1').append('<h3>' + markupName + '</h3>');

				//set tag
				for(var i = 0; i < 5; i++){
					if(artists[0][i].tags !== undefined){
						$('.tags').append("<a href='" + pathnameLink + artists[0][i].tags.name +"'>" + artists[0][i].tags.name + "</a><span class='sep'>&nbsp;/&nbsp;</span>");
					}
				}

				if (art.artImg.length !== 0) {
				//set img & biography 
					$('.info-3').append("<img class='img-fluid' src='" + art.artImg +"' /><p>" + art.bio.trim().slice(0,-1) + "</p>");
				} else {
					$('.info-3').append("<p class='noArtImage'>" + art.bio.trim().slice(0,-1) + "</p>");
				}
				// add "show more" only if biography exists
				var element = $('.info-3 p');
				if (element.prop('scrollHeight') > element.height()) {
					$('.expendBio').append("Show more <span class='caret-down'></span>");
				} else {
					element.addClass('no-bio');
				}

				$('.art-info').removeClass('hide_content');

				$('main').lfmTracks({
					ime: imeBenda,
					cont: '.main-tracks'
				});
				$('main').lfmSimilar({
				   tag: imeBenda
				});	
				$('#player').removeClass('add');
				$('body,main').removeClass('bg-trans');
				$('.info-3 a').attr('target', '_blank');
				// Removes the loading Spinner from page header
				artInfoLoaded = true;
				removeLoaderFromHeader(artInfoLoaded, artSimLoaded, artTracksLoaded);
			}, 500);
		} else {
			// Shows modal message - error when artist or genre is not found
			errorWhenNoArtistOrGenre('Artist');
		}
	}

	var $this = $(this);
	$.when(
		$.getJSON(url, function (data) {
			if(data.artist !== undefined  && (data.artist.mbid !== undefined || data.artist.tags.tag.length !== 0)){
				$(data.artist).each(function(){
					postojanje = true;
					var br = this.tags.tag.length;
					artists.push ({
						name: 	this.name,
						artImg: this.image[this.image.length-1]["#text"],
						bio:    this.bio.summary
					});
					for(var i = 0; i < 5; i++) {
						tags.push ({
							tags: this.tags.tag[i]
						});
					}
				});
			} else {
				postojanje = false;
			}
		})
	).then(function() {
		isLoaded($this);
	});
};
// Load similar artists
$.fn.lfmSimilar = function(options){
	var settings = $.extend({
		APIkey:	lfKey,
		limit:	25,
		tag:    null,
	}, options);
	var name = settings.tag.replace(/&/g, '%26').replace(/\+/g, '%2B').replace(/ /g, '%20');
	name = name.trim();
	var url = "https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=" 
			  + name + 
			  "&api_key=" 
			  + settings.APIkey + 
			  "&format=json&limit=" 
			  + settings.limit;
	var artists = [];

	function isLoaded () {
		if(artists.length > 0){
			// Loads Similar artists
			loadSimilarOrTopArtists(artists, 'Similar Artists');
			// Removes the loading Spinner from page header
			artSimLoaded = true;
			removeLoaderFromHeader(artInfoLoaded, artSimLoaded, artTracksLoaded);
		} else {
			// Shows modal message - error when there are no similar or top artists
			noSimilarOrTopArtistsError(name);
		}
	}
	$.when(
		$.getJSON(url, function (data) {
			if(data.similarartists !== undefined){
				$(data.similarartists.artist).each(function(){
					if (this.image[this.image.length-1]["#text"].length !== 0 && this.mbid !== undefined) {
						artists.push ({
							name: 	this.name,
							art:  	this.image[this.image.length-1]["#text"]
						});
					}
				});
			}
		})
	).then(function() {
		isLoaded();
	});
};
// Load artist tracks
$.fn.lfmTracks = function(options){
	var settings = $.extend({
		APIkey:		lfKey,
		ime:        null,
		limit:		25,
		cont:       null
	}, options);
	var imeBenda = settings.ime.replace(/&/g, '%26').replace(/\+/g, '%2B');
	var url = "https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=" 
			  + imeBenda + 
			  "&api_key=" 
			  + settings.APIkey + 
			  "&format=json&limit=" 
			  + settings.limit;
	var tracks = [];
	var trimas = [];
	var out = [];
	var playlistHeader = $('.playlist-header h5').text();
	var mainHeader = $('.info-1 h3').text();

	$(".form-control").val("");

	function trims(arr, obj){
		for (var i = 0; i < arr.length; i++) {
			var trackss = arr[i].name;
			if (trackss.indexOf("(") > 0){
				trackss = trackss.split("(")[0];
			}
			if (trackss.indexOf("[") > 0){
				trackss = trackss.split("[")[0];
			}
			trackss = trackss.trim();
			trackss = trackss.toLowerCase();
			obj.push(trackss);
		}
		eliminateDuplicates(trimas, out);
	}

	function isLoaded () {
		trims(tracks, trimas);
		for (var i = 0, pom = 1; i < 15; i++, pom++) {
			if (out[i] !== undefined){

				var markup = $("<li class='pesma track-" + pom + "'><div class='track-info'><span class='broj'>" 
								+ pom + "</span>&nbsp;<img src='image/icons/play-solid.svg' alt='' class='play-icon loadSpin fa-play'><span class='track_name artist-track-padding'>"
								+ out[i] + "</span></div><p class='lyrics-cont'></p></li>");

				$(settings.cont).append(markup);
			}
		}
		setTimeout(function(){
			for (var i = 0, pom = 1; i < 15; i++, pom++) {
				if(settings.cont == '.main-tracks'){
					$('main').lyrics({
						artist: imeBenda,
						track: out[i],
						rank: pom,
						cont: '.main-tracks'
					});
				} else {
					$('footer').lyrics({
						artist: imeBenda,
						track: out[i],
						rank: pom,
						cont: '.playlist-tracks'
					});
				}
			}
		}, 500);

		// Loads tracks header and when loading new artist or genre checks if it is already playing 
		// and gives active status to the track that plays in the background
		setActiveTrackOnMainPage(playlistHeader, mainHeader, imeBenda, '.track_name');
		// Removes the loading Spinner from page header
		artTracksLoaded = true;
		removeLoaderFromHeader(artInfoLoaded, artSimLoaded, artTracksLoaded);
	}
	$.when(
		$.getJSON(url, function (data) {
			if(data.toptracks !== undefined){
				$(data.toptracks.track).each(function(){
					tracks.push ({
						name: this.name
					});
				});
			}
		})
	).then(function() {
		isLoaded();
	});
};
var genInfoLoaded = false,
	genSimLoaded = false,
	genTracksLoaded = false;

// Load genre info
$.fn.lfmTagInfo = function(options){
	var settings = $.extend({
		APIkey:	lfKey,
		ime:    null
	}, options);
	var imetaga = settings.ime.replace(/&/g, '%26').replace(/\+/g, '%2B');
	var url = "https://ws.audioscrobbler.com/2.0/?method=tag.getinfo&tag=" 
			  + imetaga + 
			  "&api_key=" 
			  + settings.APIkey +
			  "&format=json";
	var tag = [];
	var postojanje;

	function isLoaded (artistElement) {
		if (postojanje){
			stuffHappeningWhenLoadingArtistOrGenre();
			window.history.pushState("", "", "info.html#tag=" + imetaga);
			setTimeout(function(){
				$('.artist-search, .info-1, .tags, .info-3, .rowds, .main-tracks').empty();
				$('.input-choice').removeClass('input-choice-expend');

				// set name
				var markupName = tag[0].name.replace(/\+/g, '&#43;');
				$('.info-1').append('<h3>' + markupName + '</h3>');

				//set img & bio
				$('.info-3').append("<p class='noArtImage'>" + tag[0].bio.trim().slice(0,-1) + "</p>");

				$('.expendBio').empty().append("Show more <span class='caret-down'></i>");

				$('.art-info').removeClass('hide_content');

				$('main').lfmTagTracks({
					ime: imetaga,
					cont: '.main-tracks'
				});
				$('main').lfmTagSimilar({
				   tag: imetaga
				});	
				$('#player').removeClass('add');
				$('body,main').removeClass('bg-trans');
				$('.info-3 a').attr('target', '_blank');
				// Removes the loading Spinner from page header
				genInfoLoaded = true;
				removeLoaderFromHeader(genInfoLoaded, genSimLoaded, genTracksLoaded);
			}, 500);
		} else {
			// Shows modal message - error when artist or genre is not found
			errorWhenNoArtistOrGenre('Genre')
		}
	}
	//  && (data.artist.mbid !== undefined || data.artist.tags.tag.length !== 0)
	var $this = $(this);
	$.when(
		$.getJSON(url, function (data) {
			$(data.tag).each(function(){
				// if number of users that have used this tag is greater then 30
				if(this.reach > 30){
					postojanje = true;
					tag.push ({
						name: 	this.name,
						bio:    this.wiki.summary
					});
				} else {
					postojanje = false;
				}
			});
		})
	).then(function() {
		isLoaded($this);
	});
};
// Load Top tracks for genre
$.fn.lfmTagTracks = function(options){
	var settings = $.extend({
		APIkey:		lfKey,
		ime:        null,
		limit:		25,
		cont:       null
	}, options);
	var imeTaga = settings.ime.replace(/&/g, '%26').replace(/\+/g, '%2B');
	var url = "https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=" 
			  + imeTaga + 
			  "&api_key=" 
			  + settings.APIkey + 
			  "&format=json&limit=" 
			  + settings.limit;
	var tracks = [];
	var playlistHeader = $('.playlist-header h5').text();
	var mainHeader = $('.info-1 h3').text();

	$(".form-control").val("");

	function isLoaded () {
		for (var i = 0, pom = 1; i < 15; i++, pom++) {
			var markup = $("<li class='pesma track-" + pom + "'><div class='track-info'><span class='broj'>" 
							+ pom + "</span>&nbsp;<img src='image/icons/play-solid.svg' alt='' class='play-icon loadSpin fa-play'><span class='art_name'>"
							+ tracks[i].artName + "</span>&nbsp;-&nbsp;<span class='track_name'>"
							+ tracks[i].songName + "</span></div><p class='lyrics-cont'></p></li>");
			$(settings.cont).append(markup);
			if(settings.cont == '.main-tracks'){
				$('main').lyrics({
					artist: tracks[i].artName,
					track: tracks[i].songName,
					rank: pom,
					cont: '.main-tracks'
				});
			} else {
				$('footer').lyrics({
					artist: tracks[i].artName,
					track: tracks[i].songName,
					rank: pom,
					cont: '.playlist-tracks'
				});
			}
		}
		// Loads tracks header and when loading new artist or genre checks if it is already playing 
		// and gives active status to the track that plays in the background
		setActiveTrackOnMainPage(playlistHeader, mainHeader, imeTaga, '.art_name');
		// Removes the loading Spinner from page header
		genTracksLoaded = true;
		removeLoaderFromHeader(genInfoLoaded, genSimLoaded, genTracksLoaded);
	}
	$.when(
		$.getJSON(url, function (data) {
			$(data.tracks.track).each(function(){
				tracks.push ({
					songName: this.name,
					artName:  this.artist.name
				});
			});
		})
	).then(function() {
		isLoaded();
	});
};
// Load lyrics
$.fn.lyrics = function(options){
	var settings = $.extend({
		artist:	null,
		track:  null,
		rank: 	null,
		cont:   null
	}, options);
	var artist = settings.artist.replace(/&/g, '%26').replace(/\+/g, '%2B').replace(/ /g, '%20');
	var track = settings.track.replace(/&/g, '%26').replace(/\+/g, '%2B').replace(/ /g, '%20');
	artist = artist.trim();
	track = track.trim();
	var url = 'https://api.lyrics.ovh/v1/' + artist + '/' + track;
	var lyrics = [];
	var error = "Unfortunately, we are not licensed to display the full lyrics";
	var instrumental = "Instrumental";
	var string = "Paroles de la chanson";

	function isLoaded () {
		if (lyrics[0] !== undefined && $(settings.cont + ' .track-' + settings.rank + ' .lyrics-cont').is(':empty')) {
			if(!(lyrics[0].text.indexOf(string))) {
				var str = lyrics[0].text.split(string);
				str = str[1].trim();
				$(settings.cont + ' .track-' + settings.rank + ' .lyrics-cont').append('<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="align-right" class="svg-inline--fa fa-align-right fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><title>Lyrics</title><path fill="#ecf0f1" d="M160 84V44c0-8.837 7.163-16 16-16h256c8.837 0 16 7.163 16 16v40c0 8.837-7.163 16-16 16H176c-8.837 0-16-7.163-16-16zM16 228h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 256h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm160-128h256c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H176c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path></svg><div class="lyrics">' + str + '</div>');
			} else {
				$(settings.cont + ' .track-' + settings.rank + ' .lyrics-cont').append('<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="align-right" class="svg-inline--fa fa-align-right fa-w-14" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><title>Lyrics</title><path fill="#ecf0f1" d="M160 84V44c0-8.837 7.163-16 16-16h256c8.837 0 16 7.163 16 16v40c0 8.837-7.163 16-16 16H176c-8.837 0-16-7.163-16-16zM16 228h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 256h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm160-128h256c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H176c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path></svg><div class="lyrics">' + lyrics[0].text + '</div>');
			}
		}
	}
	$.when(
		$.getJSON(url, function (data) {
			$(data).each(function(){
				// show lyrics if they can be displayed and the song is not instrumental
				if(data.lyrics.indexOf(error) && data.lyrics.indexOf(instrumental) && data.lyrics.trim() !== ""){
					lyrics.push ({
						text: this.lyrics
					});
				}
			});
		})
	).then(function(response) {
		isLoaded();
	});
};
// Load Top Artists for Genre
$.fn.lfmTagSimilar = function(options){
	var settings = $.extend({
		APIkey:	lfKey,
		limit:	25,
		tag:    null,
	}, options);
	var url = "https://ws.audioscrobbler.com/2.0/?method=tag.gettopartists&tag=" 
			  + settings.tag + 
			  "&api_key=" 
			  + settings.APIkey + 
			  "&format=json&limit=" 
			  + settings.limit;
	var tags = [];

	function isLoaded () {
		if(tags.length > 0){
			// Loads Top artists
			loadSimilarOrTopArtists(tags, 'Top Artists');
			// Removes the loading Spinner from page header
			genSimLoaded = true;
			removeLoaderFromHeader(genInfoLoaded, genSimLoaded, genTracksLoaded);
		} else {
			// Shows modal message - error when there are no similar or top artists
			noSimilarOrTopArtistsError(tag);
		}
	}
	$.when(
		$.getJSON(url, function (data) {
			$(data.topartists.artist).each(function(){
				if (this.image[this.image.length-1]["#text"].length !== 0 && this.mbid !== undefined) {
					tags.push ({
						name: 	this.name,
						art:  	this.image[this.image.length-1]["#text"]
					});
				}
			});
		})
	).then(function() {
		isLoaded();
	});
};
$('.noSimilarError button').click(function(event) {
	$('.noSimilarError').removeClass('show-noSimilarError');
	$('.similarTop').addClass('no-height');
});
// Removes the loading Spinner from page header
function removeLoaderFromHeader(artist, similar, tracks){
	if(artist && similar && tracks){
		// removes loading spinner frm header
		setTimeout(function(){
			$('.spinner').removeClass('show_spinner-opacity');
			setTimeout(function(){
				$('.spinner').removeClass('show_spinner');
			}, 200);
		}, 300);
		artist = false;
		similar = false,
		tracks = false;
	}
}
// Loads Similar or Top artists
function loadSimilarOrTopArtists (name, topOrSim) {
	// If the error message was previously shown, remove it
	$('.noSimilarError').removeClass('show-noSimilarError');
	$('.rowds').removeClass('rowds-height');
	$('.similarTop').removeClass('no-height');
	$('.similarTop h5 ').removeClass('similarTop-no-padding');
	// Sets number of similar or top artists to load
	if (!isMobile.any()){
		var noSim = 15;
	} else {
		var noSim = 12
	}
	for (var i = 0; i < noSim && i < name.length; i++) {
		if (!isMobile.any()){
			$('.rowds').append("<div class='fig'><figure class='effect-lily'><img class='imgmain img-fluid img-" + i + "' src='" + name[i].art + "' alt='" + name[i].name + "'/><figcaption><img class='img-fluid imgblur' src='" + name[i].art + "' alt='" + name[i].name + "'/><div><h2>" + name[i].name + "</h2></div></figcaption></figure></div>");
		} else {
			$('.rowds').append("<div class='fig'><figure class='effect-lily'><img class='imgmain img-fluid img-" + i + "' src='" + name[i].art + "' alt='" + name[i].name + "'/><figcaption><div><h2>" + name[i].name + "</h2></div></figcaption></figure></div>");
		}
	}
	$('.similarTop h5').empty().append(topOrSim + '<span class="caret-down sim-down"></span></i>');
	$('.similarTop').removeClass('hide_content');
	// No image blur on mobile
	if (!isMobile.any()){
		$('.imgblur').css('filter', 'blur(30px)');
	}
}
// Loads tracks header and when loading new artist or genre checks if it is already playing 
// and gives active status to the track that plays in the background
function setActiveTrackOnMainPage (playlistHeader, mainHeader, name, padding) {
	name = name.replace(/%26/g, '&').replace(/%20/g, ' ');
	$('.track-cont h5').attr('title', 'Play: ' + name);
	$('.track-cont h5').empty().append('<svg aria-hidden="true" data-prefix="fas" data-icon="play-circle" class="play-header play svg-inline--fa fa-play-circle fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm115.7 272l-176 101c-15.8 8.8-35.7-2.5-35.7-21V152c0-18.4 19.8-29.8 35.7-21l176 107c16.4 9.2 16.4 32.9 0 42z"></path></svg>Top Tracks');
	$('.track-cont').removeClass('hide_content');
	// If playlist header matches main page header
	if(playlistHeader.trim() == mainHeader.trim()) {
		var currentTrackNumber = $('.playlist-tracks .active .broj').text();
		// Waiting a little bit for track to load before giving it active status
		setTimeout(function(){
			$('.main-tracks .track-' + currentTrackNumber + ' .track-info').addClass('active');
			$('.main-tracks .track-' + currentTrackNumber).addClass('active-list-bg-color');
			$('.main-tracks .track-' + currentTrackNumber + ' .loadSpin').addClass('active-play');
			$('.main-tracks .track-' + currentTrackNumber + ' ' + padding).addClass('active-padding');
			setTimeout(function(){
				if($('.main-tracks .track-' + currentTrackNumber + ' .lyrics-cont').is(':empty')){
					$('.main-tracks .track-' + currentTrackNumber).append('<img src="image/icons/youtube-brands.svg" alt="" class="fa-youtube fa-youtube-no-lyrics">');
				} else {
					$('.main-tracks .track-' + currentTrackNumber).append('<img src="image/icons/youtube-brands.svg" alt="" class="fa-youtube">');
				}
			}, 2000);
		}, 1000);
	}
}
// Shows modal message - error when artist or genre is not found
function errorWhenNoArtistOrGenre(name) {
	// removes loading spinner from header
	setTimeout(function(){
		$('.spinner').removeClass('show_spinner-opacity');
		setTimeout(function(){
			$('.spinner').removeClass('show_spinner');
		}, 200);
	}, 300);
	$('#errorModal .modal-body p').empty().html('Sorry, but the ' + name + ' you have searched for is not in the <a href="http://www.last.fm/">Last.fm</a> database. Try checking your spelling or search for another ' + name + '.');
	$('#errorModal .modal-header h5').empty().html(name + ' not found!');
	// Close dropdown from search
	$('.artist-search').empty();
	// Empty input
	$('.form-control').val('');
	$('.errorButton').trigger('click');
}
// Shows modal message - error when there are no similar or top artists
function noSimilarOrTopArtistsError (name){
	name = name.replace(/%20/g, '&nbsp;').replace(/%26/g, '&');
	// removes loading spinner from header
	setTimeout(function(){
		$('.spinner').removeClass('show_spinner-opacity');
		setTimeout(function(){
			$('.spinner').removeClass('show_spinner');
		}, 200);
	}, 300);
	// Empty header
	$('.similarTop h5').empty()
	// Append artist or genre name to message
	$('.noSimilarError .modal-body span').empty().html(name);
	// Show message by giving display: block
	$('.noSimilarError').addClass('show-noSimilarError');
	// Set sim. or top artist container to height do 0
	$('.rowds').addClass('rowds-height');
	// Remove padding from header
	$('.similarTop h5').addClass('similarTop-no-padding');
	// Set similar or top artists container opacity to 1
	$('.similarTop').removeClass('hide_content');
}
// Transitions when loading artist or genre
function stuffHappeningWhenLoadingArtistOrGenre(){
	// Give slightly darker color to body
	$('body,main').addClass('bg-trans');
	// Youtube video transition - opacity
	$('#player').addClass('add');
	// Hide biography section
	$('.art-info').addClass('hide_content hide_content-info');
	// Hide tracks section
	$('.track-cont').addClass('hide_content hide_content-track');
	// Hide similar or top artist section
	$('.similarTop').addClass('hide_content hide_content-sim');
	// on narrow screens hides youtube video
	$('#player, .yt-player-cont').removeClass('expand-player');
}
// Load genre
function loadGenre(ime){
	$('main').lfmTagInfo({
		ime: ime
	});
}
// Load artist or genre
function loadArtistOrGenre(ime) {
	$('#player, .yt-player-cont').removeClass('expand-player');
	if ($('.a-art').hasClass('active-search')){
		$('main').lfmInfo({
			ime: ime
		});
	} else {
		loadGenre(ime);
	}
}
// Actions for loading recommended artists in dropdown when searching
(function($){
	// Listens to keyboard when typing
	searchKeyUp('.form-control', '.artist-search', artistSearchLoad);
	// Moving through dropdown list
	searchKrozListu('.desktop', '.artist-search-name');
	// Call this function when user types something
	function searchKeyUp(input, searchCont, searchFunc){
		$(input).keyup(function(e) {
			var text = $(this).val();
			text = text.trim();
			if(text.length !== 0 ){
				if($('.a-art').hasClass('active-search')){
					if(e.keyCode === 8){
						if($(input).val() === ""){
							$(searchCont).empty();
						} else {
							searchFunc();
						}
					} else {
						searchFunc();
					}
				}
			}
		});
	}
	// Enables moving through dropdown list with up and down keys
	function searchKrozListu(input, listLink){
		var liSelected;
		$(input + ', .bla').keydown(function(e){
			var li = $('.bla ' + listLink);
			// key down
		    if(e.keyCode === 40){
		        if(liSelected){
		            var next = liSelected.parent().next();
		            if(next.length > 0){
		                liSelected = next.children().focus();
		            } else {
		                liSelected = li.eq(0).children().focus();
		            }
		        } else {
		            liSelected = li.eq(0).children().focus();
		        }
		    // key up
		    } else if (e.keyCode === 38){
		        if(liSelected){
		            var next = liSelected.parent().prev();
		            if(next.length > 0){
		                liSelected = next.children().focus();
		            } else {
		                liSelected = li.last().children().focus();
		            }
		        } else {
		            liSelected = li.last().children().focus();
		        }   
		    }
		});
	}
	// Calls lastfm recommendation search function 
	function artistSearchLoad(){
		if(!$('.desktop').val()) {
			var val = $('.mobile').val();
		} else {
			var val = $('.desktop').val();
		}
		$('.artist-search').lfmSearchArt({
			artName: val
		});
		setTimeout(function(){
			$('.artist-search').addClass('show-input');
		}, 300);
	}
})(jQuery);
// Playing tracks events
(function($){

	var playlistArtist,
		currentTrackNumber,
		artistNameInWebsiteHeader,
		genreName;

	// Action when clicking track from main page
	$('.row-main-second').on('click', '.track-info', function(){
		if(!$(this).hasClass('active')){
			// Get current page href so we can check if page is about artist or genre
			var pathnameLink = window.location.href;
			var $this = $(this);
			// Common function from clicking main or playlist tracks
			commonAction($this);
			// Giving indication to youtube that track is clicked 
			// and that it can show player controls in the footer of the page
			$('.align-items-end').addClass('click-track');
			// removes artist image from the playlist header
			$('.art-image').remove();
			// adds youtube icon to active track on main page
			if($this.siblings('.lyrics-cont').is(':empty')){
				$(this).parent().append('<img src="image/icons/youtube-brands.svg" alt="" class="fa-youtube fa-youtube-no-lyrics">');
			} else {
				$(this).parent().append('<img src="image/icons/youtube-brands.svg" alt="" class="fa-youtube">');
			}
			if (pathnameLink.indexOf("#artist=") >= 0){
				trackName = $(this).children('.track_name').text();
				artistName = artistNameInWebsiteHeader;
				// Just the way to now if artist or genre page is open
				$('.playlist').removeClass('tag').addClass('art');
				// Load tracks to playlist
				loadTracksToPlaylist($('footer').lfmTracks, artistName, '.track_name', $this);
				// Adds artist image to playlist header
				var artistImgSrc = $('.info-3 img').attr('src');
				var markup = '<img class="img-fluid art-image" src="' + artistImgSrc + '" alt="">'
				$('.playlist-header').prepend(markup);
			} else if (pathnameLink.indexOf("#tag=") >= 0){
				genreName = artistNameInWebsiteHeader;
				trackName = $(this).children('.track_name').text();
				artistName = $(this).children('.art_name').text();
				// Just the way to now if artist or genre page is open
				$('.playlist').removeClass('art').addClass('tag');
				// Load tracks to playlist
				loadTracksToPlaylist($('footer').lfmTagTracks, genreName, '.art_name', $this);
			}
			// Loads youtube video
			$('#player').yt({
				artName: artistName,
				songName: trackName
			});
		}
	});
	// Action when clicking track from playlist
	$('.playlist .tracks_container').on('click', '.track-info', function(){
		if(!$(this).hasClass('active')){
			var $this = $(this);
			// Common function from clicking main or playlist tracks
			commonAction($this);
			// adds youtube icon to active track on main page
			$('.main-tracks .track-' + currentTrackNumber).append('<img src="image/icons/youtube-brands.svg" alt="" class="fa-youtube">');
			// Removes repeat icon from playlist tracks
			$('.playlist-tracks .pesma').find('.repeatPlay').remove();
			// Add white color to lyricks icon in playlist
			$('.playlist-tracks .track-' + currentTrackNumber + ' .fa-align-right').addClass('fa-align-right-active');
			// Adds repeat icon to activ playlist track
			if($this.siblings('.lyrics-cont').is(':empty')){
				$(this).append('<svg aria-hidden="true" data-prefix="fas" data-icon="redo-alt" class="repeatPlay repeatPlay-no-lyrics svg-inline--fa fa-redo-alt fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M256.455 8c66.269.119 126.437 26.233 170.859 68.685l35.715-35.715C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.75c-30.864-28.899-70.801-44.907-113.23-45.273-92.398-.798-170.283 73.977-169.484 169.442C88.764 348.009 162.184 424 256 424c41.127 0 79.997-14.678 110.629-41.556 4.743-4.161 11.906-3.908 16.368.553l39.662 39.662c4.872 4.872 4.631 12.815-.482 17.433C378.202 479.813 319.926 504 256 504 119.034 504 8.001 392.967 8 256.002 7.999 119.193 119.646 7.755 256.455 8z"></path></svg>');
			} else {
				$(this).append('<svg aria-hidden="true" data-prefix="fas" data-icon="redo-alt" class="repeatPlay svg-inline--fa fa-redo-alt fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M256.455 8c66.269.119 126.437 26.233 170.859 68.685l35.715-35.715C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.75c-30.864-28.899-70.801-44.907-113.23-45.273-92.398-.798-170.283 73.977-169.484 169.442C88.764 348.009 162.184 424 256 424c41.127 0 79.997-14.678 110.629-41.556 4.743-4.161 11.906-3.908 16.368.553l39.662 39.662c4.872 4.872 4.631 12.815-.482 17.433C378.202 479.813 319.926 504 256 504 119.034 504 8.001 392.967 8 256.002 7.999 119.193 119.646 7.755 256.455 8z"></path></svg>');
			}
			// If mobile, shows repeat icon at all times, not only when narrow screen
			if (isMobile.any()){
				$('.repeatPlay').addClass('show-repeat');
			}
			if ($('.playlist').hasClass('art')){
				artistName = playlistArtist;
				trackName = $(this).children('.track_name').text();
				$('.track_name').removeClass('active-padding');
				$(this).children('.track_name').addClass('active-padding');
			} else if ($('.playlist').hasClass('tag')){
				artistName = $(this).children('.art_name').text();
				trackName = $(this).children('.track_name').text();
				$('.art_name').removeClass('active-padding');
				$(this).children('.art_name').addClass('active-padding');
			}
			// When returning to an artist or genre that is active in playlist
			// Adds an active status to the track on the main page that that is currently active in playlist
			if (playlistArtist.trim() == artistNameInWebsiteHeader.trim()) {
				if ($('.playlist').hasClass('art')){
					$('.main-tracks .track-' + currentTrackNumber + ' .track-info').children('.track_name').addClass('active-padding');
				} else if ($('.playlist').hasClass('tag')){
					$('.main-tracks .track-' + currentTrackNumber + ' .track-info').find('.art_name').addClass('active-padding');
				}
				$('.main-tracks .track-' + currentTrackNumber + ' .track-info').addClass('active');
				$('.main-tracks .track-' + currentTrackNumber).addClass('active-list-bg-color');
				$('.main-tracks .track-' + currentTrackNumber + ' .track-info').children('.fa-play').addClass('active-play');
			}
			// Loads youtube video
			$('#player').yt({
				artName: artistName,
				songName: trackName
			});
		}
	});
	// Action when clicking "Top Tracks" header on main page
	$('.track-cont').on('click', 'h5', function(ev){
		playlistArtist = $('.playlist-header h5').text();
		artistNameInWebsiteHeader = $('.info-1 h3').text();
		// If artist or genre not currently active, plays first song on main page
		if(artistNameInWebsiteHeader.trim() !== playlistArtist.trim()){
			$('.main-tracks .track-1 .track-info').trigger('click');
		}
	});
	// Action when clicking youtube icon in tracks section (opens video)
	$('body').on('click', '.fa-youtube', function(){
		// opens video
		$('#player, .yt-player-cont').addClass('expand-player');
		// scroll to the top of the page
	    if (window.matchMedia('(max-width: 767px)').matches) {
			$("html, body").animate({ scrollTop: 295 });
	    } else {
	        $("html, body").animate({ scrollTop: 338 });
	    }
	});
	// Action when clicking lyrics icon
	$('body').on('click', '.lyrics-cont', function(event) {
		var pathnameLink = window.location.href;
		var trackName = $(this).siblings().find('.track_name').text();
		var lyrics = $(this).find('div').html();
		$('#lyricsModal .modal-body pre, #lyricsModal .modal-title').empty();
		if (pathnameLink.indexOf("#artist=") >= 0){
			var artistName = $('.info-1 h3').text();
		} else {
			var artistName = $(this).siblings().find('.art_name').text();
		} 
		$('#lyricsModal .modal-title').append(artistName + " - " + trackName);
		$('#lyricsModal .modal-body pre').append(lyrics);
		$('.lyricsButton').trigger('click');
	});
	// Load tracks to playlist
	function loadTracksToPlaylist(lfmFunc, nameOfArtistOrTag, givePaddingToTrack, $this){
		$(givePaddingToTrack).removeClass('active-padding');
		$this.children(givePaddingToTrack).addClass('active-padding');
		// The artist or genre on main page is not the same as the one in the playlist
		if(artistNameInWebsiteHeader !== playlistArtist){
			$('.playlist-tracks').empty();
			lfmFunc({
				ime: nameOfArtistOrTag,
				cont: '.playlist-tracks'
			});
			// Make sure the playlist is loaded before adding padding to active track
			setTimeout(function(){
				givesActiveStatusToPlaylistTrack(givePaddingToTrack);
			}, 1000);
		// If they are the same
		} else if (artistNameInWebsiteHeader === playlistArtist) {
			givesActiveStatusToPlaylistTrack(givePaddingToTrack);
		}
		// Appends playing artist or genre header to playlist
		$('.playlist h5').empty().append(nameOfArtistOrTag);
	}
	// Gives Active Status To Playlist track
	function givesActiveStatusToPlaylistTrack(givePaddingToTrack){
		// Add purple background
		$('.playlist-tracks .track-' + currentTrackNumber + ' .track-info').addClass('active');
		$('.playlist-tracks .track-' + currentTrackNumber).addClass('active-list-bg-color');
		// Show play icon
		$('.playlist-tracks .track-' + currentTrackNumber + ' .track-info').children('.fa-play').addClass('active-play');
		// Removes repeat icon from all tracks
		$('.pesma').find('.repeatPlay').remove();
		setTimeout(function(){
			// Add white color to lyricks icon in playlist
			$('.playlist-tracks .track-' + currentTrackNumber + ' .fa-align-right').addClass('fa-align-right-active');
			// Adds repeat icon to activ track
			if($('.playlist-tracks .track-' + currentTrackNumber + ' .lyrics-cont').is(':empty')){
				$('.playlist-tracks .track-' + currentTrackNumber).append('<svg aria-hidden="true" data-prefix="fas" data-icon="redo-alt" class="repeatPlay repeatPlay-no-lyrics svg-inline--fa fa-redo-alt fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M256.455 8c66.269.119 126.437 26.233 170.859 68.685l35.715-35.715C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.75c-30.864-28.899-70.801-44.907-113.23-45.273-92.398-.798-170.283 73.977-169.484 169.442C88.764 348.009 162.184 424 256 424c41.127 0 79.997-14.678 110.629-41.556 4.743-4.161 11.906-3.908 16.368.553l39.662 39.662c4.872 4.872 4.631 12.815-.482 17.433C378.202 479.813 319.926 504 256 504 119.034 504 8.001 392.967 8 256.002 7.999 119.193 119.646 7.755 256.455 8z"></path></svg>');
			} else {
				$('.playlist-tracks .track-' + currentTrackNumber).append('<svg aria-hidden="true" data-prefix="fas" data-icon="redo-alt" class="repeatPlay svg-inline--fa fa-redo-alt fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M256.455 8c66.269.119 126.437 26.233 170.859 68.685l35.715-35.715C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.75c-30.864-28.899-70.801-44.907-113.23-45.273-92.398-.798-170.283 73.977-169.484 169.442C88.764 348.009 162.184 424 256 424c41.127 0 79.997-14.678 110.629-41.556 4.743-4.161 11.906-3.908 16.368.553l39.662 39.662c4.872 4.872 4.631 12.815-.482 17.433C378.202 479.813 319.926 504 256 504 119.034 504 8.001 392.967 8 256.002 7.999 119.193 119.646 7.755 256.455 8z"></path></svg>');
			}
		}, 2000);
		// If mobile, shows repeat icon at all times, not only when narrow screen
		if (isMobile.any()){
			$('.repeatPlay').addClass('show-repeat');
		}
		// Adds padding to active song
		$('.playlist-tracks .track-' + currentTrackNumber + ' .track-info').children(givePaddingToTrack).addClass('active-padding');
	}
	// Common function from clicking main or playlist tracks
	function commonAction($this){
		// Returns Playlist header value
		playlistArtist = $('.playlist-header h5').text();
		// Returns active track position
		currentTrackNumber = $this.find('.broj').text();
		// Returns active track position
		artistNameInWebsiteHeader = $('.info-1 h3').text();
		// replace loading spinner with play icon in all but active song
		if($('.loadSpin').hasClass('fa-circle-notch')){
			$('.active .loadSpin').removeClass('fa-circle-notch').addClass('fa-play');
			$('.active .loadSpin').attr('src', 'image/icons/play-solid.svg');
		}
		// remove youtube cover that prevents user from clicking a video before song loads
		if($('.yt-overlay').length !== 0){
			$('.yt-overlay').remove();
		}
		// adds youtube icon to active track only
		$('.main-tracks').find('.fa-youtube').remove();
		// close youtube player if open
		$('#player, .yt-player-cont').removeClass('expand-player');
		// removes active class in all tracks
		$('.track-info').removeClass('active');
		$('.pesma').removeClass('active-list-bg-color');
		// adds active class to clicked track
		$this.addClass('active');
		$this.parent().addClass('active-list-bg-color');
		// hides play icon in all tracks
		$('.fa-play').removeClass('active-play');
		// show play icon on clicked track
		$this.children('.fa-play').addClass('active-play');
		// remove white color from lyricks icon in playlist
		$('.playlist-tracks .fa-align-right').removeClass('fa-align-right-active');
	}

})(jQuery);
// Action when expanding biography
$('.info').on('click', '.expendBio', function(event){
	// Toggles expanding biography
	var biography = $('.info-3').find('p');
	biography.toggleClass('expendBio-show');

	if(biography.hasClass('expendBio-show')) { // If biography is expanded
		$('.expendBio').empty().append("Show less <span class='caret-up'></i>");
	} else { // If biography is not expanded
		$('.expendBio').empty().append("Show more <span class='caret-down'></i>");
	}
});
// Search events
(function($){
	// Preventing double click and multiple loads of the same content
	var clickSubmit = true,
		clickListSong = true,
		artistNameInWebsiteHeader;
	// Action when submitting a form
	$('#forma2, #forma3').submit(function (event) {
		event.preventDefault();
		var imputFieldValue = $(this).find('.form-control').val();
		imputFieldValue = imputFieldValue.trim();
		// if input field not empty
		if(imputFieldValue.length !== 0 ){
			if(clickSubmit) {
				var artistNameFromInput = $(this).find('.form-control').val();
				loadContent(artistNameFromInput);
				clickSubmit = false;
			}
			common();
		}
	});
	// Action when clicking artist name from dropdown
	$('.artist-search').on('click', '.artist-search-name', function(event){
		event.preventDefault();

		if(clickListSong) {
			var artistNameFromDropdown = $(this).text();
			loadContent(artistNameFromDropdown);
			clickListSong = false;
		}
		common();
	});
	// Action when clicking search icon 
	$('.search-icon').on('click', function(event){
		// returning input value
		var inputValue = $(this).siblings('input').val();
		// checking if desktop or mobile form
		var formName = $(this).closest('form').attr('name');
		inputValue = inputValue.trim();
		if(inputValue.length !== 0 ){
			if(formName === 'mobile') {
				$('#forma2').submit();
			} else {
				$('#forma3').submit();
			}
		}
		// set focus on input field
		$("#forma3 .form-control").focus();
	});
	// Action (expanding) when clicking search seaction on widescreen 
	$('.search').on('click', function(event){
		var formName = $(this).find('form').attr('name');
		if(formName === 'desktop') {
			// expands input
			$('.form-group, .form-control').addClass('search-expand');
			// adds white color to input
			$('.form-control').addClass('form-control-focus');
			// adds white color to search choice
			$('#forma3 .input-choice').addClass('input-choice-focus');
			// adds white color to hamburger icon background
			$('#menuToggle').addClass('menuToggle-bg-input');
			// adds darker color to hamburger icon
			$('#menuToggle span').addClass('hamburger-input');
			// removes white color from active search and adds purple
			$('.input-choice a').removeClass('active-search-expend');
		}
		if($('.a-art').hasClass('active-search')) {
			$('.a-art').addClass('active-search-expend');
		} else {
			$('.a-gen').addClass('active-search-expend');
		}
	});
	// shows input choice on mobile
	$('.form-control').click(function(){
		var formName = $(this).closest('form').attr('name');
		if(formName === 'mobile') {
			$('.input-choice').addClass('input-choice-expend');
		}
	});
	// Check artist or genre in search
	$('.input-choice a').on('click', function(e){
		e.preventDefault();
		var $this = $(this);
		$('.input-choice a').removeClass('active-search');
		$('.input-choice a').removeClass('active-search-expend');
		$('.input-choice li').removeClass('active-search zum');
		if($this.hasClass('a-art')) {
			$('.a-art').addClass('active-search');
			$('.a-art').parent().addClass('zum');
			$('.input-choice hr').removeClass('addLine');
		} else {
			$('.a-gen').addClass('active-search');
			$('.a-gen').parent().addClass('zum');
			$('.input-choice hr').addClass('addLine');
			$('.artist-search').empty();
		}
		if($('#forma3 .input-choice').hasClass('input-choice-focus')){
			$this.addClass('active-search-expend');
		} else {
			$this.addClass('active-search');
		}
		$("#forma3 .form-control").focus();
	});
	function loadContent(artistName){
		// Scroll to top of the page
		$("html, body").animate({ scrollTop: 0 });
		artistNameInWebsiteHeader = $('.info-1 h3').text();
		// Don't load if artist already loaded
		if(artistName.toLowerCase() !== artistNameInWebsiteHeader.toLowerCase()){
			styleChange();
			loadArtistOrGenre(artistName);
		}
	}
	function styleChange(){
		// Show loading in the header
		$('.spinner').addClass('show_spinner show_spinner-opacity');
		// empties dropdown with suggested artists  
		$('.artist-search').empty();
		// empties input
		$('input').val('');
		// close menu
		$('.front-menu-expended').removeClass('front-menu-show');
		// remove padding from menu ul element
		$('.front-menu-expended ul').removeClass('front-menu-show-ul');
		// adds overflow:show to body
		$('body').removeClass('body-overflow');
		// transitions X to hamburger
		$("#menuToggle input").prop("checked", false);
	}
	function common(){
		// empties dropdown with suggested artists  
		$('.artist-search').empty();
		$('.similarTop').removeClass('expendSim-show');
		setTimeout(function(){
			clickListSong = true;
			clickSubmit = true;
		}, 1000);
	}
})(jQuery);
// Some player controls actions
(function($){
	// Mute-unmute volume
	$('.volume').click(function(){
		if($('.volume').hasClass('fa-volume-up')){
			player.setVolume(0);
			volume_slider.noUiSlider.set(0);
			$('.volume').removeClass('fa-volume-up').addClass('fa-volume-mute');
			$('.volume').attr('src', 'image/icons/volume-mute-solid.svg');
		} else {
			player.setVolume(20);
			volume_slider.noUiSlider.set(20);
			$('.volume').removeClass('fa-volume-mute').addClass('fa-volume-up');
			$('.volume').attr('src', 'image/icons/volume-up-solid.svg');
		}
	});
	// Action when clicking play icon
	$('footer').on('click', '.play', function(ev){
		$('.plpa').removeClass('fa-play-circle play').addClass('fa-pause-circle pause');
		$('.plpa').attr('src', 'image/icons/pause-circle-solid.svg');
		playVideo();
	});
	// Action when clicking pause icon
	$('footer').on('click', '.pause', function(ev){
		$('.plpa').removeClass('fa-pause-circle pause').addClass('fa-play-circle play');
		$('.plpa').attr('src', 'image/icons/play-circle-solid.svg');
		pauseVideo();
	});
	// Action when clicking repeat icon
	$('body').on('click', '.fa-redo-alt', function(event){
		$(this).toggleClass('repeat');
	});
	// Action when clicking playlist icon
	$('.playlist-icon').on('click', function(event) {
		// Toggles playlist icons red (active) color 
		$(this).find('.playlistColor').toggleClass('active-playlist');
		// Opens playlist
		$('.playlist').toggleClass('show-playlist');
	});
	// Action when clicking share icon biography
	$('share-button').click(function(){
		// Toggles share icons red (active) color 
		$('.fa-share-alt').toggleClass('share');
		// Shows social buttons from right
		$('.sb-social').toggleClass('sb-social-active');
	});
	// Enable copying link to clipboard
	var clipboard = new Clipboard('.email');
	$('body').on('click', '.email', function(event){
		setTimeout(function(){
			// Shows message that link is copied
			$('.popover').popover('hide');
		}, 2000);
	});
})(jQuery);
(function($){
	// Preventing double click and multiple loads of the same content
	var clickSim = true,
		clickCurrent = true,
		clickGenre = true,
		artistNameInWebsiteHeader;
	// Action when opening artist from similar or top section
	$('.similarTop').on('click', 'figure', function(){
		if(clickSim) {
			// Scroll to top of the page
			$("html, body").animate({ scrollTop: 0 });
			// Show loading in the header
			$('.spinner').addClass('show_spinner show_spinner-opacity');
			artistNameInWebsiteHeader = $('.info-1 h3').text();
			var artistNameFromSimilarOrTop = $(this).children('figcaption').text();
			// Don't load if artist already loaded
			if(artistNameFromSimilarOrTop.toLowerCase() !== artistNameInWebsiteHeader.toLowerCase()){
				$('main').lfmInfo({
					ime: artistNameFromSimilarOrTop
				});
			}
			clickSim = false;
		}
		common();
	});
	// Action when clicking the name of the artist that is currently playing in the player section of page 
	$('.currently-playing').on('click', function(event){
		event.preventDefault();
		$("html, body").animate({ scrollTop: 0 });
		// Makes sure that artist will be loaded and not genre with the same name
		// by giving active status to the "Artist" link in search section
		$('.input-choice a').removeClass('active-search active-search-expend');
		$('.input-choice li').removeClass('active-search zum');
		$('.a-art').addClass('active-search');
		$('.a-art').parent().addClass('zum');
		if(clickCurrent) {
			// Scroll to top of the page
			$("html, body").animate({ scrollTop: 0 });
			// Show loading in the header
			$('.spinner').addClass('show_spinner show_spinner-opacity');
			artistNameInWebsiteHeader = $('.info-1 h3').text();
			var currentlyPlayingArtistName = $('.currently-playing a').text();
			// Don't load if artist already loaded
			if(currentlyPlayingArtistName.toLowerCase() !== artistNameInWebsiteHeader.toLowerCase()){
				loadArtistOrGenre(currentlyPlayingArtistName);
			}
			clickCurrent = false;
		}
		common();
	});
	// Action when clicking genre beneath artist name
	$('.tags').on('click', 'a', function(event){
		event.preventDefault();
		if(clickGenre) {
			// Scroll to top of the page
			$("html, body").animate({ scrollTop: 0 });
			// Show loading in the header
			$('.spinner').addClass('show_spinner show_spinner-opacity');
			// gets the genre name
			var genre = $(this).text();
			// loads genre
			loadGenre(genre);
			clickGenre = false;
		}
		common();
	});
	function common(){
		$('.similarTop').removeClass('expendSim-show');
		setTimeout(function(){
			clickSim = true,
			clickCurrent = true,
			clickGenre = true;
		}, 1000);
	}
})(jQuery);
// Action when expanding similar or top artists on narrow screens
(function($){
	$('.similarTop').on('click', 'h5', function(event){
		// Get current page href so we can check if page is about artist or genre
		var pathnameLink = window.location.href;
		$('.similarTop').toggleClass('expendSim-show');
		if($('.similarTop').hasClass('expendSim-show')) { // If similar or top artist section is closed 
			common(pathnameLink, "caret-up");
		} else { // If similar or top artist section is closed 
			common(pathnameLink, "caret-down");
		}
	});
	function common(pathnameLink, caretPosition){
		setTimeout(function(){
			if (pathnameLink.indexOf("#artist=") >= 0){
				$('.similarTop h5').empty().append('Similar Artists<span class="' + caretPosition + ' sim-down"></span>');
			} else {
				$('.similarTop h5').empty().append('Top Artists<span class="' + caretPosition + ' sim-down"></span>');
			} 
		}, 300);
	}
})(jQuery);
// Action when "Home" or "About" links in menu are clicked
(function($){
	// Action when "Home" or "About" link in menu is clicked
	$('.home, .about, .logo').click(function(event) {
		common(event);
		// Wait until animation is finished before sending to location
	    var goTo = this.getAttribute("href");
	    setTimeout(function(){
	         window.location = goTo;
	    }, 400);
	});
	// Gives active class to menu link
	$('.link-to-page').click(function(event) {
		$('.link-to-page').removeClass('active-menu-page');
		$(this).addClass('active-menu-page');
	});
	function common(event){
		event.preventDefault();
		// Don't show triangle animation
		$('.triangle-wrapper').hide();
		$('.loader').show();
		$('.loader').removeClass('loader-hide');
	}
})(jQuery);
// Open / close menu
$('#menuToggle').click(function(){
	if(!$('.front-menu-expended').hasClass('front-menu-show')){
    	$('#menuToggle').addClass('menuToggle-bg-input');
	} else {
		$('#menuToggle').removeClass('menuToggle-bg-input');
	}
	$('.front-menu-expended').toggleClass('front-menu-show');
	$('.front-menu-expended ul').toggleClass('front-menu-show-ul');
	$('#menuToggle').toggleClass('menuToggle-hamburger');
	$('body').toggleClass('body-overflow');
});
// Closing things when click outside of container
$(document).click(function (e) {
    e.stopPropagation();
    var containerMenu = $(".second-half");
    var containerSearch = $(".search__form");
    var containerPlaylist = $("footer");
    var pathnameLink = window.location.href;

    // check if the clicked area is dropDown or not
    if (containerMenu.has(e.target).length === 0 && $('.front-menu-expended').css('width') < '301px') {
		$('.front-menu-expended').removeClass('front-menu-show');
		$('.front-menu-expended ul').removeClass('front-menu-show-ul');
		$("#menuToggle input").prop("checked", false);
		$('#menuToggle').removeClass('menuToggle-bg-input menuToggle-hamburger');
    }
    // check if the clicked area is search or not
    if (containerSearch.has(e.target).length === 0) {
	    $('.input-choice').removeClass('input-choice-expend');
	    $('#forma3 .input-choice').removeClass('input-choice-focus');
	    $('.input-choice a').removeClass('active-search-expend');
	    $('.form-group, .form-control, .search').removeClass('search-expand');
	    $('#forma3 .form-control').removeClass('form-control-focus');
    	$('#menuToggle span').removeClass('hamburger-input');
    	$('input').val('');
   		if( !($('.artist-search').is(':empty')) ) {
	    	$('.artist-search').empty();
	    }
    }
    // check if the clicked area is playlist or not
    if (containerPlaylist.has(e.target).length === 0) {
		$('.playlist').removeClass('show-playlist');
		$('.playlistColor').removeClass('active-playlist');
    }
});