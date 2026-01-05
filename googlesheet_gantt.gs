const GH_TOKEN = PropertiesService.getScriptProperties().getProperty("GH_TOKEN"); // あなたのPAT
const ORG_NAME = "org_name"; // 組織名
const OWNER_NAME = "owner_name"; // あなたのユーザー名
const PROJECT_NUMBER = 1; // プロジェクト番号

// ガントチャートの期間設定
const GANTT_START_DATE = new Date(2026, 0, 1); // 2026/1/1
const GANTT_END_DATE = new Date(2026, 3, 30); // 2026/4/30

function syncGitHubProject() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ProjectData") || ss.insertSheet("ProjectData");
  
  // 組織(organization)のプロジェクトを取得するクエリに固定
  const query = `
    query($login: String!, $number: Int!) {
      organization(login: $login) {
        projectV2(number: $number) {
          items(first: 100) {
            nodes {
              content {
                ... on DraftIssue { title }
                ... on Issue { title }
                ... on PullRequest { title }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
                  ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2FieldCommon { name } } }
                  ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } }
                  ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2FieldCommon { name } } }
                }
              }
            }
          }
        }
      }
    }
  `;

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${GH_TOKEN}` },
    payload: JSON.stringify({ 
      query: query, 
      variables: { 
        login: ORG_NAME, // ここに組織名を入れる
        number: PROJECT_NUMBER 
      } 
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch("https://api.github.com/graphql", options);
  const json = JSON.parse(response.getContentText());

  if (json.errors) {
    console.error("API Error Details:", json.errors);
    return;
  }

  const project = json.data?.organization?.projectV2;
  
  if (!project) {
    console.error("Project not found. 組織名、プロジェクト番号、またはPATの権限(read:org等)を確認してください。");
    return;
  }

  const items = project.items.nodes;
  const results = [];

  // PlanStartDate 昇順で並べ替え（空は末尾）
  const getPlanStartValue = (item) => {
    const fields = item.fieldValues.nodes;
    const f = fields.find(v => v.field?.name === "PlanStartDate");
    return f ? (f.date || "") : "";
  };

  const sortedItems = [...items].sort((a, b) => {
    const aVal = getPlanStartValue(a);
    const bVal = getPlanStartValue(b);
    if (!aVal && !bVal) return 0;
    if (!aVal) return 1; // aが空なら後ろ
    if (!bVal) return -1; // bが空なら後ろ
    const aDate = new Date(aVal);
    const bDate = new Date(bVal);
    return aDate - bDate;
  });
  
  // 各イシューを「予定」と「実際」の2行で表示
  sortedItems.forEach(item => {
    const fields = item.fieldValues.nodes;
    
    const getVal = (fieldName) => {
      const f = fields.find(v => v.field?.name === fieldName);
      if (!f) return "";
      return f.date || f.name || f.text || f.number || "";
    };

    const title = item.content?.title || "No Title";
    const status = getVal("Status");
    const planStart = getVal("PlanStartDate");
    const planEnd = getVal("PlanEndDate");
    const realStart = getVal("RealStartDate");
    const realEnd = getVal("RealEndDate");

    // 予定の行
    results.push([
      title,
      "予定",
      status,
      planStart,
      planEnd
    ]);
    
    // 実際の行
    results.push([
      title,
      "実際",
      status,
      realStart,
      realEnd
    ]);
  });

  // シートの更新処理
  if (results.length > 0) {
    // ヘッダー行を設定（A〜G列）
    const headers = [
      "Title",
      "Type",
      "Status",
      "StartDate",
      "EndDate"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // A〜E列を固定表示
    sheet.setFrozenColumns(5);

    // 既存データをクリア（2行目から最終行まで）
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
    }
    // 新しいデータをセット
    sheet.getRange(2, 1, results.length, headers.length).setValues(results);
    console.log(`${items.length} 件のアイテム（${results.length} 行）を同期しました。`);
    
    // ガントチャートを描画
    drawGanttChart(sheet, results.length);
  }
}

/**
 * ガントチャートをE列以降に描画
 */
function drawGanttChart(sheet, dataRows) {
  // ヘッダー行を設定（1行目）
  const totalDays = Math.ceil((GANTT_END_DATE - GANTT_START_DATE) / (1000 * 60 * 60 * 24)) + 1;
  const ganttStartCol = 6; // F列から開始（データがE列まで）
  const totalColsCount = ganttStartCol + totalDays - 1; // 全体の使用列数（A列起点）
  
  // ガント列以降をクリア
  const maxCol = sheet.getMaxColumns();
  if (maxCol >= ganttStartCol) {
    sheet.getRange(1, ganttStartCol, sheet.getMaxRows(), maxCol - ganttStartCol + 1).clearContent();
    sheet.getRange(1, ganttStartCol, sheet.getMaxRows(), maxCol - ganttStartCol + 1).setBackground(null);
  }
  
  // 日付ヘッダーを作成
  const dateHeaders = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(GANTT_START_DATE);
    date.setDate(date.getDate() + i);
    dateHeaders.push(Utilities.formatDate(date, Session.getScriptTimeZone(), "M/d"));
  }
  
  // ヘッダー行に日付を設定
  if (dateHeaders.length > 0) {
    sheet.getRange(1, ganttStartCol, 1, dateHeaders.length).setValues([dateHeaders]);
    sheet.getRange(1, ganttStartCol, 1, dateHeaders.length).setHorizontalAlignment("center");
    sheet.getRange(1, ganttStartCol, 1, dateHeaders.length).setFontSize(8);
    sheet.getRange(1, ganttStartCol, 1, dateHeaders.length).setBackground("#f0f0f0");
  }

  // 土日列を灰色で塗りつぶし（ヘッダーとデータ行）
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(GANTT_START_DATE);
    date.setDate(date.getDate() + i);
    const day = date.getDay();
    if (day === 0 || day === 6) {
      const col = ganttStartCol + i;
      sheet.getRange(1, col, dataRows + 1, 1).setBackground("#e0e0e0");
    }
  }

  // 今日の列をオレンジでハイライト
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(GANTT_START_DATE);
  start.setHours(0, 0, 0, 0);
  const todayDiff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  if (todayDiff >= 0 && todayDiff < totalDays) {
    const col = ganttStartCol + todayDiff;
    sheet.getRange(1, col, dataRows + 1, 1).setBackground("#ffb74d");
  }
  
  // 各タスクのガントバーを描画
  for (let row = 0; row < dataRows; row++) {
    const rowNum = row + 2; // 2行目から開始
    const planStart = sheet.getRange(rowNum, 4).getValue(); // D列：StartDate（予定行）
    const planEnd = sheet.getRange(rowNum, 5).getValue();   // E列：EndDate（予定行）
    const realStart = sheet.getRange(rowNum, 4).getValue(); // D列：StartDate（実際行）
    const realEnd = sheet.getRange(rowNum, 5).getValue();   // E列：EndDate（実際行）
    
    // 予定のガントバー（偶数行：予定行）
    if (row % 2 === 0 && planStart && planEnd) {
      const startDate = new Date(planStart);
      const endDate = new Date(planEnd);
      
      // ガントバーの開始位置と長さを計算
      const startDiff = Math.ceil((startDate - GANTT_START_DATE) / (1000 * 60 * 60 * 24));
      const endDiff = Math.ceil((endDate - GANTT_START_DATE) / (1000 * 60 * 60 * 24));
      
      if (startDiff >= 0 && startDiff < totalDays) {
        const barLength = Math.max(1, endDiff - startDiff + 1);
        const barEnd = Math.min(startDiff + barLength, totalDays);
        const actualBarLength = barEnd - startDiff;
        
        if (actualBarLength > 0) {
          // 予定のガントバーを青色で塗りつぶし
          const ganttRange = sheet.getRange(rowNum, ganttStartCol + startDiff, 1, actualBarLength);
          ganttRange.setBackground("#4285f4");
        }
      }
    }
    
    // 実際のガントバー（奇数行：実際行）
    if (row % 2 === 1 && realStart && realEnd) {
      const startDate = new Date(realStart);
      const endDate = new Date(realEnd);
      
      // ガントバーの開始位置と長さを計算
      const startDiff = Math.ceil((startDate - GANTT_START_DATE) / (1000 * 60 * 60 * 24));
      const endDiff = Math.ceil((endDate - GANTT_START_DATE) / (1000 * 60 * 60 * 24));
      
      if (startDiff >= 0 && startDiff < totalDays) {
        const barLength = Math.max(1, endDiff - startDiff + 1);
        const barEnd = Math.min(startDiff + barLength, totalDays);
        const actualBarLength = barEnd - startDiff;
        
        if (actualBarLength > 0) {
          // 実際のガントバーを緑色で塗りつぶし
          const ganttRange = sheet.getRange(rowNum, ganttStartCol + startDiff, 1, actualBarLength);
          ganttRange.setBackground("#34a853");
        }
      }
    }
  }
  
  // 列幅を調整
  for (let col = ganttStartCol; col < ganttStartCol + totalDays; col++) {
    sheet.setColumnWidth(col, 30);
  }

  // イシューごとに罫線を引く（2行単位）
  for (let i = 0; i < Math.ceil(dataRows / 2); i++) {
    const startRow = 2 + i * 2;
    const height = Math.min(2, dataRows - (i * 2));
    // 外枠と縦罫線のみ（予定と実際の間は線を引かない）
    sheet.getRange(startRow, 1, height, totalColsCount).setBorder(true, true, true, true, true, false);
  }
}

