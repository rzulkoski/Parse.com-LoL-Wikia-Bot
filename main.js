// Main entry point for cloud code

require('cloud/champions.js');
require('cloud/abilities.js');

Parse.Cloud.define("updateAll", function(request, response) {
	response.success('YAY!');
});