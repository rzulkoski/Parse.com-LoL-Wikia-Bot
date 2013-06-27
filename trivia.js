var toolbox = require('cloud/parse_toolbox.js');

Array.prototype.shuffle = function() {
	var sourceArray = this.slice(0);
	for (var i=0; i<this.length; i++) {
		var randomIndex = Math.floor(Math.random() * (sourceArray.length));
		this[i] = (sourceArray[randomIndex]);
		sourceArray.splice(randomIndex, 1);
	}
}

Parse.Cloud.define('getTriviaQuestion', function (request, response) {
	var championsQuery = new Parse.Query('Champion');
	var abilitiesQuery = new Parse.Query('Ability');
	championsQuery.limit(200);
	abilitiesQuery.limit(1000);

	console.log('About to fetch abilities/champions');

	Parse.Promise.when([abilitiesQuery.find(), championsQuery.find()]).then(function(abilities, champions) {
		console.log('Fetch complete!');
		var choices = [];
		var questionIndex = Math.floor(Math.random() * (abilities.length+1));
		var questionChampID = abilities[questionIndex].get('champion').id;
		console.log('Question ChampID: ' + questionChampID);
		var answerIndex = toolbox.indexOfMatchInParseArrayOnID(champions, questionChampID);
		choices.push(answerIndex);
		console.log('Answer Index: ' + answerIndex);
		console.log('Answer: ' + champions[answerIndex].get('name'));
		choices = choices.concat(getAlternateChoiceIndexesForArray(champions, answerIndex));
		console.log('choices contents: [' + choices[0] + ',' + choices[1] + ',' + choices[2] + ',' + choices[3] + ']');
		console.log('Wrong1: ' + champions[choices[1]].get('name'));
		console.log('Wrong2: ' + champions[choices[2]].get('name'));
		console.log('Wrong3: ' + champions[choices[3]].get('name'));
		console.log('Shuffling choices...');
		choices.shuffle();
		console.log('choices contents: [' + choices[0] + ',' + choices[1] + ',' + choices[2] + ',' + choices[3] + ']');
		response.success('Which champion does the ability ' + abilities[questionIndex].get('name') + ' belong to? ' +
						 'A) ' + champions[choices[0]].get('name') + ', ' +
						 'B) ' + champions[choices[1]].get('name') + ', ' +
						 'C) ' + champions[choices[2]].get('name') + ', ' +
						 'D) ' + champions[choices[3]].get('name'));
		//response.success('Success!');
	});
});

function getAlternateChoiceIndexesForArray(array, indexToAvoid) {
	var alternateChoiceIndexes = [];
	while (alternateChoiceIndexes.length < 3) {
		var alternateChoiceIndex = Math.floor(Math.random() * (array.length+1));
		if (alternateChoiceIndex != indexToAvoid && alternateChoiceIndexes.indexOf(alternateChoiceIndex) == -1) {
			alternateChoiceIndexes.push(alternateChoiceIndex);
		}
	}
	return alternateChoiceIndexes;
}
