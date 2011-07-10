var crypto = require('crypto');
var fs = require('fs');

exports.getrand = function() {
   var fd = fs.openSync("/dev/urandom","r");
   var read = fs.readSync(fd,16,0);
   var md5sum = crypto.createHash('md5');
   md5sum.update(read[0]);
   var digest = md5sum.digest('hex');
   return digest;
}
