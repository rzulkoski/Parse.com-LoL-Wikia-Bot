
// If the string provided matches the an object within the array's field provided,
// the index of the first match in the provided array will be returned. If no elements
// match it will return -1.
exports.indexOfMatchInParseArrayForStringOnField = function(array, string, field) {
	var indexOfMatch = -1;
	for (var i = 0; i < array.length; i++) {
		if (array[i].get(field) == string) indexOfMatch = i;
	}
	return indexOfMatch;
}

// If the object provided matches an element in the array provided on the field provided,
// the index of the first match in the provided array will be returned. If no elements
// match it will return -1.
exports.indexOfMatchInParseArrayForObjectOnField = function(array, object, field) {
	var indexOfMatch = -1;
	for (var i = 0; i < array.length; i++) {
		if (array[i].get(field) == object.get(field)) indexOfMatch = i;
	}
	return indexOfMatch;
}


// If the object provided matches at least one element in the array provided on the
// field provided, true will be returned. If there are no matches then false is
// returned.
exports.arrayOfParseObjectsContainsObjectForField = function(array, object, field) {
	for (var i = 0; i < array.length; i++) {
		if (array[i].get(field) == object.get(field)) return true;
	}
	return false;
}


exports.matchingElementsInArrayForObjectRefOnField = function(array, object, field) {
	var matchingElements = [];
	for (var i = 0; i < array.length; i++) {
		if (array[i].get(field).id == object.id) matchingElements.push(array[i]);
	}
	return matchingElements;
}