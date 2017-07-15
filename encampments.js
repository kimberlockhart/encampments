function init() {
	var today = new Date();
	var beginningOfTime = new Date(today.getFullYear() - 1, 1, 1, 0, 0, 0, 0);
	
	var defaultStartDate = new Date(2017, 0, 1, 0, 0, 0, 0);
	var defaultEndDate = today;
	
	$('#start').val(toHumanString(defaultStartDate));
	$('#end').val(toHumanString(defaultEndDate));
	
	// Date Picker init must occur after default dates are set
	$(".input-daterange").datepicker({
		autoclose: true,
		assumeNearbyYear: true,
		startDate: toHumanString(beginningOfTime)
	});
	
	$("#controls").change(controlsChanged);		
	buildMap(toApiString(defaultStartDate), toApiString(defaultEndDate), {open: true});
}

// Returns MM/DD/YYYY
function toHumanString(date) {
	return doubleDigit(date.getMonth() + 1) + "/" + doubleDigit(date.getDate()) + "/" + date.getFullYear();
}

// Returns YYYY-MM-DDT00:00:00
function toApiString(date) {
	return date.getFullYear() + "-" + doubleDigit(date.getMonth() + 1) + "-" + doubleDigit(date.getDate()) + "T00:00:00";
}

function doubleDigit(number) {
	if (number > 9) return number;
	return "0" + number;
}

function addSpinny() {
	$("#spinny").show();
}

function removeSpinny() {
	$("#spinny").fadeOut();
}

function controlsChanged() {

	var open = $('#open').is(":checked");
	var start = new Date($('#start').val());
	var end = new Date ($('#end').val());
	var details = [];
	$('input[name="details"]:checked').each(function() {
	   details.push(this.value);
	});
	
	buildMap(toApiString(start), toApiString(end), {open: open, details: details});
}

function buildMap(start, end, options) {
	addSpinny();
	var rangeQuery = "requested_datetime >= '" + start + "' AND requested_datetime <= '" + end + "'";
	var detailQuery = "";
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
	
	var params = {service_name: "Encampments", $where: rangeQuery + detailQuery, $limit: 50000};
	
	if (options && options.open) {
		params["status_description"] = "Open"
	}	

	// Fetch Incident Data from 311
	$.get("https://data.sfgov.org/resource/ktji-gk7t.json?" + $.param(params), function(data) {
		drawMap(data);	
		removeSpinny();
		updateTotal(data);
	});
}

function getInfoWindow(datum) {
	var content = "<h3>" + datum.service_details + " <span class='badge'>" + datum.status_description + "</span></h3>" 
	+ "<b>Address:</b> " + datum.address + "<br />" 
	+ "<b>Date Opened:</b> " + datum.requested_datetime.substr(0, 10);
	if (datum.status_description == "Closed") content += "<br /><b>Date Closed:</b> " + datum.closed_date.substr(0, 10);
	if (datum.status_notes) content += "<br /><b>Status Notes:</b> " + datum.status_notes;
	return new google.maps.InfoWindow({content: content});
}

function updateTotal(data) {
	$('#totals').html("Total Cases: " + data.length);
}

function drawMap(data) {
	// Center on San Francisco
	var map = new google.maps.Map(document.getElementById('map'), {
		zoom: 13,
		center: {lat: 37.78, lng: -122.45}
	});

	var markers = data.map(function(datum, i) {
		// Some API data is corrupt, skip those data points
		if (typeof(datum) === "undefined") return;

		var marker = new google.maps.Marker({
			position: {lat: parseFloat(datum.lat), lng: parseFloat(datum.long)},
			title: datum.service_details,
		});
		var infoWindow = getInfoWindow(datum);
		marker.infoWindow = infoWindow;
		// Add infoWindow handler to each marker so it operates when it's no longer part of a cluster
		marker.addListener("click", function() {infoWindow.open(map, marker);});
		return marker;
	});

	markerCluster = new MarkerClusterer(map, markers,
		{zoomOnClick: false, imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'});
	// On click, show each infoWindow in sequence
	google.maps.event.addListener(markerCluster, "clusterclick", function(cluster) {
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
	});	

}
