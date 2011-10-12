var data = new Array();
var userEmail = null;
var notificationCount = 0;


var cityList = [];  //autocomplete dropdown contents of cities
var featureList = []; //autocomplete dropdown contnets of features

// parameters for the loading spinner
var spinnerOptions = {
  lines: 16, // The number of lines to draw
  length: 30, // The length of each line
  width: 6, // The line thickness
  radius: 40, // The radius of the inner circle
  color: '#000', // #rbg or #rrggbb
  speed: 1.4, // Rounds per second
  trail: 38, // Afterglow percentage
  shadow: false // Whether to render a shadow
};
// re-usable variables for the spinner. initialized in 
var spinnerTarget, spinner, spinnerCount = 0;
var globalCurrentNavPage = 0;

//var feedbackQuestionAsked = false; //if feedback popup has already been asked, don't ask again
//var externalLinkClicked = false; // when any external link is clicked, don't ask the feedback question

/*
window.onbeforeunload = confirmExit;
function confirmExit()
{
  if (feedbackQuestionAsked == false){
	if (externalLinkClicked == false) {
  	  console.log("managing exit");
	  document.getElementById("exitConfirmation").src="https://spreadsheets.google.com/spreadsheet/viewform?formkey=dFQ5TTEtRVoyRktLdHVSbFJ6UGRwMEE6MQ"
  	  document.getElementById("exitConfirmation").style.visibility = "visible";
  	  feedbackQuestionAsked = true;
  	  return "Thanks so much for visiting Aptag. Mind giving us some feedback? Just click 'Stay on this page' Thanks!";
    }
  }
}
*/

// turn the spinner on. accounts for being called multiple times (i.e. starting a new api call before the last one has returned)
function spinnerOn(){
  if (spinner && spinnerCount <= 0) {
    $('#spin').attr('style',"height:400px; z-index: 5; position: fixed; width:550px;");
    spinner.spin(spinnerTarget);
  }
  spinnerCount++;
}

// turn the spinner off
function spinnerOff(){
  if (spinnerCount >= 0)
    spinnerCount--;
  if (spinnerCount == 0) {
    $('#spin').attr('style',"height:400px; z-index: 0; position: fixed; width:550px;");
    spinner.stop();
  }
}



$(window).resize(function() {
  resizeElements();
});

// set width and height of items dynamically based on window size
function resizeElements(currentNavPage){
  var windowInnerHeight = document.documentElement.clientHeight; //window.innerHeight
  var windowInnerWidth = document.documentElement.clientWidth; //window.innerWidth

  if (!currentNavPage)
    currentNavPage = globalCurrentNavPage;

  var headerHeight
    , newMapWidth = windowInnerWidth - 567;
  if (currentNavPage == 0) {
    headerHeight = $("#masthead").height() + $("#following").height();
  } else {
    headerHeight = $("#masthead").height();
  }
  var newMapHeight = windowInnerHeight - 1 - headerHeight;
  $("#myMap").css( "width", newMapWidth + "px" );
  $("#myMap").css( "height", newMapHeight + "px" );
  //$("#container1").css("margin-top", headerHeight - 21);
  //$('#panel').css("height", newMapHeight +"px");
  $('#panel').css("width", (newMapWidth-20) +"px");
  $('#CLiframe').css("width", (newMapWidth-20) +"px");
  $('#QandA').css("width", (newMapWidth-20) +"px");
  $('.left').css("height", (newMapHeight - headerHeight - 21) + "px");

  //$('#CLiframe').css("height", (newMapHeight - $('#panel #head').height()) +"px");
}


function formatPrice(price){
	var unformattedPrice = price.replace(/,/g,'');
	unformattedPrice = unformattedPrice.replace(/\$/g,'');
    unformattedPrice = parseFloat(unformattedPrice);
    if (unformattedPrice == NaN){
	    return "There was a problem with the formatting of the price.";
    } else {
  		return unformattedPrice; 
	}	
}

var pinInfobox = null
  , map = null
  , points = []
  , currentlyViewingListing = null;

panelLeftOffset = -800; //left: x; when the panel is hidden



function GetMap() {
  //map = new VEMap('myMap');
  //map.LoadMap();

  var mapOptions = {
      credentials: "AjQ80lWVznEPLE4g1ZSoTWxYeDJGcdkA6lpkNCFxveEleQ97TkL5jyUp82mJmZCX",
      mapTypeId: Microsoft.Maps.MapTypeId.automatic,
      center: new Microsoft.Maps.Location(39.0181651, -77.2085914),
      zoom: 15,
      enableClickableLogo: false,
      showScalebar: true,
      useInertia: false,
      showDashboard: true
  }
  map = new Microsoft.Maps.Map(document.getElementById("myMap"), mapOptions);

  var cityRegionAbbrevLocation = {
      'ny' : { lat: 40.719941, lng: -74.004936 }
    , 'newyork' : { lat: 40.719941, lng: -74.004936 }
    , 'dc' : { lat: 38.8951118, lng: -77.0363658 }
    , 'washingtondc' : { lat: 38.8951118, lng: -77.0363658 }
    , 'chi' : { lat: 41.88132, lng: -87.62764 }
    , 'chicago' : { lat: 41.88132, lng: -87.62764 }
  }
  var centerByRegion;
  if (typeof cityRegion != 'undefined') {
    centerByRegion = cityRegionAbbrevLocation[cityRegion];
  }
  if (!centerByRegion)
    centerByRegion = cityRegionAbbrevLocation['dc'];
  
  var centerLoc = new Microsoft.Maps.Location(centerByRegion.lat, centerByRegion.lng);


  map.setView({
      center: centerLoc,
      zoom: 11
  });

  Microsoft.Maps.Events.addHandler(map, "mousemove", function (e) {
  // get the HTML DOM Element that represents the Map
  var mapElem = map.getRootElement();
  if (e.targetType === "map") {
    // Mouse is over Map
	    mapElem.style.cursor = "default";
  } else {
    // Mouse is over Pushpin, Polyline, Polygon
    mapElem.style.cursor = "pointer";
  }
});

}

var currentlyHighlightedPoint = null;
function mapDotClicked(e){
	listingIndex = this.target._id.substr(4,this.target._id.length);

  if (clicky) clicky.log("#/clickMapDot/" + data[globalCurrentNavPage].listings[listingIndex]._id ,"Map Dot Clicked");

	console.log("listingIndex is now " + listingIndex);

	listingDiv = $('#listing_index_' + listingIndex);

	console.log("consequently, listingDiv is ");
	console.log("target._id:");
	console.log(this.target._id);
	if (currentlyHighlightedPoint != null){
		currentlyHighlightedPoint.setOptions({icon:"http://www.bingmapsportal.com/Content/poi_custom.png"});
	}
	this.target.setOptions({icon:"http://ecn.dev.virtualearth.net/mapcontrol/v7.0/i/poi_search.png"});
	currentlyHighlightedPoint = this.target;
	scrollToElement(listingDiv);
	
	displayInfobox(e, listingIndex);
}

function addMapDot(lat, lon, num, listing_index, labelText){
  var loc = new Microsoft.Maps.Location(lat, lon);
  var pin = new Microsoft.Maps.Pushpin(loc, {text: labelText, id: 'map_' + listing_index + '', icon: 'http://www.bingmapsportal.com/Content/poi_custom.png', width: '40px'});
  points[num] = pin;

  // Add handler for the pushpin click event.
  Microsoft.Maps.Events.addHandler(pin, 'click', mapDotClicked);

  // Add the pushpin to the map
  map.entities.push(points[num]);
}

// This function will create an infobox
// and then display it for the pin that triggered the hover-event.
function displayInfobox(e, listingIndex) {
  hideInfobox();

  // build or display the infoBox
  var pin = e.target;
  if (pin != null) {

    // Create the info box for the pushpin
    var location = pin.getLocation();
    console.log(listingIndex);
    console.log(data[globalCurrentNavPage].listings[listingIndex]);
    var options = {
      id: listingIndex,
      description: "<b>" + (data[globalCurrentNavPage].listings[listingIndex].price ? "$" + data[globalCurrentNavPage].listings[listingIndex].price : "") + " " + data[globalCurrentNavPage].listings[listingIndex].title + "</b><br><br>" + data[globalCurrentNavPage].listings[listingIndex].tags.join(", ") + "<br><br>" + "<a onclick='javascript: showDetails(" + listingIndex + "); if (clicky) clicky.log(\"#/showDetailsFromMap/" + data[globalCurrentNavPage].listings[listingIndex]._id + "\",\"Show Details From Map-ViewListing\");'>View Listing</a>&nbsp;&nbsp;<a onClick='javascript: showDetails(" + listingIndex + "); if (clicky) clicky.log(\"#/askQuestionFromMap/" + data[globalCurrentNavPage].listings[listingIndex]._id + "\",\"askedQuestionFromMap-ChatWithOwner\");'>Chat with Owner</a>&nbsp;&nbsp;<a onclick='javascript:markFavorite(" + listingIndex + "); if (clicky) clicky.log(\"#/markFavoriteFromMap-Favorite/" + data[globalCurrentNavPage].listings[listingIndex]._id + "\",\"Mark Favorite From Map\");'>Favorite</a>",
      height: 120,
      width: 300,
      visible: true,
      showPointer: true,
      showCloseButton: true,
      // offset the infobox enough to keep it from overlapping the pin.
      offset: new Microsoft.Maps.Point(0, pin.getHeight()),  
      zIndex: 999
    };
    // create the infobox
    pinInfobox = new Microsoft.Maps.Infobox(location, options);
    
    // add it to the map.
    map.entities.push(pinInfobox);
    pinInfobox.cm1001_er_etr.descriptionNode.innerHTML = pinInfobox.getDescription();
    $('.Infobox').css('top',116 - $('.Infobox').children().eq(1).height());
  }
}

function hideInfobox() {
  // destroy the existing infobox, if any
  if (pinInfobox != null) {
    map.entities.remove(pinInfobox);
    pinInfobox = null;
  }
}


function changeView(navigationPage){
  // close a listing if it is open
  closeDetailsPanel();
	globalCurrentNavPage = navigationPage;
	$('body').scrollTop(0);
	resizeElements(navigationPage);

	if (navigationPage == 1){
		//inbox
		$("#filterDiv").css("visibility", "hidden")
    $(".leftholder").eq(0).css("display", "none");
    $(".leftholder").eq(1).css("display", "block");

		$('li#nav0').removeClass('selected');
		$('li#nav1').addClass('selected');
		getInbox(function(data) {
		  mapData(data, 1);
		});
	} else {
		//search view
		$("#filterDiv").css("visibility", "visible");
    $(".leftholder").eq(0).css("display", "block");
    $(".leftholder").eq(1).css("display", "none");
		
		$('li#nav1').removeClass('selected');
		$('li#nav0').addClass('selected');
		sendSearchRequest(mapData);
	}
}

function testGetClickyLog() {
  if (clicky)
  	clicky.log('#menu/home','Home'); 
}

$(document).ready(function() {
  
  // waiting until dom loads to find div#spin and create the spinner object
  spinnerTarget = document.getElementById('spin');
  spinner = new Spinner(spinnerOptions).spin(spinnerTarget);
  spinner.stop();

  // size elements dynamically
  resizeElements();

  // clicky
  try{ clicky.init(66489207); }catch(e){}
 
  //testGetClickyLog();

	getAutocompleteData(saveAutocompleteData);
	
	changeView(0);
	
	var panel= $('#panel');
	panel.animate({left: panelLeftOffset});
  
  GetMap();
  
  //set function for panel's close button
  $('.close').click(closeDetailsPanel);

  //set function for question input box to automatically click submit when user presses enter
  $("#question").keyup(function(event){
    if(event.keyCode == 13){
      $("#questionButton").click();
    }
  });

  $("#userTextNumber").keyup(function(event){
    if(event.keyCode == 13){
      $("#userTextNumberButton").click();
    }
  });
  
  $("input#myEmail").keyup(function(event){
    if(event.keyCode == 13){
      $("#emailButton").click();
    }
  });

	$("#various1").fancybox({
		'titlePosition'		: 'inside',
		'transitionIn'		: 'none',
		'transitionOut'		: 'none',
		'showCloseButton'	: false
	});
	

});

function closeDetailsPanel(){
  var panel= $('#panel');
    var slidecontainer = $('#container');

	panel.zIndex("2");
	panel.animate({left: panelLeftOffset});
	currentlyViewingListing = null;
  return false;
}

function initializeSlides(){
    $('#slides').slides({
      preload: true,
      preloadImage: 'img/loading.gif',
      play: 5000,
      pause: 2500,
      hoverPause: true,
      animationStart: function(current){
        $('.caption').animate({bottom:-35}, 100);
      }, animationComplete: function(current) {
        $('.caption').animate({bottom:0}, 200);
      }, 
        slidesLoaded: function() {
          $('.caption').animate({bottom:0}, 200);
        }
      });
}

var currentListingIndex = -1;

//open up the panel to show details for this listing
function showDetails(thisListingIndex){
	thisListing = data[globalCurrentNavPage].listings[thisListingIndex];
	currentListingIndex = thisListingIndex;
	displayDetailsPanel(thisListingIndex);
}


//this returns the div of the listing (block)
function getListingDiv(listingIndex){
	listingDiv = $("#listing_index_" + listingIndex);
	return listingDiv.parent()[0];
}

//var myArrow;
//When a listing is clicked, show listing detials panel
function displayDetailsPanel(thisListingIndex){	
  var shortenedTitle = data[globalCurrentNavPage].listings[thisListingIndex].title;
  if (shortenedTitle.length > 35){
    shortenedTitle = shortenedTitle.substring(0,35) + "...";	
  }
  var panel= $('#panel');

  //var slidecontainer = $('#container');
  //var panel_width=$('#panel').css('left');
  var list_width = $('.left').outerWidth() + $('.navigation').outerWidth();
  if (currentlyViewingListing == null){
  
  	$("#CLiframe")[0].src = data[globalCurrentNavPage].listings[thisListingIndex].link;
  	//opening the panel
  	$("#listingTitle").text(shortenedTitle);
  
      //document.getElementById("existingMessages").innerHTML = 
  	addMessagesToListing(data[globalCurrentNavPage].listings[thisListingIndex]);
  
  	
  	panel.animate({left: list_width}, function(){
  		panel.zIndex("4");
  	});
  
  	var thisListingDiv = getListingDiv(thisListingIndex);
  	thisListingDiv.style.backgroundColor = "#F0F0F0";
  	
  	currentlyViewingListing = thisListingIndex;
  	$('#question').focus();
  

  } else if (currentlyViewingListing == thisListingIndex){
  	//close this listing
  	panel.zIndex("2");
  	panel.animate({left: panelLeftOffset});
  
  	var thisListingDiv = getListingDiv(thisListingIndex);
  	
  	currentlyViewingListing = null;
  } else if (currentlyViewingListing != thisListingIndex){

  	panel.zIndex("2");
  
  	//remove the highlighting from the already open one
  	var thisListingDiv = getListingDiv(currentlyViewingListing);
  	thisListingDiv.style.removeProperty("background-color");
  
  	//add highlighting to the new one.
  	thisListingDiv = getListingDiv(thisListingIndex);
  	thisListingDiv.style.backgroundColor = "#F0F0F0";
  
  	panel.animate({left: panelLeftOffset}, function(){
  		currentlyViewingListing = thisListingIndex;
  		/*
  		$(".title").html(thisListing.title);
  		$(".originalpostlink").html("Link ot original Post: <a href='" + thisListing.link + "' target='_blank'>" + thisListing.link + "</a>")
  	    $(".description").html("<iframe src='" + thisListing.link + "' width=100% height=100% scrolling='Yes'>");
  		*/
  		$("#CLiframe")[0].src = data[globalCurrentNavPage].listings[thisListingIndex].link;
		$("#listingTitle").text(shortenedTitle);
		addMessagesToListing(data[globalCurrentNavPage].listings[thisListingIndex]);
	    
  		panel.animate({left: list_width}, function(){
  			panel.zIndex("4");
  			$('#question').focus();
  			
  		});
  		
  	});

	
  } else {
	//console.log("D - this shouldn't be hit");
  }
  
  updateListingByIndex(thisListingIndex, globalCurrentNavPage, function(){});

  return false;

}

function addMessagesToListing(thisListing){
	//add the following to existing messages:
	$('#existingMessages').empty();
	//loop through all messages:
	var messagesExist = false;
	for (var j = 0; j < thisListing.messageThreads.length; j++){
		console.log("inside loop: j=" + j);
		console.log(thisListing.messageThreads[j].messages)
		for (var k = 0; k < thisListing.messageThreads[j].messages.length; k++){
			messagesExist = true;

			$("#existingMessages").append("<p><img src='img/face.png'  style='vertical-align: middle;' height='40px;'>Matt: " + thisListing.messageThreads[j].messages[k].message + "</p>");
			
		}
	}
    if (messagesExist){
		$("#replyDiv").css("visibility", "visible")		
	} else {
		$("#replyDiv").css("visibility", "hidden")
		
	}
}

function UpdateSearchParameters(){
	myPriceMin = $('#priceMin')[0].value.replace(/[A-Za-z$-]/g, "").replace(/\,/g, "").replace(/\$/g,"");
	if (myPriceMin == null) {
		myPriceMin = 0;
	}
	$('#priceMin')[0].value = myPriceMin;

	myPriceMax = $('#priceMax')[0].value.replace(/[A-Za-z$-]/g, "").replace(/\,/g, "").replace(/\$/g,"");
	if (myPriceMax == null) {
		myPriceMax = 0;
	}
	$('#priceMax')[0].value = myPriceMax;

	myBedroomCount = $('#bedroomCount')[0].value.replace(/[A-Za-z$-]/g, "").replace(/\,/g, "").replace(/\$/g,"");
	if (myBedroomCount == null) {
		myBedroomCount = 0;
	}
	$('#bedroomCount')[0].value = myBedroomCount;
	
	console.log("update search(" + myPriceMin + "," + myPriceMax + "," + myBedroomCount + ")");
	UpdateSearch(myPriceMin, myPriceMax, myBedroomCount);

}

function UpdateSearch(myPriceMin, myPriceMax, myBedroomCount){
  var myFeatureTagsString =  "";
  var myCityTagsString =  "";

	//myTagsArray = document.getElementsByName("tag[]");
	myFeatureTagsArray = document.forms['function-source1'];
	myCityTagsArray = document.forms['function-source2'];

	for (var i = 0; i < myFeatureTagsArray.length-1 ; i++){
    if (i > 0)
      myFeatureTagsString += ",";
		myFeatureTagsString += myFeatureTagsArray[i].value;
	}

	for (var i = 0; i < myCityTagsArray.length-1 ; i++){
    if (i > 0)
      myCityTagsString += ",";
		myCityTagsString += myCityTagsArray[i].value;
	}
	console.log("feature tags: " + myFeatureTagsString);
	console.log("location tags: " + myCityTagsString);

	
	sendSearchRequest(myFeatureTagsString, myCityTagsString, myPriceMin, myPriceMax, myBedroomCount, mapData);
}

function getInbox(onComplete){
  updateNotificationCount(0);
  spinnerOn();
  $.ajax('/listings?inbox=1', {
    type: "GET",
    success: function(thisData){
      spinnerOff();
      if (clicky) clicky.log("#/resultsSuccess" ,"Results successfully returned");
      console.log("here is the data that was returned...");
  	  console.log(thisData);
      onComplete(thisData, true);
    },
    error: function() {
      spinnerOff();
      if (clicky) clicky.log("#/resultsFail" ,"Results returned ERROR");
    }
  });
}

function sendSearchRequest() {
  spinnerOn();
  //onComplete function is mapData
  var data, onComplete;
  if (arguments[0] instanceof Function) {
    onComplete = arguments[0];
    $.ajax('/listings', {
      type: "GET",
      success: function(thisData){
        spinnerOff();
        if (clicky) clicky.log("#/resultsSuccess" ,"Results successfully returned");
        onComplete(thisData, false);
      },
      error: function() {
        spinnerOff();
        if (clicky) clicky.log("#/resultsFail" ,"Results returned ERROR");
      }
    });

    //if (clicky)	clicky.log("#/updateSearch?","Update Search");
  } else {
    data = {tags: arguments[0], locationTags: arguments[1], priceMin:arguments[2], priceMax:arguments[3], bedroomCount:arguments[4]};
    onComplete = arguments[5];  
    $.ajax('/listings', {
      type: "POST",
      data: data,
      dataType: "json",
      success: function(thisData){
        spinnerOff();
        if (clicky) clicky.log("#/resultsSuccess/" ,"Results successfully returned");
        onComplete(thisData, false);
      },
      error: function() {
        spinnerOff();
        if (clicky) clicky.log("#/resultsFail/" ,"Results returned ERROR");
      }
    });

    if (clicky) clicky.log("#/updateSearch?tags=" + data[0].tags + "&locationTags=" + data[0].locationTags + "&priceMin=" + data[0].priceMin + "&priceMax=" + data[0].priceMax + "&bedroomCount=" + data[0].bedroomCount,"Update Search");
  }
}
var labelText;
//maps imported data (json) into the viewModel AND places it on an actual map


function mapData(listingsResponse, navPage){
  if (!navPage)
    navPage = 0;
	data[navPage] = listingsResponse;
  // get rid of info box if one is open
  hideInfobox();

	//have to do this backwards because we're popping elements off of the array and the i count won't line up otherwise
  for (var i = points.length-1; i >= 0; i--){
		map.entities.remove(points[i]);
		points.splice(i, 1);
	}

	while ($('.leftholder').eq(navPage).children().length > 0 && $('.leftholder').eq(navPage).children()) {
    $('.leftholder').eq(navPage).children().eq($('.leftholder').eq(navPage).children().length - 1).remove();
	}
  
  // if inbox AND (TODO:) user has not logged in
  if (navPage == 1) {
    var inboxHint = '<div id="inboxWelcome">This is your activity stream. Favorite listings and your new messages will all appear here.</div>';
    $('.leftholder').eq(navPage).append(inboxHint);
  }

	var dataListingsLength = 0;
	if (data[navPage].listings != undefined) {
		dataListingsLength = data[navPage].listings.length;
	}
	for (var i = 0; i < dataListingsLength; i++){
		var myInnerHTML = "<div class='superblock'>";

		myInnerHTML += "<div class='iconset' >";
		if (!navPage == 1){
			myInnerHTML += "<button title='Ask a Question' alt='Ask a Question' class='css3button' style='vertical-align: top; font-size:12px;' onclick='javascript: showDetails(" + i + "); showAskQuestion(); if (clicky) clicky.log(\"#/askQuestionFromButton/" + data[navPage].listings[i]._id + "\",\"askQuestionFromButtonSoNoQuestionEnteredYet\");'>Ask Question</button>";
			//myInnerHTML += "<button title='Archive' alt='Archive' class='css3button' style='vertical-align: top; font-size:12px;' onclick='javascript: archivePost(" + i + "); '>Archive</button>";		
	 	} else {
			myInnerHTML += "<button title='Archive' alt='Archive' class='css3button' style='vertical-align: top; font-size:12px;' onclick='javascript: archivePost(" + i + "); '>Archive</button>";		
		}
		myInnerHTML += "<a title='Find on Map' alt='Find on Map' style='margin-left: 5px; vertical-align: top; cursor: pointer;' onclick='javascript: findOnMap(" + i + "); if (clicky) clicky.log(\"#/findOnMap/" + data[navPage].listings[i]._id + "\",\"Find on Map\");'><img src='http://www.bingmapsportal.com/Content/poi_custom.png' height=25></a>";
		myInnerHTML += "</div>";
	    myInnerHTML += "<div class='block' id='listing_index_" + i + "' name='listing_index_" + i + "' onclick='javascript: showDetails(" + i + "); if (clicky) clicky.log(\"#/showDetails/" + data[navPage].listings[i]._id + "\",\"Show Details\");'>";
		
		if (navPage == 1){
			console.log(typeof data[navPage].listings[i].userListingData.notifications == 'undefined' ? 'undefined notifications for listing ' + i : data[navPage].listings[i].userListingData.notifications);

			var notificationType;
			if (data[navPage].listings[i].userListingData.notifications)
  			notificationType = data[navPage].listings[i].userListingData.notifications[data[navPage].listings[i].userListingData.notifications.length-1].notificationType;
  		else
  		  notificationType = "error";
	    var shortenedTitle = data[navPage].listings[i].title;
	    if (shortenedTitle.length > 30){
	      shortenedTitle = shortenedTitle.substring(0,30) + "...";	
	    }
			if (notificationType== "favorite"){
				myInnerHTML += "<img src='/img/starcircled.png' height='40px;' style='vertical-align: middle'>You favorited <span style='color: blue'>" + shortenedTitle + "</span>";
			} else if (notificationType == "message") {
				myInnerHTML += "<img src='/img/commentcircled.png' height='40px;' style='vertical-align: middle'>New message about <span style='color: blue'>" + shortenedTitle + "</span>";
			} else {
		    myInnerHTML += "error";
			}
		} else {	
		
			if (data[navPage].listings[i].userListingData.matchPercentageString != undefined) {
				labelText = data[navPage].listings[i].userListingData.matchPercentageString + '%';
				myInnerHTML += "<div class=style='position: relative; float: left; border: solid 5px transparent; text-align: center; font-style: italic; padding: 5px;'><span style='font-size:16px'>";
				myInnerHTML += data[navPage].listings[i].userListingData.matchPercentageString + "%<BR>";
		  		myInnerHTML += "</span><span style='font-size: 10px;'>match</span></div>";
			} else {
				labelText = '' + i;
			}
			myInnerHTML += "<div id='listing_index_" + i + "'></div><span>" + (i+1) + ") ";
			if (data[navPage].listings[i].price != undefined){
				myInnerHTML += "$" + data[navPage].listings[i].price + " ";
			}
			myInnerHTML += data[navPage].listings[i].title + "</span>";
			//tag stuff:
			myInnerHTML += "<ul style='border: 0px' class='tagedit-list'>";

			for (var j = 0; j < data[navPage].listings[i].tags.length; j++){
				myInnerHTML += "<li class='tagedit-listelement tagedit-listelement-old'>";
				myInnerHTML += data[navPage].listings[i].tags[j];
				myInnerHTML += "<a class='tagedit-break'></a></li>";
			}
			myInnerHTML += "</ul>";	
			myInnerHTML += "</div>";

		}
		
		$('.leftholder').eq(navPage).append(myInnerHTML);
	}
	
	
	// Add map dots in reverse order so highest ranked are on top:

	for (var i = dataListingsLength-1; i >= 0  ; i--){
		if (data[navPage].listings[i].location){
			if (data[navPage].listings[i].userListingData.matchPercentageString != undefined) {
				labelText = data[navPage].listings[i].userListingData.matchPercentageString + '%';
			} else {
				labelText = '' + (i + 1);
			}
			if (data[navPage].listings[i].location.length > 0) {
				addMapDot(data[navPage].listings[i].location[0].lat, data[navPage].listings[i].location[0].lng, (i), i, labelText);
			}
		}
	}
	
	
}

//get autocomplete data
function getAutocompleteData() {
  var autoCompleteData, onComplete;

  if (arguments[0] instanceof Function) {
    onComplete = arguments[0];
    $.ajax('/tags', {
      type: "GET",
      success: function(autoCompleteData){
        loadCityAutocompleteData();
        onComplete(autoCompleteData);
      }
    });
  }
}
var templist;
function saveAutocompleteData(autocompleteResponse){
	templist = autocompleteResponse; 
	SeparateAutocompleteResponses(autocompleteResponse)
	
	$('#function-source1 #searchTags').tagedit({
		autocompleteOptions: {
			source: function(request, response){
				return response($.ui.autocomplete.filter(featureList, request.term) );
			}
		}
	});		
}


//separates autocomplete options: those with city descriptions and those without
function SeparateAutocompleteResponses(autocompleteResponse){
	for (var i = 0; i < autocompleteResponse.length; i++){
		if (autocompleteResponse[i].description != 'universal'){
			if (autocompleteResponse[i].name){
				cityList.push(autocompleteResponse[i].name);
			}
		} else {
			featureList.push(autocompleteResponse[i].name);
		}
	}
}

function loadCityAutocompleteData(){
	$('#function-source2 #city').tagedit({
		autocompleteOptions: {
			source: function(request, response){
				return response($.ui.autocomplete.filter(cityList, request.term) );
			}
		}
	});		
}

var myParentDiv;
var currentlyHighlighted = 0;

//scroll to the element:
function scrollToElement(myElement){
	console.log("about to tell you what function were running:");
	console.log(myElement.offset().top);
	$('#left').scrollTop(0);		

	$('#left').animate({
		scrollTop: myElement.offset().top - 200
	}, 600);
	myPassedElement = myElement;
	var parentDiv = myElement.parent()[0]; //
	parentDiv.style.backgroundColor = "#96faa0";
	myParentDiv = parentDiv;
	if (currentlyHighlighted !=0){
		currentlyHighlighted.style.backgroundColor="WHITE";
	}
	currentlyHighlighted = parentDiv;

 
	myParentDiv = parentDiv; //for debugging purposes
	//parentDiv.fadeOut("slow").css("background-color").val("#ffffff");
	//$("span").fadeOut("slow").css("background-color").val("FFFF99");
}
/*
function insertSlide(){
	$('.slides_control').append("<div class='slide' id='newslide'><a href='#' title='test title' target='_blank'><img src='img/slide-1.jpg' width=370 height=270 alt='slide 1'></a><div class='caption'>a caption</div></div>")

    $('#').slides({
      preload: true,
      preloadImage: 'img/loading.gif',
      play: 5000,
      pause: 2500,
      hoverPause: true,
      animationStart: function(current){
        $('.caption').animate({bottom:-35}, 100);
      }, animationComplete: function(current) {
        $('.caption').animate({bottom:0}, 200);
      }, 
        slidesLoaded: function() {
          $('.caption').animate({bottom:0}, 200);
        }
      });
*/
/*

    div(class="slide")
      a(href="http://www.flickr.com/photos/childofwar/2984345060/", title="Happy Bokeh raining Day | Flickr - Photo Sharing!", target="_blank")
        img(src="img/slide-3.jpg", width="370", height="270", alt="Slide 3")
      div(class="caption")
        p View
    div(class="slide")
      a(href="http://www.flickr.com/photos/b-tal/117037943/", title="We Eat Light | Flickr - Photo Sharing!", target="_blank")
        img(src="img/slide-4.jpg", width="370", height="270", alt="Slide 4")
      div(class="caption")
        p Hall
}
*/   
var currentlyHighlightedOnMap = -1;

function findOnMap(i){
	closeDetailsPanel();
	if (currentlyHighlightedOnMap >-1 ){
		console.log("map was already highlighted for listing i = " + i)
		//turn off old highlighting
		if (points[currentlyHighlightedOnMap] != undefined){
			points[currentlyHighlightedOnMap].setOptions({icon:"http://www.bingmapsportal.com/Content/poi_custom.png"});
		}
	}

	if (currentlyHighlightedPoint != null){
		currentlyHighlightedPoint.setOptions({icon:"http://www.bingmapsportal.com/Content/poi_custom.png"});
	}
	points[i].setOptions({icon:"http://ecn.dev.virtualearth.net/mapcontrol/v7.0/i/poi_search.png"});
	currentlyHighlightedPoint = points[i];
	map.setView({center: points[i]._location });
	currentlyHighlightedOnMap = i;

}


//
// Sorting listings by new tag names
//

function sortListingsByTagNames(listings, tagNames) {
  if (!(tagNames instanceof Array))
    tagNames = tagNames.toString().replace(/\s*,\s*/g, ',').split(',');

  for(var i = 0; i < listings.length; i++) {
    var matchCount = countListingsMatches(criteria.tags, listings[i]);
    if (!matchCount)
      matchCount = 0;
    listings[i].userListingData = {
        'matchCount': matchCount
      , 'matchPercentage': (matchCount / criteria.tags.length)
      , 'matchPercentageString': Math.round((matchCount / criteria.tags.length)*100)
    };
  }
  // sort the listings by matchcounts. this should be a little more sophisticated soon as well
  sortedListings = sortByMatchCount(listings);
  
  assignRankings(listings);
  return listings
}


function countListingsMatches(tagNames, listing) {
  var count = 0;

  for (var i = 0; i < listing.tags.length; i++) {
    for (var j = 0; j < tags.length; j++) {
      if (tagNames[j] == listing.tags[i]) {
        count++;
        continue;
      }
    }
  }
  return count;
}

function sortByMatchCount(listings) {
  return listings.sort(function(a, b){
    return b.userListingData.matchCount - a.userListingData.matchCount;
  });
}


function assignRankings(listings) {
  for (var i = 0; i < listings.length; i++) {
    if (!listings[i].userListingData)
      listings[i].userListingData = {};
    listings[i].userListingData.ranking = i;
  }
  return listings;
}

function askQuestion(messageDiv){
  console.log(messageDiv);
  messageData = {};
  messageData.message = messageDiv.val();
  messageData.listingId = data[globalCurrentNavPage].listings[currentListingIndex]._id;
  sendMessage(messageData, function(){
    // show loading icon, then confirmation upon success?
    console.log(data[globalCurrentNavPage].listings[currentListingIndex]._id);
 	//show the message:
    $("#existingMessages").append("<p><img src='img/face.png'  style='vertical-align: middle;' height='40px;'>Matt: " + messageDiv.val() + "</p>");
	//remove the message from the input field
    messageDiv.val("");
	//add the message to the list of messages for that item:
	data[globalCurrentNavPage].listings[currentListingIndex];
    updateNotificationCount(1);
  	if (notificationCount == 1) {
      showInboxTip("Responses will appear here, in your Inbox. To be alerted when you get a response,");	
  	}

	
  });

  /*
	$("#questionContent").fadeOut( function(){
		$("#questionContent").removeClass("visibleQandA")
		$("#questionContent").addClass("hiddenQandA");

		
		$("#ThanksForSubmitting").fadeOut( function(){
			$("#ThanksForSubmitting").removeClass("hiddenQandA");	
			$("#ThanksForSubmitting").fadeIn( function(){
				$("input#myEmail").focus();
			});
		});
		

	});
	*/
}

function addEmail(){
	userEmail = $("input#myEmail")[0].value;
	$("#ThanksForSubmitting").fadeOut( function(){
		$("#ThanksForSubmitting").removeClass("visibleQandA")
		$("#ThanksForSubmitting").addClass("hiddenQandA");

		
		$("#questionContent").fadeOut( function(){
			$("#questionContent").removeClass("hiddenQandA");	
			$("#questionContent").fadeIn();
		});
		

	});

}

function scheduleVisit(){
	clicky.log('#/schedule_visit','Clicked Schedule Visit'); 
	location.href='mailto:?subject=Scheduling apartment visit&body=Hello, I am writing to schedule an appointment to see the apartment you listed on Craigslist:  ' + data[globalCurrentNavPage].listings[currentListingIndex].link + '.  Are you available to show me the apartment on  ______[insert date and time]________.';	
}

function archivePost(listingIndex) {
	updateUserListingWithIndex(listingIndex, {isArchived:true}, inboxView);
}

function inboxView(){
	changeView(1);
}

function markFavorite(listingIndex){
	updateUserListingWithIndex(listingIndex, {isFavorite:true});
	updateNotificationCount(1);
	if (notificationCount == 1) {
      showInboxTip("Favorite listings and responses from owners will appear here, in your Inbox! To be alerted when you get a response,");	
	}
}

function updateUserListingWithIndex(listingIndex, thisData, onComplete) {
  console.log("running the function");
  $.ajax('/user/listing/' + data[globalCurrentNavPage].listings[listingIndex]._id, {
    type: "PUT",
    data: thisData,
    dataType: "json",
    success: function(thisData){  
      syncListingWithCallback(listingIndex, { userListingData: thisData }, data[globalCurrentNavPage].listings[listingIndex]._id, onComplete)
	  console.log("successfully updated user listing with index");
    },
    error: function(error) {
	  console.log("failed to updated user listing with index");
      if (onComplete)
        onComplete(error);
    }
  });
}

function textMe(){
	$.fancybox.close();
}

function showAskQuestion(){
  $("#questionContent").removeClass("hiddenQandA");
  $("#questionContent").addClass("visibleQandA")
  $("#QandA").height(100);
  
}

function updateButtonClick(){
	spinnerOn();
	setTimeout("spinnerOff();",250);
}


// data should contain:
// listingId -OR- messageThreadId
// message
function sendMessage(thisData, onComplete) {
  $.ajax('/messages', {
    type: "POST",
    data: thisData,
    dataType: "json",
    success: function(thisData){
      if (onComplete)
        onComplete();
    },
    error: function(error) {
      if (onComplete)
        onComplete(error)
    }
  });
}

function findListingIndexById(listingId, globalListingIndex) {
  for (var i = 0; i < data[globalListingIndex].listings.length; i++)
    if (data[globalListingIndex].listings[i]._id == listingId)
      return i;
  return null;
}

function syncListingWithCallback(listingIndex, navIndex, listing, onComplete) {

  var updateFields = [
      'fullyPopulated'
    , 'listingStatus'
    , 'images'
    , 'ownerEmail'
    , 'userListingData.isFavorite'
    , 'userListingData.isRead'
    , 'userListingData.isArchived'
    , 'userListingData.notifications'
  ];
  var fieldname;

  for(var i = 0; i < updateFields.length; i++) {
  
    // split strings on ".", to allow for updating of embedded objects
    if (updateFields[i].split(".").length > 0)
      fieldname = updateFields[i].split(".");
    else
      fieldname = [updateFields[i]];

    if (listing && typeof listing[fieldname[0]] != 'undefined') {
      if (fieldname[1]) {	//if listing is not fully populated
        if (!data[navIndex].listings[listingIndex][fieldname[0]]) //if there isn't a field for it
          data[navIndex].listings[listingIndex][fieldname[0]] = {};  //then set that field to {}
        if (listing[fieldname[0]] && typeof listing[fieldname[0]][fieldname[1]] != 'undefined') { //if there is a field
          data[navIndex].listings[listingIndex][fieldname[0]][fieldname[1]] = listing[fieldname[0]][fieldname[1]]; //set the listing
        }
      } else {
        data[navIndex].listings[listingIndex][fieldname[0]] = listing[fieldname[0]];
      }
    }
  }
  if (onComplete){
    onComplete();
  }
}

function updateListingByIndex(listingIndex, navIndex, onComplete) {
  getListingById(data[navIndex].listings[listingIndex]._id, function(thisData) {
    syncListingWithCallback(listingIndex, navIndex, thisData.listing, onComplete);
  });
}

function getListingById(listingId, onComplete) {
  $.ajax('/listing/' + listingId, {
    type: "GET",
    success: function(thisData){
      console.log('get /listing/:id callback received:');
      console.log(thisData);
      if (onComplete)
        onComplete(thisData);
    },
  });
}

function updateNotificationCount(addToCount){
	if (addToCount > 0){
  	notificationCount += addToCount;
		$("#notificationCount").text(notificationCount);
		$("#notificationCount").css("visibility", "visible");
	} else {
    notificationCount = 0;
		$("#notificationCount").text("");
		$("#notificationCount").css("visibility", "hidden");		
	}
}

function showInboxTip(text) {
  if (text)
    $("#tiptip_content_text").html(text);
  $("#tiptip_holder").fadeToggle();
  $("li#nav1").click(function(){
    $("#tiptip_holder").fadeOut();
  });
}
