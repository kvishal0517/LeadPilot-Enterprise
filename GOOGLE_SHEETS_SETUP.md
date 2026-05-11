# Google Sheets Setup for LeadPilot

To enable automatic syncing of leads to Google Sheets, follow these steps:

## 1. Create a Google Sheet
- Create a new Google Sheet.
- Rename the first tab to `Leads` (or any name you prefer, then update it in LeadPilot settings).
- Add the following headers to the first row (A1:H1):
  `Company`, `Industry`, `Contact`, `Email`, `Score`, `Subject`, `Body`, `Date`

## 2. Deploy Google Apps Script
- In your Google Sheet, go to **Extensions** > **Apps Script**.
- Delete any existing code and paste the following:

```javascript
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      obj[header.toLowerCase().replace(/ /g, "_")] = row[i];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(data.tabName || "Leads");
  
  if (!sheet) {
    return ContentService.createTextOutput("Sheet not found").setMimeType(ContentService.MimeType.TEXT);
  }
  
  // Get existing emails for deduplication
  var existingEmails = sheet.getRange("D:D").getValues().flat();
  
  data.leads.forEach(function(lead) {
    if (existingEmails.indexOf(lead.email) === -1) {
      sheet.appendRow([
        lead.company,
        lead.industry,
        lead.contact,
        lead.email,
        lead.score,
        lead.subject,
        lead.body,
        lead.date
      ]);
    }
  });
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}
```

- Click **Deploy** > **New Deployment**.
- Select type **Web App**.
- Set **Execute as** to `Me`.
- Set **Who has access** to `Anyone`.
- Click **Deploy** and copy the **Web App URL**.

## 3. Configure LeadPilot
- Go to the **Settings** page in LeadPilot.
- Navigate to the **Sheets** tab.
- Paste the **Web App URL** into the **Google Sheets URL** field.
- Save settings.

Now, every time you run the agent, it will automatically push the drafted leads to your Google Sheet!
