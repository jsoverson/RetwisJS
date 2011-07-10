function Post(pid,uid,username,status,time,version) {
   this.id       = pid;
   this.uid      = uid;
   this.username = username;
   this.status   = status;
   this.time     = time;
   this.version  = version;
}

//[version,pid,uid,username,time,status].join('|');
Post.fromV1String = function(string) {
   var parts = string.split('|');
   return new Post(parts[1],parts[2],parts[3],parts[5],parts[4],parts[0]);
}

Post.fromString = function(string) {
   return Post.fromV1String(string) 
}

Post.currentVersion = 1;

module.exports = Post;
