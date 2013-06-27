// Main entry point for cloud code

require('cloud/champions.js');
require('cloud/abilities.js');
require('cloud/items.js');
require('cloud/trivia.js');
var toolbox = require('cloud/parse_toolbox.js');

Parse.Cloud.define('updateAll', function(request, response) {
	Parse.Cloud.run('updateChampions').then(function() {
		return Parse.Cloud.run('updateAbilities');
	}).then(function() {
		response.success('updateAll Completed!');
	}, function(error) {
		response.error('updateAll FAILED.');
	});
});

Parse.Cloud.define('test', function(request, response) {
	var text = '\n{{Ability|P\n|name=Essence Theft\n|icon=EssenceTheft.jpg\n|description=Ahri gains a charge of Essence Theft with each enemy unit hit by any of her spells, with a cap of 3 charges gained per spell cast. Upon reaching 9 charges, Ahri\'s next spell will have 35% bonus spell vamp.\n}}\n{{Ability|Q\n|name=Orb of Deception\n|icon=OrbofDeception.jpg\n|description={{sbc|Active:}} Ahri sends out an orb in a line in front of her and then pulls it back, dealing magic damage on the way out and true damage on the way back.\n|leveling={{lc|Magic damage\/True damage}} {{ap|40|65|90|115|140}} {{as|(+ 33% AP)}}\n{{lc|Max Damage to the Same Target}} {{ap|80|130|180|230|280}} {{as|(+ 66% AP)}}\n|cooldown=7\n|cost={{ap|70|75|80|85|90}}\n|costtype=Mana\n|range=880\n}}\n{{Ability|W\n|name=Fox-Fire\n|icon=Fox-Fire.jpg\n|description={{sbc|Active:}} Ahri releases three fox-fires to surround her for up to 5 seconds.  After a short delay after cast, each flame will target the closest visible enemy unit to itself, prioritizing champions, and deal magic damage to the target.\n|description2=Additional fox-fires that hit the same target will only deal 50% damage.\n|leveling={{lc|Magic Damage Per Fox-Fire}} {{ap|40|65|90|115|140}} {{as|(+ 40% AP)}}\n{{lc|Magic Damage to Three Targets}} {{ap|120|195|270|345|420}} {{as|(+ 120% AP)}}\n|leveling2={{lc|Magic Damage to the Same Target}} {{ap|80|130|180|230|280}} {{as|(+ 80% AP)}}\n|range=800\n|cooldown={{ap|9|8|7|6|5}}\n|cost=60\n|costtype=Mana\n}}\n{{Ability|E\n|name=Charm\n|icon=Charm.jpg\n|description={{sbc|Active:}} Ahri blows a kiss that travels in a line in front of her. The first enemy it hits takes magic damage and is charmed, forcing them to walk harmlessly towards Ahri while being slowed by 50% for the duration.\n|leveling={{lc|Magic damage}} {{ap|60|90|120|150|180}} {{as|(+ 35% AP)}}\n{{lc|Duration}} {{ap|1|1.25|1.5|1.75|2}}\n|range=975\n|cooldown=12\n|cost={{ap|50|65|80|95|110}}\n|costtype=mana\n}}\n{{Ability|R\n|name=Spirit Rush\n|icon=SpiritRush.jpg\n|description={{sbc|Active:}} Ahri dashes towards the cursor and fires essence bolts, dealing magic damage to up to 3 visible nearby enemies, prioritizing champions. In the next 10 seconds, Spirit Rush can be cast two additional times before going on cooldown. Each enemy can only be hit once per dash.\n|leveling={{lc|Magic Damage}} {{ap|85|125|165}} {{as|(+ 35% AP)}}\n{{lc|Max Damage to Same Target}} {{ap|255|375|495}} {{as|(+ 105% AP)}}\n{{lc|Dash Range}} {{ap|450}}\n|cooldown={{ap|110|95|80}}\n|cost=100\n|costtype=mana\n|range=550\n}}\n\n';
	var pattern = /\|description[\d ]*= *([\s\S]*?)(?=\{\{[Aa]bility|\|description|\|leveling)/g

	var matchArray;
	while ((matchArray = pattern.exec(text)) !== null) {
		console.log('Match: ' + matchArray[1]);
		pattern.lastIndex -= 15;
	}
	response.success('Success!');
}, function(error) {
	response.error('Error!');
});

