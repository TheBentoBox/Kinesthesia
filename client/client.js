"use strict";

$(document).ready(function() {
	
	function sendAjax(action, data) {
		$.ajax({
			cache: false,
			type: "POST",
			url: action,
			data: data,
			dataType: "json",
			success: function(result, status, xhr) {
				window.location = result.redirect;
			},
			error: function(xhr, status, error) {
				var messageObj = JSON.parse(xhr.responseText);
			
				handleError(messageObj.error);
			}
		});        
	}

    function handleError(message) {
        $("#errorMessage").text(message);
        $("#errorMessage").fadeIn();
    }
    
    $("#signupSubmit").on("click", function(e) {
        e.preventDefault();
    
        if($("#user").val() == '' || $("#pass").val() == '' || $("#pass2").val() == '') {
            handleError("All fields are required");
            return false;
        }
        
        if($("#pass").val() !== $("#pass2").val()) {
            handleError("Passwords do not match");
            return false;           
        }

        sendAjax($("#signupForm").attr("action"), $("#signupForm").serialize());
        $("#errorMessage").fadeOut();
        
        return false;
    });

    $("#loginSubmit").on("click", function(e) {
        e.preventDefault();
    
        if($("#user").val() == '' || $("#pass").val() == '') {
            handleError("Username or password is empty");
            return false;
        }
    
        sendAjax($("#loginForm").attr("action"), $("#loginForm").serialize());
        $("#errorMessage").fadeOut();

        return false;
    });
});