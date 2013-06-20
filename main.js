// Main entry point for cloud code

require('cloud/champions.js');
require('cloud/abilities.js');

Parse.Cloud.define('updateAll', function(request, response) {
	Parse.Cloud.run('updateChampions').then(function() {
		return Parse.Cloud.run('updateAbilities');
	}).then(function() {
		response.success('updateAll Completed!');
	}, function(error) {
		response.error('updateAll FAILED.');
	});
});