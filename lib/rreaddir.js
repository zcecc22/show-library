const fs = require('fs');
const p = require('path');

/**
 * Recursively list files in a path.
 * @param {string} path Path to list.
 * @param {function} callback Callback of (err, file).
 */
function rreaddir(path, callback) {
  fs.stat(path, function(err, stats) {
    if (err) {
      callback(err, null);
      return;
    }
    if (stats.isDirectory()) {
      fs.readdir(path, function(err, files) {
        if (err) {
          callback(err, null);
          return;
        }

        files.forEach(function(file) {
          rreaddir(p.join(path, file), callback);
        });
      });
    } else if (stats.isFile()) {
      callback(null, path);
    }
  });
}

module.exports = rreaddir;
