# WBC Bracket Pool Setup Instructions

You have a **static HTML file** (`index.html`) that acts as a bracket picker app.
You have a **Google Apps Script** (`Code.gs`) that saves the data to a Google Sheet.

Follow these steps to connect them.

## Step 1: Create the Google Sheet & Script
1. Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it "WBC Pool 2026".
3. In the menu, go to **Extensions** > **Apps Script**.
4. A new tab will open with a code editor. Delete any code there (like `function myFunction() {}`).
5. Copy the entire content of the file `Code.gs` (included in your project folder) and paste it into the editor.
6. Press `Cmd + S` (or Ctrl + S) to Save. Name the project "WBC Backend".

## Step 2: Deploy as Web App
1. In the Apps Script editor, click the blue **Deploy** button (top right) -> **New deployment**.
2. Click the "Select type" gear icon (⚙️) -> **Web app**.
3. Fill in these details:
   - **Description:** "WBC Backend"
   - **Execute as:** `Me` (your email)
   - **Who has access:** `Anyone` (This is crucial so your friends can submit without logging in).
4. Click **Deploy**.
5. You might be asked to "Authorize access". Click "Review permissions", select your account, then click "Advanced" -> "Go to WBC Backend (unsafe)" -> "Allow".
6. Copy the **Web App URL** (it starts with `https://script.google.com/macros/s/...`).

## Step 3: Connect HTML to Sheet
1. Open your `index.html` file in a text editor (like VS Code, Notepad, or TextEdit).
2. Scroll down to the bottom script section (around line ~290).
3. Look for this line:
   ```javascript
   const SCRIPT_URL = 'PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE';
   ```
4. Replace `PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE` with the URL you copied in Step 2.
   - Make sure it's inside the quotes!
5. Save the file.

## Step 4: Test & Share
1. Open `index.html` in your browser.
2. Fill out the bracket.
3. Click "Submit Picks".
4. Go back to your Google Sheet. You should see a new tab called "Picks" with your data!

## Step 5: Hosting (Optional)
To share the link with friends, you can host `index.html` for free on:
- **GitHub Pages** (Upload the file to a repo -> Settings -> Pages)
- **Netlify Drop** (Drag and drop the folder)
- or just email the file to them (they can open it locally, it still works!).