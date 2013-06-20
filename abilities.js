
var toolbox = require('cloud/parse_toolbox.js');
var wikia   = require('cloud/wikia.js');

Parse.Cloud.define('updateAbilities', function(request, response) {
	var championsQuery = new Parse.Query('Champion');
	var abilitiesQuery = new Parse.Query('Ability');
	championsQuery.limit(200);
	abilitiesQuery.limit(1000);

	Parse.Promise.when([championsQuery.find(), abilitiesQuery.find(), wikia.login()]).then(function(championsResult, abilitiesResult, wikiaCookie) {
		return fetchAndUpdateAbilitiesFromWikiaForChampions(championsResult, abilitiesResult, wikiaCookie);
	}).then(function(results) {
		return Parse.Promise.as('Abilities updated');  // results[0].get('name'));
	}).then(function(champ) {
		response.success('Success! ' + champ);
	}, function(error) {
		response.error('Error: ' + error.text);
	});
});

function fetchAndUpdateAbilitiesFromWikiaForChampions(champions, abilities, wikiaCookie) {
	//var wikiaURL = 'http://leagueoflegends.wikia.com/api.php?action=query&format=json&prop=revisions&rvprop=content&generator=categorymembers&gcmtitle=Category:Released_champion&gcmlimit=max&export';
	var wikiaURL = 'http://leagueoflegends.wikia.com/api.php?action=query&format=json&prop=revisions&rvprop=content&titles=Nidalee|Quinn'; // Temporary since titles has a limit of 50!!!
	console.log('URL for ability fetch: ' + wikiaURL);

	return Parse.Cloud.httpRequest({ url: wikiaURL, headers: { 'Cookie' : wikiaCookie } }).then(function(httpResponse) {
		console.log('About to show response');
		console.log('Response: ' + httpResponse.text.substring(0, 1000));
		var json = JSON.parse(httpResponse.text);

		var i=0;
		for (var page in json.query.pages) {
			var abilityChampName = JSON.stringify(json.query.pages[page].title).replace(/"/g, '');
			var abilitiesPattern = /== *Abilities *==[\s\\n]+([^\[]+)== *References *==/
			
			var abilityDataString = abilitiesPattern.exec(JSON.stringify(json.query.pages[page].revisions))[1];

			var champIndex = toolbox.indexOfMatchInParseArrayForStringOnField(champions, abilityChampName, 'name');

			if (i < 2) {

				console.log('Champ ObjectID: ' + champions[champIndex].id);
				console.log('Ability Champion RefID: ' + abilities[0].get('champion').id);
				if (abilities[0].get('champion').id == champions[champIndex].id) console.log('MATCHES!!!!');

				var abilitiesForChampion = toolbox.matchingElementsInArrayForObjectRefOnField(abilities, champions[champIndex], 'champion');

				abilities = abilities.concat(parseAbilityDataStringForChampionWithAbilities(abilityDataString, champions[champIndex], abilitiesForChampion));
			}

			i++;
		}

		console.log('count = ' + i);


		// TEMP TEMP TEMP TEMP
		//return ability.save();



		return Parse.Object.saveAll(abilities).then(function() { // Save all abilities/champs
			return Parse.Promise.as(champions);
		})
	}, function(error) {
		console.log('Error with HTTPRequest:' + error.text);
		return error;
	});
}

function parseAbilityDataStringForChampionWithAbilities(dataString, champion, existingAbilities) {
	var Ability = Parse.Object.extend('Ability');
	var namePattern = /\|name \= ([^\\]+)\\n/
	var statsToParse = getArrayOfStatsToUpdate();
	var newAbilities = [];

	var individualAbilityDataStrings = separateAbilityDataStringIntoIndividualAbilityDataStrings(dataString);

	for (var i=0; i<individualAbilityDataStrings.length; i++) {
		var binding = /\|([PQWER])/.exec(individualAbilityDataStrings[i])[1];

		if (abilityDataStringHoldsMultipleAbilities(individualAbilityDataStrings[i])) {
			console.log(binding + ': Multiple');
			var multipleAbilitiesPattern = /[Aa]bility[\s]+info/g
			var startIndexOfAbility1 = multipleAbilitiesPattern.exec(individualAbilityDataStrings[i]).index;
			var startIndexOfAbility2 = multipleAbilitiesPattern.exec(individualAbilityDataStrings[i]).index;

			var ability1DataString = individualAbilityDataStrings[i].substring(startIndexOfAbility1, startIndexOfAbility2-1);
			var ability2DataString = individualAbilityDataStrings[i].substring(startIndexOfAbility2, individualAbilityDataStrings[i].length-1);

			// Check if ability to be parsed is already known, if so prepare to update known ability else create new ability object and push onto newAbilities array.
			var indexOfMatch = toolbox.indexOfMatchInParseArrayForStringOnField(existingAbilities, namePattern.exec(ability1DataString)[1], 'name');
			if (indexOfMatch == -1) {
				ability1 = new Ability();
				newAbilities.push(ability1);
			} else ability1 = existingAbilities[indexOfMatch];
			indexOfMatch = toolbox.indexOfMatchInParseArrayForStringOnField(existingAbilities, namePattern.exec(ability2DataString)[1], 'name');
			if (indexOfMatch == -1) {
				ability2 = new Ability();
				newAbilities.push(ability2);
			} else ability2 = existingAbilities[indexOfMatch];
			

			ability1.set('champion', champion);
			ability1.set('rawData', ability1DataString);
			ability1.set('binding', binding);
			ability1.set('primary', true);
			ability2.set('champion', champion);
			ability2.set('rawData', ability2DataString);
			ability2.set('binding', binding);
			ability2.set('primary', false);

			for (var statIndex=0; statIndex<statsToParse.length; statIndex++) {
				setStatUsingDataStringAndAbility(statsToParse[statIndex], ability1DataString, ability1);
				setStatUsingDataStringAndAbility(statsToParse[statIndex], ability2DataString, ability2);
			}
		} else {
			console.log(binding + ': Single');
			var indexOfMatch = toolbox.indexOfMatchInParseArrayForStringOnField(existingAbilities, namePattern.exec(individualAbilityDataStrings[i])[1], 'name');
			if (indexOfMatch == -1) {
				ability = new Ability();
				newAbilities.push(ability);
			} else ability = existingAbilities[indexOfMatch];

			ability.set('champion', champion);
			ability.set('rawData', individualAbilityDataStrings[i]);
			ability.set('primary', true);
			ability.set('binding', binding);

			for (var statIndex=0; statIndex<statsToParse.length; statIndex++) {
				setStatUsingDataStringAndAbility(statsToParse[statIndex], individualAbilityDataStrings[i], ability);
			}
		}
	}

	return newAbilities; // Only need to return NEW ability objects
}

function separateAbilityDataStringIntoIndividualAbilityDataStrings(dataString) {
	var pPattern = /\{\{[Aa]bility[\w\s\\]*(\|P[^\[]+)\{\{[Aa]bility[\w\s\\]*\|Q/
	var qPattern = /\{\{[Aa]bility[\w\s\\]*(\|Q[^\[]+)\{\{[Aa]bility[\w\s\\]*\|W/
	var wPattern = /\{\{[Aa]bility[\w\s\\]*(\|W[^\[]+)\{\{[Aa]bility[\w\s\\]*\|E/
	var ePattern = /\{\{[Aa]bility[\w\s\\]*(\|E[^\[]+)\{\{[Aa]bility[\w\s\\]*\|R/
	var rPattern = /\{\{[Aa]bility[\w\s\\]*(\|R[^\[]+)/

	var individualAbilityDataStrings = [];

	individualAbilityDataStrings.push(pPattern.exec(dataString)[1]);
	individualAbilityDataStrings.push(qPattern.exec(dataString)[1]);
	individualAbilityDataStrings.push(wPattern.exec(dataString)[1]);
	individualAbilityDataStrings.push(ePattern.exec(dataString)[1]);
	individualAbilityDataStrings.push(rPattern.exec(dataString)[1]);
	
	return individualAbilityDataStrings;
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










