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



/*
function strElapsed($t) {
    $d = time()-$t;
    if ($d < 60) return "$d seconds";
    if ($d < 3600) {
        $m = (int)($d/60);
        return "$m minute".($m > 1 ? "s" : "");
    }
    if ($d < 3600*24) {
        $h = (int)($d/3600);
        return "$h hour".($h > 1 ? "s" : "");
    }
    $d = (int)($d/(3600*24));
    return "$d day".($d > 1 ? "s" : "");
}

function showPost($id) {
    $r = redisLink();
    $postdata = $r->get("post:$id");
    if (!$postdata) return false;

    $aux = explode("|",$postdata);
    $id = $aux[0];
    $time = $aux[1];
    $username = $r->get("uid:$id:username");
    $post = join(array_splice($aux,2,count($aux)-2),"|");
    $elapsed = strElapsed($time);
    $userlink = "<a class=\"username\" href=\"profile.php?u=".urlencode($username)."\">".utf8entities($username)."</a>";

    echo('<div class="post">'.$userlink.' '.utf8entities($post)."<br>");
    echo('<i>posted '.$elapsed.' ago via web</i></div>');
    return true;
}

function showUserPosts($userid,$start,$count) {
    $r = redisLink();
    $key = ($userid == -1) ? "global:timeline" : "uid:$userid:posts";
    $posts = $r->lrange($key,$start,$start+$count);
    $c = 0;
    foreach($posts as $p) {
        if (showPost($p)) $c++;
        if ($c == $count) break;
    }
    return count($posts) == $count+1;
}

function showUserPostsWithPagination($username,$userid,$start,$count) {
    global $_SERVER;
    $thispage = $_SERVER['PHP_SELF'];

    $navlink = "";
    $next = $start+10;
    $prev = $start-10;
    $nextlink = $prevlink = false;
    if ($prev < 0) $prev = 0;

    $u = $username ? "&u=".urlencode($username) : "";
    if (showUserPosts($userid,$start,$count))
        $nextlink = "<a href=\"$thispage?start=$next".$u."\">Older posts &raquo;</a>";
    if ($start > 0) {
        $prevlink = "<a href=\"$thispage?start=$prev".$u."\">&laquo; Newer posts</a>".($nextlink ? " | " : "");
    }
    if ($nextlink || $prevlink)
        echo("<div class=\"rightlink\">$prevlink $nextlink</div>");
}

function showLastUsers() {
    $r = redisLink();
    $users = $r->sort("global:users","GET uid:*:username DESC LIMIT 0 10");
    echo("<div>");
    foreach($users as $u) {
        echo("<a class=\"username\" href=\"profile.php?u=".urlencode($u)."\">".utf8entities($u)."</a> ");
    }
    echo("</div><br>");
}

?>
*/