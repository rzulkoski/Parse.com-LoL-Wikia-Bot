
var toolbox = require('cloud/parse_toolbox.js');
var credentials = require('cloud/wikia_credentials.js');

function indexOfMatchInParseArrayForStringOnField(array, string, field) {
	var indexOfMatch = -1;
	for (var i = 0; i < array.length; i++) {
		if (array[i].get(field) == string) indexOfMatch = i;
	}
	return indexOfMatch;
}

Parse.Cloud.define('updateAbilities', function(request, response) {
	var championsQuery = new Parse.Query('Champion');
	var abilitiesQuery = new Parse.Query('Ability');
	championsQuery.limit(200);
	abilitiesQuery.limit(1000);

	Parse.Promise.when([championsQuery.find(), abilitiesQuery.find(), logInToWikia()]).then(function(championsResult, abilitiesResult, wikiaCookie) {
		return fetchAndUpdateAbilitiesFromWikiaForChampions(championsResult, abilitiesResult, wikiaCookie);
	}).then(function(results) {
		return Parse.Promise.as('YOU WIN');  // results[0].get('name'));
	}).then(function(champ) {
		response.success('Success! ' + champ);
	}, function(error) {
		response.error('Error: ' + error.text);
	});
});

function fetchAndUpdateAbilitiesFromWikiaForChampions(champions, abilities, wikiaCookie) {
	//var wikiaURL = 'http://leagueoflegends.wikia.com/api.php?action=query&format=json&prop=revisions&rvprop=content&generator=categorymembers&gcmtitle=Category:Released_champion&gcmlimit=max';
	var wikiaURL = 'http://leagueoflegends.wikia.com/api.php?action=query&format=json&prop=revisions&rvprop=content&titles=Nidalee'; // Temporary since titles has a limit of 50!!!
	console.log('URL for ability fetch: ' + wikiaURL);

	return Parse.Cloud.httpRequest({ url: wikiaURL, headers: { 'Cookie' : wikiaCookie } }).then(function(httpResponse) {
		console.log('About to show response');
		console.log('Response: ' + httpResponse.text.substring(0,1000));
		var json = JSON.parse(httpResponse.text);

		var abilitiesToSave = [];
		var i=0;
		for (var page in json.query.pages) {
			var abilityChampName = JSON.stringify(json.query.pages[page].title).replace(/"/g, '');
			var abilitiesPattern = /== *Abilities *==[\s\\n]+([^\[]+)== *References *==/
			var pPattern = /\{\{[Aa]bility[\w\s\\]*(\|P[^\[]+)\{\{[Aa]bility[\w\s\\]*\|Q/
			var qPattern = /\{\{[Aa]bility[\w\s\\]*(\|Q[^\[]+)\{\{[Aa]bility[\w\s\\]*\|W/
			var wPattern = /\{\{[Aa]bility[\w\s\\]*(\|W[^\[]+)\{\{[Aa]bility[\w\s\\]*\|E/
			var ePattern = /\{\{[Aa]bility[\w\s\\]*(\|E[^\[]+)\{\{[Aa]bility[\w\s\\]*\|R/
			var rPattern = /\{\{[Aa]bility[\w\s\\]*(\|R[^\[]+)/
			
			var abilityDataString = abilitiesPattern.exec(JSON.stringify(json.query.pages[page].revisions))[1];

			var champIndex = toolbox.indexOfMatchInParseArrayForStringOnField(champions, abilityChampName, 'name');

			if (i < 2) {
				abilitiesToSave = abilitiesToSave.concat(parseAbilityDataStringForChampion(pPattern.exec(abilityDataString)[1], champions[champIndex]));
				abilitiesToSave = abilitiesToSave.concat(parseAbilityDataStringForChampion(qPattern.exec(abilityDataString)[1], champions[champIndex]));
				abilitiesToSave = abilitiesToSave.concat(parseAbilityDataStringForChampion(wPattern.exec(abilityDataString)[1], champions[champIndex]));
				abilitiesToSave = abilitiesToSave.concat(parseAbilityDataStringForChampion(ePattern.exec(abilityDataString)[1], champions[champIndex]));
				abilitiesToSave = abilitiesToSave.concat(parseAbilityDataStringForChampion(rPattern.exec(abilityDataString)[1], champions[champIndex]));

				console.log('\n\n' +
							'\nchampIndex: ' + champIndex +
							'\nchampions.name: ' + champions[champIndex].get('name') +
							'\nabilityDataString.name: ' + abilityChampName +
							'\ndataString: ' + abilityDataString + '\n' + 
							'\n\n');

				console.log('Passive: ' + pPattern.exec(abilityDataString)[1]);
				console.log('Q Ability: ' + qPattern.exec(abilityDataString)[1]);
				console.log('W Ability: ' + wPattern.exec(abilityDataString)[1]);
				console.log('E Ability: ' + ePattern.exec(abilityDataString)[1]);
				console.log('R Ability: ' + rPattern.exec(abilityDataString)[1]);
			}

			i++;
		}

		console.log('count = ' + i);

		return Parse.Object.saveAll(abilitiesToSave).then(function() {
			return Parse.Promise.as(champions);
		})
	}, function(error) {
		console.log('Error with HTTPRequest:' + error.text);
		return error;
	});
}

function parseAbilityDataStringForChampion(dataString, champion) {
	var Ability = Parse.Object.extend('Ability');
	var statsToParse = getArrayOfStatsToUpdate();
	var binding = /\|([PQWER])/.exec(dataString)[1];
	var abilities = [];

	if (abilityDataStringHoldsMultipleAbilities(dataString)) {
		var multipleAbilitiesPattern = /[Aa]bility[\s]+info/g
		var startIndexOfAbility1 = multipleAbilitiesPattern.exec(dataString).index;
		var startIndexOfAbility2 = multipleAbilitiesPattern.exec(dataString).index;

		if (champion.get('name') == 'Nidalee') console.log(	'\n\nindex1: ' + startIndexOfAbility1 + ', index2: ' + startIndexOfAbility2 +
															'\ndataString: ' + dataString +
															'\n\n');

		var ability1 = new Ability();
		var ability2 = new Ability();
		

		ability1.set('rawData', dataString);
		ability1.set('binding', binding);
		ability1.set('primary', true);
		ability2.set('rawData', dataString.substring(startIndexOfAbility2, dataString.length-1));
		ability2.set('binding', binding);
		ability2.set('primary', false);

		for (var i=0; i<statsToParse.length; i++) {
			setStatUsingDataStringAndAbility(statsToParse[i], dataString.substring(startIndexOfAbility1, startIndexOfAbility2-1), ability1);
			setStatUsingDataStringAndAbility(statsToParse[i], dataString.substring(startIndexOfAbility2), ability2);
		}

		abilities.push(ability1);
		abilities.push(ability2);
	} else {
		var ability = new Ability();

		ability.set('rawData', dataString);
		ability.set('primary', true);
		ability.set('binding', binding);

		for (var i=0; i<statsToParse.length; i++) {
			setStatUsingDataStringAndAbility(statsToParse[i], dataString, ability);
		}

		abilities.push(ability);
	}

	return abilities;
}

function abilityDataStringHoldsMultipleAbilities(dataString) {
	return /[Aa]bility[\s]+info/.test(dataString);
}

function setStatUsingDataStringAndAbility(stat, dataString, ability) {
	var pattern = /NOT_SET/
	var matchArray;

	switch (stat) {
		case 'binding':
			pattern = /\|([PQWER])/
			break;
		case 'name':
			pattern = /\|name \= ([^\\]+)\\n/
			break;
		case 'imageName':
			pattern = /\|icon \= ([^\\]+)\\n/
			break;
		case 'description':
			pattern = /\|description[\s]+\=[\s\\n]+(?:\{+sbc\|[\w\:]+\}+ )*([^\?]+)(?:\|leveling)*/
	}

	matchArray = pattern.exec(dataString);

	if (matchArray !== null) {
		switch (stat) {
			case 'moveSpeed': // Placeholder
				ability.set(stat, parseInt(matchArray[1]));
				break;
			case 'attackDelay': // Placeholder
				ability.set(stat, parseFloat(matchArray[1]));
				break;
			case 'binding':
			case 'name':
			case 'imageName':
			case 'description':
				ability.set(stat, matchArray[1]);
				break;
			case 'releaseDate': // Placeholder
				ability.set(stat, new Date(matchArray[1]));
				break;
		}
	}
}

function getArrayOfStatsToUpdate() {
	var statsToUpdate = ['name','imageName'];// 'binding','description'];

	return statsToUpdate;
}

// Returns a cookie after successful login
function logInToWikia() {
	console.log('Login: ' + credentials.loginName() + ', Password: ' + credentials.password());
	var wikiaURL = 'http://leagueoflegends.wikia.com/api.php?action=login&lgname=' + credentials.loginName() + '&lgpassword=' + credentials.password() + '&format=json';
	var cookie;
	var sessionID;
	var loginDomain;
	var confirmToken;
	var cookiePrefix;

	return Parse.Cloud.httpRequest({ method: "POST", url: wikiaURL }).then(function(httpResponse) {
		console.log(httpResponse.text);
		json = JSON.parse(httpResponse.text);

		cookiePrefix = json.login.cookieprefix;
		var loginToken = json.login.token;
		var result = json.login.result;

		cookie = httpResponse.headers['Set-Cookie'];
		sessionID = /session=([\w]+);/.exec(cookie)[1];

		var loginDomain = /domain=([\.\w]+);/.exec(cookie)[1];

		confirmToken = cookiePrefix + '_session=' + sessionID;

		for (var header in httpResponse.headers) {
			console.log('Headers: ' + header + ': ' + httpResponse.headers[header]);
		}

		console.log('\n\n' +
					'\n==============================' +
					'\nInitial login response: ' + result +
					'\nCookie prefix: ' + cookiePrefix +
				    '\nCookie Received: ' + cookie +
				    '\nSessionID: ' + sessionID +
				    '\nLogin token: ' + loginToken +
				    '\n==============================\n\n');

		return Parse.Promise.as(loginToken);
	}).then(function(loginToken) {
		return Parse.Cloud.httpRequest({ method: "POST", url: wikiaURL + '&lgtoken=' + loginToken + '&cookieprefix=' + cookiePrefix + '&sessionid=' + sessionID, headers: { 'Cookie' : cookie } }).then(function (loginResponse) {
			var json = JSON.parse(loginResponse.text);
			var finalCookie = loginResponse.headers['Set-Cookie'];
			var result = json.login.result;
			console.log('\n' +
						'\n==============================' +
						'\nFinal login response: ' + result +
				    	'\nCookie sent: ' + cookie +
				    	'\nCookie received: ' + finalCookie +
				    	'\n==============================\n\n\n');

			return Parse.Promise.as(finalCookie);
		});
	}, function(error) {
		return Parse.Error(error);
	});
}










