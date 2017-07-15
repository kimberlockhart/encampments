Dates =  {
	
	// Returns MM/DD/YYYY
	toHumanString: function(date) {
		return Dates.doubleDigit(date.getMonth() + 1) + "/" + Dates.doubleDigit(date.getDate()) + "/" + date.getFullYear();
	},
	
	// Returns YYYY-MM-DDT00:00:00
	toApiString: function(date) {
		return date.getFullYear() + "-" + Dates.doubleDigit(date.getMonth() + 1) + "-" + Dates.doubleDigit(date.getDate()) + "T00:00:00";
	},
	
	// Private
	doubleDigit: function(number) {
		if (number > 9) return number;
		return "0" + number;
	}
}

Spinny = {
	add: function() {
		$("#spinny").show();
	},

	remove: function() {
		$("#spinny").fadeOut();
	}
	
}