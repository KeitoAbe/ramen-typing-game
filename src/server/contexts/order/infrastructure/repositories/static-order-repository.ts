import type { OrderRepository } from "@/server/contexts/order/domain/repositories/order-repository";
import type { Order } from "@/types/order";

// DB を入れるまでは、注文をリポジトリの中に持つ
export const STATIC_ORDERS: readonly Order[] = [
  { id: "shoyu", text: "しょうゆ", reading: "しょうゆ" },
  { id: "miso", text: "味噌ラーメン", reading: "みそらーめん" },
  { id: "shio", text: "塩でお願いします", reading: "しおでおねがいします" },
  {
    id: "ajitama",
    text: "味玉トッピングで",
    reading: "あじたまとっぴんぐで",
  },
  {
    id: "barikata",
    text: "バリカタでお願いします",
    reading: "ばりかたでおねがいします",
  },
  { id: "tonkotsu", text: "豚骨ひとつ", reading: "とんこつひとつ" },
  { id: "chashu", text: "チャーシュー麺", reading: "ちゃーしゅーめん" },
  { id: "negi", text: "ネギ多めで", reading: "ねぎおおめで" },
  { id: "nori", text: "海苔増しで", reading: "のりましで" },
  { id: "menma", text: "メンマください", reading: "めんまください" },
  { id: "futsu", text: "麺は普通で", reading: "めんはふつうで" },
  { id: "kotteri", text: "こってり濃いめ", reading: "こってりこいめ" },
  { id: "assari", text: "あっさり醤油", reading: "あっさりしょうゆ" },
  { id: "gyoza", text: "餃子もひとつ", reading: "ぎょうざもひとつ" },
  { id: "beer", text: "瓶ビール一本", reading: "びんびーるいっぽん" },
  {
    id: "oaiso",
    text: "お愛想お願いします",
    reading: "おあいそおねがいします",
  },
  { id: "umai", text: "大将、うまいね", reading: "たいしょう、うまいね" },
  { id: "kaedama", text: "替え玉ください", reading: "かえだまください" },
  // 並（よみ 2〜7 字）向けの短い注文
  { id: "shio-only", text: "塩", reading: "しお" },
  { id: "rice", text: "ライス", reading: "らいす" },
  { id: "okawari", text: "おかわり", reading: "おかわり" },
  { id: "katame", text: "硬めで", reading: "かためで" },
  { id: "mizu", text: "水ください", reading: "みずください" },
  // 特盛り（よみ 9 字以上）向けの長い注文
  {
    id: "ninniku",
    text: "ニンニク入れますか",
    reading: "にんにくいれますか",
  },
  {
    id: "kaedama-barikata",
    text: "替え玉バリカタでください",
    reading: "かえだまばりかたでください",
  },
  {
    id: "nomihoshi",
    text: "スープまで飲み干しました",
    reading: "すーぷまでのみほしました",
  },
  {
    id: "chashu-oomori",
    text: "チャーシュー麺の大盛りで",
    reading: "ちゃーしゅーめんのおおもりで",
  },
  {
    id: "gyoza-beer",
    text: "餃子と瓶ビールください",
    reading: "ぎょうざとびんびーるください",
  },
  {
    id: "yasai-mashimashi",
    text: "野菜マシマシでお願いします",
    reading: "やさいましましでおねがいします",
  },
  // 並（よみ 2〜7 字）向けの短い注文とひとこと。5〜7 字のものは大盛りにも出る
  { id: "oomori", text: "大盛り", reading: "おおもり" },
  { id: "tokumori", text: "特盛り", reading: "とくもり" },
  { id: "ohiya", text: "お冷", reading: "おひや" },
  { id: "doumo", text: "どうも", reading: "どうも" },
  { id: "moyashi", text: "もやし", reading: "もやし" },
  { id: "nitamago", text: "煮卵", reading: "にたまご" },
  { id: "karamiso", text: "辛味噌", reading: "からみそ" },
  { id: "corn", text: "コーン", reading: "こーん" },
  { id: "butter", text: "バター", reading: "ばたー" },
  { id: "tadaima", text: "ただいま", reading: "ただいま" },
  { id: "iwanori", text: "岩海苔", reading: "いわのり" },
  { id: "tsukemen", text: "つけ麺", reading: "つけめん" },
  { id: "han-rice", text: "半ライス", reading: "はんらいす" },
  { id: "men-sukuname", text: "麺少なめ", reading: "めんすくなめ" },
  { id: "zeppin", text: "絶品だね", reading: "ぜっぴんだね" },
  { id: "matakimasu", text: "また来ます", reading: "またきます" },
  { id: "kosho", text: "胡椒ある", reading: "こしょうある" },
  { id: "hitori", text: "一人です", reading: "ひとりです" },
  { id: "nama-beer", text: "生ビール", reading: "なまびーる" },
  { id: "beni-shoga", text: "紅しょうが", reading: "べにしょうが" },
  { id: "ohashi", text: "お箸ください", reading: "おはしください" },
  { id: "nioi", text: "いい匂い", reading: "いいにおい" },
  { id: "shiraga-negi", text: "白髪ネギ", reading: "しらがねぎ" },
  { id: "tantanmen", text: "担々麺", reading: "たんたんめん" },
  { id: "hiyashi-chuka", text: "冷やし中華", reading: "ひやしちゅうか" },
  { id: "hisashiburi", text: "久しぶり", reading: "ひさしぶり" },
  { id: "joren", text: "常連です", reading: "じょうれんです" },
  { id: "okaikei", text: "お会計", reading: "おかいけい" },
  { id: "gochisousama", text: "ごちそうさま", reading: "ごちそうさま" },
  { id: "yattemasuka", text: "やってますか", reading: "やってますか" },
  // 大盛り（よみ 5〜10 字）向けの店主との雑談
  { id: "hieru", text: "今日は冷えるね", reading: "きょうはひえるね" },
  // 特盛り（よみ 9 字以上）向けの長い注文と雑談
  {
    id: "tenki",
    text: "今日もいい天気ですね",
    reading: "きょうもいいてんきですね",
  },
  {
    id: "ame",
    text: "雨が降ってきましたね",
    reading: "あめがふってきましたね",
  },
  {
    id: "nannenme",
    text: "この店は何年目ですか",
    reading: "このみせはなんねんめですか",
  },
  {
    id: "hiketsu",
    text: "スープの秘訣は何ですか",
    reading: "すーぷのひけつはなんですか",
  },
  {
    id: "shigoto-gaeri",
    text: "仕事帰りに寄りました",
    reading: "しごとがえりによりました",
  },
  {
    id: "shuden",
    text: "終電まであと少しです",
    reading: "しゅうでんまであとすこしです",
  },
  {
    id: "aiseki",
    text: "相席でも大丈夫です",
    reading: "あいせきでもだいじょうぶです",
  },
  {
    id: "karasa-hikaeme",
    text: "辛さは控えめにしてください",
    reading: "からさはひかえめにしてください",
  },
  {
    id: "shokken",
    text: "食券はどこで買いますか",
    reading: "しょっけんはどこでかいますか",
  },
  {
    id: "nihonichi",
    text: "大将の腕は日本一だね",
    reading: "たいしょうのうではにほんいちだね",
  },
  {
    id: "shime-gohan",
    text: "締めにご飯を入れたい",
    reading: "しめにごはんをいれたい",
  },
  {
    id: "seabura",
    text: "背脂を少し足してください",
    reading: "せあぶらをすこしたしてください",
  },
  {
    id: "samui-hi",
    text: "寒い日はラーメンに限る",
    reading: "さむいひはらーめんにかぎる",
  },
  {
    id: "megane",
    text: "湯気で眼鏡が曇ります",
    reading: "ゆげでめがねがくもります",
  },
  {
    id: "kakubetsu",
    text: "屋台のラーメンは格別だ",
    reading: "やたいのらーめんはかくべつだ",
  },
  {
    id: "omiyage",
    text: "お土産に持ち帰れますか",
    reading: "おみやげにもちかえれますか",
  },
  {
    id: "ashita-shigoto",
    text: "明日も仕事なので帰ります",
    reading: "あしたもしごとなのでかえります",
  },
  {
    id: "onaji-mono",
    text: "隣の人と同じものを",
    reading: "となりのひととおなじものを",
  },
  {
    id: "mayoi",
    text: "醤油と塩で迷っています",
    reading: "しょうゆとしおでまよっています",
  },
  {
    id: "kodomo-utsuwa",
    text: "子供用の器はありますか",
    reading: "こどもようのうつわはありますか",
  },
  {
    id: "tsuki",
    text: "今夜は月がきれいですね",
    reading: "こんやはつきがきれいですね",
  },
];

export class StaticOrderRepository implements OrderRepository {
  async findAll(): Promise<Order[]> {
    return [...STATIC_ORDERS];
  }
}
