# MyFantasyLeague.com API Complete Documentation

This document contains the complete API documentation for MyFantasyLeague.com, compiled from their official documentation pages.

## Table of Contents

1. [General Information](#general-information)
2. [Export API Endpoints](#export-api-endpoints)
3. [Import API Endpoints](#import-api-endpoints)
4. [Miscellaneous API Endpoints](#miscellaneous-api-endpoints)
5. [Sample Code](#sample-code)

---

## General Information

### URL Format
All requests follow this format:
```
protocol://host/year/command?args
```

**Example:**
```
https://www44.myfantasyleague.com/2023/standings?L=80000&W=3
```

### Components:
- **Protocol**: `http` or `https` (HTTPS recommended and may become required)
- **Host**: Server where the league lives (e.g., `www44.myfantasyleague.com`)
- **Year**: Season year (e.g., 2023)
- **Command**: Direction of data flow (`export`, `import`, etc.)
- **Args**: Additional parameters

### Key Parameters:
- **L**: League ID (required for league-specific requests)
- **W**: Week number (1-21)
- **JSON**: Set to 1 for JSON format, 0 for XML (default)
- **TYPE**: Specifies the data type for export/import commands

### Authentication

#### Login Process:
1. Call login API: `https://api.myfantasyleague.com/2023/login?USERNAME=user&PASSWORD=pass&XML=1`
2. Extract cookie from response: `<status cookie_name="cookie_value"...>`
3. Pass cookie in subsequent requests: `Cookie: MFL_USER_ID=cookie_value`

#### Alternative Authentication:
- Use **APIKEY** parameter for export requests (owner access only)
- API key available via JavaScript variable `apiKey` when logged in

### Rate Limiting (2020+)
- Unregistered clients have lower limits
- Registered clients get 2.5x higher limits
- Register at API Client Registration Page
- Use proper User-Agent header
- 429 status code indicates throttling

### Best Practices:
- Space requests 1 second apart
- Cache data (player database updates once daily)
- Use `api.myfantasyleague.com` for non-league requests
- Avoid requests during high-traffic times
- Don't retry failed requests immediately

### Data Types:
- **Player IDs**: 4-5 digit strings with leading zeros (e.g., "0531")
- **Franchise IDs**: 4-digit strings with leading zeros (e.g., "0001")
- **Timestamps**: Unix time format in EST/EDT timezone

---

## Export API Endpoints

### Common League Info

#### `league`
Get general league setup parameters including league name, roster size, starting lineup requirements, franchise names, etc.

**Parameters:**
- `L` (required): League ID

**Access:** Public (private info only for league owners)

#### `rules`
Get league scoring rules for a given league.

**Parameters:**
- `L` (required): League ID

#### `rosters`
Get current rosters for all franchises including player status and salary/contract info.

**Parameters:**
- `L` (required): League ID
- `FRANCHISE` (optional): Specific franchise ID
- `W` (optional): Week number

**Access:** Private (league owners only)

#### `freeAgents`
Get fantasy free agents for a league.

**Parameters:**
- `L` (required): League ID
- `POSITION` (optional): Filter by position

**Access:** Private (league owners only)

#### `schedule`
Get fantasy schedule for a league/week with scores for past weeks.

**Parameters:**
- `L` (required): League ID
- `W` (optional): Week number
- `F` (optional): Franchise ID

**Access:** Private (league owners only)

### Transactions

#### `transactions`
Get all non-pending transactions for a league.

**Parameters:**
- `L` (required): League ID
- `W` (optional): Week filter
- `TRANS_TYPE` (optional): Transaction type filter
- `FRANCHISE` (optional): Franchise filter
- `DAYS` (optional): Days filter
- `COUNT` (optional): Limit results

**Access:** Private (league owners only)

#### `pendingWaivers`
Get pending waivers for current franchise.

**Parameters:**
- `L` (required): League ID
- `FRANCHISE_ID` (optional): For commissioner requests

**Access:** Private (league owners only)

#### `pendingTrades`
Get pending trades for current franchise.

**Parameters:**
- `L` (required): League ID
- `FRANCHISE_ID` (optional): For commissioner requests

**Access:** Private (league owners only)

#### `tradeBait`
Get trade bait for all franchises.

**Parameters:**
- `L` (required): League ID
- `INCLUDE_DRAFT_PICKS` (optional): Include draft picks

**Access:** Private (league owners only)

#### `assets`
Get all tradable assets (players, draft picks) for a league.

**Parameters:**
- `L` (required): League ID

**Access:** Private (league owners only)

### Scoring and Results

#### `leagueStandings`
Get current league standings.

**Parameters:**
- `L` (required): League ID
- `COLUMN_NAMES` (optional): Include column mappings
- `ALL` (optional): Include additional fields
- `WEB` (optional): Web site columns only

**Access:** Private (league owners only)

#### `weeklyResults`
Get weekly results including scores for all players.

**Parameters:**
- `L` (required): League ID
- `W` (optional): Week number or "YTD"
- `MISSING_AS_BYE` (optional): Show missing opponents as BYE

**Access:** Private (league owners only)

#### `liveScoring`
Get live scoring data for current week.

**Parameters:**
- `L` (required): League ID
- `W` (optional): Week number
- `DETAILS` (optional): Include non-starters

#### `playerScores`
Get all player scores for a league/week.

**Parameters:**
- `L` (required): League ID
- `W` (optional): Week number, "YTD", or "AVG"
- `YEAR` (optional): Year
- `PLAYERS` (optional): Specific player IDs
- `POSITION` (optional): Position filter
- `STATUS` (optional): Status filter
- `RULES` (optional): Recalculate with league rules
- `COUNT` (optional): Limit results

**Access:** Private (league owners only)

#### `projectedScores`
Get projected fantasy points using league scoring system.

**Parameters:**
- `L` (required): League ID
- `W` (optional): Week number
- `PLAYERS` (optional): Specific player IDs
- `POSITION` (optional): Position filter
- `STATUS` (optional): Status filter
- `COUNT` (optional): Limit results

**Access:** Private (league owners only)

### Draft & Auction

#### `draftResults`
Get draft results for a league.

**Parameters:**
- `L` (required): League ID

**Access:** Private (league owners only)

#### `auctionResults`
Get auction results for a league.

**Parameters:**
- `L` (required): League ID

**Access:** Private (league owners only)

#### `selectedKeepers`
Get currently selected keepers.

**Parameters:**
- `L` (required): League ID
- `FRANCHISE` (optional): Specific franchise

**Access:** Private (league owners only)

#### `myDraftList`
Get My Draft List for current franchise.

**Parameters:**
- `L` (required): League ID

**Access:** Private (league owners only)

### Fantasy Content

#### `players`
Get all player IDs, names, and positions in the database.

**Parameters:**
- `L` (optional): League ID
- `DETAILS` (optional): Include complete details
- `SINCE` (optional): Unix timestamp for changes since
- `PLAYERS` (optional): Specific player IDs

**Note:** Updated once daily, cache recommended

#### `playerProfile`
Get detailed player information including DOB, ADP, height/weight.

**Parameters:**
- `P` (required): Player ID(s)

#### `allRules`
Get all scoring rules that MFL supports.

#### `playerRanks`
Get overall player rankings from FantasySharks.com.

**Parameters:**
- `POS` (optional): Position filter
- `SOURCE` (optional): Rankings source

#### `adp`
Get Average Draft Position results.

**Parameters:**
- `PERIOD` (optional): Draft period filter
- `FCOUNT` (optional): Franchise count filter
- `IS_PPR` (optional): PPR league filter
- `IS_KEEPER` (optional): Keeper league filter
- `IS_MOCK` (optional): Mock draft filter
- `CUTOFF` (optional): Minimum selection percentage
- `DETAILS` (optional): Include league details

#### `aav`
Get Average Auction Value results.

**Parameters:**
- `PERIOD` (optional): Auction period filter
- `IS_PPR` (optional): PPR league filter
- `IS_KEEPER` (optional): Keeper league filter

### NFL Content

#### `injuries`
Get NFL injury report with player status and details.

**Parameters:**
- `W` (optional): Week number

#### `nflSchedule`
Get NFL schedule for one week including scores.

**Parameters:**
- `W` (optional): Week number or "ALL"

#### `nflByeWeeks`
Get bye weeks for every NFL team.

**Parameters:**
- `W` (optional): Specific week

#### `pointsAllowed`
Get fantasy points allowed by each NFL team by position.

**Parameters:**
- `L` (required): League ID

### User Functions

#### `myleagues`
Get all leagues for the current user.

**Parameters:**
- `YEAR` (optional): Specific year
- `FRANCHISE_NAMES` (optional): Include franchise names

**Access:** Private (league owners only)

#### `leagueSearch`
Search for leagues by ID or name.

**Parameters:**
- `SEARCH` (optional): Search string (min 3 chars)
- `ID` (optional): Specific league ID
- `YEAR` (optional): Year to search

---

## Import API Endpoints

### Common League Info

#### `lineup`
Import a franchise's starting lineup.

**Parameters:**
- `L` (required): League ID
- `W` (required): Week number
- `STARTERS` (required): Comma-separated player IDs
- `COMMENTS` (optional): Lineup comments
- `TIEBREAKERS` (optional): Tiebreaker players
- `BACKUPS` (optional): Backup players
- `FRANCHISE_ID` (optional): For commissioner requests

**Access:** Private (league owners only)

#### `franchises`
Load franchise names, graphics, and contact information.

**Parameters:**
- `L` (required): League ID
- `DATA` (required): XML data
- `OVERLAY` (optional): Overlay existing data

**Access:** Commissioner only

#### `calendarEvent`
Import an event to league calendar.

**Parameters:**
- `L` (required): League ID
- `EVENT_TYPE` (required): Event type ID
- `START_TIME` (required): Unix timestamp
- `END_TIME` (optional): Unix timestamp
- `HAPPENS` (optional): Repeat weekly

**Access:** Commissioner only

### Transactions

#### `fcfsWaiver`
Execute immediate add/drop move (first-come, first-serve).

**Parameters:**
- `L` (required): League ID
- `ADD` (optional): Player ID to add
- `DROP` (optional): Comma-separated player IDs to drop
- `FRANCHISE_ID` (optional): For commissioner requests

**Access:** Private (league owners only)

#### `waiverRequest`
Import waiver requests for one round.

**Parameters:**
- `L` (required): League ID
- `ROUND` (required): Waiver round
- `PICKS` (required): Comma-separated waiver claims
- `REPLACE` (optional): Replace existing picks
- `FRANCHISE_ID` (optional): For commissioner requests

**Access:** Private (league owners only)

#### `blindBidWaiverRequest`
Import blind bidding waiver requests.

**Parameters:**
- `L` (required): League ID
- `ROUND` (required): Waiver round (if conditional)
- `PICKS` (required): Comma-separated bids
- `REPLACE` (optional): Replace existing picks
- `FRANCHISE_ID` (optional): For commissioner requests

**Access:** Private (league owners only)

#### `tradeProposal`
Propose a trade to another franchise.

**Parameters:**
- `L` (required): League ID
- `OFFEREDTO` (required): Target franchise ID
- `WILL_GIVE_UP` (required): Assets being offered
- `WILL_RECEIVE` (required): Assets being requested
- `COMMENTS` (optional): Trade message
- `EXPIRES` (optional): Expiration timestamp
- `FRANCHISE_ID` (optional): For commissioner requests

**Access:** Private (league owners only)

#### `tradeResponse`
Respond to an existing trade offer.

**Parameters:**
- `L` (required): League ID
- `TRADE_ID` (required): Trade ID
- `RESPONSE` (required): "accept", "reject", or "revoke"
- `COMMENTS` (optional): Response message
- `FRANCHISE_ID` (optional): For commissioner requests

**Access:** Private (league owners only)

### Draft & Auction

#### `draftResults`
Load complete draft results (offline draft import).

**Parameters:**
- `L` (required): League ID
- `DATA` (required): XML draft data

**Access:** Commissioner only

#### `auctionResults`
Load complete auction results (offline auction import).

**Parameters:**
- `L` (required): League ID
- `DATA` (required): XML auction data
- `CLEAR` (optional): Clear existing results
- `OVERWRITE` (optional): Overwrite rosters

**Access:** Commissioner only

#### `myDraftList`
Set players in owner's My Draft List.

**Parameters:**
- `L` (required): League ID
- `PLAYERS` (required): Comma-separated player IDs

**Access:** Private (league owners only)

---

## Miscellaneous API Endpoints

### Draft & Auction

#### `live_draft`
Control live draft (make picks, pause, resume, skip, undo).

**Parameters:**
- `L` (required): League ID
- `CMD` (required): "DRAFT", "PAUSE", "RESUME", "SKIP", "UNDO"
- `PLAYER_PICK` (required for DRAFT): Player ID
- `FRANCHISE_PICK` (optional): Franchise ID for commissioner
- `ROUND` (required for DRAFT): Round number
- `PICK` (required for DRAFT): Pick number
- `COMMENTS` (optional): Pick comments
- `JSON` (optional): Return JSON format
- `XML` (optional): Return XML format

**Access:** Private (league owners only)

### User Functions

#### `login`
Validate user credentials and return authentication cookie.

**Parameters:**
- `USERNAME` (required): Login username
- `PASSWORD` (required): Login password
- `XML` (required): Set to 1

**Note:** Use HTTPS and POST method for security

### NFL Content

#### `mfl_status`
Get current week and system status.

**URL:** `https://api.myfantasyleague.com/fflnetdynamic2025/mfl_status.xml`

#### `nfl_sched`
Get full NFL schedule with live updates (every 15 minutes).

**URL:** `https://api.myfantasyleague.com/fflnetdynamic2025/nfl_sched.xml`

#### `nfl_sched_X`
Get NFL schedule for specific week X.

**URL:** `https://api.myfantasyleague.com/fflnetdynamic2025/nfl_sched_1.xml`

---

## Sample Code

### Perl Export Example

```perl
#!/bin/perl

# Set these variables:
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

# Get login cookie
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

# Get league host
my $url = "${proto}://$api_host/$year/export";
my $headers = HTTP::Headers->new("Cookie" => "MFL_USER_ID=$cookie");
my $ml_args = qq(TYPE=myleagues&JSON=$json);
my $ml_req = HTTP::Request->new("GET", "$url?$ml_args", $headers);
print "Making request to get league host: $url?$ml_args\n";
my $ml_resp = $ua->request($ml_req);

# Find host in response
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

# Get league info
my $args = qq(TYPE=$req_type&L=$league_id&JSON=$json);
my $req = HTTP::Request->new("GET", "$url?$args", $headers);
print "Making request to get league info $url?$args\n";
my $resp = $ua->request($req);
print "\nLeague Info:\n";
print $resp->as_string();
```

### Perl Import Example

```perl
# Import auction results example
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
```

---

## Important Notes

1. **Security**: Always use HTTPS for login requests
2. **Caching**: Cache player data (updates once daily)
3. **Rate Limiting**: Space requests 1 second apart
4. **Error Handling**: Handle 429 status codes (rate limiting)
5. **Data Types**: Treat player/franchise IDs as strings with leading zeros
6. **Timestamps**: All times in Unix format, EST/EDT timezone
7. **XML Encoding**: Properly encode special characters in import data
8. **POST Recommended**: Use POST for import requests with DATA parameter

This documentation covers all available MFL API endpoints as of 2023. For the most current information, always refer to the official MFL API documentation.