
/**
 * Left-pad a value, casting it to String, and append a suffix.
 *
 * @param {string} padWith - Char(s) to pad the result with
 * @param {string} suffix - To be appended to the end of the result
 * @param {number} length - Length to pad stringified value to (before appending suffix)
 * @param {?} val - Will be cast to String, left-padded, and suffix appended
 * @returns {string} padded
 */
export function lpad(val, length, {padWith=' ', suffix=''} = {}) {
	return String(val).padStart(length, padWith) + suffix;
}
