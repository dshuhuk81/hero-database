"""Offline regression tests: completeness, client language isolation, CN package discovery."""
import json
import subprocess
import sys
import tempfile
import unittest
import zlib
import io
import zipfile
from pathlib import Path

from unpack_config import config_zips

SCRIPTS = Path(__file__).resolve().parent


class HeroReleaseExportTests(unittest.TestCase):
    def test_fresh_adb_pull_with_files_subdirectory_exports(self):
        from Crypto.Cipher import AES
        from motto_crypt import KEY, IV
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            packages = root / 'snapshot/cn/files/data/packages'
            packages.mkdir(parents=True)
            archive = io.BytesIO()
            with zipfile.ZipFile(archive, 'w') as zf:
                zf.writestr('client/config/hero_detail.json', json.dumps({
                    '1001': {'id': 1001, 'name': '直接名字'}
                }))
            raw = archive.getvalue()
            padding = 16 - len(raw) % 16
            encrypted = AES.new(KEY, AES.MODE_CBC, IV).encrypt(raw + bytes([padding]) * padding)
            (packages / 'config.zip').write_bytes(encrypted)
            out = root / 'report.md'
            run = subprocess.run([sys.executable, '-I', str(SCRIPTS / 'export_hero_releases_cn.py'),
                                  str(root / 'snapshot/cn'), '--out', str(out)], capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertIn('直接名字', out.read_text(encoding='utf-8'))
            self.assertTrue((root / 'snapshot_plain/x_cn/client/config/hero_detail.json').exists())

    def test_cn_monolithic_deflate_package_is_not_dropped(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ('config.zip', 'deflate_config.zip', 'deflate_config_zh_cn.zip'):
                (root / name).touch()
            self.assertEqual([p.name for p in config_zips(root)],
                             ['config.zip', 'deflate_config.zip', 'deflate_config_zh_cn.zip'])

    def test_separate_clients_keep_undated_hidden_and_variant_entries(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cfg = root / 'client/config'
            cfg.mkdir(parents=True)
            heroes = {
                '1001': {'id': 1001, 'name': 'tid#HeroName_1001', 'is_visible': 0},
                '1002': {'id': 1002, 'name': 'tid#HeroName_1002', 'enable_time': '2099-07-10 00:00:00'},
                '1003': {'id': 1003, 'name': 'Untranslated|Name', 'enable_time': '2026-12-03 00:00:00'},
                '100101': {'id': 100101, 'name': 'Variant'},
                '__m': 1,
            }
            (cfg / 'hero_detail.json').write_text(json.dumps(heroes), encoding='utf-8')
            (cfg / 'hero_skin.json').write_text(json.dumps({
                '101': {'id': 101, 'hero': 1001, 'portrait': 'A_UI_Portrait_Hekate_Img'}
            }), encoding='utf-8')
            for lang, pairs in [('ZH_CN', [['HeroName_1001', '赫卡忒'], ['HeroName_1002', '美杜莎']]),
                                ('EN_US', [['HeroName_1001', 'Hecate'], ['HeroName_1002', 'Medusa']])]:
                folder = root / lang
                folder.mkdir()
                compressor = zlib.compressobj(wbits=-15)
                raw = json.dumps(pairs, ensure_ascii=False).encode()
                (folder / '0').write_bytes(compressor.compress(raw) + compressor.flush())
            for client, expected, foreign in [('cn', '赫卡忒', 'Hecate'), ('global', 'Hecate', '赫卡忒')]:
                out = root / (client + '.md')
                run = subprocess.run([sys.executable, '-I', str(SCRIPTS / ('export_hero_releases_' + client + '.py')),
                                      str(root), '--out', str(out), '--today', '2026-11-12'],
                                     capture_output=True, text=True)
                self.assertEqual(run.returncode, 0, run.stderr)
                report = out.read_text(encoding='utf-8')
                for value in [expected, 'tid#HeroName_1001', 'Hekate', '100101', 'ohne Datum',
                              '2099-07-10 00:00:00', 'Platzhalter', '2026-12-03 00:00:00', 'Untranslated\\|Name']:
                    self.assertIn(value, report)
                self.assertNotIn(f'| {foreign} |', report)


if __name__ == '__main__':
    unittest.main()
