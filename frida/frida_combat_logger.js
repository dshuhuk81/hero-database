/**
 * Frida Combat Logger — Motto Immortal
 *
 * Goal: Intercept damage calculation during combat to:
 *   1. Confirm the overstep_combat suppression formula
 *   2. Log raw vs modified damage values
 *   3. Capture level gap data at time of hit
 *
 * Prerequisites:
 *   - Frida 16+ on host
 *   - frida-server running on emulator (see setup guide)
 *   - Game running on emulator (not on physical device — too risky)
 *
 * Usage:
 *   frida -U -n "com.youzu.en.motto" -l frida_combat_logger.js
 *   (replace package name with actual app package — check via `adb shell pm list packages | grep motto`)
 */

"use strict";

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const CONFIG = {
    logToFile: true,
    logPath: "/sdcard/combat_log.json",
    verboseMode: false,                  // set true to log every hit (spammy)
    captureOnlyOverstepHits: true,       // only log hits where overstep > 0
    maxLogEntries: 10000,
};

// ─── UNITY IL2CPP BOOTSTRAP ───────────────────────────────────────────────────

// The game uses Unity + IL2CPP. Methods live in libil2cpp.so.
// We need to find the right class/method names at runtime.

const il2cpp = Module.findBaseAddress("libil2cpp.so");
if (!il2cpp) {
    console.error("[!] libil2cpp.so not found — game may not be running or wrong process");
} else {
    console.log("[+] libil2cpp.so base:", il2cpp);
}

// ─── APPROACH 1: Symbol Scan (easiest if symbols not stripped) ───────────────

function trySymbolHook() {
    // Common Unity combat method names (may be obfuscated)
    const candidateMethods = [
        "CombatManager_CalculateDamage",
        "BattleManager_ApplyDamage",
        "HeroUnit_TakeDamage",
        "DamageCalculator_Calculate",
        "FightSystem_CalcDamage",
        "CombatFormula_GetDamage",
        // obfuscated fallbacks — update after finding via class-dump
        "Method_100",
        "Method_101",
    ];

    let hooked = 0;
    for (const name of candidateMethods) {
        const addr = Module.findExportByName("libil2cpp.so", name);
        if (addr) {
            console.log(`[+] Found symbol: ${name} @ ${addr}`);
            hookDamageMethod(addr, name);
            hooked++;
        }
    }

    if (hooked === 0) {
        console.log("[-] No symbols found — symbols likely stripped. Falling back to pattern scan.");
        tryPatternScan();
    }
}

// ─── APPROACH 2: Byte Pattern Scan ───────────────────────────────────────────
// Use if symbols are stripped. Pattern derived from disassembly of similar Unity games.
// YOU MUST UPDATE this pattern after disassembling the actual libil2cpp.so.

function tryPatternScan() {
    console.log("[*] Starting pattern scan — this may take a few seconds...");

    // Placeholder pattern — replace with actual bytes from IDA/Ghidra analysis
    // Common approach: find the function that reads overstep_combat field and processes it
    const PATTERN_PLACEHOLDER = "FF 43 01 D1 FC 6F 04 A9";  // ARM64 function prologue example

    try {
        const matches = Memory.scanSync(il2cpp, Process.getModuleByName("libil2cpp.so").size, PATTERN_PLACEHOLDER);
        if (matches.length > 0) {
            console.log(`[+] Pattern found at ${matches.length} location(s)`);
            matches.forEach((m, i) => {
                console.log(`    [${i}] ${m.address}`);
                // hookDamageMethod(m.address, `pattern_match_${i}`);
            });
        } else {
            console.log("[-] Pattern not found — update pattern after disassembly");
        }
    } catch (e) {
        console.error("[-] Pattern scan failed:", e.message);
    }
}

// ─── APPROACH 3: IL2CPP Class Inspector (best for finding method offsets) ────
// Enumerate loaded classes to find combat-related ones

function inspectClasses() {
    console.log("[*] Enumerating IL2CPP classes...");

    // il2cpp_domain_get_assemblies → iterate assemblies → find CombatManager
    // This requires il2cpp.h bindings — use frida-il2cpp-bridge for cleaner API

    // Simpler: grep memory for class name strings
    const keywords = ["CombatManager", "DamageCalc", "BattleFormula", "OverstepCombat", "overstep"];
    keywords.forEach(kw => {
        const results = scanForString(kw);
        if (results.length > 0) {
            console.log(`[+] "${kw}" found at: ${results.slice(0, 3).join(", ")}`);
        }
    });
}

function scanForString(str) {
    const results = [];
    const pattern = Array.from(Buffer.from(str, "utf-8")).map(b => b.toString(16).padStart(2, "0")).join(" ");
    try {
        const matches = Memory.scanSync(il2cpp, Process.getModuleByName("libil2cpp.so").size, pattern);
        matches.forEach(m => results.push(m.address.toString()));
    } catch (e) { /* ignore */ }
    return results;
}

// ─── HOOK IMPLEMENTATION ──────────────────────────────────────────────────────

const combatLog = [];

function hookDamageMethod(addr, label) {
    Interceptor.attach(addr, {
        onEnter(args) {
            // Typical Unity method signature (ARM64):
            //   arg0 = this (attacker unit)
            //   arg1 = target unit
            //   arg2 = skill/ability context
            //   arg3 = method info (IL2CPP internal)
            this.label = label;
            this.t = Date.now();

            try {
                // Read attacker stats — offsets are guesses, update after memory inspection
                this.attackerLevel = args[0].add(0x48).readInt();   // offset to level field
                this.targetLevel   = args[1].add(0x48).readInt();
                this.baseAtk       = args[0].add(0x60).readFloat();
                this.targetDef     = args[1].add(0x64).readFloat();

                if (CONFIG.verboseMode) {
                    console.log(`[>] ${label}: attacker L${this.attackerLevel} vs target L${this.targetLevel}`);
                }
            } catch (e) {
                // offsets wrong — field reads will fail silently
            }
        },

        onLeave(retval) {
            try {
                const finalDamage = retval.toInt32();
                const levelGap    = (this.targetLevel || 0) - (this.attackerLevel || 0);

                if (CONFIG.captureOnlyOverstepHits && levelGap <= 0) return;

                const entry = {
                    ts:             this.t,
                    hook:           this.label,
                    attackerLevel:  this.attackerLevel,
                    targetLevel:    this.targetLevel,
                    levelGap:       levelGap,
                    levelGapPct:    this.attackerLevel > 0 ? (levelGap / this.attackerLevel * 100).toFixed(1) : null,
                    baseAtk:        this.baseAtk,
                    targetDef:      this.targetDef,
                    finalDamage:    finalDamage,
                };

                combatLog.push(entry);
                console.log(JSON.stringify(entry));

                if (combatLog.length >= CONFIG.maxLogEntries) flushLog();
            } catch (e) { /* ignore parse errors */ }
        }
    });

    console.log(`[+] Hooked: ${label} @ ${addr}`);
}

// ─── MEMORY FIELD PROBE ───────────────────────────────────────────────────────
// Run this while standing in front of an enemy to find field offsets.
// Pass a known hero object address from memory scanner.

function probeUnitFields(unitAddr) {
    console.log(`[*] Probing unit @ ${unitAddr}`);
    const base = ptr(unitAddr);

    for (let offset = 0; offset < 0x200; offset += 4) {
        try {
            const val = base.add(offset).readInt();
            if (val > 0 && val < 5000) {  // plausible level range
                console.log(`  offset 0x${offset.toString(16)}: ${val}  (possible level?)`);
            }
        } catch (e) { /* unreadable page */ }
    }
}

// ─── LOG FLUSHING ─────────────────────────────────────────────────────────────

function flushLog() {
    if (!CONFIG.logToFile || combatLog.length === 0) return;

    const json = JSON.stringify(combatLog, null, 2);
    try {
        const f = new File(CONFIG.logPath, "a");
        f.write(json + "\n");
        f.flush();
        f.close();
        console.log(`[+] Flushed ${combatLog.length} entries to ${CONFIG.logPath}`);
        combatLog.length = 0;
    } catch (e) {
        console.error("[-] Log flush failed:", e.message);
    }
}

// Auto-flush every 30 seconds
setInterval(flushLog, 30000);

// ─── ALTERNATIVE: GameGuardian-style memory watch ────────────────────────────
// If Frida hook approach fails, use this to watch specific memory addresses
// that update during combat (requires manual address discovery first)

function watchMemoryAddress(addr, label) {
    // Poll the address every 500ms and log changes
    let lastVal = null;
    setInterval(() => {
        try {
            const val = ptr(addr).readFloat();
            if (val !== lastVal) {
                console.log(`[watch] ${label} @ ${addr}: ${lastVal} → ${val}`);
                lastVal = val;
                combatLog.push({ ts: Date.now(), type: "watch", label, addr, value: val });
            }
        } catch (e) { /* page unmapped */ }
    }, 500);
}

// ─── NETWORK PACKET CAPTURE (bonus: confirm server-side configs) ─────────────
// Intercept HTTP/HTTPS calls to find if stage configs come from server

function hookNetworking() {
    const SSLRead = Module.findExportByName("libssl.so", "SSL_read");
    if (SSLRead) {
        Interceptor.attach(SSLRead, {
            onLeave(retval) {
                const len = retval.toInt32();
                if (len > 0 && len < 65536) {
                    try {
                        const buf = this.context.x1.readByteArray(len);  // ARM64 arg1
                        const str = String.fromCharCode.apply(null, new Uint8Array(buf));
                        if (str.includes("overstep") || str.includes("stage_battle")) {
                            console.log("[NET] Stage config in response:", str.substring(0, 500));
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        });
        console.log("[+] SSL_read hooked — watching for stage config responses");
    }
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────

console.log("=".repeat(60));
console.log("Motto Immortal Combat Logger v1.0");
console.log("=".repeat(60));

if (il2cpp) {
    // Step 1: Try to find method by symbol name
    trySymbolHook();

    // Step 2: Look for relevant strings in memory (helps locate code)
    inspectClasses();

    // Step 3: Hook network to detect live config fetching
    hookNetworking();

    console.log("[*] Logger active. Enter combat to capture data.");
    console.log("[*] Log file:", CONFIG.logPath);
}

// Export helpers for interactive use from Frida REPL:
//   frida> probeUnitFields("0x12345678")
//   frida> watchMemoryAddress("0x87654321", "playerHP")
global.probeUnitFields = probeUnitFields;
global.watchMemoryAddress = watchMemoryAddress;
global.flushLog = flushLog;
