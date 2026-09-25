# Tower Defense hero audio map

Source folders: `~/Downloads/skill_audio` (attack + ultimate) and `~/Downloads/hero_voices` (placement voice).
APK internal names resolved through `src/data/game_id_mapping.json` (`internal_name`, `spine_name`, `skill_icon_prefix`).

Pick rules:
- Attack: `*attack1.wav`, else first `attack*` / `hit` file
- Ultimate: `*skill3.wav`, else first `skill3_*`
- Voice: shortest runtime of the hero's voice lines

## TD roster (21 heroes) - all complete

| Hero | Internal (APK) | Attack | Ultimate | Voice | Attack file | Ultimate file | Voice file (sec) |
|---|---|:-:|:-:|:-:|---|---|---|
| amunra | amengla | ✅ | ✅ | ✅ | SW_H_AMengLa@attack1.wav | SW_H_AMengLa@skill3.wav | amengla901.wav (3.21) |
| anubis | anubisi | ✅ | ✅ | ✅ | SW_H_ANuBiSi@attack1.wav | SW_H_ANuBiSi@skill3.wav | anubisi901.wav (5.17) |
| artemis | aertemisi | ✅ | ✅ | ✅ | SW_H_AErTeMiSi@attack1.wav | SW_H_AErTeMiSi@skill3_1.wav | aertemisi801.wav (2.66) |
| bastet | basite | ✅ | ✅ | ✅ | SW_H_BaSiTe@attack1.wav | SW_H_BaSiTe@skill3.wav | basite401.wav (5.59) |
| caishen | caishen | ✅ | ✅ | ✅ | SW_H_CaiShen@attack1_fly.wav | SW_H_CaiShen@skill3.wav | caishen901.wav (4.05) |
| demeter | demoteer | ✅ | ✅ | ✅ | SW_H_DeMoTeEr@attack1.wav | SW_H_DeMoTeEr@skill3.wav | demoteer301.wav (3.47) |
| diana | dianna | ✅ | ✅ | ✅ | SW_H_DiAnNa@attack1.wav | SW_H_DiAnNa@skill3.wav | dianna401.wav (2.53) |
| fengyi | fengyi | ✅ | ✅ | ✅ | SW_H_FengYi@attack1_fly.wav | SW_H_FengYi@skill3.wav | fengyi801.wav (3.29) |
| freya | fuleiya | ✅ | ✅ | ✅ | SW_H_FuLeiYa@attack1.wav | SW_H_FuLeiYa@skill3.wav | fuleiya801.wav (3.11) |
| horus | helusi | ✅ | ✅ | ✅ | SW_H_HeLuSi@attack1.wav | SW_H_HeLuSi@skill3.wav | helusi801.wav (3.71) |
| jormungandr | yemengjiade | ✅ | ✅ | ✅ | SW_H_YeMengJiaDe@attack1.wav | SW_H_YeMengJiaDe@skill3.wav | yemengjiade402.wav (6.06) |
| medusa | meidusha | ✅ | ✅ | ✅ | SW_H_MeiDuSha@attack1.wav | SW_H_MeiDuSha@skill3.wav | meidusha801.wav (3.13) |
| momus | momosi | ✅ | ✅ | ✅ | SW_H_MoMoSi@attack1.wav | SW_H_MoMoSi@skill3.wav | momosi801.wav (4.73) |
| nuwa | nvwa | ✅ | ✅ | ✅ | SW_H_NvWa@attack1.wav | SW_H_NvWa@skill3.wav | nvwa301.wav (5.77) |
| nyx | nikesi | ✅ | ✅ | ✅ | SW_H_NiKeSi@attack1.wav | SW_H_NiKeSi@skill3.wav | nikesi801.wav (4.21) |
| phoenix | feinikesi | ✅ | ✅ | ✅ | SW_H_FeiNiKeSi@attack1.wav | SW_H_FeiNiKeSi@skill3.wav | feinikesi801.wav (6.66) |
| poseidon | bosaidong | ✅ | ✅ | ✅ | SW_H_BoSaiDong@attack1.wav | SW_H_BoSaiDong@skill3.wav | bosaidong801.wav (3.24) |
| prometheus | puluomixiusi | ✅ | ✅ | ✅ | SW_H_PuLuoMiXiuSi@attack1.wav | SW_H_PuLuoMiXiuSi@skill3.wav | puluomixiusi901.wav (4.18) |
| set | saite | ✅ | ✅ | ✅ | SW_H_SaiTe@attack1.wav | SW_H_SaiTe@skill3.wav | saite303.wav (5.2) |
| yuelao | yuelao | ✅ | ✅ | ✅ | SW_H_YueLao@attack1.wav | SW_H_YueLao@skill3.wav | yuelao302.wav (3.71) |
| zeus | zhousi | ✅ | ✅ | ✅ | SW_H_ZhouSi@attack1.wav | SW_H_ZhouSi@skill3.wav | zhousi901.wav (4.94) |

## Other database heroes (37/67 complete)

| Hero | Internal (APK) | Attack | Ultimate | Voice | Attack file | Ultimate file | Voice file (sec) |
|---|---|:-:|:-:|:-:|---|---|---|
| ananke | - | ❌ | ❌ | ❌ | - | - | - |
| aquarius | baopingzuo | ✅ | ✅ | ✅ | SW_H_BaoPing@attack1.wav | SW_H_BaoPing@skill3.wav | baopingzuo901.wav (3.16) |
| ares | aruisi | ✅ | ✅ | ✅ | SW_H_ARuiSi@attack1.wav | SW_H_ARuiSi@skill3.wav | aruisi801.wav (3.55) |
| aries | baiyangzuo | ✅ | ✅ | ✅ | SW_H_BaiYang@attack1.wav | SW_H_BaiYang@skill3.wav | baiyangzuo801.wav (3.71) |
| athena | yadianna | ✅ | ✅ | ✅ | SW_H_YaDianNa@attack1.wav | SW_H_YaDianNa@skill3.wav | yadianna301.wav (3.4) |
| audhumla | - | ❌ | ❌ | ❌ | - | - | - |
| cancer | juxiezuo | ✅ | ✅ | ✅ | SW_H_JuXie@attack1.wav | SW_H_JuXie@skill3.wav | juxiezuo901.wav (3.42) |
| canopicjar ⚠️ guess | habi | ✅ | ✅ | ❌ | SW_M_HouGuan@attack1.wav | SW_M_HouGuan@skill3.wav | - |
| capricorn | mojiezuo | ✅ | ✅ | ✅ | SW_H_MoJie@attack1.wav | SW_H_MoJie@skill3.wav | mojiezuo901.wav (2.19) |
| chaos | - | ❌ | ❌ | ❌ | - | - | - |
| charon | - | ❌ | ❌ | ❌ | - | - | - |
| cronus | keluonuosi | ✅ | ✅ | ✅ | KeLuoNuoSi_Attack1.wav | KeLuoNuoSi_Skill3.wav | keluonuosi901.wav (4.54) |
| dionysus | diaonisuosi | ✅ | ✅ | ✅ | SW_H_DiAoNiSuoSi@attack1.wav | SW_H_DiAoNiSuoSi@skill3.wav | diaonisuosi901.wav (4.02) |
| eris | elisi | ❌ | ❌ | ❌ | - | - | - |
| gaiya | - | ❌ | ❌ | ❌ | - | - | - |
| geb | gaibui | ✅ | ✅ | ✅ | SW_H_GaiBu@attack1.wav | SW_H_GaiBu@skill3.wav | gaibu901.wav (4.86) |
| gemini | shuangzizuo | ✅ | ✅ | ✅ | SW_H_ShuangZi@attack1.wav | SW_H_ShuangZi@skill3_1.wav | shuangzizuo901.wav (2.12) |
| hades | - | ❌ | ❌ | ❌ | - | - | - |
| hebo | - | ❌ | ❌ | ❌ | - | - | - |
| hecate | hekate | ✅ | ✅ | ✅ | SW_H_HeKaTe@attack1.wav | SW_H_HeKaTe@skill3.wav | hekate901.wav (3.06) |
| heket | - | ❌ | ❌ | ❌ | - | - | - |
| hela | haila | ✅ | ✅ | ✅ | SW_H_HaiLa@attack1.wav | SW_H_HaiLa@skill3.wav | haila302.wav (2.32) |
| hephaestus | hehuaisituosi | ✅ | ✅ | ✅ | SW_H_HeHuaiSiTuoSi@attack1.wav | SW_H_HeHuaiSiTuoSi@skill3_01.wav | hehuaisituosi801.wav (3.0) |
| hera | hela | ❌ | ❌ | ❌ | - | - | - |
| heracles | helakelesi | ❌ | ❌ | ✅ | - | - | helakelesi801.wav (5.49) |
| hladgunnr | Hladgunnr | ✅ | ✅ | ✅ | SW_H_HeLaDeGuNa@attack1_1.wav | SW_H_HeLaDeGuNa@skill3.wav | heladeguna301.wav (3.16) |
| idunn | - | ❌ | ❌ | ❌ | - | - | - |
| iris | yilisi | ✅ | ✅ | ✅ | SW_H_YiLiSi@attack1.wav | SW_H_YiLiSi@skill3.wav | yilisi801.wav (3.34) |
| isis | yixisi | ✅ | ✅ | ✅ | SW_H_YiXiSi@attack1.wav | SW_H_YiXiSi@skill3.wav | yixisi801.wav (3.63) |
| jinchan ⚠️ guess | jinchan | ✅ | ✅ | ❌ | SW_M_HaMa@attack1.wav | SW_M_HaMa@skill3.wav | - |
| jingwei | jingwei | ✅ | ✅ | ✅ | SW_H_JingWei@attack1.wav | SW_H_JingWei@skill3_end.wav | jingwei901.wav (2.48) |
| khepri | kaibuli | ✅ | ✅ | ✅ | SW_H_KaiBuLi@attack1.wav | SW_H_KaiBuLi@skill3.wav | kaibuli701.wav (4.0) |
| kraken | kelaken | ✅ | ✅ | ❌ | SW_M_KeLaKen@attack1.wav | SW_M_KeLaKen@skill3.wav | - |
| leo | shizizuo | ✅ | ✅ | ✅ | SW_H_ShiZi@attack1.wav | SW_H_ShiZi@skill3.wav | shizizuo801.wav (3.37) |
| libra | tianchengzuo | ✅ | ✅ | ✅ | SW_H_TianCheng@attack1_fly.wav | SW_H_TianCheng@skill3.wav | tianchengzuo901.wav (3.68) |
| mazu | - | ❌ | ❌ | ❌ | - | - | - |
| mengpo | mengpo | ✅ | ✅ | ✅ | SW_H_MengPo@attack1.wav | SW_H_MengPo@skill3_1.wav | mengpo801.wav (5.77) |
| meret | maierte | ✅ | ✅ | ✅ | MaiErTe_Attack1.wav | MaiErTe_Skill3.wav | maierte301.wav (4.54) |
| nemesis | niemoxisi | ✅ | ✅ | ✅ | SW_H_NieMoXiSi@attack1.wav | SW_H_NieMoXiSi@skill3_end.wav | niemoxisi301.wav (5.17) |
| nephtys | - | ❌ | ❌ | ❌ | - | - | - |
| nezha | nezha | ✅ | ✅ | ✅ | SW_H_NeZha@attack1.wav | SW_H_NeZha@skill3.wav | nezha901.wav (2.51) |
| nidhogg | - | ❌ | ❌ | ❌ | - | - | - |
| nuba | nvba | ✅ | ✅ | ✅ | SW_H_NvBa@attack1.wav | SW_H_NvBa@skill3.wav | nvba901.wav (4.68) |
| nut | sikadi | ❌ | ❌ | ✅ | - | - | sikadi901.wav (4.02) |
| nymphia | hainingfu | ✅ | ✅ | ❌ | SW_M_HaiFuNing@attack1_fly.wav | SW_M_HaiFuNing@skill3.wav | - |
| pan | pan | ✅ | ✅ | ✅ | SW_H_Pan@attack1_01.wav | SW_H_Pan@skill3.wav | pan801.wav (3.53) |
| pisces | shuangyuzuo | ✅ | ✅ | ✅ | SW_H_ShuangYu@attack1.wav | SW_H_ShuangYu@skill3.wav | shuangyuzuo801.wav (3.87) |
| ratatoskr | latatuosike | ✅ | ✅ | ❌ | SW_M_LaTaTuoSiKe@attack1_fly.wav | SW_M_LaTaTuoSiKe@skill3_fly.wav | - |
| sagittarius | sheshouzuo | ✅ | ✅ | ✅ | SW_H_SheShou@attack1_fly.wav | SW_H_SheShou@skill3.wav | sheshouzuo901.wav (2.87) |
| scorpio | tianxiezuo | ✅ | ✅ | ✅ | SW_H_TianXie@attack1.wav | SW_H_TianXie@skill3.wav | tianxiezuo901.wav (2.93) |
| sekhmet | saihemaite | ✅ | ✅ | ✅ | SW_H_SaiHeMaiTe@attack1.wav | SW_H_SaiHeMaiTe@skill3.wav | saihemaite901.wav (2.87) |
| serket | saierkaite | ❌ | ❌ | ❌ | - | - | - |
| skadi | sikadi | ❌ | ❌ | ✅ | - | - | sikadi901.wav (4.02) |
| surtr | suerteer | ✅ | ✅ | ✅ | SW_H_SuErTeEr@attack1.wav | SW_H_SuErTeEr@skill3.wav | suerteer403.wav (2.46) |
| tailao | zhuyao | ✅ | ✅ | ❌ | SW_M_ZhuYao@attack1.wav | SW_M_ZhuYao@skill3.wav | - |
| taurus | jinniuzuo | ✅ | ✅ | ✅ | SW_H_JinNiu@attack1.wav | SW_H_JinNiu@skill3.wav | jinniuzuo901.wav (3.32) |
| tefnut | taifunute | ✅ | ✅ | ✅ | SW_H_TaiFuNuTe@attack1.wav | SW_H_TaiFuNuTe@skill3.wav | taifunute301.wav (4.25) |
| treant | shuren | ✅ | ✅ | ❌ | SW_M_ShuRen@attack1.wav | SW_M_ShuRen@skill3.wav | - |
| ullr | wuleer | ✅ | ✅ | ✅ | SW_H_WuLeEr@attack1.wav | SW_H_WuLeEr@skill3.wav | wuleer901.wav (4.96) |
| ushabti ⚠️ guess | pantuoer | ✅ | ✅ | ❌ | SW_M_GuanJia@attack1_fly.wav | SW_M_GuanJia@skill3.wav | - |
| venus | - | ❌ | ❌ | ❌ | - | - | - |
| virgo | chunvzuo | ✅ | ✅ | ✅ | SW_H_ChuNvZuo@attack1.wav | SW_H_ChuNvZuo@skill3.wav | shinvzuo901.wav (1.99) |
| wenshen | wenshen | ✅ | ✅ | ✅ | SW_H_WenShen@attack1.wav | SW_H_WenShen@skill3.wav | wenshen801.wav (3.32) |
| xuannv | - | ❌ | ❌ | ❌ | - | - | - |
| yanluo | yanwang | ✅ | ✅ | ✅ | SW_H_YanWang@attack1.wav | SW_H_YanWang@skill3.wav | yanluowang901.wav (5.17) |
| yaoji | - | ❌ | ❌ | ❌ | - | - | - |
| zaojun | - | ❌ | ❌ | ❌ | - | - | - |

## Notes

- ⚠️ guess: `HaMa` (toad) = Jin Chan, `HouGuan` (monkey jar, Hapi lid) = Canopic Jar, `GuanJia` (butler) = Ushabti. Pinyin meaning only, not confirmed in APK data.
- Mapping typos fixed by alias: geb `gaibui` -> `gaibu`, hladgunnr `Hladgunnr` -> `heladeguna`, yanluo voice `yanluowang`.
- Nut and Skadi both point at `sikadi` voice files (hero_detail overlap, see game_id_mapping note). Voice belongs to Skadi until checked.
- `SW_M_*` heroes (Kraken, Nymphia, Ratatoskr, Tailao, Treant, Jin Chan, Canopic Jar, Ushabti) have no voice bundles in `hero_voices`.
- Not hero audio: `SW_B_*` (bosses: LiLiSi, MengYanMa, YiShiTaEr), `ShortVo_*` (generic grunts), `MDBaiYang` / `MDTianXie` (skill0 only), `SW_H_LiLiSi`, `SW_H_AiPiJia` (unreleased/unknown).
- Skin variants skipped: `CaiShen01`, `YeMengJiaDe01`, `YanWang01`, `skin_*` voices.
