
/*function indexOfMatchInParseArrayForObjectOnField(array, object, field) {
	var indexOfMatch = -1;
	for (var i = 0; i < array.length; i++) {
		if (array[i].get(field) == object.get(field)) indexOfMatch = i;
	}
	return indexOfMatch;
}*/
var toolbox = require('cloud/parse_toolbox.js');

function updateChampionWithChampion(champToUpdate, sourceChamp) {
	var statsToUpdate = getArrayOfStatsToUpdate();

	champToUpdate.set('crType', sourceChamp.get('crType'));
	for (var i=0; i<statsToUpdate.length; i++) {
		champToUpdate.set(statsToUpdate[i], sourceChamp.get(statsToUpdate[i]));
	}
}

Parse.Cloud.define('updateChampions', function(request, response) {
	var query = new Parse.Query('Champion');
	query.limit(200);
	
	Parse.Promise.when([fetchChampionListFromWikia(), query.find()]).then(function(wikiaResults, parseResults) {
		for (var i=0; i<wikiaResults.length; i++) {
			var indexOfMatch = toolbox.indexOfMatchInParseArrayForObjectOnField(parseResults, wikiaResults[i], 'name');
			if (indexOfMatch >= 0) {
				updateChampionWithChampion(parseResults[indexOfMatch], wikiaResults[i]);
			} else {
				parseResults.push(wikiaResults[i]);
			}
		}
		
		Parse.Object.saveAll(parseResults).then(function() {
			response.success('Champs updated!');
		});
	}, function (error) {
		response.error('Error: ' + error.message);
	});
});

function fetchChampionListFromWikia() {
	var wikiaURL = 'http://leagueoflegends.wikia.com/api.php?action=query&titles=List_of_champions&prop=revisions&rvprop=content&format=json';
	
	return Parse.Cloud.httpRequest({ url: wikiaURL }).then(function(httpResponse) {
		var Champion = Parse.Object.extend('Champion');
		var namePattern = /\{\{ci\|([\w\s\.']+)\}\}\\n\|bgcolor=\\"#\d+\\"\|([\w\s]+)/g;
		var matchArray;
			
		var champions = [];
		while((matchArray = namePattern.exec(httpResponse.text)) !== null) {
			var champion = new Champion();
			champion.set('name', matchArray[1]);
			champion.set('crType', matchArray[2]);
			champions.push(champion);
			
			if (matchArray[1] == 'Zyra') break;
		}
		
		return fetchChampionDataFromWikiaForChampions(champions).then(function(championsWithData) {
			return Parse.Promise.as(championsWithData);
		});
	});
}

function fetchChampionDataFromWikiaForChampions(champions) {
	var wikiaBaseURL = 'http://leagueoflegends.wikia.com/api.php?action=parse&format=json&text=';
	var textToParse = assembleTextToParseForChampions(champions); 
	var champDataPattern = /(disp_name=[\w\s\\\|=\-\.,'"\(\)\+%]+)}}/g
	
	return Parse.Cloud.httpRequest({ url: wikiaBaseURL + textToParse }).then(function(httpResponse) {
		var matchArray;
		
		console.log('champDataResponse:' + httpResponse.text);
		
		var i = 0;
		while((matchArray = champDataPattern.exec(httpResponse.text)) !== null) {
			champions[i].set('rawData', matchArray[1]);
			parseChampionDatastringForChampion(matchArray[1], champions[i]);
			i++;
		}

		return Parse.Promise.as(champions);
	});
}

function assembleTextToParseForChampions(champions) {
	var textToParse = '';
	
	for (var i=0; i<champions.length; i++) {
		var champ = escape(champions[i].get('name'))
		textToParse += '{{Data_' + champ + '}}';
	}
	
	console.log('champDataRequest: ' + textToParse);
	
	return textToParse;
}

function parseChampionDatastringForChampion(dataString, champion) {
	var namePattern = /disp_name=([\w\s\.']+)/
	var statsToParse = getArrayOfStatsToUpdate();

	if (champion.get('name') == namePattern.exec(dataString)[1]) {
		for (var i=0; i<statsToParse.length; i++) {
			setStatUsingDataStringAndChampion(statsToParse[i], dataString, champion);
		}
	}
}

function setStatUsingDataStringAndChampion(stat, dataString, champion) {
	var pattern = /NOT_SET/
	var matchArray;

	switch (stat) {
		case 'moveSpeed':
			pattern = /\|ms=([\d]+)/
			break;
		case 'range':
			pattern = /\|range=([\d]+)/
			break;
		case 'attackDelay':
			pattern = /\|attack_delay=([\-\d\.]+)/
			break;
		case 'baseAttackSpeed':
			pattern = /\|as_base=([\d\.]+)/
			break;
		case 'baseAttackDamage':
			pattern = /\|dam_base=([\d]+)/
			break;
		case 'baseArmor':
			pattern = /\|arm_base=([\d]+)/
			break;
		case 'baseMagicResist':
			pattern = /\|mr_base=([\d]+)/
			break;
		case 'baseHealth':
			pattern = /\|hp_base=([\d]+)/
			break;
		case 'baseManaPool':
			pattern = /\|mp_base=([\d]+)/
			break;
		case 'baseHP5':
			pattern = /\|hp5_base=([\d\.]+)/
			break;
		case 'baseMP5':
			pattern = /\|mp5_base=([\d\.]+)/
			break;
		case 'perLvlAttackSpeedPct':
			pattern = /\|as_lvl=([\d\.]+)/
			break;
		case 'perLvlAttackDamage':
			pattern = /\|dam_lvl=([\d\.]+)/
			break;
		case 'perLvlArmor':
			pattern = /\|arm_lvl=([\d\.]+)/
			break;
		case 'perLvlMagicResist':
			pattern = /\|mr_lvl=([\d\.]+)/
			break;
		case 'perLvlHealth':
			pattern = /\|hp_lvl=([\d\.]+)/
			break;
		case 'perLvlManaPool':
			pattern = /\|mp_lvl=([\d]+)/
			break;
		case 'perLvlHP5':
			pattern = /\|hp5_lvl=([\d\.]+)/
			break;
		case 'perLvlMP5':
			pattern = /\|mp5_lvl=([\d\.]+)/
			break;
		case 'imageName':
			pattern = /\|image=([\w\.]+)/
			break;
		case 'title':
			pattern = /\|title=([\w\s'"\-\.]+)/
			break;
		case 'releaseDate':
			pattern = /\|date=([\w\s\d]+)/
			break;
		case 'costIP':
			pattern = /\|ip=([\d]+)/
			break;
		case 'costRP':
			pattern = /\|rp=([\d]+)/
			break;
		case 'ratingHealth':
			pattern = /\|health=([\d]+)/
			break;
		case 'ratingAttack':
			pattern = /\|attack=([\d]+)/
			break;
		case 'ratingSpells':
			pattern = /\|spells=([\d]+)/
			break;
		case 'ratingDifficulty':
			pattern = /\|difficulty=([\d]+)/
			break;
		case 'heroType':
			pattern = /\|herotype=([\w,]+)/
			break;
		}

	matchArray = pattern.exec(dataString);

	if (matchArray !== null) {
		switch (stat) {
			case 'moveSpeed':
			case 'range':
			case 'baseAttackDamage':
			case 'baseArmor':
			case 'baseMagicResist':
			case 'baseHealth':
			case 'baseManaPool':
			case 'perLvlManaPool':
			case 'costIP':
			case 'costRP':
			case 'ratingHealth':
			case 'ratingAttack':
			case 'ratingSpells':
			case 'ratingDifficulty':
				champion.set(stat, parseInt(matchArray[1]));
				break;
			case 'attackDelay':
			case 'baseAttackSpeed':
			case 'baseHP5':
			case 'baseMP5':
			case 'perLvlAttackSpeedPct':
			case 'perLvlAttackDamage':
			case 'perLvlArmor':
			case 'perLvlMagicResist':
			case 'perLvlHealth':
			case 'perLvlHP5':
			case 'perLvlMP5':
				champion.set(stat, parseFloat(matchArray[1]));
				break;
			case 'imageName':
			case 'title':
			case 'heroType':
				champion.set(stat, matchArray[1]);
				break;
			case 'releaseDate':
				champion.set(stat, new Date(matchArray[1]));
				break;
		}
	} else {
		if (stat == 'imageName') {
			var constructedImageName = champion.get('name').replace(/[\.\s']+/g, '') + 'Square.png';
			champion.set(stat, constructedImageName);
		}
	}
}

function getArrayOfStatsToUpdate() {
	var statsToUpdate = ['moveSpeed','range','attackDelay','baseAttackSpeed','baseAttackDamage',
						 'baseArmor','baseMagicResist','baseHealth','baseManaPool','baseHP5','baseMP5',
						 'perLvlAttackSpeedPct','perLvlAttackDamage','perLvlArmor','perLvlMagicResist',
						 'perLvlHealth','perLvlManaPool','perLvlHP5','perLvlMP5',
						 'imageName','title','releaseDate','costIP','costRP','heroType',
						 'ratingHealth','ratingAttack','ratingSpells','ratingDifficulty'];

	return statsToUpdate;
}