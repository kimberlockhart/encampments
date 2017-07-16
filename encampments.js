var THREE_ONE_ONE_API_URL_BASE = "https://data.sfgov.org/resource/ktji-gk7t.json?";
var DEFAULT_MARKER_IMG = "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m";

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

function buildMapFromForm() {

	var open = $('#open').is(":checked");
	var start = new Date($('#start').val());
	var end = new Date ($('#end').val());
	var details = [];
	$('input[name="details"]:checked').each(function() {
	   details.push(this.value);
	});
	var clusters = $('#clusters').is(":checked");
	buildMap(Dates.toApiString(start), Dates.toApiString(end), {open: open, details: details, clusters: clusters});
}

function buildMap(start, end, options) {
	Spinny.add();
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

	// Fetch Incident Data from 311
	$.get(THREE_ONE_ONE_API_URL_BASE + $.param(params), function(data) {
		drawMap(data, options.clusters);	
		Spinny.remove();
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

function drawMap(data, clusters) {
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

function markerClick(marker, map) {
	marker.infoWindow.open(map, markers);	
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
