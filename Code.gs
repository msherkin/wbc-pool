function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leaderboard");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    data.shift(); // Remove headers
    var leaderboard = data.map(function(row) {
      return {
        rank: row[0],
        name: row[1],
        score: row[2]
      };
    });
    
    return ContentService.createTextOutput(JSON.stringify(leaderboard)).setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
     return ContentService.createTextOutput(JSON.stringify({ "error": error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Picks");
    
    if (!sheet) {
      sheet = ss.insertSheet("Picks");
      sheet.appendRow([
        "Timestamp", "Name", 
        "Pool A Winner", "Pool A Runner-up", 
        "Pool B Winner", "Pool B Runner-up", 
        "Pool C Winner", "Pool C Runner-up", 
        "Pool D Winner", "Pool D Runner-up", 
        "Winner QF 1", "Winner QF 2", "Winner QF 3", "Winner QF 4", 
        "Winner SF 1", "Winner SF 2", 
        "Champion",
        "Tiebreaker 1", "Tiebreaker 2", "Tiebreaker 3"
      ]);
    }
    
    var newRow = [
      new Date(), 
      params.name,
      params.poolA_1, params.poolA_2,
      params.poolB_1, params.poolB_2,
      params.poolC_1, params.poolC_2,
      params.poolD_1, params.poolD_2,
      params.qf1, params.qf2, params.qf3, params.qf4,
      params.sf1, params.sf2,
      params.champion,
      params.tb1, params.tb2, params.tb3
    ];
    
    sheet.appendRow(newRow);
    
    // Automatically recalculate scores when a new pick is submitted
    calculateScores();
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success", "row": sheet.getLastRow() })).setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🏆 WBC Bracket')
      .addItem('Setup Sheets', 'setupSheets')
      .addItem('Calculate Scores & Standings', 'calculateScores')
      .addToUi();
}

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup Picks
  var picksSheet = ss.getSheetByName("Picks");
  if (!picksSheet) {
    picksSheet = ss.insertSheet("Picks");
    picksSheet.appendRow([
      "Timestamp", "Name", 
      "Pool A Winner", "Pool A Runner-up", 
      "Pool B Winner", "Pool B Runner-up", 
      "Pool C Winner", "Pool C Runner-up", 
      "Pool D Winner", "Pool D Runner-up", 
      "Winner QF 1", "Winner QF 2", "Winner QF 3", "Winner QF 4", 
      "Winner SF 1", "Winner SF 2", 
      "Champion",
      "Tiebreaker 1", "Tiebreaker 2", "Tiebreaker 3"
    ]);
  }

  // 2. Setup Results
  var resultsSheet = ss.getSheetByName("Results");
  if (!resultsSheet) {
    resultsSheet = ss.insertSheet("Results");
    var resultsData = [
      ["Match/Slot", "Actual Winner"],
      ["Pool A Winner", ""],
      ["Pool A Runner-up", ""],
      ["Pool B Winner", ""],
      ["Pool B Runner-up", ""],
      ["Pool C Winner", ""],
      ["Pool C Runner-up", ""],
      ["Pool D Winner", ""],
      ["Pool D Runner-up", ""],
      ["Winner QF 1", ""],
      ["Winner QF 2", ""],
      ["Winner QF 3", ""],
      ["Winner QF 4", ""],
      ["Winner SF 1", ""],
      ["Winner SF 2", ""],
      ["Champion", ""],
      ["Tiebreaker 1 (Total HR)", ""],
      ["Tiebreaker 2 (Total Runs)", ""],
      ["Tiebreaker 3 (Total Final Runs)", ""]
    ];
    resultsSheet.getRange(1, 1, resultsData.length, 2).setValues(resultsData);
    resultsSheet.setColumnWidth(1, 180);
    resultsSheet.setColumnWidth(2, 200);
  }

  // 3. Setup Leaderboard
  if (!ss.getSheetByName("Leaderboard")) {
    var lbSheet = ss.insertSheet("Leaderboard");
    lbSheet.appendRow(["Rank", "Participant", "Total Points"]);
  }
  
  SpreadsheetApp.getUi().alert("Setup Complete! Enter actual game winners and tiebreaker answers in the 'Results' sheet.");
}

function calculateScores() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var picksSheet = ss.getSheetByName("Picks");
  var resultsSheet = ss.getSheetByName("Results");
  var leaderboardSheet = ss.getSheetByName("Leaderboard");

  if (!picksSheet || !resultsSheet || !leaderboardSheet) {
    return;
  }

  // 1. Get Actual Results
  // Indices: 
  // 0-7: Pool Picks (10 pts)
  // 8-11: QF Winners (Not directly scored in rules, but used to determine SFists)
  // According to rules: 
  // - 10 pts for each of 8 teams advancing to QF (Pool winners/runners-up)
  // - 10 pts for each of 4 SFists
  // - 20 pts for each of 2 Finalists
  // - 20 pts for Champion
  // - 10 pts per Tiebreaker
  // - 5 pt Bonus per pool for correct order
  
  var resultsData = resultsSheet.getRange(2, 2, 18, 1).getValues();
  var results = resultsData.map(function(row) { return row[0].toString().trim(); });
  
  // 2. Get Picks
  var picksData = picksSheet.getDataRange().getValues();
  if (picksData.length <= 1) return; // No picks yet

  var participants = [];
  
  // Loop through participants (skip header)
  for (var i = 1; i < picksData.length; i++) {
    var row = picksData[i];
    var name = row[1];
    var score = 0;
    
    // --- ROUND 1: POOL ADVANCEMENT (10 pts each) ---
    // Columns 2-9 are Pool picks
    var advancingTeams = results.slice(0, 8);
    for (var j = 0; j < 8; j++) {
      var pick = row[j + 2].toString().trim();
      if (advancingTeams.includes(pick) && pick !== "") {
        score += 10;
      }
    }
    
    // --- BONUS: CORRECT POOL ORDER (5 pts each) ---
    for (var p = 0; p < 4; p++) {
       var winPick = row[2 + (p*2)].toString().trim();
       var runPick = row[3 + (p*2)].toString().trim();
       var winRes = results[p*2];
       var runRes = results[p*2 + 1];
       if (winPick === winRes && runPick === runRes && winRes !== "" && runRes !== "") {
         score += 5;
       }
    }
    
    // --- ROUND 2: SEMIFINALISTS (10 pts each) ---
    // SFists are the winners of QF matches (Results indices 8-11)
    var sfists = results.slice(8, 12);
    // Picks for SFists are in columns 10-13 (Winner QF 1-4)
    for (var k = 0; k < 4; k++) {
       var sfPick = row[k + 10].toString().trim();
       if (sfists.includes(sfPick) && sfPick !== "") {
         score += 10;
       }
    }
    
    // --- ROUND 3: FINALISTS (20 pts each) ---
    // Finalists are winners of SF matches (Results indices 12-13)
    var finalists = results.slice(12, 14);
    // Picks for Finalists are in columns 14-15 (Winner SF 1-2)
    for (var l = 0; l < 2; l++) {
       var fPick = row[l + 14].toString().trim();
       if (finalists.includes(fPick) && fPick !== "") {
         score += 20;
       }
    }
    
    // --- ROUND 4: CHAMPION (20 pts) ---
    var champRes = results[14];
    var champPick = row[16].toString().trim();
    if (champPick === champRes && champRes !== "") {
      score += 20;
    }
    
    // --- TIEBREAKERS (10 pts each) ---
    // Indices 15, 16, 17 in Results
    // Columns 17, 18, 19 in Picks
    for (var m = 0; m < 3; m++) {
       var tbPick = row[m + 17].toString().trim();
       var tbRes = results[m + 15];
       if (tbPick === tbRes && tbRes !== "") {
         score += 10;
       }
    }
    
    participants.push({ name: name, score: score });
  }

  // 3. Sort by score
  participants.sort(function(a, b) { return b.score - a.score; });

  // 4. Update Leaderboard
  leaderboardSheet.clear();
  leaderboardSheet.appendRow(["Rank", "Participant", "Total Points"]);
  
  var lbData = [];
  var currentRank = 1;
  for (var n = 0; n < participants.length; n++) {
    if (n > 0 && participants[n].score < participants[n-1].score) {
      currentRank = n + 1;
    }
    lbData.push([currentRank, participants[n].name, participants[n].score]);
  }

  if (lbData.length > 0) {
    leaderboardSheet.getRange(2, 1, lbData.length, 3).setValues(lbData);
  }
}
