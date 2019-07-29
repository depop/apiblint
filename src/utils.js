import fs from 'fs';
import path from 'path';

import walk from 'walkdir';


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

/**
 * Recursively find all .apib files in the given path
 *
 * @param {string} dirpath - (relative) path to search for .apib files in
 * @returns {Promise<Array<string>>} list of absolute paths to .apib files
 */
export async function findBlueprintsInPath(dirpath) {
  return new Promise((resolve, reject) => {
    const blueprints = [];
    const fstats = fs.statSync(dirpath);
    if (fstats.isFile()) {
      if (dirpath.endsWith('.apib')) {
        blueprints.push(path.resolve(dirpath));
      }
      resolve(blueprints);
    } else
    if (fstats.isDirectory()) {
      const emitter = walk(dirpath);
      emitter.on('file', function(filename, stat) {
        if (filename.endsWith('.apib')) {
          blueprints.push(filename);
        }
      });
      emitter.on('error', reject);
      emitter.on('fail', reject);
      emitter.on('end', () => {
        resolve(blueprints);
      });      
    } else {
      reject(dirpath);
    }
  });
}

/**
 * Recursively find all .apib files in the given paths
 *
 * @param {Array<string>} dirpaths - (relative) paths to search for .apib files in
 * @returns {Promise<Array<string>>} flat list of absolute paths to .apib files
 */
export async function findBlueprints(...dirpaths) {
  return Promise.all(
    dirpaths.map(async (dirpath) => findBlueprintsInPath(dirpath))
  ).then(array => array.flat());
}

