# Campaign / Odyssey Progression Unlock Overview

Generated from local files in `/Users/daschultheiss/android`.

## Scope

- `open_condition` is the source of truth for features unlocked by campaign stage progression. Runtime logic treats `stage_id` gates as unlocked when `UserDataManager:getCurrentStageId() >= unlock_condition_param`.
- `bag_battle_chapter` is the Odyssey/BagBattle chapter progression table. It links each BagBattle chapter to a campaign `main_chapter_id` and wave progression.
- Names are kept as localization keys unless a reliable extracted English value was available.
- Entries with gates like `99999`, `999999`, or `9999999` are included in a locked/future/dev section because they are technically stage-gated but not realistically reached in normal progression.

## Source Files

- `game_extracted/region_7584e4b000/client/config/open_condition/open_condition.json`
- `live_device_data/config_memory_extracted/client/config/open_condition/open_condition.json`
- `game_extracted/region_7584e4b000/client/config/bag_battle/bag_battle_chapter.json`
- `game_extracted/region_7584e4b000/client/config/bag_battle/bag_battle_wave.json`
- `live_device_data/config_memory_extracted/client/config/bag_battle/bag_battle_chapter.json`
- `game_extracted/region_7584e4b000/client/config/stage/chapter.json`
- `game_extracted/region_7584e4b000/client/config/stage/stage_map.json`
- `game_extracted/region_754c000000/NewConfig/stage.lua` for stage-id context such as chapter, next stage, and stage display key.
- `game_extracted/region_7584e4b000/client/config/active/treasure_hunt/treasure_hunt_*.json` for Realm Rover's internally named `treasure_hunt` mode.
- `game_extracted/region_7584e4b000/client/dist/lobby/lobby-main/UILobbyField.js` and `client/dist/default/util/OpenConditionUtil.js` for the Wilds tile and `treasure_hunt` runtime linkage.

## Integrity Checks

- Extracted and live-memory `open_condition.json` match: yes.
- Extracted and live-memory `bag_battle_chapter.json` match: yes.
- Parsed campaign stage entries from `stage.lua`: 2828.
- Open-condition entries with a `stage_id` gate: 169. Practical normal-progression gates below 99999: 137. Locked/future/dev gates at 99999+: 32.

## Quick Stage Unlock Summary

| Campaign stage gate | Chapter id | Stage name key | Next stage | Unlock count | Unlocks |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 |  | 1 | 5 | 10000:stage<br>20019:announcement<br>20030:hero_comment<br>20037:cd_key<br>20043:wechat_walkthrough |
| 1 | 1 | StageName_001 | 2 | 2 | 10001:bag<br>10066:question |
| 3 | 1 | StageName_003 | 4 | 4 | 10010:hero<br>10011:hero_detail<br>10013:hero_skill<br>20017:personalization |
| 4 | 1 | StageName_004 | 101 | 49 | 10004:mail<br>10005:chat<br>10006:friend<br>10012:illustration<br>10015:sanctuary<br>10016:gacha<br>10017:gacha_normal<br>10018:gacha_camp<br>10019:gacha_friend<br>10020:gacha_wish<br>10021:hero_evolution<br>10023:quest<br>10024:quest_daily<br>10025:quest_weekly<br>10026:quest_main<br>10052:hero_illustration<br>10054:divination<br>10056:main<br>10057:daily_divination<br>10058:ai_divination<br>10060:fate_star<br>10061:charge<br>10062:quest_life<br>10063:red_packet<br>10064:red_packet_take<br>20001:online_reward<br>20003:active_sign<br>20005:daily_forecast<br>20009:recharge_diamond_shop<br>20013:normal_month_card<br>20014:super_month_card<br>20024:login_total_hero<br>20029:vip (vip=1)<br>20031:stage_comment<br>20033:social_follower<br>20035:magically_change_generator<br>20038:rebate<br>20040:hero_skin<br>20072:pre_order<br>20073:sun_praise<br>20075:guoqing_huoyue<br>20076:hero_skin_discount<br>20080:hundred_boss<br>20081:mystery_shop<br>20082:hundred_red_packet<br>20087:web_charge_active<br>20098:monthly_mobius<br>20108:active_rank<br>20109:active_rank1 |
| 103 | 2 | StageName_103 | 104 | 1 | 20102:threedays_gift |
| 105 | 2 | StageName_105 | 106 | 1 | 10002:idle |
| 109 | 2 | StageName_109 | 201 | 12 | 10014:hero_equip<br>10028:shop<br>10029:shop_normal<br>10030:shop_dismiss<br>10037:field<br>10038:rogue<br>10039:shop_rogue<br>10068:battle_vip_aufo_fight_next (vip=2)<br>20022:charge_first<br>20026:recharge_first_shop<br>20048:recover_reward<br>20110:active_rank2 |
| 201 | 3 | StageName_201 | 202 | 1 | 10051:recommend |
| 204 | 3 | StageName_204 | 205 | 2 | 20104:recharge_hero2<br>20105:recharge_hero3 |
| 206 | 3 | StageName_206 | 207 | 1 | 20004:stage_race |
| 212 | 3 | StageName_212 | 301 | 9 | 10003:idle_quick<br>10040:tower<br>10041:tower_normal<br>20002:recruit<br>20012:growth_gift<br>20018:recruit_2<br>20021:popup_gift<br>20041:recharge_continuous<br>20089:recharge_activity |
| 309 | 4 | StageName_309 | 310 | 1 | 10035:guild |
| 318 | 4 | StageName_318 | 401 | 5 | 10050:shrine<br>20010:recharge_weekly_shop<br>20011:recharge_monthly_shop<br>20023:battlepass<br>20071:launch_event |
| 403 | 5 | StageName_403 | 404 | 1 | 20000:active |
| 409 | 5 | StageName_409 | 410 | 4 | 10044:arena<br>10045:shop_arena<br>10046:arena_normal<br>10048:friend_challenge |
| 424 | 5 | StageName_424 | 501 | 1 | 20032:weekly_activities |
| 503 | 6 | StageName_503 | 504 | 2 | 10033:hero_echo<br>20054:hero_replace |
| 518 | 6 | StageName_518 | 519 | 1 | 10049:bounty |
| 530 | 6 | StageName_530 | 601 | 1 | 20028:recharge_daily_shop |
| 603 | 7 | StageName_603 | 604 | 1 | 20016:bag_battle |
| 630 | 7 | StageName_630 | 701 | 5 | 10069:battle_speed_3<br>10081:shop_player_return<br>20055:gods_game<br>20057:gods_game_ui<br>20103:teampreset |
| 703 | 8 | StageName_703 | 704 | 1 | 10032:monument |
| 730 | 8 | StageName_730 | 801 | 2 | 20039:new_card_push<br>20090:recharge_hero |
| 803 | 9 | StageName_803 | 804 | 1 | 10031:talent |
| 830 | 9 | StageName_830 | 901 | 4 | 20006:god_trial<br>20051:active_boss<br>20052:monthly_bag_battle<br>20088:monthly_god_trial |
| 903 | 10 | StageName_903 | 904 | 2 | 10043:world_boss<br>10053:mercenary |
| 930 | 10 | StageName_930 | 1001 | 1 | 20053:hero_recycle |
| 1103 | 12 | StageName_1103 | 1104 | 1 | 10071:suits_power |
| 1303 | 14 | StageName_1303 | 1304 | 1 | 10042:tower_camp |
| 1503 | 16 | StageName_1503 | 1504 | 4 | 10047:arena_high<br>20044:gve_battle_skip<br>20045:normal_arena_skip<br>20046:arena_peak |
| 1530 | 16 | StageName_1530 | 1601 | 1 | 10075:battle_speed_4 |
| 1803 | 19 | StageName_1803 | 1804 | 2 | 20106:battlepass2<br>20111:active_rank3 |
| 1903 | 20 | StageName_1903 | 1904 | 1 | 10077:totem |
| 2503 | 26 | StageName_2503 | 2504 | 5 | 10079:shop_treasure_hunt (Expedition Shop)<br>20056:treasure_hunt (Realm Rover)<br>20074:collection<br>20112:active_rank4<br>20114:active_collection |
| 2945 | 30 | StageName_2945 | 3001 | 1 | 20113:active_rank5 |
| 3003 | 31 | StageName_3003 | 3004 | 1 | 20107:battlepass3 |
| 99999 |  |  |  | 1 | 20036:magically_change_traveler_diary |
| 999999 |  |  |  | 30 | 10027:quest_special<br>10055:sign_in<br>10059:whipping_boy<br>10067:skip_gacha_anim<br>10072:stage_skip<br>10073:rogue_autowin<br>10074:bounty_auto<br>10076:client_speed<br>10078:totem_skip_gacha<br>10080:player_return<br>20027:recharge_accumulate<br>20049:recover_reward_sale (vip=)<br>20050:ai_chat<br>20077:wansheng_huoyue<br>20078:wansheng_huanhua<br>20079:hundred_shuangdan<br>20083:hundred_fish_gacha<br>20084:hundred_huoyue<br>20085:hundred_days_chagre<br>20086:hundred_signin<br>20091:spring_festival_active<br>20092:spring_collect_word<br>20093:spring_boss<br>20094:spring_mystery_shop<br>20095:spring_signin<br>20096:spring_days_chagre<br>20097:spring_red_packet<br>20099:collection_skip_gacha<br>20100:returning_good_gift <br>20101:recharge_exchange_operation |
| 9999999 |  |  |  | 1 | 20025:recharge_rebate |

## Realm Rover

Realm Rover is the Wilds mode internally named `treasure_hunt` (Chinese config description `四方游历`). It is not `gods_game`; that earlier identification was incorrect. `UILobbyField` places `treasure_hunt_node` directly in the Wilds function list, alongside Arena, Tower, Roguelike, World Boss, and Bounty.

Its configured campaign milestone is **25-3**, represented internally by stage gate **2503** (`StageName_2503`). The stage record has `chapter_id = 26`, whose chapter name key is `ChapteName25`, confirming the player-facing chapter number.

| Open id | Internal key | Stage gate | Player-facing stage | Purpose |
| --- | --- | --- | --- | --- |
| 20056 | `treasure_hunt` | 2503 | 25-3 | Realm Rover gameplay gate |
| 10079 | `shop_treasure_hunt` | 2503 | 25-3 | Expedition Shop gate |

The tile can be visible before it is playable. Its Wilds lock state requires both the campaign condition and a currently supplied recurring-activity instance. The extracted schedule contains repeated Realm Rover runs, which explains why this fixed Wilds feature opens regularly even though its availability is delivered through the activity scheduler.

## Odyssey / BagBattle Chapter Gates

`main_chapter_id` is the campaign stage milestone tied to each BagBattle/Odyssey chapter. `unlock_wave_index` is the configured wave-index gate for that chapter. Wave count is derived by following `bag_battle_wave.next` from `begin_wave_id`.

| BagBattle chapter | Name key | Resolved name | Campaign main_chapter_id | Campaign chapter id | Campaign stage key | Unlock wave index | Begin wave | Over wave | Wave count | Wave chain | Initial coin | Grid | Refresh group | Scene id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | BAG_BATTLE_CHAPTER_NAME_01 | Crossroads Beyond Chronos | 603 | 7 | StageName_603 | 0 | 101 | 105 | 5 | 101, 102, 103, 104, 105 | 15 | 1 | 1 | 17 |
| 2 | BAG_BATTLE_CHAPTER_NAME_02 |  | 603 | 7 | StageName_603 | 5 | 201 | 208 | 8 | 201, 202, 203, 204, 205, 206, 207, 208 | 15 | 2 | 2 | 17 |
| 3 | BAG_BATTLE_CHAPTER_NAME_03 |  | 703 | 8 | StageName_703 | 8 | 301 | 310 | 10 | 301, 302, 303, 304, 305, 306, 307, 308, 309, 310 | 15 | 2 | 3 | 17 |
| 4 | BAG_BATTLE_CHAPTER_NAME_04 |  | 803 | 9 | StageName_803 | 10 | 401 | 403 | 3 | 401, 402, 403 | 75 | 3 | 4 | 17 |
| 5 | BAG_BATTLE_CHAPTER_NAME_05 |  | 1003 | 11 | StageName_1003 | 3 | 501 | 508 | 8 | 501, 502, 503, 504, 505, 506, 507, 508 | 30 | 5 | 5 | 17 |
| 6 | BAG_BATTLE_CHAPTER_NAME_06 |  | 1203 | 13 | StageName_1203 | 8 | 601 | 608 | 8 | 601, 602, 603, 604, 605, 606, 607, 608 | 30 | 2 | 6 | 17 |
| 7 | BAG_BATTLE_CHAPTER_NAME_07 |  | 1403 | 15 | StageName_1403 | 8 | 701 | 710 | 10 | 701, 702, 703, 704, 705, 706, 707, 708, 709, 710 | 30 | 4 | 7 | 17 |
| 8 | BAG_BATTLE_CHAPTER_NAME_08 |  | 1603 | 17 | StageName_1603 | 10 | 801 | 803 | 3 | 801, 802, 803 | 125 | 4 | 8 | 17 |
| 9 | BAG_BATTLE_CHAPTER_NAME_09 |  | 1803 | 19 | StageName_1803 | 3 | 901 | 910 | 10 | 901, 902, 903, 904, 905, 906, 907, 908, 909, 910 | 45 | 6 | 9 | 17 |
| 10 | BAG_BATTLE_CHAPTER_NAME_10 |  | 2003 | 21 | StageName_2003 | 10 | 1001 | 1006 | 6 | 1001, 1002, 1003, 1004, 1005, 1006 | 15 | 10 | 10 | 17 |
| 11 | BAG_BATTLE_CHAPTER_NAME_11 |  | 2203 | 23 | StageName_2203 | 6 | 1101 | 1108 | 8 | 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108 | 15 | 11 | 11 | 17 |
| 12 | BAG_BATTLE_CHAPTER_NAME_12 | The Amazing Phoenix | 2403 | 25 | StageName_2403 | 8 | 1201 | 1205 | 5 | 1201, 1202, 1203, 1204, 1205 | 10 | 12 | 12 | 17 |
| 13 | BAG_BATTLE_CHAPTER_NAME_13 | Final Destination | 2603 | 27 | StageName_2603 | 5 | 1301 | 1308 | 8 | 1301, 1302, 1303, 1304, 1305, 1306, 1307, 1308 | 15 | 13 | 13 | 17 |
| 14 | BAG_BATTLE_CHAPTER_NAME_14 | Bird's Dragon Quest | 2803 | 29 | StageName_2803 | 8 | 1401 | 1408 | 8 | 1401, 1402, 1403, 1404, 1405, 1406, 1407, 1408 | 15 | 14 | 14 | 17 |
| 15 | BAG_BATTLE_CHAPTER_NAME_15 | All-Encompassing Revenge | 3003 | 31 | StageName_3003 | 8 | 1501 | 1505 | 5 | 1501, 1502, 1503, 1504, 1505 | 15 | 15 | 15 | 17 |
| 16 | BAG_BATTLE_CHAPTER_NAME_16 | Absolute Silence | 3203 | 33 | StageName_3203 | 5 | 1601 | 1608 | 8 | 1601, 1602, 1603, 1604, 1605, 1606, 1607, 1608 | 30 | 16 | 16 | 17 |
| 17 | BAG_BATTLE_CHAPTER_NAME_17 | Zeus' Games | 3403 | 35 | StageName_3403 | 8 | 1701 | 1708 | 8 | 1701, 1702, 1703, 1704, 1705, 1706, 1707, 1708 | 30 | 17 | 17 | 17 |
| 18 | BAG_BATTLE_CHAPTER_NAME_18 |  | 3603 | 37 | StageName_3603 | 8 | 1801 | 1808 | 8 | 1801, 1802, 1803, 1804, 1805, 1806, 1807, 1808 | 30 | 18 | 18 | 17 |
| 19 | BAG_BATTLE_CHAPTER_NAME_19 |  | 3803 | 39 | StageName_3803 | 8 | 1901 | 1903 | 3 | 1901, 1902, 1903 | 45 | 19 | 19 | 17 |
| 999 | 测试关卡 |  | 99999999 |  |  | 9999999 | 99901 | 99906 | 6 | 99901, 99902, 99903, 99904, 99905, 99906 | 15 | 999 | 999 | 0 |

## All Practical Campaign-Stage Unlocks

| Stage gate | Stage key | Campaign chapter | Stage num | Open id | Feature key | Name key | Resolved name | Conditions | Other conditions | Window show | Container | UI stage | Open desc key | Icon |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 |  | 0 | 0 | 10000 | stage | OpenConditionName_10000 |  | stage_id=0 |  | 0 | 0 | 2 |  |  |
| 0 |  | 0 | 0 | 20019 | announcement | OpenConditionName_20016 |  | stage_id=0 |  | 0 | 0 | 0 |  |  |
| 0 |  | 0 | 0 | 20030 | hero_comment |  |  | stage_id=0 |  | 0 | 0 | 0 |  |  |
| 0 |  | 0 | 0 | 20037 | cd_key |  |  | stage_id=0 |  | 0 | 0 | 0 |  |  |
| 0 |  | 0 | 0 | 20043 | wechat_walkthrough | OpenConditionName_20042 |  | stage_id=0 |  | 0 | 0 | 0 |  |  |
| 1 | StageName_001 | 1 | 1 | 10001 | bag | OpenConditionName_10001 |  | stage_id=1 |  | 0 | 0 | 0 |  |  |
| 1 | StageName_001 | 1 | 1 | 10066 | question | OpenConditionName_10066 |  | stage_id=1 |  | 0 | 0 | 0 |  |  |
| 3 | StageName_003 | 1 | 3 | 10010 | hero | OpenConditionName_10010 |  | stage_id=3 |  | 0 | 0 | 0 | OpenConditionDes_10010 |  |
| 3 | StageName_003 | 1 | 3 | 10011 | hero_detail | OpenConditionName_10011 |  | stage_id=3 |  | 0 | 0 | 0 |  |  |
| 3 | StageName_003 | 1 | 3 | 10013 | hero_skill | OpenConditionName_10013 |  | stage_id=3 |  | 0 | 0 | 0 |  |  |
| 3 | StageName_003 | 1 | 3 | 20017 | personalization | OpenConditionName_20014 |  | stage_id=3 |  | 0 | 0 | 0 | OpenConditionDes_20017 |  |
| 4 | StageName_004 | 1 | 4 | 10004 | mail | OpenConditionName_10004 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10005 | chat | OpenConditionName_10005 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10006 | friend | OpenConditionName_10006 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10012 | illustration | OpenConditionName_10012 |  | stage_id=4 |  | 0 | 10015 | 1 |  |  |
| 4 | StageName_004 | 1 | 4 | 10015 | sanctuary | OpenConditionName_10015 |  | stage_id=4 |  | 0 | 10056 | 1 |  |  |
| 4 | StageName_004 | 1 | 4 | 10016 | gacha | OpenConditionName_10016 |  | stage_id=4 |  | 0 | 10056 | 1 | OpenConditionDes_10016 | Assets/New/Art/Texture/UI/Sanctuary/A_UI_Sanctuary_DrawCard_Icon.png |
| 4 | StageName_004 | 1 | 4 | 10017 | gacha_normal | OpenConditionName_10017 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10018 | gacha_camp | OpenConditionName_10018 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10019 | gacha_friend | OpenConditionName_10019 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10020 | gacha_wish | OpenConditionName_10020 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10021 | hero_evolution | OpenConditionName_10021 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10023 | quest | OpenConditionName_10023 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10024 | quest_daily | OpenConditionName_10024 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10025 | quest_weekly | OpenConditionName_10025 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10026 | quest_main | OpenConditionName_10026 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10052 | hero_illustration | OpenConditionName_10052 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10054 | divination | OpenConditionName_10054 |  | stage_id=4 |  | 0 | 10056 | 1 |  |  |
| 4 | StageName_004 | 1 | 4 | 10056 | main | OpenConditionName_10056 |  | stage_id=4 |  | 0 | 0 | 1 |  |  |
| 4 | StageName_004 | 1 | 4 | 10057 | daily_divination | OpenConditionName_10057 |  | stage_id=4 |  | 0 | 10056 | 0 | OpenConditionDes_10057 | Assets/New/Art/Texture/UI/Divination/A_UI_Divination_LuckTendency02_Btn.png |
| 4 | StageName_004 | 1 | 4 | 10058 | ai_divination | OpenConditionName_10058 |  | stage_id=4 |  | 0 | 10056 | 1 | OpenConditionDes_10058 | Assets/New/Art/Texture/UI/Divination/A_UI_Divination_TarotCardRoom_Btn.png |
| 4 | StageName_004 | 1 | 4 | 10060 | fate_star | OpenConditionName_10060 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10061 | charge | OpenConditionName_10061 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10062 | quest_life | OpenConditionName_10062 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10063 | red_packet | OpenConditionName_10063 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 10064 | red_packet_take | OpenConditionName_10064 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20001 | online_reward | OpenConditionName_20001 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20003 | active_sign | OpenConditionName_20003 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20005 | daily_forecast | OpenConditionName_20005 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20009 | recharge_diamond_shop | OpenConditionName_20007 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20013 | normal_month_card | OpenConditionName_20011 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20014 | super_month_card | OpenConditionName_20012 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20024 | login_total_hero | OpenConditionName_20021 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20029 | vip |  |  | stage_id=4; vip=1 | vip=1 | 0 | 0 | 0 | OpenConditionDes_20029 |  |
| 4 | StageName_004 | 1 | 4 | 20031 | stage_comment |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20033 | social_follower |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20035 | magically_change_generator |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20038 | rebate |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20040 | hero_skin |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20072 | pre_order |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20073 | sun_praise |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20075 | guoqing_huoyue |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20076 | hero_skin_discount |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20080 | hundred_boss | OpenConditionName_20080 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20081 | mystery_shop | OpenConditionName_20081 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20082 | hundred_red_packet | OpenConditionName_20082 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20087 | web_charge_active |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20098 | monthly_mobius | OpenConditionName_20098 |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20108 | active_rank |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 4 | StageName_004 | 1 | 4 | 20109 | active_rank1 |  |  | stage_id=4 |  | 0 | 0 | 0 |  |  |
| 103 | StageName_103 | 2 | 7 | 20102 | threedays_gift | OpenConditionName_20102 |  | stage_id=103 |  | 0 | 0 | 0 |  |  |
| 105 | StageName_105 | 2 | 9 | 10002 | idle | OpenConditionName_10002 |  | stage_id=105 |  | 0 | 10000 | 0 | OpenConditionDes_10002 | Assets/New/Art/Texture/UI/Sanctuary/A_UI_Sanctuary_HangupReward_Icon.png |
| 109 | StageName_109 | 2 | 13 | 10014 | hero_equip | OpenConditionName_10014 |  | stage_id=109 |  | 0 | 0 | 0 |  |  |
| 109 | StageName_109 | 2 | 13 | 10028 | shop | OpenConditionName_10028 |  | stage_id=109 |  | 0 | 0 | 0 |  |  |
| 109 | StageName_109 | 2 | 13 | 10029 | shop_normal | OpenConditionName_10029 |  | stage_id=109 |  | 0 | 0 | 0 |  |  |
| 109 | StageName_109 | 2 | 13 | 10030 | shop_dismiss | OpenConditionName_10030 |  | stage_id=109 |  | 0 | 0 | 0 |  |  |
| 109 | StageName_109 | 2 | 13 | 10037 | field | OpenConditionName_10037 |  | stage_id=109 |  | 0 | 0 | 1 |  |  |
| 109 | StageName_109 | 2 | 13 | 10038 | rogue | OpenConditionName_10038 |  | stage_id=109 |  | 0 | 10056 | 1 | OpenConditionDes_10038 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_Rougleike_Img.png |
| 109 | StageName_109 | 2 | 13 | 10039 | shop_rogue | OpenConditionName_10039 |  | stage_id=109 |  | 0 | 0 | 0 |  |  |
| 109 | StageName_109 | 2 | 13 | 10068 | battle_vip_aufo_fight_next |  |  | stage_id=109; vip=2 | vip=2 | 0 | 0 | 0 | OpenConditionDes_10068 |  |
| 109 | StageName_109 | 2 | 13 | 20022 | charge_first | OpenConditionName_20019 |  | stage_id=109 |  | 0 | 0 | 0 |  |  |
| 109 | StageName_109 | 2 | 13 | 20026 | recharge_first_shop |  |  | stage_id=109 |  | 0 | 0 | 0 |  |  |
| 109 | StageName_109 | 2 | 13 | 20048 | recover_reward |  |  | stage_id=109 |  | 0 | 0 | 0 |  |  |
| 109 | StageName_109 | 2 | 13 | 20110 | active_rank2 |  |  | stage_id=109 |  | 0 | 0 | 0 |  |  |
| 201 | StageName_201 | 3 | 14 | 10051 | recommend | OpenConditionName_10051 |  | stage_id=201 |  | 0 | 0 | 0 |  |  |
| 204 | StageName_204 | 3 | 17 | 20104 | recharge_hero2 | OpenConditionName_20104 |  | stage_id=204 |  | 0 | 0 | 0 |  |  |
| 204 | StageName_204 | 3 | 17 | 20105 | recharge_hero3 | OpenConditionName_20105 |  | stage_id=204 |  | 0 | 0 | 0 |  |  |
| 206 | StageName_206 | 3 | 19 | 20004 | stage_race | OpenConditionName_20004 |  | stage_id=206 |  | 0 | 10000 | 0 |  | Assets/New/Art/Texture/UI/WorldMain/A_UI_WorldMain_StageRace_Icon.png |
| 212 | StageName_212 | 3 | 25 | 10003 | idle_quick | OpenConditionName_10003 |  | stage_id=212 |  | 0 | 0 | 0 |  |  |
| 212 | StageName_212 | 3 | 25 | 10040 | tower | OpenConditionName_10040 |  | stage_id=212 |  | 0 | 0 | 0 |  |  |
| 212 | StageName_212 | 3 | 25 | 10041 | tower_normal | OpenConditionName_10041 |  | stage_id=212 |  | 1 | 10056 | 1 | OpenConditionDes_10041 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_Tower_Img.png |
| 212 | StageName_212 | 3 | 25 | 20002 | recruit | OpenConditionName_20002 |  | stage_id=212 |  | 0 | 0 | 0 |  |  |
| 212 | StageName_212 | 3 | 25 | 20012 | growth_gift | OpenConditionName_20010 |  | stage_id=212 |  | 0 | 0 | 0 |  |  |
| 212 | StageName_212 | 3 | 25 | 20018 | recruit_2 | OpenConditionName_20015 |  | stage_id=212 |  | 0 | 0 | 0 |  |  |
| 212 | StageName_212 | 3 | 25 | 20021 | popup_gift | OpenConditionName_20018 |  | stage_id=212 |  | 0 | 0 | 0 |  |  |
| 212 | StageName_212 | 3 | 25 | 20041 | recharge_continuous | OpenConditionName_20041 |  | stage_id=212 |  | 0 | 0 | 0 |  |  |
| 212 | StageName_212 | 3 | 25 | 20089 | recharge_activity |  |  | stage_id=212 |  | 0 | 0 | 0 |  |  |
| 309 | StageName_309 | 4 | 34 | 10035 | guild | OpenConditionName_10035 |  | stage_id=309 |  | 1 | 10056 | 1 | OpenConditionDes_10035 | Assets/New/Art/Texture/UI/Sanctuary/A_UI_Sanctuary_Alliance_Icon.png |
| 318 | StageName_318 | 4 | 43 | 10050 | shrine | OpenConditionName_10050 |  | stage_id=318 |  | 1 | 10056 | 1 | OpenConditionDes_10050 | Assets/New/Art/Texture/UI/LobbyMain/A_UI_WorldMain_Shrine_Btn.png |
| 318 | StageName_318 | 4 | 43 | 20010 | recharge_weekly_shop | OpenConditionName_20008 |  | stage_id=318 |  | 0 | 0 | 0 |  |  |
| 318 | StageName_318 | 4 | 43 | 20011 | recharge_monthly_shop | OpenConditionName_20009 |  | stage_id=318 |  | 0 | 0 | 0 |  |  |
| 318 | StageName_318 | 4 | 43 | 20023 | battlepass | OpenConditionName_20020 |  | stage_id=318 |  | 0 | 0 | 0 |  |  |
| 318 | StageName_318 | 4 | 43 | 20071 | launch_event |  |  | stage_id=318 |  | 0 | 0 | 0 |  |  |
| 403 | StageName_403 | 5 | 46 | 20000 | active | OpenConditionName_20000 |  | stage_id=403 |  | 0 | 0 | 0 |  |  |
| 409 | StageName_409 | 5 | 52 | 10044 | arena | OpenConditionName_10044 |  | stage_id=409 |  | 0 | 10037 | 1 |  |  |
| 409 | StageName_409 | 5 | 52 | 10045 | shop_arena | OpenConditionName_10045 |  | stage_id=409 |  | 0 | 0 | 0 |  |  |
| 409 | StageName_409 | 5 | 52 | 10046 | arena_normal | OpenConditionName_10046 |  | stage_id=409 |  | 1 | 10037 | 1 | OpenConditionDes_10046 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_Arena_Img.png |
| 409 | StageName_409 | 5 | 52 | 10048 | friend_challenge | OpenConditionName_10048 |  | stage_id=409 |  | 0 | 0 | 0 |  |  |
| 424 | StageName_424 | 5 | 67 | 20032 | weekly_activities | OpenConditionName_20032 |  | stage_id=424 |  | 0 | 0 | 0 |  |  |
| 503 | StageName_503 | 6 | 70 | 10033 | hero_echo | OpenConditionName_10033 |  | stage_id=503 |  | 1 | 10056 | 1 | OpenConditionDes_10033 | Assets/New/Art/Texture/UI/Sanctuary/A_UI_Sanctuary_LevelSynchronization_Icon.png |
| 503 | StageName_503 | 6 | 70 | 20054 | hero_replace | OpenConditionName_20054 |  | stage_id=503 |  | 0 | 0 | 0 |  |  |
| 518 | StageName_518 | 6 | 85 | 10049 | bounty | OpenConditionName_10049 |  | stage_id=518 |  | 1 | 10056 | 1 | OpenConditionDes_10049 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_PostReward_Img.png |
| 530 | StageName_530 | 6 | 97 | 20028 | recharge_daily_shop |  |  | stage_id=530 |  | 0 | 0 | 0 |  |  |
| 603 | StageName_603 | 7 | 100 | 20016 | bag_battle | OpenConditionName_20013 |  | stage_id=603 |  | 1 | 10000 | 2 | OpenConditionDes_20016 | Assets/New/Art/Texture/UI/WorldMain/A_UI_WorldMain_BagBattle_Entrance01_Btn.png |
| 630 | StageName_630 | 7 | 127 | 10069 | battle_speed_3 |  |  | stage_id=630 |  | 0 | 0 | 0 | OpenConditionDes_10069 |  |
| 630 | StageName_630 | 7 | 127 | 10081 | shop_player_return |  |  | stage_id=630 |  | 0 | 0 | 0 |  |  |
| 630 | StageName_630 | 7 | 127 | 20055 | gods_game | OpenConditionName_20055 |  | stage_id=630 |  | 0 | 0 | 0 |  |  |
| 630 | StageName_630 | 7 | 127 | 20057 | gods_game_ui | OpenConditionName_20055 |  | stage_id=630 |  | 0 | 0 | 0 |  |  |
| 630 | StageName_630 | 7 | 127 | 20103 | teampreset | OpenConditionName_20103 |  | stage_id=630 |  | 0 | 0 | 0 |  |  |
| 703 | StageName_703 | 8 | 130 | 10032 | monument | OpenConditionName_10032 |  | stage_id=703 |  | 1 | 10056 | 1 | OpenConditionDes_10032 | Assets/New/Art/Texture/UI/Sanctuary/A_UI_Sanctuary_Monument_Icon.png |
| 730 | StageName_730 | 8 | 157 | 20039 | new_card_push |  |  | stage_id=730 |  | 0 | 0 | 0 |  |  |
| 730 | StageName_730 | 8 | 157 | 20090 | recharge_hero | OpenConditionName_20090 |  | stage_id=730 |  | 0 | 0 | 0 |  |  |
| 803 | StageName_803 | 9 | 160 | 10031 | talent | OpenConditionName_10031 |  | stage_id=803 |  | 1 | 10056 | 1 | OpenConditionDes_10031 | Assets/New/Art/Texture/UI/Sanctuary/A_UI_Sanctuary_TeamDevelopment_Icon.png |
| 830 | StageName_830 | 9 | 187 | 20006 | god_trial | OpenConditionName_20006 |  | stage_id=830 |  | 0 | 0 | 0 |  |  |
| 830 | StageName_830 | 9 | 187 | 20051 | active_boss | OpenConditionName_20051 |  | stage_id=830 |  | 0 | 0 | 0 |  |  |
| 830 | StageName_830 | 9 | 187 | 20052 | monthly_bag_battle | OpenConditionName_20052 |  | stage_id=830 |  | 0 | 0 | 0 |  |  |
| 830 | StageName_830 | 9 | 187 | 20088 | monthly_god_trial | OpenConditionName_20006 |  | stage_id=830 |  | 0 | 0 | 0 |  |  |
| 903 | StageName_903 | 10 | 190 | 10043 | world_boss | OpenConditionName_10043 |  | stage_id=903 |  | 1 | 10037 | 1 | OpenConditionDes_10043 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_WorldBoss_Img.png |
| 903 | StageName_903 | 10 | 190 | 10053 | mercenary | OpenConditionName_10053 |  | stage_id=903 |  | 0 | 0 | 0 |  |  |
| 930 | StageName_930 | 10 | 217 | 20053 | hero_recycle | OpenConditionName_20053 |  | stage_id=930 |  | 0 | 0 | 0 |  |  |
| 1103 | StageName_1103 | 12 | 250 | 10071 | suits_power | OpenConditionName_10071 |  | stage_id=1103 |  | 1 | 10000 | 2 | OpenConditionDes_10071 | Assets/New/Art/Texture/UI/WorldMain/A_UI_WorldMain_SuitsPower_Entrance_Btn.png |
| 1303 | StageName_1303 | 14 | 310 | 10042 | tower_camp | OpenConditionName_10042 |  | stage_id=1303 |  | 1 | 10037 | 1 | OpenConditionDes_10042 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_Tower_Img.png |
| 1503 | StageName_1503 | 16 | 370 | 10047 | arena_high | OpenConditionName_10047 |  | stage_id=1503 |  | 1 | 10044 | 1 | OpenConditionDes_10047 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_Arena_Img.png |
| 1503 | StageName_1503 | 16 | 370 | 20044 | gve_battle_skip |  |  | stage_id=1503 |  | 0 | 0 | 0 | OpenConditionDes_20044 |  |
| 1503 | StageName_1503 | 16 | 370 | 20045 | normal_arena_skip |  |  | stage_id=1503 |  | 0 | 0 | 0 | OpenConditionDes_20045 |  |
| 1503 | StageName_1503 | 16 | 370 | 20046 | arena_peak | OpenConditionName_20046 |  | stage_id=1503 |  | 0 | 0 | 0 |  |  |
| 1530 | StageName_1530 | 16 | 397 | 10075 | battle_speed_4 |  |  | stage_id=1530 |  | 0 | 0 | 0 | OpenConditionDes_10075 |  |
| 1803 | StageName_1803 | 19 | 460 | 20106 | battlepass2 | OpenConditionName_20020 |  | stage_id=1803 |  | 0 | 0 | 0 |  |  |
| 1803 | StageName_1803 | 19 | 460 | 20111 | active_rank3 |  |  | stage_id=1803 |  | 0 | 0 | 0 |  |  |
| 1903 | StageName_1903 | 20 | 490 | 10077 | totem | OpenConditionName_10077 |  | stage_id=1903 |  | 1 | 10015 | 1 | OpenConditionDes_10077 | Assets/New/Art/Texture/UI/Totem/A_UI_Totem_NewFunction_Img.png |
| 2503 | StageName_2503 | 26 | 760 | 10079 | shop_treasure_hunt |  | Expedition Shop | stage_id=2503 |  | 0 | 0 | 0 |  |  |
| 2503 | StageName_2503 | 26 | 760 | 20056 | treasure_hunt | OpenConditionName_20056 | Realm Rover | stage_id=2503 |  | 0 | 0 | 0 |  |  |
| 2503 | StageName_2503 | 26 | 760 | 20074 | collection |  |  | stage_id=2503 |  | 0 | 0 | 0 |  |  |
| 2503 | StageName_2503 | 26 | 760 | 20112 | active_rank4 |  |  | stage_id=2503 |  | 0 | 0 | 0 |  |  |
| 2503 | StageName_2503 | 26 | 760 | 20114 | active_collection |  |  | stage_id=2503 |  | 0 | 0 | 0 |  |  |
| 2945 | StageName_2945 | 30 | 982 | 20113 | active_rank5 |  |  | stage_id=2945 |  | 0 | 0 | 0 |  |  |
| 3003 | StageName_3003 | 31 | 985 | 20107 | battlepass3 | OpenConditionName_20020 |  | stage_id=3003 |  | 0 | 0 | 0 |  |  |

## Visible Unlock Popups / Window-Show Entries

These are stage-gated entries with `window_show = 1`, so they are the ones most likely intended to be surfaced as campaign progression unlock announcements.

| Stage gate | Stage key | Open id | Feature key | Name key | Resolved name | Container | Icon |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 212 | StageName_212 | 10041 | tower_normal | OpenConditionName_10041 |  | 10056 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_Tower_Img.png |
| 309 | StageName_309 | 10035 | guild | OpenConditionName_10035 |  | 10056 | Assets/New/Art/Texture/UI/Sanctuary/A_UI_Sanctuary_Alliance_Icon.png |
| 318 | StageName_318 | 10050 | shrine | OpenConditionName_10050 |  | 10056 | Assets/New/Art/Texture/UI/LobbyMain/A_UI_WorldMain_Shrine_Btn.png |
| 409 | StageName_409 | 10046 | arena_normal | OpenConditionName_10046 |  | 10037 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_Arena_Img.png |
| 503 | StageName_503 | 10033 | hero_echo | OpenConditionName_10033 |  | 10056 | Assets/New/Art/Texture/UI/Sanctuary/A_UI_Sanctuary_LevelSynchronization_Icon.png |
| 518 | StageName_518 | 10049 | bounty | OpenConditionName_10049 |  | 10056 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_PostReward_Img.png |
| 603 | StageName_603 | 20016 | bag_battle | OpenConditionName_20013 |  | 10000 | Assets/New/Art/Texture/UI/WorldMain/A_UI_WorldMain_BagBattle_Entrance01_Btn.png |
| 703 | StageName_703 | 10032 | monument | OpenConditionName_10032 |  | 10056 | Assets/New/Art/Texture/UI/Sanctuary/A_UI_Sanctuary_Monument_Icon.png |
| 803 | StageName_803 | 10031 | talent | OpenConditionName_10031 |  | 10056 | Assets/New/Art/Texture/UI/Sanctuary/A_UI_Sanctuary_TeamDevelopment_Icon.png |
| 903 | StageName_903 | 10043 | world_boss | OpenConditionName_10043 |  | 10037 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_WorldBoss_Img.png |
| 1103 | StageName_1103 | 10071 | suits_power | OpenConditionName_10071 |  | 10000 | Assets/New/Art/Texture/UI/WorldMain/A_UI_WorldMain_SuitsPower_Entrance_Btn.png |
| 1303 | StageName_1303 | 10042 | tower_camp | OpenConditionName_10042 |  | 10037 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_Tower_Img.png |
| 1503 | StageName_1503 | 10047 | arena_high | OpenConditionName_10047 |  | 10044 | Assets/New/Art/Texture/UI/OpenField/A_UI_OpenField_Arena_Img.png |
| 1903 | StageName_1903 | 10077 | totem | OpenConditionName_10077 |  | 10015 | Assets/New/Art/Texture/UI/Totem/A_UI_Totem_NewFunction_Img.png |

## Locked / Future / Dev Stage Gates

| Stage gate | Open id | Feature key | Name key | Conditions | Window show | Container | Open desc key |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 99999 | 20036 | magically_change_traveler_diary |  | stage_id=99999 | 0 | 0 |  |
| 999999 | 10027 | quest_special | OpenConditionName_10027 | stage_id=999999 | 0 | 0 |  |
| 999999 | 10055 | sign_in | OpenConditionName_10055 | stage_id=999999 | 0 | 0 |  |
| 999999 | 10059 | whipping_boy | OpenConditionName_10059 | stage_id=999999 | 0 | 0 |  |
| 999999 | 10067 | skip_gacha_anim | OpenConditionName_10067 | stage_id=999999 | 0 | 0 | OpenConditionDes_10067 |
| 999999 | 10072 | stage_skip |  | stage_id=999999 | 0 | 0 | OpenConditionDes_10072 |
| 999999 | 10073 | rogue_autowin |  | stage_id=999999 | 0 | 0 | OpenConditionDes_10073 |
| 999999 | 10074 | bounty_auto |  | stage_id=999999 | 0 | 0 | OpenConditionDes_10074 |
| 999999 | 10076 | client_speed |  | stage_id=999999 | 0 | 0 | OpenConditionDes_10076 |
| 999999 | 10078 | totem_skip_gacha | OpenConditionName_10078 | stage_id=999999 | 0 | 0 | OpenConditionDes_10078 |
| 999999 | 10080 | player_return |  | stage_id=999999 | 0 | 0 |  |
| 999999 | 20027 | recharge_accumulate | OpenConditionName_20022 | stage_id=999999 | 0 | 0 | OpenConditionDes_20027 |
| 999999 | 20049 | recover_reward_sale |  | stage_id=999999; vip= | 0 | 0 | OpenConditionDes_20049 |
| 999999 | 20050 | ai_chat |  | stage_id=999999 | 0 | 0 |  |
| 999999 | 20077 | wansheng_huoyue | OpenConditionName_20077 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20078 | wansheng_huanhua | OpenConditionName_20078 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20079 | hundred_shuangdan | OpenConditionName_20079 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20083 | hundred_fish_gacha | OpenConditionName_20083 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20084 | hundred_huoyue | OpenConditionName_20084 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20085 | hundred_days_chagre | OpenConditionName_20085 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20086 | hundred_signin | OpenConditionName_20086 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20091 | spring_festival_active | OpenConditionName_20091 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20092 | spring_collect_word | OpenConditionName_20092 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20093 | spring_boss | OpenConditionName_20093 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20094 | spring_mystery_shop | OpenConditionName_20094 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20095 | spring_signin | OpenConditionName_20095 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20096 | spring_days_chagre | OpenConditionName_20096 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20097 | spring_red_packet | OpenConditionName_20097 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20099 | collection_skip_gacha |  | stage_id=999999 | 0 | 0 |  |
| 999999 | 20100 | returning_good_gift  | OpenConditionName_20101 | stage_id=999999 | 0 | 0 |  |
| 999999 | 20101 | recharge_exchange_operation |  | stage_id=999999 | 0 | 0 |  |
| 9999999 | 20025 | recharge_rebate |  | stage_id=9999999 | 0 | 0 |  |

## Non-Stage Open Conditions

These are not directly unlocked by campaign stage progression, but they are in the same `open_condition` table and can combine with stage gates elsewhere.

| Open id | Feature key | Name key | Resolved name | Conditions | Window show | Container | UI stage | Open desc key |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10022 | hero_reborn | OpenConditionName_10022 |  | ten_gacha=10 | 0 | 0 | 0 |  |
| 10034 | gacha_super | OpenConditionName_10034 |  | common_and_race_gacha=400 | 0 | 0 | 0 |  |
| 10036 | shop_guild | OpenConditionName_10036 |  | has_guild=1 | 0 | 0 | 0 |  |
| 10065 | alliance_boss | OpenConditionName_10065 |  | has_guild=1 | 0 | 0 | 0 |  |
| 10070 | gacha_super_enter | OpenConditionName_10034 |  | common_and_race_gacha=750 | 1 | 10016 | 1 | OpenConditionDes_10070 |
| 20020 | conquest | OpenConditionName_20017 |  | has_guild=1 | 0 | 0 | 0 |  |
| 20042 | charge_star | OpenConditionName_20042 |  | common_and_race_gacha=750 | 0 | 0 | 0 |  |
| 20047 | guild_gvg | OpenConditionName_20047 |  | has_guild= | 0 | 0 | 0 |  |

## Campaign Chapter Table

| Chapter id | Chapter name key | Unlock level | Previous chapter | Next chapter | Map id | First stage from stage_map index | Fog name | Chapter focus |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ChapteName0 | 0 | 0 | 1 | 1 | 1 |  | chaper_0 |
| 2 | ChapteName1 | 0 | 1 | 2 | 1 | 101 |  |  |
| 3 | ChapteName2 | 0 | 2 | 3 | 2 | 201 | StageMapFog1_3 | chaper_3 |
| 4 | ChapteName3 | 0 | 3 | 4 | 2 | 301 | StageMapFog1_4 | chaper_4 |
| 5 | ChapteName4 | 0 | 4 | 5 | 2 | 401 | StageMapFog1_5 | chaper_5 |
| 6 | ChapteName5 | 0 | 5 | 6 | 3 | 501 | StageMapFog2_1 | chaper_6 |
| 7 | ChapteName6 | 0 | 6 | 7 | 3 | 601 | StageMapFog2_2 | chaper_7 |
| 8 | ChapteName7 | 0 | 7 | 8 | 3 | 701 | StageMapFog2_3 | chaper_8 |
| 9 | ChapteName8 | 0 | 8 | 9 | 4 | 801 | StageMapFog3_1 | chaper_9 |
| 10 | ChapteName9 | 0 | 9 | 10 | 4 | 901 | StageMapFog3_2 | chaper_10 |
| 11 | ChapteName10 | 0 | 10 | 11 | 4 | 1001 | StageMapFog3_3 | chaper_11 |
| 12 | ChapteName11 | 0 | 11 | 12 | 5 | 1101 | StageMapFog4_1 | chaper_12 |
| 13 | ChapteName12 | 0 | 12 | 13 | 5 | 1201 | StageMapFog4_2 | chaper_13 |
| 14 | ChapteName13 | 0 | 13 | 14 | 5 | 1301 | StageMapFog4_3 | chaper_14 |
| 15 | ChapteName14 | 0 | 14 | 15 | 6 | 1401 | StageMapFog5_1 | chaper_15 |
| 16 | ChapteName15 | 0 | 15 | 16 | 6 | 1501 | StageMapFog5_2 | chaper_16 |
| 17 | ChapteName16 | 0 | 16 | 17 | 6 | 1601 | StageMapFog5_3 | chaper_17 |
| 18 | ChapteName17 | 0 | 17 | 18 | 7 | 1701 | StageMapFog6_1 | chaper_18 |
| 19 | ChapteName18 | 0 | 18 | 19 | 7 | 1801 | StageMapFog6_2 | chaper_19 |
| 20 | ChapteName19 | 0 | 19 | 20 | 7 | 1901 | StageMapFog6_3 | chaper_20 |
| 21 | ChapteName20 | 0 | 20 | 21 | 8 | 2001 | StageMapFog7_1 | chaper_21 |
| 22 | ChapteName21 | 0 | 21 | 22 | 8 | 2101 | StageMapFog7_2 | chaper_22 |
| 23 | ChapteName22 | 0 | 22 | 23 | 8 | 2201 | StageMapFog7_3 | chaper_23 |
| 24 | ChapteName23 | 0 | 23 | 24 | 9 | 2301 | StageMapFog8_1 | chaper_24 |
| 25 | ChapteName24 | 0 | 24 | 25 | 9 | 2401 | StageMapFog8_2 | chaper_25 |
| 26 | ChapteName25 | 0 | 25 | 26 | 9 | 2501 | StageMapFog8_3 | chaper_26 |
| 27 | ChapteName26 | 0 | 26 | 27 | 10 | 2601 | StageMapFog9_1 | chaper_27 |
| 28 | ChapteName27 | 0 | 27 | 28 | 10 | 2701 | StageMapFog9_2 | chaper_28 |
| 29 | ChapteName28 | 0 | 28 | 29 | 10 | 2801 | StageMapFog9_3 | chaper_29 |
| 30 | ChapteName29 | 0 | 29 | 30 | 11 | 2901 | StageMapFog10_1 | chaper_30 |
| 31 | ChapteName30 | 0 | 30 | 31 | 11 | 3001 | StageMapFog10_2 | chaper_31 |
| 32 | ChapteName31 | 0 | 31 | 32 | 11 | 3101 | StageMapFog10_3 | chaper_32 |
| 33 | ChapteName32 | 0 | 32 | 33 | 12 | 3201 | StageMapFog11_1 | chaper_33 |
| 34 | ChapteName33 | 0 | 33 | 34 | 12 | 3301 | StageMapFog11_2 | chaper_34 |
| 35 | ChapteName34 | 0 | 34 | 35 | 12 | 3401 | StageMapFog11_3 | chaper_35 |
| 36 | ChapteName35 | 0 | 35 | 36 | 13 | 3501 | StageMapFog12_1 | chaper_36 |
| 37 | ChapteName36 | 0 | 36 | 37 | 13 | 3601 | StageMapFog12_2 | chaper_37 |
| 38 | ChapteName37 | 0 | 37 | 38 | 13 | 3701 | StageMapFog12_3 | chaper_38 |
| 39 | ChapteName38 | 0 | 38 | 39 | 14 | 3801 | StageMapFog13_1 | chaper_39 |
| 40 | ChapteName39 | 0 | 39 | 40 | 14 | 3901 | StageMapFog13_2 | chaper_40 |
| 41 | ChapteName40 | 0 | 40 | 41 | 14 | 4001 | StageMapFog13_3 | chaper_41 |
| 42 | ChapteName41 | 0 | 41 | 42 | 15 | 4101 | StageMapFog14_1 | chaper_42 |
| 43 | ChapteName42 | 0 | 42 | 43 | 15 | 4201 | StageMapFog14_2 | chaper_43 |
| 44 | ChapteName43 | 0 | 43 | 44 | 15 | 4301 | StageMapFog14_3 | chaper_44 |
| 45 | ChapteName44 | 0 | 44 | 45 | 16 | 4401 | StageMapFog15_1 | chaper_45 |
| 46 | ChapteName45 | 0 | 45 | 46 | 16 | 4501 | StageMapFog15_2 | chaper_46 |
| 47 | ChapteName46 | 0 | 46 | 47 | 16 | 4601 | StageMapFog15_3 | chaper_47 |
| 48 | ChapteName47 | 0 | 47 | 48 | 17 | 4701 | StageMapFog16_1 | chaper_48 |
| 49 | ChapteName48 | 0 | 48 | 49 | 17 | 4801 | StageMapFog16_2 | chaper_49 |
| 50 | ChapteName49 | 0 | 49 | 50 | 17 | 4901 | StageMapFog16_3 | chaper_50 |
| 51 | ChapteName50 | 0 | 50 | 51 | 18 | 5001 | StageMapFog17_1 | chaper_51 |
| 52 | ChapteName51 | 0 | 51 | 52 | 18 | 5101 | StageMapFog17_2 | chaper_52 |
| 53 | ChapteName52 | 0 | 52 | 53 | 18 | 5201 | StageMapFog17_3 | chaper_53 |
| 54 | ChapteName53 | 0 | 53 | 54 | 19 | 5301 | StageMapFog18_1 | chaper_54 |
| 55 | ChapteName54 | 0 | 54 | 55 | 19 | 5401 | StageMapFog18_2 | chaper_55 |
| 56 | ChapteName55 | 0 | 55 | 56 | 19 | 5501 | StageMapFog18_3 | chaper_56 |
| 57 | ChapteName56 | 0 | 56 | 57 | 20 | 5601 | StageMapFog19_1 | chaper_57 |
| 58 | ChapteName57 | 0 | 57 | 58 | 20 | 5701 | StageMapFog19_2 | chaper_58 |
| 59 | ChapteName58 | 0 | 58 | 59 | 20 | 5801 | StageMapFog19_3 | chaper_59 |
| 60 | ChapteName59 | 0 | 59 | 60 | 21 | 5901 | StageMapFog20_1 | chaper_60 |
| 61 | ChapteName60 | 0 | 60 | 61 | 21 | 6001 | StageMapFog20_2 | chaper_61 |
| 62 | ChapteName61 | 0 | 61 | 62 | 21 | 6101 | StageMapFog20_3 | chaper_62 |
| 63 | ChapteName62 | 0 | 62 | 63 | 22 | 6201 | StageMapFog21_1 | chaper_63 |
| 64 | ChapteName63 | 0 | 63 | 64 | 22 | 6301 | StageMapFog21_2 | chaper_64 |
| 65 | ChapteName64 | 0 | 64 | 65 | 22 | 6401 | StageMapFog21_3 | chaper_65 |
| 66 | ChapteName65 | 0 | 65 | 66 | 23 | 6501 | StageMapFog22_1 | chaper_66 |
| 67 | ChapteName66 | 0 | 66 | 67 | 23 | 6601 | StageMapFog22_2 | chaper_67 |
| 68 | ChapteName67 | 0 | 67 | 68 | 23 | 6701 | StageMapFog22_3 | chaper_68 |
| 69 | ChapteName68 | 0 | 68 | 69 | 24 | 6801 | StageMapFog23_1 | chaper_69 |
| 70 | ChapteName69 | 0 | 69 | 70 | 24 | 6901 | StageMapFog23_2 | chaper_70 |
| 71 | ChapteName70 | 0 | 70 | 71 | 24 | 7001 | StageMapFog23_3 | chaper_71 |

## Campaign Map Groups

| Map id | Map path | Chapters |
| --- | --- | --- |
| 1 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_0.prefab | 1, 2 |
| 2 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_1.prefab | 3, 4, 5 |
| 3 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_2.prefab | 6, 7, 8 |
| 4 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_3.prefab | 9, 10, 11 |
| 5 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_4.prefab | 12, 13, 14 |
| 6 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_5.prefab | 15, 16, 17 |
| 7 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_6.prefab | 18, 19, 20 |
| 8 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_7.prefab | 21, 22, 23 |
| 9 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_8.prefab | 24, 25, 26 |
| 10 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_9.prefab | 27, 28, 29 |
| 11 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_10.prefab | 30, 31, 32 |
| 12 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_11.prefab | 33, 34, 35 |
| 13 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_12.prefab | 36, 37, 38 |
| 14 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_13.prefab | 39, 40, 41 |
| 15 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_14.prefab | 42, 43, 44 |
| 16 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_15.prefab | 45, 46, 47 |
| 17 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_16.prefab | 48, 49, 50 |
| 18 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_17.prefab | 51, 52, 53 |
| 19 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_18.prefab | 54, 55, 56 |
| 20 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_19.prefab | 57, 58, 59 |
| 21 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_20.prefab | 60, 61, 62 |
| 22 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_21.prefab | 63, 64, 65 |
| 23 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_22.prefab | 66, 67, 68 |
| 24 | Assets/New/Cooperation/UI/MainStageMap/StageMapSet/StageMap_23.prefab | 69, 70, 71 |

## Stage Constants

```json
{
  "move_stage_time": 0.8,
  "fog_anim_time": 2,
  "rise_chapter_anim_time": 1,
  "fall_chapter_anim_time": 1.5,
  "refresh_first_stage_delay": 0.5,
  "focus_chapter_ease": 19,
  "move_stage_ease": 19,
  "map_bgm": "bgm_travel",
  "near_player_open_condition": 201,
  "first_stage_formation_hide_hero_ids": [
    201
  ],
  "idle_efficiency_show_stage": 106,
  "stage_map_anim_max_speed_rate": 5,
  "stage_map_accelerated_speed": 0.2,
  "stage_map_anim_max_normal_speed_count": 3,
  "play_enter_formation_transition_stage_ids": [
    1
  ],
  "team_count_mode_extension_id_map": {
    "1": 101,
    "2": 102,
    "3": 103,
    "4": 104,
    "5": 105,
    "__m": 1
  }
}
```

## Notes

- The campaign stage config uses localization keys such as `StageName_603`, so this overview keeps those keys instead of guessing display text.
- `stage.lua` is decompiled Lua and uses temporary table ids internally. The report only uses fields from entries that contain an explicit `stage_id`.
- `bag_battle_chapter` includes chapter `999` as a test chapter; it is listed in the Odyssey/BagBattle table with its unrealistic `main_chapter_id = 99999999`.
