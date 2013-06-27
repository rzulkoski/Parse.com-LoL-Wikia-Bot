
// Includes
var toolbox = require('cloud/parse_toolbox.js');
var wikia   = require('cloud/wikia.js');

// Main entry point for Cloud Code function
Parse.Cloud.define('updateItems', function(request, response) {
	// Prepare Parse.com queries for existing Items
	var itemsQuery = new Parse.Query('Item');
	itemsQuery.limit(1000);

	// Fetch existing Items using the query we just set up.
	itemsQuery.find().then(function(itemsResult) {
		// Use the existing Items we just fetched to compare to the Items
		// we are about to fetch from Wikia, compare them, and update/save accordingly.
		return fetchAndUpdateItemsFromWikiaForItems(itemsResult);
	}).then(function(numberOfItemsSaved) {
		// Return a successful reponse describing the number of objects that were created/updated and saved.
		response.success('Success! ' + numberOfItemsSaved + ' Item' + (numberOfItemsSaved == 1 ? '' : 's') + ' created/updated.');
	}, function(error) {
		response.error('Error: ' + error);
	});
});



// DESCRIPTION
function fetchAndUpdateItemsFromWikiaForItems(items) {
	var wikiaURL = 'http://leagueoflegends.wikia.com/api.php?action=query&format=json&generator=categorymembers&gcmtitle=Category:Advanced%20items&gcmlimit=max&export';
	console.log('URL for ability fetch: ' + wikiaURL);
	var Item = Parse.Object.extend('Item');

	return Parse.Cloud.httpRequest({ url: wikiaURL }).then(function(httpResponse) {
		var json = JSON.parse(httpResponse.text);
		var pages = wikia.parsePagesFromExportText(JSON.stringify(json.query.export['*']));
		var itemsToSave = [];

		for (var i=0; i<pages.length; i++) {
			var itemDataString = pages[i].text;  ///([\s\S]*?)== *Strategy *==/.exec(pages[i].text)[1];
			var itemNameFromPage = pages[i].title;
			var itemIndex = toolbox.indexOfMatchInParseArrayForStringOnField(items, itemNameFromPage, 'name');
			
			var item;
			if (itemIndex == -1) {
				item = new Item();
				item.set('name', itemNameFromPage);
			}
			else item = items[itemIndex];

			itemsToSave = itemsToSave.concat(parseItemDataStringForItem(itemDataString, item));
		}

		console.log('aboutToSave');
		return Parse.Object.saveAll(itemsToSave).then(function() { // Save all new/updated items.
			console.log('doneSaving');
			return Parse.Promise.as(itemsToSave.length);
		})

	}, function(error) {
		console.log('Error with HTTPRequest:' + error.text);
		return error;
	});
}

function parseItemDataStringForItem(itemDataString, item) {
	var statsToParse = getArrayOfStatsToUpdate();
	var itemsToSave = [];

	var itemShouldBeSaved = false;
	item.set('rawData', itemDataString);

	var hasChanged = false;
	for (var statIndex=0; statIndex<statsToParse.length; statIndex++) {
		hasChanged = setStatUsingDataStringAndItem(statsToParse[statIndex], itemDataString, item);
		if (itemShouldBeSaved == false && hasChanged == true) itemShouldBeSaved = true;
	}

	itemShouldBeSaved = true; // TEMP

	if (itemShouldBeSaved) itemsToSave.push(item);

	return itemsToSave; // Only need to return new items and items that have changed
}

function setStatUsingDataStringAndItem(stat, dataString, item) {
	var newValue;
	var matchArray;
	var pattern;
	var hasChanged = false;

	switch (stat) {
		case 'imageName':
			pattern = /\|icon *\= *([^\\]*?)\\n/g
			break;
		case 'description':
			pattern = /\|description[\d ]*= *([\s\S]*?)(?=\}\}\\n|\|description|\|leveling|\|cooldown)/g
			break;
		case 'leveling':
			pattern = /\|leveling *= *([\s\S]*?)\\n\|/g
	}

	var matches = 0;
	while((matchArray = pattern.exec(dataString)) !== null) {
		matches++;
		//if (ability.get('champion').id == 'WWzCjMvxze' && stat == 'description') console.log('LastIndex: ' + pattern.lastIndex + ', Desc: ' + matchArray[1]);
		var oldValue = item.get((matches == 1 ? stat : stat + matches));

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
			case 'leveling':
				newValue = matchArray[1];
				break;
			case 'releaseDate': // Placeholder
				newValue = new Date(matchArray[1]);
				break;
		}

		if (oldValue != newValue) {
			hasChanged = true;
			item.set((matches == 1 ? stat : stat + matches), newValue);
		}
	}
		
	return hasChanged;
}

function getArrayOfStatsToUpdate() {
	var statsToUpdate = []; //['name','imageName']; //,'description','leveling'];

	return statsToUpdate;
}










