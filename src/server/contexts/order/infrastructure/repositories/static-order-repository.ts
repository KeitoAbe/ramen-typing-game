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
];

export class StaticOrderRepository implements OrderRepository {
  async findAll(): Promise<Order[]> {
    return [...STATIC_ORDERS];
  }
}
