var credentials = require('cloud/wikia_credentials.js');

// Returns an array of page objects with 'title' and 'text' as the members for each object.
// NOTE: This function was constructed with the help of 'BryghtShadow' (http://leagueoflegends.wikia.com/wiki/User:BryghtShadow)
exports.parsePagesFromExportText = function(exportText) {
	var pagePattern = /<page>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<text xml\:space=\\"preserve\\" bytes=\\"\d+\\">([\s\S]*?)<\/page>/g
	var pages = [];

	var matchArray;
	while ((matchArray = pagePattern.exec(exportText)) !== null) {
		var page = new Object();
		page.title = matchArray[1];
		page.text = matchArray[2];
		pages.push(page);
	}

	return pages;
}


// Returns a cookie after successful login
exports.login = function() {
	console.log('Login: ' + credentials.loginName() + ', Password: ' + credentials.password());
	var wikiaURL = 'http://leagueoflegends.wikia.com/api.php?action=login&lgname=' + credentials.loginName() + '&lgpassword=' + credentials.password() + '&format=json';
	var cookie;
	var sessionID;
	var loginDomain;
	var confirmToken;
	var cookiePrefix;

	return Parse.Cloud.httpRequest({ method: "POST", url: wikiaURL }).then(function(httpResponse) {
		//console.log(httpResponse.text);
		json = JSON.parse(httpResponse.text);

		cookiePrefix = json.login.cookieprefix;
		var loginToken = json.login.token;
		var result = json.login.result;

		cookie = httpResponse.headers['Set-Cookie'];
		sessionID = /session=([\w]+);/.exec(cookie)[1];

		var loginDomain = /domain=([\.\w]+);/.exec(cookie)[1];

		confirmToken = cookiePrefix + '_session=' + sessionID;

		for (var header in httpResponse.headers) {
			//console.log('Headers: ' + header + ': ' + httpResponse.headers[header]);
		}

		/*console.log('\n\n' +
					'\n==============================' +
					'\nInitial login response: ' + result +
					'\nCookie prefix: ' + cookiePrefix +
				    '\nCookie Received: ' + cookie +
				    '\nSessionID: ' + sessionID +
				    '\nLogin token: ' + loginToken +
				    '\n==============================\n\n');*/

		return Parse.Promise.as(loginToken);
	}).then(function(loginToken) {
		return Parse.Cloud.httpRequest({ method: "POST", url: wikiaURL + '&lgtoken=' + loginToken + '&cookieprefix=' + cookiePrefix + '&sessionid=' + sessionID, headers: { 'Cookie' : cookie } }).then(function (loginResponse) {
			var json = JSON.parse(loginResponse.text);
			var finalCookie = loginResponse.headers['Set-Cookie'];
			var result = json.login.result;
			/*console.log('\n' +
						'\n==============================' +
						'\nFinal login response: ' + result +
				    	'\nCookie sent: ' + cookie +
				    	'\nCookie received: ' + finalCookie +
				    	'\n==============================\n\n\n');*/

			return Parse.Promise.as(finalCookie);
		});
	}, function(error) {
		return Parse.Error(error);
	});
}