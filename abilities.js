
// Includes
var toolbox = require('cloud/parse_toolbox.js');
var wikia   = require('cloud/wikia.js');



// Main entry point for Cloud Code function
Parse.Cloud.define('updateAbilities', function(request, response) {
	// Prepare Parse.com queries for existing Champions and Abilities
	var championsQuery = new Parse.Query('Champion');
	var abilitiesQuery = new Parse.Query('Ability');
	championsQuery.limit(200);
	abilitiesQuery.limit(1000);

	// Fetch existing Champions and Abilities using the queries we just set up.
	Parse.Promise.when([championsQuery.find(), abilitiesQuery.find()]).then(function(championsResult, abilitiesResult) {
		// Use the existing Champions and Abilities we just fetched to compare to the Abilities
		// we are about to fetch from Wikia, compare them, and update/save accordingly.
		return fetchAndUpdateAbilitiesFromWikiaForChampionsAndAbilities(championsResult, abilitiesResult);
	}).then(function(numberOfAbilitiesSaved) {
		// Return a successful reponse describing the number of objects that were created/updated and saved.
		response.success('Success! ' + numberOfAbilitiesSaved + ' Abilit' + (numberOfAbilitiesSaved == 1 ? 'y' : 'ies') + ' created/updated.');
	}, function(error) {
		response.error('Error: ' + error);
	});
});



// DESCRIPTION
function fetchAndUpdateAbilitiesFromWikiaForChampionsAndAbilities(champions, abilities) {
	var wikiaURL = 'http://leagueoflegends.wikia.com/api.php?action=query&format=json&generator=categorymembers&gcmtitle=Category:Released_champion&gcmlimit=max&export';
	console.log('URL for ability fetch: ' + wikiaURL);

	return Parse.Cloud.httpRequest({ url: wikiaURL }).then(function(httpResponse) {
		var json = JSON.parse(httpResponse.text);
		var pages = wikia.parsePagesFromExportText(JSON.stringify(json.query.export['*']));
		var abilitiesToSave = [];

		for (var i=0; i<pages.length; i++) {
			var abilitiesDataString = /== *Abilities *==([\s\S]*?)== *References *==/.exec(pages[i].text)[1];
			var champNameFromPage = pages[i].title;
			var champIndex = toolbox.indexOfMatchInParseArrayForStringOnField(champions, champNameFromPage, 'name');
			var existingAbilitiesForChampion = toolbox.matchingElementsInArrayForObjectRefOnField(abilities, champions[champIndex], 'champion');

			if (i<114) {
				abilitiesToSave = abilitiesToSave.concat(parseAbilitiesDataStringForChampionWithExistingAbilities(abilitiesDataString, champions[champIndex], existingAbilitiesForChampion));
			}
		}

		console.log('aboutToSave');
		return Parse.Object.saveAll(abilitiesToSave).then(function() { // Save all new/updated abilities.
			console.log('doneSaving');
			return Parse.Promise.as(abilitiesToSave.length);
		})

	}, function(error) {
		console.log('Error with HTTPRequest:' + error.text);
		return error;
	});
}



function parseAbilitiesDataStringForChampionWithExistingAbilities(abilitiesDataString, champion, existingAbilities) {
	var Ability = Parse.Object.extend('Ability');
	var namePattern = /\|name *= *([^\\]+)\\n/
	var bindingPattern = /\|([PQWER])/
	var statsToParse = getArrayOfStatsToUpdate();
	var abilitiesToSave = [];

	//console.log(abilitiesDataString);
	var individualAbilityDataStrings = separateAbilitiesDataStringIntoIndividualAbilityDataStrings(abilitiesDataString);

	for (var i=0; i<individualAbilityDataStrings.length; i++) {
		var ability;
		var abilityShouldBeSaved = false;
		var primaryAbilityName = namePattern.exec(individualAbilityDataStrings[i])[1];

		var indexOfMatch = toolbox.indexOfMatchInParseArrayForStringOnField(existingAbilities, primaryAbilityName, 'name');
		if (indexOfMatch == -1) {
			ability = new Ability();
			abilityShouldBeSaved = true;
		} else ability = existingAbilities[indexOfMatch];

		ability.set('champion', champion);
		ability.set('binding', bindingPattern.exec(individualAbilityDataStrings[i])[1]);
		ability.set('rawData', individualAbilityDataStrings[i]);

		var hasChanged = false;
		for (var statIndex=0; statIndex<statsToParse.length; statIndex++) {
			hasChanged = setStatUsingDataStringAndAbility(statsToParse[statIndex], individualAbilityDataStrings[i], ability);
			if (abilityShouldBeSaved == false && hasChanged == true) abilityShouldBeSaved = true;
		}

		if (abilityShouldBeSaved) abilitiesToSave.push(ability);
	}

	return abilitiesToSave; // Only need to return new abilities and abilities that have changed
}

function separateAbilitiesDataStringIntoIndividualAbilityDataStrings(dataString) {
	var pPattern = /\{\{[Aa]bility[^\|]*(\|P[\s\S]*?)\{\{[Aa]bility[^\|]*\|Q/
	var qPattern = /\{\{[Aa]bility[^\|]*(\|Q[\s\S]*?)\{\{[Aa]bility[^\|]*\|W/
	var wPattern = /\{\{[Aa]bility[^\|]*(\|W[\s\S]*?)\{\{[Aa]bility[^\|]*\|E/
	var ePattern = /\{\{[Aa]bility[^\|]*(\|E[\s\S]*?)\{\{[Aa]bility[^\|]*\|R/
	var rPattern = /\{\{[Aa]bility[^\|]*(\|R[\s\S]*)/

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
	var newValue;
	var matchArray;
	var pattern;
	var hasChanged = false;

	switch (stat) {
		case 'name':
			pattern = /\|name *\= *([^\\]*?)\\n/g
			break;
		case 'imageName':
			pattern = /\|icon *\= *([^\\]*?)\\n/g
			break;
		case 'description':
			pattern = /\|description[\d ]*= *([\s\S]*?)(?=\}\}\\n|\|description|\|leveling|\|cooldown)/g
			break;
	}

	var matches = 0;
	while((matchArray = pattern.exec(dataString)) !== null) {
		matches++;
		if (ability.get('champion').id == 'WWzCjMvxze' && stat == 'description') console.log('LastIndex: ' + pattern.lastIndex + ', Desc: ' + matchArray[1]);
		var oldValue = ability.get((matches == 1 ? stat : stat + matches));

		switch (stat) {
			case 'moveSpeed': // Placeholder
				newValue = parseInt(matchArray[1]);
				break;
			case 'attackDelay': // Placeholder
				newValue = parseFloat(matchArray[1]);
				break;
			case 'name':
			case 'imageName':
			case 'description':
				newValue = matchArray[1];
				break;
			case 'releaseDate': // Placeholder
				newValue = new Date(matchArray[1]);
				break;
		}

		if (oldValue != newValue) {
			hasChanged = true;
			ability.set((matches == 1 ? stat : stat + matches), newValue);
		}
	}
		
	return hasChanged;
}

function getArrayOfStatsToUpdate() {
	var statsToUpdate = ['name','imageName','description'];

	return statsToUpdate;
}










