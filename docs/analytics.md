# GA4 で計測するイベント

測定 ID（環境変数 `NEXT_PUBLIC_GA_MEASUREMENT_ID`）を設定したときだけ、GA4 にページの表示と下のカスタムイベントを送る。
未設定のときは GA4 のタグを読み込まず、何も送らない。送る処理は [src/client/lib/analytics.ts](../src/client/lib/analytics.ts) にまとめている。

GA4 の管理画面でカスタムディメンション・カスタム指標を登録するときは、この表のパラメータ名を使う。
イベントを足したり、パラメータを変えたりしたら、この表も直す。

## イベントの一覧

| イベント名 | 送るとき | パラメータ |
|---|---|---|
| `play_start` | プレイを始めたとき（「いただきます」のあと、スペースか Enter を押して最初の丼が出たとき） | `course_id`、`course_name`、`toppings` |
| `play_end` | 閉店したとき | `course_id`、`course_name`、`toppings`、`bill`、`balance`、`served_count`、`discarded_count`、`miss_count`、`accuracy`、`keys_per_second`、`max_streak`、`kaedama_count`、`title_id`、`is_personal_best` |
| `replay` | 結果画面で「もう一杯」を押したとき | `course_id` |
| `share` | 結果画面で「X で共有」を押したとき。GA4 の推奨イベントの形で送る | `method`、`content_type`、`item_id` |
| `ime_notice_shown` | 日本語入力がオンのまま打って「半角英数に切り替えて」の案内が出たとき（1 プレイに 1 回まで） | `course_id` |
| `touch_notice_shown` | タッチ端末で「PC のキーボードで遊んでください」の案内が出たとき（1 ページの表示に 1 回まで） | なし |
| `ticket_abandon` | 食券を買ったあと、プレイを始めずにページを離れたとき（タブを閉じる・別のページに移る）。「いただきます」のあと、スペースか Enter で始める前に離れたときも含む | `course_id` |
| `sound_toggle` | 効果音のオン・オフを切り替えたとき | `enabled` |

## パラメータ

| パラメータ | 型 | 内容 |
|---|---|---|
| `course_id` | 文字列 | 食券のコースの id（`nami` / `oomori` / `tokumori`） |
| `course_name` | 文字列 | 食券のコースの名前（`並` など） |
| `toppings` | 文字列 | 選んだトッピングの id をカンマ区切りにしたもの（例: `gekikara,ninniku`）。選んでいなければ `none` |
| `bill` | 数値 | お会計（円） |
| `balance` | 数値 | 差し引き（お会計 − 食券代、円）。損なら負 |
| `served_count` | 数値 | 平らげた杯数 |
| `discarded_count` | 数値 | のびて下げられた丼の数 |
| `miss_count` | 数値 | ミスタイプ数 |
| `accuracy` | 数値 | 正確率（0〜100、小数 1 桁） |
| `keys_per_second` | 数値 | 1 秒あたりの平均打鍵数（小数 1 桁） |
| `max_streak` | 数値 | 最大連続杯数 |
| `kaedama_count` | 数値 | 替え玉の回数 |
| `title_id` | 文字列 | 結果画面の称号の id（`passerby` / `hungry` / `regular` / `connoisseur` / `critic` / `legend`） |
| `is_personal_best` | 真偽値 | このプレイでそのコースの自己ベストを更新したか（初めて遊んだコースも更新とみなす） |
| `method` | 文字列 | 共有先。いまは `x` だけ |
| `content_type` | 文字列 | 共有したもの。いまは `result`（結果画面の成績）だけ |
| `item_id` | 文字列 | 共有した成績のコースの id（`course_id` と同じ値） |
| `enabled` | 真偽値 | 切り替えたあとの効果音がオンか |

## 送り方の決まり

- 送る処理は gtag.js のキューに積むだけにして、ゲームの進行やキー入力を待たせない。タグが例外を投げてもゲームには伝えない。
- `ticket_abandon` はページが閉じる間際に送るので、`transport_type: "beacon"` を付けて sendBeacon で送らせ、
  `pagehide` は GA4 のタグより先に受けられるよう capture で受ける。アプリの中で別のページに移ったときは、ゲームのアンマウントで送る。
- 打鍵ごと・1 杯ごとのような細かい操作は送らない。入力した文字そのものなど、個人を特定できる情報も送らない。
