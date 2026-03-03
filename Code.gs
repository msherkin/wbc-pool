function doPost(e) {
  try {
    // 1. Parse the incoming JSON data
    var params = JSON.parse(e.postData.contents);
    
    // 2. Open the spreadsheet (Active Sheet)
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Picks");
    if (!sheet) {
      // Create if it doesn't exist
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Picks");
      // Add Headers
      sheet.appendRow([
        "Timestamp", "Name", 
        "Pool A Winner", "Pool A Runner-up", 
        "Pool B Winner", "Pool B Runner-up", 
        "Pool C Winner", "Pool C Runner-up", 
        "Pool D Winner", "Pool D Runner-up", 
        "Winner QF 1", "Winner QF 2", "Winner QF 3", "Winner QF 4", 
        "Winner SF 1", "Winner SF 2", 
        "Champion"
      ]);
    }
    
    // 3. Prepare the row data
    var newRow = [
      new Date(), 
      params.name,
      params.poolA_1, params.poolA_2,
      params.poolB_1, params.poolB_2,
      params.poolC_1, params.poolC_2,
      params.poolD_1, params.poolD_2,
      params.qf1, params.qf2, params.qf3, params.qf4,
      params.sf1, params.sf2,
      params.champion
    ];
    
    // 4. Append to sheet
    sheet.appendRow(newRow);
    
    // 5. Return success message (JSON)
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success", "row": sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    // Return error message
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    // 1. Get the "Leaderboard" sheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leaderboard");
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. Get all data (excluding headers if they exist)
    var data = sheet.getDataRange().getValues();
    
    // Remove header row (assumes Row 1 is headers)
    if (data.length > 1) {
      data.shift(); 
    } else {
       // Return empty if only header or no data
       return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Map to JSON object
    // Assuming Column A = Rank, B = Name, C = Score
    var leaderboard = data.map(function(row) {
      return {
        rank: row[0],
        name: row[1],
        score: row[2]
      };
    });
    
    // 4. Return as JSON
    return ContentService
      .createTextOutput(JSON.stringify(leaderboard))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
     return ContentService
      .createTextOutput(JSON.stringify({ "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}