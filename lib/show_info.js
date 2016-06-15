const SHOW_PATTERNS = [/S(\d{1,2})E(\d{1,2})/i,
                /(\d{1,2})X(\d{1,2})/i,
                /Season (\d{1,2}) Episode (\d{1,2})/i,
                /(\d{1})(\d{2})/i];

function getShowInfo(filename) {
  let value = null;
  for (let i = 0; i < SHOW_PATTERNS.length; i++) {
    if (SHOW_PATTERNS[i].test(filename)) {
      value = {};
      const splitStr = filename.split(SHOW_PATTERNS[i]);
      value.name = splitStr[0].replace(/\W+/g, ' ').trim();
      value.season = parseInt(splitStr[1], 10);
      value.episode = parseInt(splitStr[2], 10);
      break;
    }
  }
  return value;
}

module.exports = getShowInfo;
