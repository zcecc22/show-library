const fs = require('fs');
const p = require('path');

/**
 * Recursively list files in a path.
 * @param {string} path Path to list.
 * @param {function} cb Callback of (err, file).
 */
function rreaddir(path, cb) {
  fs.stat(path, function (err, stats) {
    if (err) {
      cb(err, null);
      return;
    }
    if (stats.isDirectory()) {
      fs.readdir(path, function (err, files) {
        if (err) {
          cb(err, null);
          return;
        }

        files.forEach(function (file) {
          rreaddir(p.join(path, file), cb);
        });
      });
    } else if (stats.isFile()) {
      cb(null, path);
    }
  });
}

module.exports = rreaddir;
