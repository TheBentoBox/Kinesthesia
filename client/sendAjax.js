"use strict";

function sendAjax(action, data) {
	$.ajax({
		cache: false,
		type: "POST",
		url: action,
		data: data,
		dataType: "json",
		success: function(result, status, xhr) {
			console.log("Server updated stats successfully");
			if (result.redirect != undefined) window.location = result.redirect;
		},
		error: function(xhr, status, error) {
			console.log(error);
		}
	});        
}