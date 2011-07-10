var express = require('express');
var app = express.createServer();
var redis = require('redis');
var r = redis.createClient(6379,'127.0.0.1');

var Util = require('./lib/util.js');
var User = require('./lib/user.js');
var Post = require('./lib/post.js');

app.set('view engine', 'jade');

app.dynamicHelpers({
   stash: function(req, res){
      return req.stash; // Inspired by perl catalyst
   }
});

app.configure(function(){
   app.set('view engine', 'jade');
   app.set('view options', { layout: 'layout' });
   app.use(express.cookieParser());
   app.use(express.bodyParser());
   app.use(express.methodOverride());
   app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
   app.use(app.router);
   app.use(express.static(__dirname + '/public', { maxAge: 60*60*24}));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});



app.all('*',function(req,res,next) {
   req.stash = {};
   User.fromSession(req.cookies['auth'],function(err,user) {
      if (err) return res.render('error', {error:"Error retrieving user intercept"});
      req.stash.user = user;
      next();
   });
});

app.get('/', function(req,res) {
   if (req.stash.user.isLoggedIn()) {
      var start = req.param('start',0);
      var count = req.param('count',10);
      req.stash.start = start;
      req.stash.count = count;
      r.multi()
         .scard("uid:"+req.stash.user.id+":followers")
         .scard("uid:"+req.stash.user.id+":following")
         .exec(function(err,replies){
            if (!err) {
               req.stash.followers = replies.shift();
               req.stash.following = replies.shift();
            }
            req.stash.user.getPosts(start,count,function(err,posts) {
               if (err) console.log("Error retrieving posts for UID:" + req.stash.user.id);
               req.stash.posts = posts || [];
               res.render('index');
            });
      });
   } else {
      res.render('welcome');
   }
});

app.all('/post', function(req,res) {
   if (!req.stash.user.isLoggedIn()) return res.redirect('/');

   r.incr("global:nextPostId",function(err,pid) {
      var status = req.param('status').replace(/\n/,"");
      var post = [Post.currentVersion,pid,req.stash.user.id,req.stash.user.name,+new Date(),status].join('|');

      r.set("post:"+pid,post)
      r.lpush("global:timeline",pid);
      r.ltrim("global:timeline",0,1000); //keep last 1000 only

      r.smembers("uid:" + req.stash.user.id + ":followers",function(err,users) {
         if (err) {
            console.log("Could not retrieve followers");
            users = [];
         }
         users.push(req.stash.user.id);
         var multiAction = r.multi();
         for (uid in users) {
            multiAction.lpush("uid:"+users[uid]+":posts",pid);
         }
         multiAction.exec(function(err,replies) {res.redirect('/')});
      });
   });
});

app.post('/login', function(req,res) {
   var username = req.param('username','').trim();
   var password = req.param('password','').trim();

   r.get("username:"+username+":id",function(err,uid) {
      r.multi()
         .get("uid:"+uid+":password")
         .get("uid:"+uid+":auth")
         .exec(function(err,replies) {
            if (err) {
               res.render('error',{error:'Error retrieving data'});
            } else {
               var realPassword = replies[0];
               var authsecret = replies[1];
               if (!uid || password !== realPassword) {
                  res.render('error',{error:'Wrong username or password'});
               } else {
                  res.cookie('auth', authsecret, {maxAge : 60*60*24*365});
                  res.redirect('/');
               }
            }
      });
   });
});

app.get('/logout', function(req,res) {
   var authsecret = Util.getrand();
   var uid = req.stash.user.id;
   var oldsecret = r.get("uid:" + uid + ":auth");

   r.multi()
      .set("uid:"+uid+":auth",authsecret)
      .set("auth:"+authsecret,uid)
      .del("auth:"+oldsecret)
      .exec(function(err,replies) {
         if (err) {
            res.render('error', {error:'Error logging out' + err});
         } else {
            res.redirect('/');
         }
   });
});

app.get('/profile/:username', function(req,res) {
   r.get("username:"+req.param('username','')+":id",function(err,uid) {
      if (err || !uid > 0) return res.redirect('/');
      var start = req.param('start',0);
      var count = req.param('count',10);
      req.stash.start = start;
      req.stash.count = count;
      req.stash.uid = uid;
      req.stash.username = req.param('username','');
      User.getPosts(uid,start,count,function(err,posts) {
         req.stash.posts = posts;
         res.render('profile');
      });
   });
});

app.get('/follow/:uid', function(req,res) {follow(req,res,req.param('uid',-1),true)});
app.get('/unfollow/:uid', function(req,res) {follow(req,res,req.param('uid',-1),false)});

function follow(req,res,uid,follow) {
   if (!req.stash.user.isLoggedIn()) return res.redirect('/');
   if (uid > 0 && uid != req.stash.user.id) {
      if (follow) {
         r.sadd("uid:"+uid+":followers",req.stash.user.id);
         r.sadd("uid:"+req.stash.user.id+":following",uid);
       } else {
         r.srem("uid:"+uid+":followers",req.stash.user.id);
         r.srem("uid:"+req.stash.user.id+":following",uid);
      }
   }
   r.get('uid:'+uid+':name',function(err,name) {
      res.redirect('/profile/' + name);
   });
}

app.post('/register', function(req,res) {
   var username  = req.param('username','').trim();
   var password  = req.param('password','').trim();
   var password2 = req.param('password2','').trim();

   if (!username.length > 0 || !password.length > 0) {
      res.render('error',{error : "Must supply all fields" });
   } else if (password !== password2) {
      res.render('error',{error : "Passwords did not match" });
   } else {
      r.get('username:' + username + ':id',function(err,val){
         if (err) {
            res.render('error',{error : "Error checking for existing username : " + err });
         } else if (val) {
            res.render('error',{error : "Username already in use, try something different!" });
         } else {
            User.register(username,password,function(err,user,session) {
               if (err) {
                  res.render('error',{error : 'Could not register user'});
               } else {
                  res.cookie('auth', session, {maxAge : 3600*24*365});
                  req.stash.user = user;
                  res.render('registered');
               }
            });
         }
      });
   }
});

app.get('/timeline', function(req,res) {
   r.sort('global:users','DESC','LIMIT','0','10','GET','uid:*:username',function(err,usernames) {
      if (err) {console.log('error retrieving global users : ' + err)}
      req.stash.usernames = usernames || [];

      var start = req.param('start',0);
      var count = req.param('count',10);
      req.stash.start = start;
      req.stash.count = count;
      User.getPosts(-1, start, count, function(err, posts) {
         if (err) {console.log('error retrieving all posts : ' + err)}
         req.stash.posts = posts;
         res.render('timeline');
      });
   });
});

app.listen(80);

