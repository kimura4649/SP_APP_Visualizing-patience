# 我慢貯金アプリ 画面仕様プロンプト（Claude用インプット）

以下の画面構成・制約を厳守して実装・回答してください。

---

## SCREEN_1: MainScreen

### LAYOUT_RATIO
- TOP_AREA: 40% of screen height
- MID_AREA: 30% of screen height
- BOT_AREA: 30% of screen height

### TOP_AREA (40%)
```
[HEADER]
  left:  Text="我慢貯金"
  right: Button="履歴 →" → navigate(HistoryScreen)

[HERO_CARD]
  top-right: Icon=CalendarIcon → openModal(CalendarModal)
  label:     "{currentMonth}月の我慢貯金"
  value:     "¥{monthTotal}" (large, bold)
             ※ マイナス時は "¥-{abs}" 形式
  divider
  label:     "今日の合計"
  value:     "¥{todayTotal}"
             ※ 集計: localTimezone 0:00:00〜23:59:59
             ※ 0件時: "{MM}月{DD}日（システム日付）：¥0"
  label:     "{prevMonth}月の実績"
  value:     "¥{prevMonthTotal}" (subdued)
```

### MID_AREA (30%)
```
[DEFAULT_BUTTONS] 3-column grid
  ※ 初期出荷時設定値（変更・削除可能）
  [+¥150 ジュース] [+¥500 コンビニ] [+¥800 外食]
  [+¥300 お菓子]   [+¥1,200 ランチ]  [+¥2,000 飲み会]
  ※ 長押し(Android標準時間) → 削除ボタン表示 / 3秒 or 他タップでキャンセル
  ※ tap → add record + toast "+¥XXX（カテゴリ名）を追加しました"(2s)

[CUSTOM_INPUT] card
  input: 金額（数字キーボード, -100000〜100000, 0不可）
  input: メモ（任意, max500文字）
  checkbox: "ワンタップボタンに登録する"
    checked=true → input: ボタン名（任意, max30文字）
  button: "追加"
    → 0円: toast "0円は記録できません"(2s), no save
    → 正常: save record + toast "+¥XXX を追加しました"(2s)
    → checkbox=true: save record + save button + toast "+¥XXX を追加 ＆「○○」を登録しました"(2s)
    → 書き込み失敗: toast "保存に失敗しました。再度お試しください"(2s)

[REGISTERED_BUTTONS] 3-column grid ※ count>0 のときのみ表示
  ※ 登録済みボタン（上限30個、超過時は追加ボタン非活性）
  ※ 長押し → 削除ボタン表示（DEFAULT_BUTTONSと同仕様）
```

### BOT_AREA (30%)
```
[AD_BANNER] 320×50
  ※ 読み込み失敗時: 空白
  ※ オフライン時: 空白
```

---

## MODAL: CalendarModal

```
[HEADER]
  left:   "‹" 前月ボタン ※ 最初のレコード月では disabled
  center: "{YYYY}年{M}月"
  right:  "›" 翌月ボタン ※ 現在月では disabled

[MONTH_TOTAL]
  "{M}月 合計：¥{total}" ※ データなし時 ¥0

[CALENDAR_GRID] 7col × max6row
  各セル: 日付 + 当日合計金額（小）
  ※ データなし日: 金額非表示（空白）
  ※ 当日セル: 背景色ハイライト（色はデザイン時に決定）

[CLOSE_BUTTON] 右上
```

---

## SCREEN_2: HistoryScreen

```
[HEADER]
  left:   "← もどる" → navigate(MainScreen)
  center: "{M}月"

[MONTH_SWITCH]
  "‹ 前月" ※ 最初のレコード月では disabled
  "YYYY年M月"
  "翌月 ›"  ※ 現在月では disabled

[MONTH_TOTAL]
  "合計 ¥{total}"

[HISTORY_LIST] ※ 昇順（古い順）
  GROUP: "M月D日（曜日）" e.g. "4月9日（木）"
    RECORD: "{memo} ¥{amount}"  ※ memo空の場合は "¥{amount}" のみ
    ※ 同一日内: 登録順（古い順）

[AD_BANNER] 320×50, fixed bottom
  ※ 読み込み失敗時・オフライン時: 空白
```

---

## DATA_STRUCTURES

```
Record {
  id: string        // 3桁連番 "001"〜"999"
  date: "YYYY-MM-DD"
  amount: number    // -100000〜100000, 0不可
  memo: string      // 空文字可, max500
}

ArchivedRecord {
  id: string
  date: "YYYY-MM-DD"
  amount: number
  memo: string
  deletedAt: "YYYY-MM-DD"
}

RegisteredButton {
  amount: number    // -100000〜100000
  name: string      // 空文字可, max30
}
```

### ID管理ルール
- 追加時: max(records.id) + 1（3桁ゼロ埋め）
- 削除時: archivedRecordsへ移動 → records全体を先頭から連番振り直し

### AsyncStorage Keys
- `records` / `registeredButtons` / `archivedRecords`

---

## VALIDATION

| field        | rule |
|---|---|
| amount       | -100000〜100000, 0不可, 整数のみ |
| memo         | max 500文字 |
| button.name  | max 30文字, 空文字可 |
| button count | max 30個 |
| 翌月ボタン   | 現在月で disabled |
| 前月ボタン   | 最初のレコード月で disabled |

---

## TECH_STACK

| role | tech |
|---|---|
| framework | React Native + Expo |
| language  | JavaScript |
| storage   | AsyncStorage (max 6MB) |
| ads       | react-native-google-mobile-ads |
| mail      | expo-mail-composer |
| platform  | iOS 13.0+ / Android 8.0+ (API 26+) |

---

## CAPACITY_MANAGEMENT

- 容量チェック: アプリ起動時 + 記録追加後
- 80%超: 警告ダイアログ（メールアドレス・FROM・TO入力 → CSV送信後削除 or あとで）
  - 「あとで」→ 90%到達時に再表示
- 90%超: 最古月から月単位で削除（80%未満になるまで繰り返す）
  - メール設定済みなら先にCSV送信してから削除
  - 削除後 toast "容量確保のため古いデータを削除しました"(2s)

### CSV仕様（エクスポート時）
- columns: date, amount, memo
- encoding: UTF-8 BOM付き
- delimiter: カンマ
- newline: CRLF
