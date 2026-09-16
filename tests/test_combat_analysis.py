import json
import tempfile
import unittest
from pathlib import Path

from combat_analysis import analyze, compare, rebuild, save_report


class CombatAnalysisTests(unittest.TestCase):
    def setUp(self):
        self.meta = {
            "schema_version": 2,
            "capture_id": "zaojun_fixture",
            "hero_repo": str(Path(__file__).resolve().parents[1]),
            "hero": {
                "id": 4013,
                "slug": "zaojun",
                "name": "Zaojun",
                "runtime_identity": "H_ZaoJun",
            },
            "experiment": {
                "name": "fixture", "variant": "bond-dies", "repeat": 1,
                "mode": "pve", "stage": "fixture-stage", "opponent": "fixture-team",
                "lineup": "Zaojun, Ally", "formation": "Zaojun back",
                "automation": "auto", "client_build": "test",
            },
        }
        self.rows = [
            {"ms": "0", "kind": "READY"},
            {"ms": "0", "kind": "DAMAGE_HOOK", "normal": "true", "true_damage": "true"},
            {"ms": "0", "kind": "PLAYER_LINEUP", "hero": "H_ZaoJun", "instance": "@1", "camp": "1", "position": "0,0,2", "max_hp": "10000", "atk": "1000"},
            {"ms": "0", "kind": "PLAYER_LINEUP", "hero": "H_Ally", "instance": "@2", "camp": "1", "position": "0,0,1", "max_hp": "20000", "atk": "500"},
            {"ms": "0", "kind": "PLAYER_LINEUP", "hero": "H_Enemy", "instance": "@9", "camp": "2", "position": "0,0,-1", "max_hp": "30000", "atk": "500"},
            {"ms": "100", "kind": "BUFF_ADD", "id": "40133401", "src": "H_ZaoJun", "src_instance": "@1", "src_camp": "1", "dst": "H_Ally", "dst_instance": "@2", "dst_camp": "1", "skill": "skill4"},
            {"ms": "900", "kind": "ENERGY_CHANGE", "hero": "H_Ally", "instance": "@2", "camp": "1", "spent": "1000", "gained": "0", "actual": "-1000"},
            {"ms": "1000", "kind": "ENERGY_CHANGE", "hero": "H_ZaoJun", "instance": "@1", "camp": "1", "reason": "ultimate_clear", "spent": "1000", "gained": "0"},
            {"ms": "1000", "kind": "PLAYER_SKILL", "phase": "start", "hero": "H_ZaoJun", "instance": "@1", "camp": "1", "skill": "skill1", "state": "skill"},
            {"ms": "1200", "kind": "DAMAGE", "src": "H_ZaoJun", "src_instance": "@1", "src_camp": "1", "dst": "H_Enemy", "dst_instance": "@9", "dst_camp": "2", "active_skill": "skill1", "out": "5000"},
            {"ms": "1300", "kind": "HEAL", "src": "H_ZaoJun", "src_instance": "@1", "dst": "H_Ally", "dst_instance": "@2", "skill": "401364", "effective": "1200"},
            {"ms": "1400", "kind": "HEAL", "src": "H_Ally", "src_instance": "@2", "dst": "H_ZaoJun", "dst_instance": "@1", "skill": "ally_heal", "effective": "700"},
            {"ms": "1500", "kind": "PLAYER_SKILL", "phase": "end", "hero": "H_ZaoJun", "instance": "@1", "camp": "1", "skill": "skill1", "state": "idle"},
            {"ms": "2000", "kind": "FEATURE_ENTER", "hero": "H_ZaoJun", "instance": "@1", "camp": "1", "feature": "H_ZaoJun_skill1_Model", "method": "afterAttack", "killer": "H_ZaoJun", "killer_atk": "1000", "killer_max_hp": "10000", "victim": "H_Enemy", "victim_atk": "500", "victim_max_hp": "30000", "damage": "7000"},
            {"ms": "3000", "kind": "PLAYER_DEAD", "hero": "H_Ally", "instance": "@2", "camp": "1"},
        ]

    def test_explains_benefits_and_zaojun_bond(self):
        result = analyze(self.meta, self.rows)
        self.assertEqual(result["metrics"]["calculator_damage"], 5000)
        self.assertEqual(result["benefits"]["given"][0]["effective_healing"], 1200)
        self.assertEqual(result["benefits"]["received"][0]["effective_healing"], 700)
        self.assertEqual(result["benefits"]["allied_energy_spending"][0]["energy_spent"], 1000)
        bond = result["hero_adapter"]["bond_lifecycle"][0]
        self.assertEqual(bond["recipient_death_seconds"], 3.0)
        self.assertFalse(bond["replacement_observed"])
        formula = result["hero_adapter"]["food_offering_formula"]
        self.assertEqual(formula["status"], "captured_operands")
        self.assertEqual(formula["events"][0]["victim_max_hp"], 30000)

    def test_flags_cast_without_completion_or_hit(self):
        rows = self.rows + [
            {"ms": "5000", "kind": "ENERGY_CHANGE", "hero": "H_ZaoJun", "instance": "@1", "camp": "1", "reason": "ultimate_clear", "spent": "1000", "gained": "0"},
            {"ms": "5000", "kind": "PLAYER_SKILL", "phase": "start", "hero": "H_ZaoJun", "instance": "@1", "camp": "1", "skill": "skill2", "state": "skill"},
            {"ms": "5200", "kind": "BUFF_ADD", "id": "control", "src": "H_Enemy", "src_instance": "@9", "dst": "H_ZaoJun", "dst_instance": "@1", "buff_state": "type:Stun"},
            {"ms": "5500", "kind": "PLAYER_DEAD", "hero": "H_ZaoJun", "instance": "@1", "camp": "1"},
        ]
        result = analyze(self.meta, rows)
        text = " ".join(item["finding"] for item in result["findings"])
        self.assertIn("No completion callback", text)
        self.assertIn("no directly attributed hit", text)

    def test_missing_end_callback_does_not_imply_interruption_when_hits_exist(self):
        rows = [row for row in self.rows if not (
            row.get("kind") == "PLAYER_SKILL" and row.get("phase") == "end"
        )]
        result = analyze(self.meta, rows)
        finding = next(item for item in result["findings"] if "No completion callback" in item["finding"])
        self.assertIn("still produced 1 attributed hit", finding["reason"])
        self.assertIn("does not establish cancellation or interruption", finding["reason"])
        self.assertNotIn("incomplete cast", finding["reason"])

    def test_symbolic_runtime_alias_is_not_reported_as_second_instance(self):
        rows = self.rows + [
            {"ms": "50", "kind": "FEATURE_ENTER", "hero": "H_ZaoJun", "instance": "?", "camp": "1", "feature": "H_ZaoJun_skill0_Model", "method": "tick"},
        ]
        result = analyze(self.meta, rows)
        self.assertEqual(result["target_instances"], ["@1"])
        self.assertEqual(result["target_match_aliases"], ["H_ZaoJun"])
        self.assertFalse(any("Selected target resolved" in warning for warning in result["coverage_warnings"]))

    def test_ultimate_cycle_prefers_post_transfer_resource_snapshot(self):
        rows = self.rows + [
            {"ms": "1000", "kind": "TARGET_SELECTION", "hero": "H_ZaoJun", "instance": "@1", "camp": "1", "feature": "H_ZaoJun_skill3_Model", "targets": "@9"},
            {"ms": "1000", "kind": "FEATURE_EXIT", "hero": "H_ZaoJun", "instance": "@1", "camp": "1", "feature": "H_ZaoJun_skill3_Model", "self_state": "energyCount:204000,cachedEnergyCount:0,energyMaxCount:1228800"},
            {"ms": "1000", "kind": "FEATURE_EXIT", "hero": "H_ZaoJun", "instance": "@1", "camp": "1", "feature": "H_ZaoJun_skill3_Model", "self_state": "energyCount:0,cachedEnergyCount:204000,energyMaxCount:1228800"},
        ]
        result = analyze(self.meta, rows)
        cycle = result["hero_adapter"]["ultimate_cycles"][0]
        self.assertEqual(cycle["stored_at_start"], 0)
        self.assertEqual(cycle["committed_at_start"], 199.21875)

    def test_rebuild_and_compare_write_reports(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            folders = []
            for index, variant in enumerate(("single-target", "five-target"), 1):
                folder = root / variant
                folder.mkdir()
                meta = json.loads(json.dumps(self.meta))
                meta["experiment"]["variant"] = variant
                (folder / "capture_manifest.json").write_text(json.dumps(meta), encoding="utf-8")
                (folder / "events.jsonl").write_text("\n".join(json.dumps(row) for row in self.rows), encoding="utf-8")
                rebuild(folder)
                self.assertTrue((folder / "HERO_GUIDE.md").exists())
                folders.append(folder)
            output = root / "comparison"
            compare(folders, output)
            self.assertTrue((output / "COMPARISON.md").exists())


if __name__ == "__main__":
    unittest.main()
