//////////////////////////////////////////////////////////////////
//　機能名：DiscordメンバーIDとニックネームのスプレッドシート出力
//　概要：Discordサーバー内のメンバー情報を取得し、Googleスプレッドシートに書き込む
//　引数：なし
//　環境変数：
//　　- BOT_TOKEN: Discord Botのトークン
//　　- GUILD_ID: DiscordサーバーID
//　　- SPREADSHEET_ID: GoogleスプレッドシートID
//　作成日：2026-02-27
//　更新日：
//　作成者：ChatGPT
//////////////////////////////////////////////////////////////////


// ===== 必要ライブラリ読み込み =====
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { google } = require('googleapis');

// ===== Expressサーバー設定（Cloud Run用）=====
const app = express();
const PORT = process.env.PORT || 8080;

// ===== HTTP GET "/" にアクセスされたときの処理 =====
app.get('/', async (req, res) => {

  // ===== Discordクライアント生成（メンバー取得Intent必須）=====
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ]
  });

  try {
    // ===== Discord Botログイン =====
    await client.login(process.env.BOT_TOKEN);

    // ===== 指定サーバー取得 =====
    const guild = await client.guilds.fetch(process.env.GUILD_ID);

    // ===== サーバー内メンバー全件取得 =====
    const members = await guild.members.fetch();

    // ===== シートに書き込むデータ作成 =====
    // A列：DiscordメンバーID
    // B列：globalName（なければusername）
    const values = members.map(member => ([
      member.user.id,
      member.user.globalName ?? member.user.username
    ]));

    await client.destroy();

    // ===== Google Sheets API 認証 =====
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const SHEET_NAME = 'Discord_ID';

    // ===== 既存データ削除 =====
    // A2:B の範囲をクリア（ヘッダは残す）
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:B`
    });

    // ===== データ書き込み =====
    // A2から書き込み開始
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2`,
      valueInputOption: 'RAW',
      requestBody: {
        values: values
      }
    });

    res.send("スプレッドシート更新完了（Discord_IDシート）");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});