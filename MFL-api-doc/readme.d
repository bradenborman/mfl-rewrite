In this folder I have 3 files for getting or posting data examples -- It it not formatted but you can get the following view from 

https://www47.myfantasyleague.com/2023/api_info?STATE=details&L=32291#

Some sample code they have to show: Perl


The following Perl script is a sample of how to get the league info for a league a user is in. It shows how to get the cookie from a username and how to identify the host of a league. Set the $league_id, $username and $password variables to appropriate values. Converting this to other languages should be pretty straight-forward as long you have access to an HTTP library.
#!/bin/perl

# Set these variables somehow:
my $league_id = "LEAGUE_ID";
my $username = "USERNAME";
my $password = "PASSWORD";
my $year = "2022";

# Defaults
my $proto = "https";
my $api_host = "api.myfantasyleague.com";
my $json = 0;
my $req_type = 'league';

use HTTP::Request::Common qw(GET);  
use LWP::UserAgent; 

$ua = LWP::UserAgent->new();  

my $login_url = "https://$api_host/$year/login?USERNAME=$username&PASSWORD=$password&XML=1";
my $login_req = HTTP::Request->new("GET", $login_url);
print "Making request to get cookie: $login_url\n";
my $login_resp = $ua->request($login_req);
my $cookie;
if($login_resp->as_string() =~ /MFL_USER_ID="([^"]*)">OK/) {
    $cookie = $1;
}
else {
    die "Can not get login cookie.  Response: " .
        $login_resp->as_string() . "\n";
}
print "Got cookie $cookie\n";

my $url = "${proto}://$api_host/$year/export";
my $headers = HTTP::Headers->new("Cookie" => "MFL_USER_ID=$cookie");
my $ml_args = qq(TYPE=myleagues&JSON=$json);
my $ml_req = HTTP::Request->new("GET", "$url?$ml_args", $headers);
print "Making request to get league host: $url?$ml_args\n";
my $ml_resp = $ua->request($ml_req);

# find host in the return string - note that this is for illustrating the
# API. A more robust solution would be to use a proper XML parser.
if($ml_resp->as_string() =~ m!url="(https?)://([a-z0-9]+.myfantasyleague.com)/$year/home/$league_id"!s) {
    $proto = $1;
    my $league_host = $2;
    print "Got league host $league_host\n";
    $url = "${proto}://${league_host}/$year/export";
}
else {
    die "Can't find info for league id $league_id.  Response: " . 
        $ml_resp->as_string() . "\n";
}

my $args = qq(TYPE=$req_type&L=$league_id&JSON=$json);
my $req = HTTP::Request->new("GET", "$url?$args", $headers);
print "Making request to get league info $url?$args\n";
my $resp = $ua->request($req);
print "\nLeague Info:\n";
print $resp->as_string();

print "\n";


The following Perl script is a sample of how to import data into a league. We use the auctionResults request since that one requires the data to be sent in in XML. For these, it's strongly recommended that you use a POST method (the ones that don't require a DATA argument can be submitted via GET fairly easily). To avoid cluttering the example, this one does not show how to get the user cookie or the proper league host. That process is illustrated in the export sample above.

# Defaults
my $req_type = 'auctionResults';

use HTTP::Request::Common qw(POST);  
use LWP::UserAgent; 

my $ua = LWP::UserAgent->new();  
my $url = "${proto}://$league_host/$year/import";
my $args = qq(L=$league_id&TYPE=$req_type);

my $data = "DATA=" . qq(<auctionResults>
<auctionUnit unit="LEAGUE">
<auction player="7391" franchise="0006" winningBid="3" timeStarted="1495563902" lastBidTime="1495613918" />
</auctionUnit>
</auctionResults>
);

my $headers = HTTP::Headers->new(
                    "Cookie" => "MFL_USER_ID=" . $cookie,
                    "Content-Type" => 'application/x-www-form-urlencoded',
                    "Content-Length" => length($data),
                );

my $req = HTTP::Request->new("POST", "$url?$args", $headers, $data);
my $resp = $ua->request($req);
print "Response: " . $resp->as_string();

print "\n";