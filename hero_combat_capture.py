#!/usr/bin/env python3
"""Reusable, name-driven live hero combat capture for Motto Immortal.

Usage: python3 hero_combat_capture.py HERO_NAME
Controlled experiment:
  python3 hero_combat_capture.py HERO_NAME --experiment target_count --variant single-target --repeat 1
  python3 hero_combat_capture.py HERO_NAME --experiment target_count --variant five-target --repeat 1
Start the fight only after the script prints READY TO WATCH FIGHT.  Ctrl-C after
the settlement screen; a machine-readable log and first-pass report are saved
under fights/<hero>_<timestamp>/.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import os
from pathlib import Path
import re
import signal
import select
import subprocess
import sys
import threading
import time

from combat_analysis import analyze, save_report, rebuild

ROOT = Path(__file__).resolve().parent
ADB = Path.home() / "Library/Android/sdk/platform-tools/adb"
LATEST_SKIN_JSON_GLOB = "live_extractions/latest/unpacked/region_*/client/config/hero_skin.json"
PACKAGE_DEFAULT = "com.goatgames.mot.gb.gp"
CAPTURE_SCHEMA_VERSION = 2


def default_runtime_root() -> Path:
    """Find the local extraction workspace without coupling reports to it."""
    configured = os.environ.get("MOTTO_CAPTURE_RUNTIME_ROOT")
    candidates = [Path(configured)] if configured else []
    candidates.extend([ROOT, ROOT.parent / "android"])
    return next(
        (path for path in candidates if (path / "global_lua_dump").exists() or (path / "live_extractions").exists()),
        ROOT,
    )


def hero_records() -> list[dict]:
    """Load the legacy dashboard database or normalize repository hero JSON."""
    legacy = ROOT / "dashboard/src/data/heroes.json"
    if legacy.exists():
        return json.loads(legacy.read_text(encoding="utf-8"))
    records = []
    for source in sorted((ROOT / "src/data/heroes").glob("*.json")):
        try:
            data = json.loads(source.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(data, dict) or data.get("heroID") is None:
            continue
        records.append({
            "id": data["heroID"], "slug": data.get("id") or source.stem,
            "name": data.get("name"), "name_cn": data.get("name_cn"),
            "global": {"class": data.get("class"), "faction": data.get("faction")},
        })
    return records


def resolve_hero(name: str, runtime_root: Path) -> dict:
    heroes = hero_records()
    key = name.casefold().strip()
    matches = [h for h in heroes if key in {
        str(h.get("name", "")).casefold(), str(h.get("name_cn", "")).casefold(),
        str(h.get("slug", "")).casefold(), str(h.get("id", "")).casefold()
    }]
    if len(matches) != 1:
        close = [str(h.get("name") or h.get("name_cn") or h.get("id")) for h in heroes
                 if key in str(h.get("name") or "").casefold()]
        raise SystemExit(f"Hero {name!r} is not unique/found. Possible matches: {close[:20]}")
    hero = matches[0]
    runtime = None
    skin_id = None
    skin_lua = runtime_root / "global_lua_dump/LuaScripts_DataCenter_NewConfig_hero_skin.lua.lua"
    if skin_lua.exists():
        skin_text = skin_lua.read_text(encoding="utf-8")
        block_re = re.compile(r"t\[\d+\]\s*=\s*\{(?:(?!\nt\[\d+\]\s*=).)*?\n\}", re.S)
        for block in block_re.findall(skin_text):
            if re.search(rf"\bhero\s*=\s*{int(hero['id'])}\s*,", block):
                m = re.search(r"skin_template\s*=\s*'([^']+)'", block)
                i = re.search(r"\bid\s*=\s*(\d+)\s*,", block)
                if m:
                    runtime, skin_id = m.group(1), int(i.group(1)) if i else None
                    break

    # The generated Lua dump can lag behind the latest extracted game config.
    # Prefer it for compatibility, but use the current JSON extraction for new heroes.
    if not runtime:
        for skin_json in sorted(runtime_root.glob(LATEST_SKIN_JSON_GLOB), reverse=True):
            try:
                skins = json.loads(skin_json.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            for entry in skins.values():
                if not isinstance(entry, dict) or entry.get("hero") != hero["id"]:
                    continue
                if entry.get("skin_template"):
                    runtime = entry["skin_template"]
                    skin_id = entry.get("id")
                    break
            if runtime:
                break
    if not runtime:
        raise SystemExit(
            f"Could not resolve runtime skin_template for hero {hero['id']} in "
            f"{skin_lua} or {runtime_root / LATEST_SKIN_JSON_GLOB}"
        )
    hero["runtime_identity"] = runtime
    hero["skin_id"] = skin_id
    return hero


def static_evidence(hero: dict, runtime_root: Path) -> dict:
    runtime = hero["runtime_identity"]
    files = sorted((runtime_root / "global_lua_dump").glob(f"*{runtime}*"))
    return {
        "hero": hero,
        "runtime_lua_files": [str(p) for p in files],
        "capture_scope": [
            "normal and true damage calculator input/output and level coefficient",
            "target feature construction and primitive parameters",
            "skill start/end and mechanic callbacks with pre/post state",
            "incoming damage mutation/negation, dodge callbacks, target redirection",
            "target identity and current attacker/defender combat state",
            "full lineup identity, instance, camp, position, HP, and ATK",
            "generic skill timing and active-skill context for damage attribution",
            "generic Energy gain, spend, clear, and Ultimate timing",
            "generic effective healing, overheal floor, and direct HP changes",
            "generic buff/debuff application, removal, and exposed shield values",
            "generic death/revive and summon ownership/lifetime events",
            "source-to-beneficiary attribution for damage, healing, buffs, shields, Energy, summons, and deaths",
            "controlled paired-fight comparison across every recorded performance category",
        ],
        "guide_questions": [
            "Which ally benefited this hero most through healing, buffs, protection, energy, or damage amplification?",
            "Which benefits did this hero give to each teammate?",
            "For a damage dealer, which mechanic dealt the most damage and how can it be amplified?",
            "For a support, what is the specialty, ideal use case, and team requirement?",
            "Which partners are mechanically recommended from verified kits, and which are actually supported by controlled fight evidence?",
            "Did the hero complete a meaningfully charged Ultimate before the fight was decided, and what was the principal limitation?",
        ],
    }


def lua_probe(runtime: str, device_log: str, capture_all: bool = False) -> str:
    # The Lua side writes compact pipe records. Values are escaped so every line
    # remains parseable even when a class/state name contains punctuation.
    return r'''
local TARGET=%TARGET%; local PATH=%PATH%; local CAPTURE_ALL=%CAPTURE_ALL%; local PREFIX='[HEROLOG]';
local fh=io.open(PATH,'a');
local function esc(x) x=tostring(x); return (x:gsub('%%','%%25'):gsub('|','%%7C'):gsub('\n','%%0A')) end
local function tm() local ok,s=pcall(function() return SceneManager:getCurSceneModel() end); return ok and s and tonumber(s.curTime) or -1 end
local function emit(kind, fields)
  local a={PREFIX,'ms='..esc(tm()),'kind='..esc(kind)};
  for k,v in pairs(fields or {}) do a[#a+1]=esc(k)..'='..esc(v) end
  if fh then fh:write(table.concat(a,'|')..'\n');fh:flush() end
end
local function safe(fn, d) local ok,v=pcall(fn);if ok then return v end;return d or '?' end
local function who(p) if not p then return 'nil' end;return safe(function() return p:get_skinTemplate() end,'?') end
local function camp(p) if not p then return '?' end;return safe(function() return p:get_camp() end,'?') end
local function iid(p) if not p then return '?' end;return safe(function() return p:get_playerInstanceId() end,'?') end
local function master(p)
  if not p then return '?' end
  local m=safe(function() return p:get_master() end,nil);if not m then return 'nil' end;return who(m)..'#'..tostring(iid(m))
end
local function num(v) if type(v)=='number' then return v end;return safe(function() return GlobalTools:ToNumber(v) end,v) end
local function state(p)
  if not p then return '?' end
  return safe(function() return p.aiEngine:getCurrentStateName() end,'?')
end
local function pos(p)
  if not p then return '?' end
  return safe(function() local v=p:get_position();return tostring(num(v.x))..','..tostring(num(v.y))..','..tostring(num(v.z)) end,'?')
end
local function hp(p,a)
  if not p or not p.data or not Battle or not Battle.AttrEnum then return '?' end
  return num(safe(function() return p.data:getAttrVal(Battle.AttrEnum[a]) end,'?'))
end
local function firstValue(obj, names)
  if not obj then return '?' end
  for _,name in ipairs(names) do
    local v=safe(function() local x=obj[name]; if type(x)=='function' then return x(obj) end; return x end,nil)
    if v~=nil and v~='?' then return v end
  end
  return '?'
end
local function loadout(p)
  local d=safe(function() return p.data end,nil)
  return {
    level=firstValue(p,{'get_level','getLevel','level','heroLevel'}) ~= '?' and firstValue(p,{'get_level','getLevel','level','heroLevel'}) or firstValue(d,{'level','heroLevel','lv'}),
    relict=firstValue(p,{'get_relic','getRelic','get_relic_level','relic','relicLevel'}) ~= '?' and firstValue(p,{'get_relic','getRelic','get_relic_level','relic','relicLevel'}) or firstValue(d,{'relic','relicLevel','relicLv','exclusiveLevel'}),
    throne=firstValue(p,{'get_throne','getThrone','get_throne_level','throne','throneLevel'}) ~= '?' and firstValue(p,{'get_throne','getThrone','get_throne_level','throne','throneLevel'}) or firstValue(d,{'throne','throneLevel','throneLv'}),
    divination=firstValue(p,{'get_divination','getDivination','divination','divinationLevel'}) ~= '?' and firstValue(p,{'get_divination','getDivination','divination','divinationLevel'}) or firstValue(d,{'divination','divinationLevel','divinationLv','augury'}),
    player_state=tostring(p), data_state=tostring(d)
  }
end
local function skillName(s)
  if not s then return 'nil' end
  return safe(function() return s:get_skillName() end,
    safe(function() return s:getSkillName() end,safe(function() return s:getSkillId() end,tostring(s))))
end
local function relevant(p)
  if CAPTURE_ALL then return true end
  if not p then return false end
  if who(p)==TARGET then return true end
  local m=safe(function() return p:get_master() end,nil)
  return m and who(m)==TARGET or false
end
local function buffValue(b)
  if not b then return '?' end
  local w=safe(function() return b.bufWork end,nil)
  if not w then return '?' end
  return num(safe(function() return w:getValue() end,safe(function() return w.value end,'?')))
end
local ACTIVE_SKILL={}
local function snap(o)
  local a={}; for k,v in pairs(o) do
    if type(v)=='number' or type(v)=='boolean' or type(v)=='string' then a[#a+1]=tostring(k)..':'..tostring(v) end
  end; table.sort(a); return table.concat(a,',')
end
local function combatSnapshot(p,phase)
  pcall(function()
    local d=p.data
    local fields={hero=who(p),instance=iid(p),camp=camp(p),master=master(p),phase=phase,
      position=pos(p),state=state(p),player_fields=snap(p),data_fields=snap(d or {})}
    for _,attr in ipairs({'CurHp','Hp','Atk','Def','Rage','Crit','CurAtk'}) do fields[attr]=hp(p,attr) end
    if Battle and Battle.AttrEnum then
      local attrs={}
      for name,_ in pairs(Battle.AttrEnum) do
        if type(name)=='string' then attrs[#attrs+1]=name..':'..tostring(hp(p,name)) end
      end
      table.sort(attrs);fields.attributes=table.concat(attrs,',')
    end
    emit('COMBATANT_SNAPSHOT',fields)
  end)
end
local CALL_SEQ=0; local CALL_STACK={}
local function attackFields(ad)
  if type(ad)~='table' then return {} end
  local w=ad.wantData or {}; local at=ad.attackData or {};
  local killer=ad.killer or at.killer;local victim=ad.victim or at.victim
  return {killer=who(killer),killer_instance=iid(killer),killer_atk=hp(killer,'Atk'),killer_max_hp=hp(killer,'Hp'),
          victim=who(victim),victim_instance=iid(victim),victim_atk=hp(victim,'Atk'),victim_max_hp=hp(victim,'Hp'),
          damage=num(w.damage or '?'),crit=w.isCrit or w.crit or '?',dodge=w.isDodge or w.dodge or '?',
          skill=tostring(at.skillConfig or '?')}
end
local function wrap(o,n,cn)
  local old=o[n];if type(old)~='function' then return end
  o[n]=function(self,...)
    CALL_SEQ=CALL_SEQ+1;local callId=CALL_SEQ;local parentId=CALL_STACK[#CALL_STACK] or 0;CALL_STACK[#CALL_STACK+1]=callId
    local args={...};local pre=snap(self);local af=attackFields(args[1]);
    emit('FEATURE_ENTER',{call_id=callId,parent_call_id=parentId,hero=who(self.player),instance=iid(self.player),camp=camp(self.player),feature=cn,method=n,state=state(self.player),self_state=pre,
      killer=af.killer or '?',killer_instance=af.killer_instance or '?',killer_atk=af.killer_atk or '?',killer_max_hp=af.killer_max_hp or '?',
      victim=af.victim or '?',victim_instance=af.victim_instance or '?',victim_atk=af.victim_atk or '?',victim_max_hp=af.victim_max_hp or '?',damage=af.damage or '?'})
    local out=table.pack(old(self,...));
    if (n=='onCreateSummonerEvent' or n=='onDestroySummonerEvent') and type(args[2])=='table' then
      local e=args[2];local mp=e.masterPlayer;local so=e.summoner;local sp=so and safe(function() return so:getPlayer() end,nil) or nil
      emit(n=='onCreateSummonerEvent' and 'SUMMON_CREATE' or 'SUMMON_DESTROY',{observer=cn,master=who(mp),master_instance=iid(mp),summon=who(sp),summon_instance=iid(sp),camp=camp(mp),position=pos(sp),cur_hp=hp(sp,'CurHp'),max_hp=hp(sp,'Hp')})
    end
    if n=='findTargets' or n=='redirectTargets' then
      local ts={};local one=safe(function() return self.targetPlayer end,nil);if one then ts[#ts+1]=who(one)..'#'..tostring(iid(one)) end
      local many=safe(function() return self.targetPlayers end,nil);if type(many)=='table' then for _,p in ipairs(many) do ts[#ts+1]=who(p)..'#'..tostring(iid(p)) end end
      local sig=table.concat(ts,',');if sig~='' and sig~=self._heroCaptureTargets then self._heroCaptureTargets=sig;emit('TARGET_SELECTION',{feature=cn,method=n,hero=who(self.player),instance=iid(self.player),targets=sig,position=pos(self.player)}) end
    end
    if n=='revive' then emit('PLAYER_REVIVE',{hero=who(self.player),instance=iid(self.player),camp=camp(self.player),master=master(self.player),position=pos(self.player),cur_hp=hp(self.player,'CurHp'),max_hp=hp(self.player,'Hp'),feature=cn}) end
    emit('FEATURE_EXIT',{call_id=callId,parent_call_id=parentId,hero=who(self.player),instance=iid(self.player),camp=camp(self.player),feature=cn,method=n,state=state(self.player),self_state=snap(self),damage=attackFields(args[1]).damage or '?'})
    CALL_STACK[#CALL_STACK]=nil
    if n=='spawnFinish' then combatSnapshot(self.player,'spawnFinish') end
    return table.unpack(out,1,out.n)
  end
end
-- Generic cross-player attribution hooks. The named runtime and its owned
-- summons are selected by relevant(); --capture-all retains the whole fight.
local PD=package.loaded['Battle.Ply.PlayerData'];local PM=package.loaded['Battle.Ply.Player_Model'];
if PD then
  if _G.__HERO_PD_ORIG then for k,v in pairs(_G.__HERO_PD_ORIG) do PD[k]=v end end
  _G.__HERO_PD_ORIG={init=PD.init,changeEnergy=PD.changeEnergy,clearEnergy=PD.clearEnergy,addCurHp=PD.addCurHp}
  if type(PD.init)=='function' then local old=PD.init;PD.init=function(self,player,...)
    local o=table.pack(old(self,player,...));
    local eq=loadout(player)
    emit('PLAYER_LINEUP',{hero=who(player),instance=iid(player),camp=camp(player),master=master(player),position=pos(player),cur_hp=hp(player,'CurHp'),max_hp=hp(player,'Hp'),atk=hp(player,'Atk'),energy=hp(player,'Rage'),level=eq.level,relic=eq.relict,throne=eq.throne,divination=eq.divination,player_state=eq.player_state,data_state=eq.data_state})
    return table.unpack(o,1,o.n)
  end end
  if type(PD.changeEnergy)=='function' then local old=PD.changeEnergy;PD.changeEnergy=function(self,reason,delta,...)
    local p=self.player;local before=hp(p,'Rage')
    local o=table.pack(old(self,reason,delta,...));local after=hp(p,'Rage')
    local actual=(type(before)=='number' and type(after)=='number') and after-before or num(delta)
    if relevant(p) then emit('ENERGY_CHANGE',{hero=who(p),instance=iid(p),camp=camp(p),reason=reason,requested=num(delta),before=before,after=after,actual=actual,spent=(type(actual)=='number' and actual<0) and -actual or 0,gained=(type(actual)=='number' and actual>0) and actual or 0,active_skill=ACTIVE_SKILL[iid(p)] or 'nil',state=state(p),continuous_candidate=(type(actual)=='number' and actual<0 and state(p)~='skill')}) end
    return table.unpack(o,1,o.n)
  end end
  if type(PD.clearEnergy)=='function' then local old=PD.clearEnergy;PD.clearEnergy=function(self,...)
    local p=self.player;local before=hp(p,'Rage')
    local o=table.pack(old(self,...));local after=hp(p,'Rage')
    local actual=(type(before)=='number' and type(after)=='number') and after-before or 0
    if relevant(p) then emit('ENERGY_CHANGE',{hero=who(p),instance=iid(p),camp=camp(p),reason='ultimate_clear',requested=-before,before=before,after=after,actual=actual,spent=(actual<0 and -actual or 0),gained=0,active_skill=ACTIVE_SKILL[iid(p)] or 'nil',state=state(p),continuous_candidate=false}) end
    return table.unpack(o,1,o.n)
  end end
  if type(PD.addCurHp)=='function' then local old=PD.addCurHp;PD.addCurHp=function(self,delta,...)
    local p=self.player;local before=hp(p,'CurHp');local o=table.pack(old(self,delta,...));local after=hp(p,'CurHp')
    if relevant(p) then emit('DIRECT_HP_CHANGE',{hero=who(p),instance=iid(p),camp=camp(p),requested=num(delta),before=before,after=after,actual=(type(before)=='number' and type(after)=='number') and after-before or '?',active_skill=ACTIVE_SKILL[iid(p)] or 'nil',cause_candidate='unattributed_direct_hp'}) end
    return table.unpack(o,1,o.n)
  end end
end
if PM then
  if _G.__HERO_PM_ORIG then for k,v in pairs(_G.__HERO_PM_ORIG) do PM[k]=v end end
  _G.__HERO_PM_ORIG={skillStart=PM.skillStart,skillEnd=PM.skillEnd,cureExt=PM.cureExt,enterRealDead=PM.enterRealDead}
  if type(PM.skillStart)=='function' then local old=PM.skillStart;PM.skillStart=function(self,sk,...)
    combatSnapshot(self,'skillStart_before')
    ACTIVE_SKILL[iid(self)]=skillName(sk);local o=table.pack(old(self,sk,...))
    if relevant(self) then emit('PLAYER_SKILL',{phase='start',hero=who(self),instance=iid(self),camp=camp(self),master=master(self),skill=skillName(sk),skill_type=safe(function() return sk.type end,'?'),energy=hp(self,'Rage'),position=pos(self),state=state(self)}) end
    return table.unpack(o,1,o.n)
  end end
  if type(PM.skillEnd)=='function' then local old=PM.skillEnd;PM.skillEnd=function(self,sk,...)
    local o=table.pack(old(self,sk,...))
    if relevant(self) then emit('PLAYER_SKILL',{phase='end',hero=who(self),instance=iid(self),camp=camp(self),master=master(self),skill=skillName(sk),skill_type=safe(function() return sk.type end,'?'),energy=hp(self,'Rage'),position=pos(self),state=state(self)}) end
    combatSnapshot(self,'skillEnd_after')
    ACTIVE_SKILL[iid(self)]=nil
    return table.unpack(o,1,o.n)
  end end
  if type(PM.cureExt)=='function' then local old=PM.cureExt;PM.cureExt=function(self,typ,source,coef,fix,baseOn,sourceSkill,...)
    local before=hp(self,'CurHp');local maxhp=hp(self,'Hp');local o=table.pack(old(self,typ,source,coef,fix,baseOn,sourceSkill,...));local after=hp(self,'CurHp')
    if relevant(self) or relevant(source) then emit('HEAL',{src=who(source),src_instance=iid(source),src_master=master(source),dst=who(self),dst_instance=iid(self),dst_master=master(self),heal_type=typ,coef=num(coef),fix=num(fix),skill=skillName(sourceSkill),active_skill=ACTIVE_SKILL[iid(source)] or 'nil',before=before,after=after,max_hp=maxhp,effective=(type(before)=='number' and type(after)=='number') and math.max(0,after-before) or '?',overheal_floor=(type(fix)=='number' and type(before)=='number' and type(after)=='number') and math.max(0,fix-(after-before)) or '?'}) end
    return table.unpack(o,1,o.n)
  end end
  if type(PM.enterRealDead)=='function' then local old=PM.enterRealDead;PM.enterRealDead=function(self,...)
    if relevant(self) then emit('PLAYER_DEAD',{hero=who(self),instance=iid(self),camp=camp(self),master=master(self),position=pos(self),active_skill=ACTIVE_SKILL[iid(self)] or 'nil'}) end
    return old(self,...)
  end end
end
local BM=package.loaded['Battle.Buf.BufManager_Model'];if BM then
  if type(_G.__HERO_BM_ORIG)=='table' then for k,v in pairs(_G.__HERO_BM_ORIG) do BM[k]=v end end
  _G.__HERO_BM_ORIG={addBufById=BM.addBufById,addBufByData=BM.addBufByData,removeBuf=BM.removeBuf,removeBufById=BM.removeBufById,removeBufByType=BM.removeBufByType}
  if type(BM.addBufById)=='function' then local old=BM.addBufById;BM.addBufById=function(self,id,source,sourceSkill,...)
    local out=table.pack(old(self,id,source,sourceSkill,...))
    if relevant(self.player) or relevant(source) then emit('BUFF_ADD',{id=id,src=who(source),src_instance=iid(source),src_master=master(source),dst=who(self.player),dst_instance=iid(self.player),dst_master=master(self.player),skill=skillName(sourceSkill),active_skill=ACTIVE_SKILL[iid(source)] or 'nil',buff_state=snap(out[1] or {}),value=buffValue(out[1])}) end
    return table.unpack(out,1,out.n)
  end end
  if type(BM.addBufByData)=='function' then local old=BM.addBufByData;BM.addBufByData=function(self,data,source,sourceSkill,...)
    local out=table.pack(old(self,data,source,sourceSkill,...));local b=out[1]
    if relevant(self.player) or relevant(source) then emit('BUFF_ADD',{id=safe(function() return data.id or data.buffId end,'?'),via='data',src=who(source),src_instance=iid(source),src_master=master(source),dst=who(self.player),dst_instance=iid(self.player),dst_master=master(self.player),skill=skillName(sourceSkill),active_skill=ACTIVE_SKILL[iid(source)] or 'nil',buff_state=snap(b or {}),value=buffValue(b)}) end
    return table.unpack(out,1,out.n)
  end end
  if type(BM.removeBuf)=='function' then local old=BM.removeBuf;BM.removeBuf=function(self,b,...)
    if relevant(self.player) then emit('BUFF_REMOVE',{id=safe(function() return b.id or b.buffId or b.data.id end,'?'),src=safe(function() return who(b.source) end,'?'),dst=who(self.player),dst_instance=iid(self.player),value=buffValue(b),buff_state=snap(b or {})}) end
    return old(self,b,...)
  end end
  if type(BM.removeBufById)=='function' then local old=BM.removeBufById;BM.removeBufById=function(self,id,...)
    if relevant(self.player) then emit('BUFF_REMOVE_REQUEST',{id=id,via='id',dst=who(self.player),dst_instance=iid(self.player)}) end
    return old(self,id,...)
  end end
  if type(BM.removeBufByType)=='function' then local old=BM.removeBufByType;BM.removeBufByType=function(self,typ,...)
    if relevant(self.player) then emit('BUFF_REMOVE_REQUEST',{buff_type=typ,via='type',dst=who(self.player),dst_instance=iid(self.player)}) end
    return old(self,typ,...)
  end end
end
-- Shield work is supplied by the runtime in some builds and therefore may not
-- exist in the extracted Lua tree. Discover loaded shield classes and record
-- their value mutations. Buff IDs/source still come from BUFF_ADD.
for key,SW in pairs(package.loaded) do
  if type(key)=='string' and key:find('BufWorkShield',1,true) and type(SW)=='table' then
    _G.__HERO_SHIELD_ORIG=_G.__HERO_SHIELD_ORIG or {}
    for _,n in ipairs({'setValue','addFixValue','reduceValue','consume','onAttack','beforeAttack'}) do
      local old=SW[n]
      if type(old)=='function' and not _G.__HERO_SHIELD_ORIG[key..':'..n] then
        _G.__HERO_SHIELD_ORIG[key..':'..n]=old
        SW[n]=function(self,...)
          local owner=safe(function() return self.player or (self.playerBuf and self.playerBuf.player) or (self.buf and self.buf.player) end,nil)
          local before=num(safe(function() return self:getValue() end,safe(function() return self.value end,'?')))
          local o=table.pack(old(self,...))
          local after=num(safe(function() return self:getValue() end,safe(function() return self.value end,'?')))
          if relevant(owner) then emit('SHIELD_CHANGE',{class=key,method=n,hero=who(owner),instance=iid(owner),before=before,after=after,delta=(type(before)=='number' and type(after)=='number') and after-before or '?',args=snap({...})}) end
          return table.unpack(o,1,o.n)
        end
      end
    end
  end
end
local BASE=package.loaded['Battle.Ply.SkillFeatures.SkillFeatures_Model'];
if not BASE then emit('FATAL',{reason='SkillFeatures_Model not loaded'});return end
if _G.__HERO_GENERIC_BASE_INIT then BASE.init=_G.__HERO_GENERIC_BASE_INIT end
local init=rawget(BASE,'init');_G.__HERO_GENERIC_BASE_INIT=init
local watched={'spawnFinish','skillStart','skillEnd','afterAttack','killerAfterAttack','beforeCure','killerBeforeCure','afterCure','killerAfterCure','cureOverflow','onCureEvent','onAttackPlayer','onDodgeEvent','redirectTargets','findTargets','dispatchMessage','forceTrigger','onCreateSummonerEvent','onPlayerDeadEvent','canDead','summonPlayerAtPosition','beginEffect','endEffect','revive','bulletHit','addBuf','addSoul','clearCDTime'}
BASE.init=function(self,ply,skill,className,...)
  local r=init(self,ply,skill,className,...);pcall(function()
    local cn=tostring(className or (self.class and self.class.__cname) or '?');
    if not relevant(ply) and not cn:find(TARGET,1,true) then return end
    emit('FEATURE_INIT',{feature=cn,hero=who(ply),camp=camp(ply),instance=iid(ply),master=master(ply),self_state=snap(self)})
    for _,n in ipairs(watched) do wrap(self,n,cn) end
  end);return r
end
local D=rawget(_G,'Battle') and Battle.DamageUtil
if D then
  if _G.__HERO_GENERIC_DAMAGE_ORIG then for k,v in pairs(_G.__HERO_GENERIC_DAMAGE_ORIG) do D[k]=v end end
  _G.__HERO_GENERIC_DAMAGE_ORIG={}
  local function dw(k,kind)
    local old=D[k];if type(old)~='function' then return false end;_G.__HERO_GENERIC_DAMAGE_ORIG[k]=old
    D[k]=function(a,b,p,...)
      local o=old(a,b,p,...);if relevant(a) or relevant(b) then
        local coef=safe(function() if kind=='TRUE' then return D.getLvPressingRealDamageCoef(a,b) else return D.getLvPressingDamageCoef(a,b) end end,'?')
        emit('DAMAGE',{path=kind,src=who(a),src_camp=camp(a),src_instance=iid(a),src_master=master(a),src_position=pos(a),dst=who(b),dst_camp=camp(b),dst_instance=iid(b),dst_master=master(b),dst_position=pos(b),power=num(p),out=num(o),coef=coef,active_skill=ACTIVE_SKILL[iid(a)] or 'normal_or_delayed',src_state=state(a),dst_state=state(b),dst_hp_before=hp(b,'CurHp')})
      end;return o
    end;return true
  end
  emit('DAMAGE_HOOK',{normal=dw('calDamageByPower','NORMAL'),true_damage=dw('calRealDamageByPower','TRUE')})
end
emit('READY',{target=TARGET})
'''.replace("%TARGET%", json.dumps(runtime)).replace("%PATH%", json.dumps(device_log)).replace("%CAPTURE_ALL%", "true" if capture_all else "false")


JS_TEMPLATE = r'''
'use strict'; var LUA=%LUA%; var done=false,battleL=null;
function arm(){var x=Process.findModuleByName('libxlua.so');if(!x)return false;
 var load=new NativeFunction(x.getExportByName('luaL_loadbufferx'),'int',['pointer','pointer','uint64','pointer','pointer']);
 var call=new NativeFunction(x.getExportByName('lua_pcallk'),'int',['pointer','int','int','int','pointer','pointer']);
 var top=new NativeFunction(x.getExportByName('lua_gettop'),'int',['pointer']);
 var settop=new NativeFunction(x.getExportByName('lua_settop'),'void',['pointer','int']);
 var str=new NativeFunction(x.getExportByName('lua_tolstring'),'pointer',['pointer','int','pointer']);
 Interceptor.attach(x.getExportByName('luaL_loadbufferx'),{onEnter:function(a){try{var n=a[3].readUtf8String();if(n&&n.indexOf('Battle')>=0)battleL=a[0];}catch(e){}}});
 Interceptor.attach(x.getExportByName('lua_pcallk'),{onEnter:function(a){if(done)return;var L=battleL||a[0];var t=top(L),b=Memory.allocUtf8String(LUA),n=Memory.allocUtf8String('=hero_generic_probe');
   var rc=load(L,b,LUA.length,n,ptr(0));if(rc===0)rc=call(L,0,0,0,ptr(0),ptr(0));
   if(rc===0){done=true;send({t:'injected'});}else{var e=str(L,-1,ptr(0));send({t:'error',m:e.isNull()?'?':e.readUtf8String()});}settop(L,t);}});return true;}
if(!arm()){var iv=setInterval(function(){if(arm())clearInterval(iv)},1000)}
'''


def resolve_pid(package: str) -> int | None:
    r = subprocess.run([str(ADB), "shell", "pidof", package], capture_output=True, text=True)
    return int(r.stdout.split()[0]) if r.stdout.split() else None


def parse_line(line: str) -> dict:
    def unesc(v: str) -> str:
        return v.replace("%0A", "\n").replace("%7C", "|").replace("%25", "%")
    row = {"host_ts": dt.datetime.now().astimezone().isoformat(timespec="milliseconds")}
    for part in line.strip().split("|")[1:]:
        if "=" in part:
            k, v = part.split("=", 1); row[unesc(k)] = unesc(v)
    return row


def save_analysis_safely(outdir: Path, meta: dict, rows: list[dict], camp: str, config_root: Path) -> bool:
    """Preserve a capture even when report generation encounters new runtime data."""
    try:
        save_report(outdir, analyze(meta, rows, camp, config_root))
        error = outdir / "ANALYSIS_ERROR.txt"
        if error.exists():
            error.unlink()
        return True
    except Exception as exc:
        fallback = ""
        try:
            write_report(outdir, meta, rows)
            fallback = " A legacy LIVE_ANALYSIS.md fallback was generated."
        except Exception as fallback_exc:
            fallback = f" Legacy fallback also failed: {type(fallback_exc).__name__}: {fallback_exc}."
        (outdir / "ANALYSIS_ERROR.txt").write_text(
            f"Raw capture was preserved, but primary analysis failed:\n{type(exc).__name__}: {exc}\n{fallback}\n",
            encoding="utf-8",
        )
        print(f"WARNING: raw capture saved but analysis failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return False


def write_report(outdir: Path, meta: dict, rows: list[dict]) -> None:
    hero = meta["hero"]; damages = [r for r in rows if r.get("kind") == "DAMAGE"]
    def number(row: dict, key: str) -> float:
        try:
            return float(row.get(key, 0))
        except (TypeError, ValueError):
            return 0.0

    outgoing = [r for r in damages if r.get("src") == hero["runtime_identity"]]
    paths = {}
    for r in outgoing:
        p = r.get("path", "?"); paths.setdefault(p, {"events": 0, "sum": 0})
        paths[p]["events"] += 1
        try: paths[p]["sum"] += int(float(r.get("out", 0)))
        except ValueError: pass
    methods = {}
    for r in rows:
        if r.get("kind") == "FEATURE_ENTER": methods[r.get("method", "?")] = methods.get(r.get("method", "?"), 0) + 1
    # Count only ENTER records: every instrumented call also has an EXIT record.
    # Keep the runtime feature name because it preserves the exact equipped
    # skill/tier (for example skill3_4), while avoiding guesses from damage.
    skill_uses = collections.Counter(
        r.get("feature", "?") for r in rows
        if r.get("kind") == "FEATURE_ENTER" and r.get("method") == "skillStart"
    )
    total = sum(x["sum"] for x in paths.values())
    lineups = [r for r in rows if r.get("kind") == "PLAYER_LINEUP"]
    def side(row: dict) -> str:
        value = str(row.get("camp", "?"))
        return "Eigene Helden" if value.lower() in {"1", "ally", "player", "friend", "camp1"} else ("Gegner" if value.lower() in {"2", "enemy", "foe", "camp2"} else f"Camp {value}")
    lines = [f"# {hero['name']} live battle analysis", "", "## Capture identity", "",
             f"- Hero ID: `{hero['id']}`", f"- Runtime: `{hero['runtime_identity']}`", f"- Events: {len(rows)}", "",
             f"- Mode: `{(meta.get('experiment') or {}).get('stage') or (meta.get('experiment') or {}).get('mode') or 'unspecified'}`", "",
             "## Time-Challenge / Lineup snapshot", "",
             "Die Werte stammen aus der Battle-Runtime. `?` bedeutet, dass der Client den Wert unter einem anderen Namen oder nicht im Player-Objekt bereitstellt.", "",
             "| Seite | Held/Runtime | Instance | Level | Relict | Throne | Divination | Camp |", "|---|---|---|---:|---|---|---|---|"]
    for row in lineups:
        lines.append(f"| {side(row)} | `{row.get('hero','?')}` | `{row.get('instance','?')}` | {row.get('level','?')} | {row.get('relic','?')} | {row.get('throne','?')} | {row.get('divination','?')} | `{row.get('camp','?')}` |")
    if not lineups:
        lines.append("| — | Keine PLAYER_LINEUP-Daten erfasst | — | — | — | — | — | — |")
    lines += ["", "Bei unbekannten Camp-Codes bleibt die Zuordnung absichtlich als `Camp X` erhalten, damit eigene Helden und Gegner nicht vertauscht werden.", "",
              "## Direct combat totals", "", "| Path | Events | Output | Share |", "|---|---:|---:|---:|"]
    for p,x in sorted(paths.items()): lines.append(f"| {p} | {x['events']} | {x['sum']:,} | {(x['sum']/total*100 if total else 0):.2f}% |")
    lines += ["", "## Observed mechanic callbacks", ""] + [f"- `{k}`: {v}" for k,v in sorted(methods.items())]
    lines += ["", "## Skill uses", ""]
    if skill_uses:
        lines += ["| Runtime feature | Uses |", "|---|---:|"]
        lines += [f"| `{feature}` | {count} |" for feature, count in sorted(skill_uses.items())]
        lines += ["", "A use is one observed `skillStart` entry. Passive callbacks, damage ticks, and the matching `skillEnd` are not counted as additional uses."]
    else:
        lines += ["No `skillStart` calls were observed in this capture."]

    runtime = hero["runtime_identity"]
    target_owned = lambda row, side: row.get(side) == runtime or str(row.get(f"{side}_master", "")).startswith(runtime + "#")
    owned_outgoing = [r for r in damages if target_owned(r, "src")]
    incoming = [r for r in damages if r.get("dst") == runtime]
    heals_given = [r for r in rows if r.get("kind") == "HEAL" and target_owned(r, "src")]
    heals_received = [r for r in rows if r.get("kind") == "HEAL" and r.get("dst") == runtime]
    energy = [r for r in rows if r.get("kind") == "ENERGY_CHANGE" and r.get("hero") == runtime]
    buffs_given = [r for r in rows if r.get("kind") == "BUFF_ADD" and target_owned(r, "src")]
    buffs_received = [r for r in rows if r.get("kind") == "BUFF_ADD" and r.get("dst") == runtime]
    deaths = [r for r in rows if r.get("kind") == "PLAYER_DEAD" and (r.get("hero") == runtime or str(r.get("master", "")).startswith(runtime + "#"))]
    revives = [r for r in rows if r.get("kind") == "PLAYER_REVIVE" and (r.get("hero") == runtime or str(r.get("master", "")).startswith(runtime + "#"))]
    summons = [r for r in rows if r.get("kind") in {"SUMMON_CREATE", "SUMMON_DESTROY"} and r.get("master") == runtime]
    shield_changes = [r for r in rows if r.get("kind") == "SHIELD_CHANGE" and r.get("hero") == runtime]
    hp_changes = [r for r in rows if r.get("kind") == "DIRECT_HP_CHANGE" and r.get("hero") == runtime]
    player_casts = [r for r in rows if r.get("kind") == "PLAYER_SKILL" and r.get("hero") == runtime]

    lines += ["", "## Generic performance ledger", "",
              "This ledger includes the hero and, where ownership is available, its summons. "
              "`active_skill` is exact for synchronous damage/healing inside a player-level cast and is labeled "
              "`normal_or_delayed` otherwise; delayed projectiles and persistent effects still require timeline review.", "",
              "| Measure | Observed value |", "|---|---:|",
              f"| Hero + owned-summon outgoing damage | {sum(number(r, 'out') for r in owned_outgoing):,.0f} |",
              f"| Direct incoming calculator damage to hero | {sum(number(r, 'out') for r in incoming):,.0f} |",
              f"| Effective healing given by hero/owned summons | {sum(number(r, 'effective') for r in heals_given):,.0f} |",
              f"| Effective healing received by hero | {sum(number(r, 'effective') for r in heals_received):,.0f} |",
              f"| Exposed shield value gained | {sum(max(0, number(r, 'delta')) for r in shield_changes):,.0f} |",
              f"| Exposed shield value consumed/removed | {sum(max(0, -number(r, 'delta')) for r in shield_changes):,.0f} |",
              f"| Energy gained | {sum(number(r, 'gained') for r in energy):,.0f} |",
              f"| Energy spent | {sum(number(r, 'spent') for r in energy):,.0f} |",
              f"| Buff/debuff applications sourced by hero/owned summons | {len(buffs_given)} |",
              f"| Buff/debuff applications received by hero | {len(buffs_received)} |",
              f"| Hero/owned-summon death events | {len(deaths)} |",
              f"| Hero/owned-unit revive events | {len(revives)} |",
              f"| Owned summon create/destroy observations | {sum(r.get('kind') == 'SUMMON_CREATE' for r in summons)} / {sum(r.get('kind') == 'SUMMON_DESTROY' for r in summons)} |"]

    by_skill: dict[str, dict[str, float]] = {}
    for row in owned_outgoing:
        name = row.get("active_skill", "unattributed")
        item = by_skill.setdefault(name, {"events": 0, "damage": 0})
        item["events"] += 1; item["damage"] += number(row, "out")
    lines += ["", "### Damage attribution by active skill context", ""]
    if by_skill:
        lines += ["| Skill context | Events | Damage | Share |", "|---|---:|---:|---:|"]
        owned_total = sum(x["damage"] for x in by_skill.values())
        for name, item in sorted(by_skill.items(), key=lambda pair: pair[1]["damage"], reverse=True):
            share = item["damage"] / owned_total * 100 if owned_total else 0
            lines.append(f"| `{name}` | {int(item['events'])} | {item['damage']:,.0f} | {share:.2f}% |")
    else:
        lines.append("No attributable outgoing damage was observed.")

    lines += ["", "### Skill and resource timing", ""]
    starts = [r for r in player_casts if r.get("phase") == "start"]
    if starts:
        lines += ["| Time | Skill | Energy | Position/state |", "|---:|---|---:|---|"]
        for row in starts:
            lines.append(f"| {row.get('ms', '?')} ms | `{row.get('skill', '?')}` | {row.get('energy', '?')} | `{row.get('position', '?')}` / `{row.get('state', '?')}` |")
    else:
        lines.append("No player-level skill start was observed; feature-level starts may still appear above.")

    lines += ["", "### Support attribution", ""]
    if heals_given:
        heal_by_target: dict[str, float] = collections.defaultdict(float)
        for row in heals_given: heal_by_target[f"{row.get('dst', '?')}#{row.get('dst_instance', '?')}"] += number(row, "effective")
        lines += ["| Healing beneficiary | Effective healing |", "|---|---:|"]
        lines += [f"| `{name}` | {value:,.0f} |" for name, value in sorted(heal_by_target.items(), key=lambda x: x[1], reverse=True)]
    else:
        lines.append("No effective healing sourced by the hero or its owned summons was observed.")
    if buffs_given:
        lines += ["", "| Buff ID | Target | Skill/context | Exposed value |", "|---|---|---|---:|"]
        for row in buffs_given:
            lines.append(f"| `{row.get('id', '?')}` | `{row.get('dst', '?')}` | `{row.get('skill', row.get('active_skill', '?'))}` | {row.get('value', '?')} |")
        lines += ["", "An exposed buff-work value is not automatically a shield. Identify shield buff IDs from config/Lua before summing shield generation; absorption requires matching value changes or engine events."]
    else:
        lines += ["", "No buff/debuff application sourced by the hero or its owned summons was observed."]

    lines += ["", "### Survivability events", "",
              f"- Incoming damage events: {len(incoming)}; zero-output events: {sum(number(r, 'out') == 0 for r in incoming)}.",
              f"- Effective healing received: {sum(number(r, 'effective') for r in heals_received):,.0f} across {len(heals_received)} events.",
              f"- Direct HP mutations: {len(hp_changes)} (includes non-calculator HP transfer, self-cost, scripted loss, and may overlap ordinary damage/healing).",
              f"- Shield value mutations: {len(shield_changes)}; availability depends on the runtime shield class being loaded when the probe attaches.",
              f"- Explicit hero/owned-unit deaths: {len(deaths)}.",
              f"- Explicit hero/owned-unit revives: {len(revives)}.",
              "- Zero calculator output can indicate immunity, dodge, shield, mitigation, or another mutation. Attribute prevented damage only with the adjacent feature/buff timeline."]

    role = (hero.get("global") or {}).get("class") or (hero.get("external") or {}).get("class") or "Unknown"
    lines += ["", "## Hero-guide analysis contract", "",
              f"Detected class: **{role}**. Complete these sections after reviewing the captured timeline and static implementation:",
              "", "### Team Building evidence layers", "",
              "Keep two separate partner lists: (1) mechanically recommended candidates found from verified hero kits/database search, and "
              "(2) fight-verified partners supported by controlled recordings. Never label a theoretical candidate the definitive best team. "
              "For every named recommendation, state whether its evidence is observed, Lua-confirmed, database-derived, or theory-crafted.",
              "", "For PvP, answer whether the hero completed a meaningfully charged Ultimate before the fight was decided. Identify whether "
              "Energy generation, partner death, control/interruption, or enemy spacing was the principal limitation. "
              "Compare timing and damage share with PvE, not raw damage totals.",
              "", "### 1. Who enabled this hero most?", "",
              "Rank allied sources of healing, buffs, shields/protection, energy, control setup, and measurable damage amplification. Separate self-generated effects from ally contributions.",
              "", "### 2. What did this hero give teammates?", "",
              "Attribute healing, buffs, shields, energy, control, enemy debuffs, summoned bodies, targeting relief, and indirect enablement to each beneficiary.",
              "", "### 3. Damage-dealer specialization", "",
              "Identify the largest damage skill/path, its share and cadence, the mechanic that enabled it, and the most effective ways to amplify it. Include target, mode, level-suppression, and settlement-coverage caveats.",
              "", "### 4. Support specialization", "",
              "If the hero is a support or hybrid, explain the unique specialty, ideal encounter, required partners, beneficiaries, anti-synergies, and what the support does not provide.",
              "", "### Remaining required guide coverage", "",
              "- Role and battlefield purpose; positioning and target selection",
              "- Each skill's cadence, targets, damage/control/support contribution",
              "- Resources gathered or spent: energy, stacks, buffs, shields, healing",
              "- Enablers provided to allies and pressure imposed on enemies",
              "- Survivability: prevented damage, dodge, mitigation, recovery and death timing",
              "- Relic/exclusive-equipment triggers and thresholds",
              "- Synergies, counters, failure modes, investment breakpoints and mode dependence",
              "- Calculator coverage versus settlement totals and limitations", ""]
    (outdir / "LIVE_ANALYSIS.md").write_text("\n".join(lines), encoding="utf-8")


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        return rows
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def write_demeter_super_armor_test(outdir: Path, rows: list[dict]) -> Path:
    """Write the opt-in Heket debuff versus Demeter Super Armor timeline."""
    demeter = "H_DeMoTeEr"
    heket_debuff = "301212101"

    def millis(row: dict) -> float:
        try:
            return float(row.get("ms", -1))
        except (TypeError, ValueError):
            return -1

    def unique(events: list[dict]) -> list[dict]:
        # addBufById calls addBufByData internally, so collapse duplicate hooks.
        seen = set(); result = []
        for row in events:
            key = (row.get("kind"), row.get("ms"), row.get("id"),
                   row.get("src_instance"), row.get("dst_instance"))
            if key not in seen:
                seen.add(key); result.append(row)
        return result

    demeter_buffs = unique([
        row for row in rows
        if row.get("kind") == "BUFF_ADD" and row.get("dst") == demeter
    ])
    immunity_adds = [
        row for row in demeter_buffs
        if re.search(r"(?:^|,)type:Immunity(?:,|$)", row.get("buff_state", ""))
    ]
    immunity_ids = {row.get("id") for row in immunity_adds}
    immunity_removes = unique([
        row for row in rows
        if row.get("kind") == "BUFF_REMOVE" and row.get("dst") == demeter
        and row.get("id") in immunity_ids
    ])
    debuff_adds = unique([
        row for row in rows
        if row.get("kind") == "BUFF_ADD" and row.get("dst") == demeter
        and row.get("id") == heket_debuff
        and (row.get("src") == "H_HaiKuiTe_Frog" or
             str(row.get("src_master", "")).startswith("H_HaiKuiTe#"))
    ])

    intervals = []
    for add in immunity_adds:
        end = next((row for row in immunity_removes
                    if row.get("id") == add.get("id")
                    and row.get("dst_instance") == add.get("dst_instance")
                    and millis(row) >= millis(add)), None)
        intervals.append((millis(add), millis(end) if end else float("inf"), add, end))

    overlaps = []
    for debuff in debuff_adds:
        active = [item for item in intervals if item[0] <= millis(debuff) <= item[1]]
        if active:
            overlaps.append((debuff, active))

    skill3 = [
        row for row in rows if row.get("kind") == "PLAYER_SKILL"
        and row.get("hero") == demeter and "skill3" in row.get("skill", "").lower()
    ]
    lines = ["# One-time test: Heket debuff vs Demeter Super Armor", "",
             f"- Demeter runtime: `{demeter}`",
             f"- Heket frog debuff: `{heket_debuff}`",
             f"- Explicit Demeter `Immunity`/Super Armor applications: **{len(immunity_adds)}**",
             f"- Heket debuff applications onto Demeter: **{len(debuff_adds)}**",
             f"- Debuff applications during an active Super Armor interval: **{len(overlaps)}**", ""]
    if overlaps:
        lines += ["**Result: YES — Heket's debuff was added while Demeter's Super Armor buff was active.**", ""]
    elif immunity_adds and debuff_adds:
        lines += ["**Result: NO observed overlap — both effects occurred, but not at the same time.**", ""]
    elif not immunity_adds:
        lines += ["**Result: inconclusive — no explicit Super Armor/Immunity application was captured on Demeter.**", ""]
    else:
        lines += ["**Result: inconclusive — Super Armor was captured, but Heket's debuff was not applied to Demeter.**", ""]
    lines += ["## Timeline", "", "| Time (ms) | Event | Buff | Details |", "|---:|---|---|---|"]
    timeline = []
    for row in immunity_adds:
        timeline.append((millis(row), "Super Armor add", row.get("id", "?"), row.get("dst_instance", "?")))
    for row in immunity_removes:
        timeline.append((millis(row), "Super Armor remove", row.get("id", "?"), row.get("dst_instance", "?")))
    for row in debuff_adds:
        during = any(start <= millis(row) <= end for start, end, _, _ in intervals)
        timeline.append((millis(row), "Heket debuff add", heket_debuff,
                         f"source={row.get('src', '?')}; super_armor_active={str(during).lower()}"))
    for row in skill3:
        timeline.append((millis(row), f"Demeter skill3 {row.get('phase', '?')}", "—", row.get("skill", "?")))
    for when, event, buff, details in sorted(timeline):
        lines.append(f"| {when:g} | {event} | `{buff}` | `{details}` |")
    if not timeline:
        lines.append("| — | No matching events captured | — | — |")
    output = outdir / "DEMETER_SUPER_ARMOR_TEST.md"
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return output


def summarize_capture(meta: dict, rows: list[dict], cutoff_ms: float | None = None) -> dict[str, float]:
    runtime = meta["hero"]["runtime_identity"]

    def number(row: dict, key: str) -> float:
        try:
            return float(row.get(key, 0))
        except (TypeError, ValueError):
            return 0.0

    selected = [r for r in rows if cutoff_ms is None or number(r, "ms") <= cutoff_ms]
    owned = lambda r, side: r.get(side) == runtime or str(r.get(f"{side}_master", "")).startswith(runtime + "#")
    damage_out = [r for r in selected if r.get("kind") == "DAMAGE" and owned(r, "src")]
    damage_in = [r for r in selected if r.get("kind") == "DAMAGE" and r.get("dst") == runtime]
    heals_out = [r for r in selected if r.get("kind") == "HEAL" and owned(r, "src")]
    heals_in = [r for r in selected if r.get("kind") == "HEAL" and r.get("dst") == runtime]
    energy = [r for r in selected if r.get("kind") == "ENERGY_CHANGE" and r.get("hero") == runtime]
    shields = [r for r in selected if r.get("kind") == "SHIELD_CHANGE" and r.get("hero") == runtime]
    buffs_out = [r for r in selected if r.get("kind") == "BUFF_ADD" and owned(r, "src")]
    summons = [r for r in selected if r.get("kind") in {"SUMMON_CREATE", "SUMMON_DESTROY"} and r.get("master") == runtime]
    deaths = [r for r in selected if r.get("kind") == "PLAYER_DEAD" and (r.get("hero") == runtime or str(r.get("master", "")).startswith(runtime + "#"))]
    revives = [r for r in selected if r.get("kind") == "PLAYER_REVIVE" and (r.get("hero") == runtime or str(r.get("master", "")).startswith(runtime + "#"))]
    return {
        "duration_ms": max((number(r, "ms") for r in selected), default=0),
        "events": len(selected),
        "damage_out": sum(number(r, "out") for r in damage_out),
        "damage_events": len(damage_out),
        "damage_in": sum(number(r, "out") for r in damage_in),
        "healing_out": sum(number(r, "effective") for r in heals_out),
        "healing_in": sum(number(r, "effective") for r in heals_in),
        "shield_gained": sum(max(0, number(r, "delta")) for r in shields),
        "shield_lost": sum(max(0, -number(r, "delta")) for r in shields),
        "energy_gained": sum(number(r, "gained") for r in energy),
        "energy_spent": sum(number(r, "spent") for r in energy),
        "skill_starts": sum(r.get("kind") == "PLAYER_SKILL" and r.get("hero") == runtime and r.get("phase") == "start" for r in selected),
        "buffs_out": len(buffs_out),
        "summons_created": sum(r.get("kind") == "SUMMON_CREATE" for r in summons),
        "summons_destroyed": sum(r.get("kind") == "SUMMON_DESTROY" for r in summons),
        "deaths": len(deaths),
        "revives": len(revives),
    }


def write_experiment_comparison(current_outdir: Path, experiment_name: str, hero_id: int) -> Path | None:
    if not experiment_name:
        return None
    captures: list[tuple[Path, dict, list[dict]]] = []
    for manifest in (ROOT / "fights").glob("*/capture_manifest.json"):
        try:
            meta = json.loads(manifest.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        exp = meta.get("experiment") or {}
        if exp.get("name") != experiment_name or (meta.get("hero") or {}).get("id") != hero_id:
            continue
        rows = load_jsonl(manifest.parent / "events.jsonl")
        if rows:
            captures.append((manifest.parent, meta, rows))
    if len(captures) < 2:
        return None
    captures.sort(key=lambda item: str(item[1].get("started_at", "")))
    durations = [summarize_capture(meta, rows)["duration_ms"] for _, meta, rows in captures]
    common_ms = min((d for d in durations if d > 0), default=0)
    metrics = [
        ("duration_ms", "Observed duration (ms)"), ("damage_out", "Hero + summons damage"),
        ("damage_events", "Damage events"), ("damage_in", "Damage received"),
        ("healing_out", "Effective healing given"), ("healing_in", "Effective healing received"),
        ("shield_gained", "Exposed shield gained"), ("shield_lost", "Exposed shield consumed/removed"),
        ("energy_gained", "Energy gained"), ("energy_spent", "Energy spent"),
        ("skill_starts", "Skill starts"), ("buffs_out", "Buff/debuff applications"),
        ("summons_created", "Summons created"), ("summons_destroyed", "Summons destroyed"),
        ("deaths", "Hero/owned-unit deaths"), ("revives", "Hero/owned-unit revives"),
    ]
    labels = [
        f"{(meta.get('experiment') or {}).get('variant') or path.name}-r{(meta.get('experiment') or {}).get('repeat', 1)}"
        for path, meta, _ in captures
    ]
    full = [summarize_capture(meta, rows) for _, meta, rows in captures]
    common = [summarize_capture(meta, rows, common_ms) for _, meta, rows in captures]
    contexts = [meta.get("experiment") or {} for _, meta, _ in captures]
    controlled_fields = ("stage", "mode", "opponent", "lineup", "formation", "investment", "automation", "client_build")
    declared_varying = set().union(*(set(context.get("varied_fields") or []) for context in contexts))
    missing_context = [field for field in controlled_fields if field not in declared_varying and all(context.get(field) in (None, "", "unknown", "unspecified") for context in contexts)]
    differing_context = [field for field in controlled_fields if len({json.dumps(context.get(field), sort_keys=True) for context in contexts}) > 1]
    uncontrolled_differences = [field for field in differing_context if field not in declared_varying]
    control_status = "insufficient metadata" if missing_context else ("not controlled" if uncontrolled_differences else "recorded controls match")
    lines = [f"# {captures[0][1]['hero']['name']} controlled fight comparison", "",
             f"Experiment: `{experiment_name}`", f"Shared-duration cutoff: **{common_ms:,.0f} ms**", "",
             f"Control status: **{control_status}**.",
             f"Declared variable fields: {', '.join(sorted(declared_varying)) or 'none'}. Missing controls: {', '.join(missing_context) or 'none'}. Uncontrolled differences: {', '.join(uncontrolled_differences) or 'none'}.", "",
             "Full-fight totals are descriptive when durations differ. The shared-window table only normalizes observation length; it is causal only when the recorded controls match.", "",
             "## Full captures", "", "| Metric | " + " | ".join(labels) + " |",
             "|---|" + "---:|" * len(labels)]
    for key, label in metrics:
        lines.append("| " + label + " | " + " | ".join(f"{item[key]:,.0f}" for item in full) + " |")
    lines += ["", "## Shared-window comparison", "", "| Metric | " + " | ".join(labels) + " |",
              "|---|" + "---:|" * len(labels)]
    for key, label in metrics:
        if key == "duration_ms":
            continue
        lines.append("| " + label + " | " + " | ".join(f"{item[key]:,.0f}" for item in common) + " |")
    if len(common) == 2:
        lines += ["", "## Two-variant deltas", "", f"Delta is `{labels[1]} − {labels[0]}`.", "",
                  "| Metric | Absolute delta | Relative delta |", "|---|---:|---:|"]
        for key, label in metrics:
            if key == "duration_ms":
                continue
            delta = common[1][key] - common[0][key]
            relative = delta / common[0][key] * 100 if common[0][key] else 0
            lines.append(f"| {label} | {delta:+,.0f} | {relative:+.2f}% |")
    lines += ["", "## Interpretation limits", "",
              "- Compare identical stage, opponents, formation, investment and manual/auto settings.",
              "- Skill context is exact for synchronous effects; delayed projectiles and persistent effects may be unattributed.",
              "- Shield totals depend on the runtime exposing a loaded shield-work implementation.",
              "- Calculator totals should be reconciled with the settlement screen before claiming complete game-accounted output."]
    output = current_outdir / "EXPERIMENT_COMPARISON.md"
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return output


def detach_bounded(session, timeout: float = 3.0) -> bool:
    """Do not let an unresponsive Frida session block saved captures."""
    done = threading.Event()
    def detach():
        try:
            session.detach()
        except Exception:
            pass
        finally:
            done.set()
    threading.Thread(target=detach, daemon=True).start()
    return done.wait(timeout)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("hero", nargs='?', help="display name, slug, CN name, or numeric hero ID")
    ap.add_argument('--analyze', type=Path, help='rebuild reports from an existing capture; no device required')
    ap.add_argument('--compare', type=Path, nargs='+', help='compare existing captures; no device required')
    ap.add_argument('--camp', default='1', help='target hero camp (default 1)')
    ap.add_argument('--runtime-root', type=Path, default=default_runtime_root(),
                    help='workspace containing global_lua_dump/live_extractions (auto-detected by default)')
    ap.add_argument('--config-root', type=Path, default=None,
                    help='extracted client config root (defaults below --runtime-root)')
    ap.add_argument('--hero-repo', type=Path, default=Path('/Users/daschultheiss/hero-database'), help='reference kit repository; never used as observed battle investment')
    ap.add_argument('--checkpoint-seconds', type=float, default=30, help='periodic evidence report interval; 0 disables')
    ap.add_argument("--package", default=PACKAGE_DEFAULT)
    ap.add_argument("--out", default="")
    ap.add_argument("--capture-all", action=argparse.BooleanOptionalAction, default=True,
                    help="capture every combatant and interaction (default); use --no-capture-all for a lower-volume target-only diagnostic")
    ap.add_argument("--experiment", default="", help="shared name for all controlled variants")
    ap.add_argument("--variant", default="single", help="arbitrary variant label, e.g. grouped or single-target")
    ap.add_argument("--repeat", type=int, default=1, help="repeat number for this variant")
    ap.add_argument("--stage", default="", help="stage/mode label; use the same value in both paired runs")
    ap.add_argument("--mode", choices=("unspecified", "pve", "pvp", "time_challenge"), default="unspecified",
                    help="combat mode, required context for PvE/PvP comparisons")
    ap.add_argument("--opponent", default="", help="opponent/team label, especially for matchup-dependent PvP runs")
    ap.add_argument("--lineup", default="", help="human-readable allied lineup in formation order")
    ap.add_argument("--formation", default="", help="formation-slot notes; runtime coordinates are also captured")
    ap.add_argument("--investment", default="", help="target and team investment fingerprint")
    ap.add_argument("--vary", action="append", default=[], choices=("stage", "mode", "opponent", "lineup", "formation", "investment", "automation", "client_build"),
                    help="manifest field intentionally changed by this experiment; repeat when needed")
    ap.add_argument("--automation", choices=("unknown", "auto", "manual"), default="unknown")
    ap.add_argument("--result", choices=("unknown", "victory", "defeat", "timeout"), default="unknown",
                    help="known result; may be corrected in capture_manifest.json after the fight")
    ap.add_argument("--client-build", default="", help="client/build identifier for comparison validation")
    ap.add_argument("--expect", action="append", default=[],
                    help="expected behavior to audit; repeat for multiple expectations")
    ap.add_argument("--notes", default="", help="formation/investment notes stored in the manifest")
    ap.add_argument("--max-duration", type=float, default=0,
                    help="automatically stop after N seconds and write the report (0 = manual stop)")
    ap.add_argument("--demeter-super-armor-test", action="store_true",
                    help="one-time Heket test: correlate debuff 301212101 on Demeter with active Immunity/Super Armor")
    args = ap.parse_args()
    config_root = args.config_root or args.runtime_root / 'live_extractions/latest/unpacked/region_04/client/config'
    if args.analyze:
        rebuild(args.analyze, args.out or None, args.camp, config_root, args.hero_repo)
        print(f'Rebuilt evidence report: {args.out or args.analyze}/HERO_GUIDE.md')
        return
    if args.compare:
        from combat_analysis import compare
        compare(args.compare, Path(args.out or ROOT/'fights/comparison'), args.camp, config_root, args.hero_repo)
        return
    if not args.hero: ap.error('hero is required for live capture')
    if args.max_duration < 0 or args.checkpoint_seconds < 0: ap.error('durations must be nonnegative')
    if args.repeat < 1: ap.error('--repeat must be at least 1')
    if not ADB.exists():
        raise SystemExit(f"ADB not found at {ADB}; install/configure Android platform-tools before capturing")
    if not args.runtime_root.exists():
        raise SystemExit(f"Runtime extraction root does not exist: {args.runtime_root}")
    try:
        import frida
    except ModuleNotFoundError as exc:
        raise SystemExit("Python package `frida` is required for live capture") from exc
    hero = resolve_hero(args.hero, args.runtime_root); stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    outdir = Path(args.out) if args.out else ROOT / "fights" / f"{hero['slug']}_{stamp}"
    outdir.mkdir(parents=True, exist_ok=True)
    meta = static_evidence(hero, args.runtime_root); meta["package"] = args.package; meta["started_at"] = dt.datetime.now().astimezone().isoformat()
    meta["schema_version"] = CAPTURE_SCHEMA_VERSION
    meta["capture_id"] = f"{hero['slug']}_{stamp}"
    meta["runtime_root"] = str(args.runtime_root)
    meta['hero_repo'] = str(args.hero_repo)
    meta["experiment"] = {"name": args.experiment, "variant": args.variant, "capture_all": args.capture_all,
                          "repeat": args.repeat, "stage": args.stage, "mode": args.mode,
                          "opponent": args.opponent, "lineup": args.lineup, "formation": args.formation,
                          "investment": args.investment, "varied_fields": args.vary,
                          "automation": args.automation, "result": args.result,
                          "client_build": args.client_build, "expectations": args.expect,
                          "notes": args.notes}
    if args.variant != "single" and not args.capture_all:
        raise SystemExit("Controlled experiment variants require --capture-all")
    if args.variant != "single" and not args.experiment:
        raise SystemExit("Paired runs require the same non-empty --experiment name")
    (outdir / "capture_manifest.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    device_log = f"/sdcard/Android/data/{args.package}/files/hero_combat_{hero['slug']}.log"
    subprocess.run([str(ADB), "shell", f": > {device_log}"], capture_output=True)
    pid = resolve_pid(args.package)
    if not pid: raise SystemExit(f"{args.package} is not running")
    # Do not let adb/tail own the terminal's input. Otherwise macOS can route
    # Ctrl-C to the adb child and Python never receives KeyboardInterrupt.
    tail = subprocess.Popen([str(ADB), "shell", "tail", "-f", "-n", "+1", device_log], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, text=True, errors="replace", bufsize=1, start_new_session=True)
    session = frida.get_usb_device(timeout=10).attach(pid)
    js = JS_TEMPLATE.replace("%LUA%", json.dumps(lua_probe(hero["runtime_identity"], device_log, args.capture_all)))
    script = session.create_script(js)
    state = {"injected": False}; rows: list[dict] = []
    script.on("message", lambda m,d: (state.update(injected=True) if m.get("payload",{}).get("t") == "injected" else print("[FRIDA]", m.get("payload",m), flush=True)))
    script.load()
    events = (outdir / "events.jsonl").open("w", encoding="utf-8")
    # Terminal-close sends SIGHUP/SIGTERM rather than KeyboardInterrupt. Turn
    # those into the same controlled shutdown path so the report is generated.
    def stop_capture(signum, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGINT, stop_capture)
    signal.signal(signal.SIGTERM, stop_capture)
    if hasattr(signal, "SIGHUP"):
        signal.signal(signal.SIGHUP, stop_capture)
    if hasattr(signal, "SIGALRM"):
        signal.signal(signal.SIGALRM, stop_capture)
    print(f"Resolved {hero['name']} ({hero['id']}) -> {hero['runtime_identity']} / skin {hero['skin_id']}")
    print(f"Output: {outdir}")
    stop_requested = threading.Event()
    if args.max_duration > 0:
        # A real process alarm interrupts readline/select even if adb keeps a
        # pipe descriptor open through a child shell.
        signal.setitimer(signal.ITIMER_REAL, args.max_duration)
    def console_stop_reader():
        try:
            for command in sys.stdin:
                if command.strip().lower() in {"q", "quit", "stop", "exit"}:
                    stop_requested.set()
                    try:
                        tail.kill()
                    except OSError:
                        pass
                    break
        except (OSError, ValueError):
            pass
    threading.Thread(target=console_stop_reader, daemon=True).start()
    print("Zum Beenden alternativ: q + Enter", flush=True)
    announced = False
    last_checkpoint = time.monotonic()
    buffer = b''
    try:
        assert tail.stdout
        while True:
            if stop_requested.is_set():
                break
            ready, _, _ = select.select([tail.stdout], [], [], 1.0)
            if not ready:
                continue
            chunk = os.read(tail.stdout.fileno(), 65536)
            if not chunk:
                break
            buffer += chunk
            while b'\n' in buffer:
                raw, buffer = buffer.split(b'\n',1)
                line = raw.decode('utf-8',errors='replace')
                if '[HEROLOG]' not in line: continue
                row = parse_line(line); rows.append(row); events.write(json.dumps(row,ensure_ascii=False)+'\n'); events.flush()
                if row.get('kind') == 'READY' and not announced:
                    announced=True
                    print('READY TO WATCH FIGHT — start battle now.',flush=True)
            if args.checkpoint_seconds and time.monotonic()-last_checkpoint >= args.checkpoint_seconds:
                save_analysis_safely(outdir, meta, rows, args.camp, config_root)
                last_checkpoint=time.monotonic()
    except KeyboardInterrupt:
        pass
    finally:
        if hasattr(signal, "SIGALRM"):
            signal.setitimer(signal.ITIMER_REAL, 0)
        print("\nSTOP: Aufnahme beendet; Bericht wird gespeichert.", flush=True)
        stop_requested.set()
        events.close()
        tail.kill()
        meta["finished_at"] = dt.datetime.now().astimezone().isoformat(); meta["event_count"] = len(rows)
        (outdir / "capture_manifest.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
        analysis_ok = save_analysis_safely(outdir, meta, rows, args.camp, config_root)
        comparison = write_experiment_comparison(outdir, args.experiment, hero["id"]) if args.experiment else None
        demeter_test = write_demeter_super_armor_test(outdir, rows) if args.demeter_super_armor_test else None
        uses = collections.Counter(
            r.get("feature", "?") for r in rows
            if r.get("kind") == "FEATURE_ENTER" and r.get("method") == "skillStart"
        )
        if uses:
            print("Skill uses: " + ", ".join(f"{name}={count}" for name, count in sorted(uses.items())))
        report_text = str(outdir / 'HERO_GUIDE.md') if analysis_ok else f"FAILED; see {outdir / 'ANALYSIS_ERROR.txt'}"
        print(f"\nSaved capture -> {outdir}\nReport -> {report_text}")
        if comparison:
            print(f"Comparison -> {comparison}")
        if demeter_test:
            print(f"Demeter Super Armor test -> {demeter_test}")
        print("Bericht gespeichert. Frida-Verbindung wird getrennt (max. 3 Sekunden).", flush=True)
        detached = detach_bounded(session)
        if not detached:
            print("Frida detach antwortet nicht; Aufnahme ist gespeichert. Prozess wird beendet.", flush=True)
            # All capture files are closed and reports saved. Avoid native
            # Frida shutdown waiting indefinitely on the same connection.
            sys.stdout.flush()
            sys.stderr.flush()
            os._exit(0)


if __name__ == "__main__":
    main()
