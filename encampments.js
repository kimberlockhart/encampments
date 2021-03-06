var THREE_ONE_ONE_API_URL_BASE = "https://data.sfgov.org/resource/ktji-gk7t.json?";
var DEFAULT_MARKER_IMG = "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m";
var TENT_MARKER_IMG = "http://map.saintfrancischallenge.org/images/tent.png";

function init() {
	var today = new Date();
	var beginningOfTime = new Date(today.getFullYear() - 1, 1, 1, 0, 0, 0, 0);
	
	var defaultStartDate = new Date(2017, 0, 1, 0, 0, 0, 0);
	var defaultEndDate = today;
	
	$('#start').val(Dates.toHumanString(defaultStartDate));
	$('#end').val(Dates.toHumanString(defaultEndDate));
	
	// Date Picker init must occur after default dates are set
	$(".input-daterange").datepicker({
		autoclose: true,
		assumeNearbyYear: true,
		startDate: Dates.toHumanString(beginningOfTime)
	});
	
	$('[data-toggle="tooltip"]').tooltip(); 
	
	$("#controls").change(buildMapFromForm);		
	buildMapFromForm();
}

function switchToggles(callback) {
	$(".switch").each(function() {
		var $toggler = $(this);
		var $togglee = $("#" + $toggler.data("element"));
		if ($toggler.find("input").is(":checked")) {
			$togglee.slideDown(callback);
		} else {
			$togglee.slideUp(callback);
		}
	});
}

function buildMapFromForm() {
	var callback = function() {
		var open = $('#open').is(":checked");
		var start = new Date($('#start').val());
		var end = new Date ($('#end').val());
		var details = [];
		$('input[name="details"]:checked').each(function() {
		   details.push(this.value);
		});
		var clusters = $('#clusters').is(":checked");
		buildMap(Dates.toApiString(start), Dates.toApiString(end), {open: open, details: details, clusters: clusters});
	};
	switchToggles(callback);
}

function buildMap(start, end, options) {
	
	var map = drawMap();
	
	var rangeQuery = "requested_datetime >= '" + start + "' AND requested_datetime <= '" + end + "'";
	var detailQuery = "";
	var openQuery = "";
	if (options.details) {
		if (options.details.length == 0) {
			detailQuery = "AND service_details != 'Encampment Cleanup' AND service_details != 'Cart Pickup' AND service_details != 'Storage'";
		} else {
			var partialDetailQueries = [];
			$.each(options.details, function() {
				partialDetailQueries.push("service_details = '" + this + "'");
			});
			// iterate thorugh the incdent types, add text to an array, then join with OR
			detailQuery = " AND (" + partialDetailQueries.join(" OR ") + ")";
		}
	}
	if (options.open) {
		openQuery = " AND (status_description = 'Open' OR (status_description = 'Closed' AND closed_date >= '" + end + "'))";
	}
	
	var params = {service_name: "Encampments", $where: rangeQuery + detailQuery + openQuery, $limit: 50000};
	
	// Fetch Case Data from 311
	if ($('input[name="cases"]').is(":checked")) {
		Spinny.add();
		$.get(THREE_ONE_ONE_API_URL_BASE + $.param(params), function(data) {
			addCaseMarkers(data, options.clusters, map);	
			Spinny.remove();
			updateCaseTotal(data);
		});
	}
	
	// Fetch DPW Encampment Data
	if ($('input[name="encampments"]').is(":checked")) {
		var month = $('select[name="month"]').val();
		var data = encampments[month];
		addEncampmentMarkers(data, map);
		updateEncampmentTotal(data);
	}
}
function updateEncampmentTotal(data) {
	$('#encampmentTotals').text("Total Encampments: " + data.length);
}

function updateCaseTotal(data) {
	$('#caseTotals').text("Total Cases: " + data.length);
}

function addEncampmentMarkers(data, map) {
	var encampmentMarkers = data.map(function(datum, i) {
		var marker = new google.maps.Marker( {
			position: {lat: datum.Lat, lng: datum.Lon},
			title: "Encampment " + datum.EncampmentID,
			icon: TENT_MARKER_IMG,
			map: map
		});
		var infoWindow = getEncampmentInfoWindow(datum);
		marker.infoWindow = infoWindow;
		// Add infoWindow handler to each marker so it operates when it's no longer part of a cluster
		marker.addListener("click", function() {infoWindow.open(map, marker);});
		return marker;
	});
}

function addCaseMarkers(data, clusters, map) {
	var markers = data.map(function(datum, i) {
		// Some API data is corrupt, skip those data points
		if (typeof(datum) === "undefined") return;

		var marker = new google.maps.Marker({
			position: {lat: parseFloat(datum.lat), lng: parseFloat(datum.long)},
			title: datum.service_details,
		});
		var infoWindow = getCaseInfoWindow(datum);
		marker.infoWindow = infoWindow;
		// Add infoWindow handler to each marker (even for cluster mode) so it operates when it's demoted from a cluster
		marker.addListener("click", function() {markerClick(marker, map)});
		return marker;
	});
	
	if (clusters) {
		markerCluster = new MarkerClusterer(map, markers,
			{zoomOnClick: false, imagePath: DEFAULT_MARKER_IMG});
		google.maps.event.addListener(markerCluster, "clusterclick", function(cluster) {clusterClick(cluster, map)});	
	} else {
		// Add markers directly to map
		markers.forEach(function(marker) {
			marker.setMap(map);
		});
	}
}

function getCaseInfoWindow(datum) {
	var values = {
		"service_details": datum.service_details,
		"service_description": datum.status_description,
		"address": datum.address,
		"date_opened": datum.requested_datetime.substr(0, 10),
		"status_notes": datum.status_notes
	}
	if (datum.status_description == "Closed") {
		values["closed"] = true;
		values["date_closed"] = datum.closed_date.substr(0, 10);
	}
	
	var template = $('#caseInfoWindow').html();
	var content = Mustache.render(template, values);
	return new google.maps.InfoWindow({content: content});
}

function getEncampmentInfoWindow(datum) {
	var levelValue = parseInt(datum.Safety.substr(0, 1));
	switch(levelValue) {
		case 5:
			level="danger";
			level_text="Dangerous or Violent";
	    case 4:
	        level="not_safe";
			level_text = "Not Safe";
	        break;
	    case 3:
	        level="neutral";
			level_text = "Neutral";
	        break;
	    case 2:
	        level="somewhat";
			level_text = "Somewhat Safe";
	        break;
		case 1:
			level="safe";
			level_text = "Safe";
        	break;
		default:
			level="unknown";
			level_text="No Safety Info";
			break;
	}
	
	
	var values = {
		"encampment_id": datum.EncampmentID,
		"status": datum.Status || "Unknown",
		"last_assessment": datum.LastAssessment || "Unknown",
		"location_type": datum.LocationType || "Unknown",
		"people": datum.People || "Unknown",
		"tents": datum.Tents || "Unknown",
		"level": level,
		"level_text": level_text
	};
	
	var template = $('#encampmentInfoWindow').html();
	var content = Mustache.render(template, values);
	return new google.maps.InfoWindow({content: content});
}

function drawMap(data, clusters) {
	// Center on San Francisco
	var map = new google.maps.Map(document.getElementById('map'), {
		zoom: 13,
		center: {lat: 37.78, lng: -122.45}
	});
	return map;
}

function markerClick(marker, map) {
	marker.infoWindow.open(map, marker);	
}

// Show each infoWindow in sequence
function clusterClick(cluster, map) {
	if (typeof(cluster.counter) == 'undefined') cluster.counter = 0;
	if (cluster.infoWindow) cluster.infoWindow.close();
	var size = cluster.getSize();
	var markerIndex = cluster.counter % size;
	var markers = cluster.getMarkers();
	var infoWindow = markers[markerIndex].infoWindow;
	infoWindow.setPosition(cluster.getCenter());
	infoWindow.open(map);
	cluster.infoWindow = infoWindow;
	cluster.counter++;
}
