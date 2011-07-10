var redis = require('redis');
var r = redis.createClient();
var Util = require('./retwis.js');
var Post = require('./post.js');

function User(id,name) {
   this.id = id || -1;
   this.name = name;
}

User.prototype.isLoggedIn = function() {
   return this.id > 0;
}

User.prototype.getPosts = function(start,count,callback) {
   User.getPosts(this.id,start,count,callback);
}

User.register = function(username, password, callback) {
   r.incr("global:nextUserId",function(err,userId) {
      if (err) callback(err);
      var authsecret = Util.getrand();
      r.multi()
         .set("username:"+username+":id",userId)
         .set("uid:"+userId+":username",username)
         .set("uid:"+userId+":password",password)
         .set("uid:"+userId+":auth",authsecret)
         .set("auth:"+authsecret,userId)
         .sadd("global:users",userId)
         .exec(function(err,replies) {
            if (err) callback(err);
            callback(undefined, new User(userId,username), authsecret);
         });
   });
}

User.getPosts = function(uid, start, count, callback) {
   var key = uid == -1 ? 'global:timeline' : 'uid:' + uid + ':posts';
   var multiAction = r.multi();
   r.lrange(key, start, start+count, function(err,pids){
      if (err) return callback(err);
      r.mget(pids.map(function(pid){return 'post:'+pid}),function(err,rawPosts) {
         if (err) return callback(err);
         var posts = rawPosts.map(function(postString){return Post.fromString(postString)});
         return callback(undefined, posts);
      });
   });
}

User.fromSession = function(sessionId,callback) {
   r.get('auth:'+sessionId,function(err,uid) {
      if (err) return callback(err);
      if (uid) {
         r.multi()
            .get('uid:' + uid + ':auth')
            .get('uid:' + uid + ':username')
            .exec(function(err,replies) {
               if (err) return callback(err);
               if (replies[0] == sessionId) {
                  callback(undefined, new User(uid,replies[1]));
               } else {
                  callback(undefined, new User());
               }
         });
      } else {
         callback(undefined, new User());
      }
   });
}

module.exports = User;
