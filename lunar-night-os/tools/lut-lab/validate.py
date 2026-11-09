"""Validate LunarNight v2 LUTs (skill step 5): lattice, patches, natural images, inverse test.
Usage: validate.py LUTDIR REFDIR OUTDIR"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy.spatial import cKDTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_lut as B  # noqa: E402

LUMA = np.array([0.2126, 0.7152, 0.0722])
MACBETH = {
    'dark skin': (115, 82, 68), 'light skin': (194, 150, 130), 'blue sky': (98, 122, 157),
    'foliage': (87, 108, 67), 'blue flower': (133, 128, 177), 'bluish green': (103, 189, 170),
    'orange': (214, 126, 44), 'purplish blue': (80, 91, 166), 'moderate red': (193, 90, 99),
    'purple': (94, 60, 108), 'yellow green': (157, 188, 64), 'orange yellow': (224, 163, 46),
    'blue': (56, 61, 150), 'green': (70, 148, 73), 'red': (175, 54, 60), 'yellow': (231, 199, 31),
    'magenta': (187, 86, 149), 'cyan': (8, 133, 161), 'white': (243, 243, 242),
    'neutral 8': (200, 200, 200), 'neutral 6.5': (160, 160, 160), 'neutral 5': (122, 122, 121),
    'neutral 3.5': (85, 85, 85), 'black': (52, 52, 52),
}


def apply_lut(img, t, n=33):
    x = np.clip(img, 0, 1) * (n - 1)
    i0 = np.floor(x).astype(int)
    i0 = np.clip(i0, 0, n - 2)
    f = x - i0
    r0, g0, b0 = i0[..., 0], i0[..., 1], i0[..., 2]
    fr, fg, fb = f[..., 0:1], f[..., 1:2], f[..., 2:3]
    out = 0
    for db in (0, 1):
        for dg in (0, 1):
            for dr in (0, 1):
                w = (fr if dr else 1 - fr) * (fg if dg else 1 - fg) * (fb if db else 1 - fb)
                out = out + w * t[b0 + db, g0 + dg, r0 + dr]
    return out


def hsv(rgb):
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    s = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return s, mx


def oklch(rgb):
    lab = B.lin_to_oklab(np.clip(rgb, 0, 1) ** 2.4)
    C = np.hypot(lab[..., 1], lab[..., 2])
    H = (np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) + 360) % 360
    return lab[..., 0], C, H


def lab_ab(rgb):
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = (lin @ M.T) / np.array([0.95047, 1.0, 1.08883])
    e, k = 216 / 24389, 24389 / 27
    f = np.where(xyz > e, np.cbrt(xyz), (k * xyz + 16) / 116)
    return 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])


def zones(img):
    Y = img @ LUMA
    a, b = lab_ab(img)
    out = {}
    for name, lo, hi in (('shadow', 0.02, 0.18), ('mid', 0.30, 0.60), ('high', 0.75, 0.97)):
        z = (Y >= lo) & (Y < hi)
        out[name] = (round(float(a[z].mean()), 1), round(float(b[z].mean()), 1)) if z.sum() > 200 else None
    return out


def to_img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def load(path, max_side=640):
    im = Image.open(path).convert('RGB')
    s = max_side / max(im.size)
    if s < 1:
        im = im.resize((int(im.size[0] * s), int(im.size[1] * s)), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255.0


def sheet(rows, path, label_h=0, row_h=None):
    if row_h:
        rows = [[np.asarray(to_img(r).resize((max(1, int(r.shape[1] * row_h / r.shape[0])), row_h), Image.LANCZOS)).astype(np.float32) / 255 for r in row] for row in rows]
    h = max(r.shape[0] for row in rows for r in row)
    canvas_rows = []
    for row in rows:
        ims = [np.pad(r, ((0, h - r.shape[0]), (0, 6), (0, 0)), constant_values=0.12) for r in row]
        canvas_rows.append(np.concatenate(ims, 1))
    w = max(r.shape[1] for r in canvas_rows)
    canvas_rows = [np.pad(r, ((0, 6), (0, w - r.shape[1]), (0, 0)), constant_values=0.12) for r in canvas_rows]
    to_img(np.concatenate(canvas_rows, 0)).save(path)


def main():
    lutdir, refdir, out = sys.argv[1:4]
    os.makedirs(out, exist_ok=True)
    names = ['Violet', 'Blue', 'Soft', 'Kitchen']
    tables = {n: np.load(os.path.join(lutdir, f'{n}.npy')) for n in names}
    report = {}
    # 1 lattice
    for n, t in tables.items():
        steps = []
        for ax in (0, 1, 2):
            d = np.abs(np.diff(t, axis=ax)).max(-1)
            steps.append(d.max())
        grey = np.array([t[i, i, i] for i in range(33)])
        gl = grey @ LUMA
        idx = np.unravel_index(np.argmax(np.abs(np.diff(t, axis=2)).max(-1)), (33, 33, 32))
        report[n] = {
            'nan': bool(np.isnan(t).any()),
            'grey_monotonic': bool(np.all(np.diff(gl) >= -1e-6)),
            'max_step': round(float(max(steps)), 4),
            'max_step_at_bgr': [int(v) for v in idx],
            'grey_ramp': {f'{i / 32:.3f}': [round(float(v), 3) for v in grey[i]] for i in (0, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 28, 32)},
        }
    # 2 patches
    pv = np.array(list(MACBETH.values()), np.float32) / 255
    for n, t in tables.items():
        o = apply_lut(pv, t)
        s, v = hsv(o)
        L, C, H = oklch(o)
        _, _, Hin = oklch(pv)
        report[n]['patches'] = {k: {'out': [round(float(x), 3) for x in o[i]], 'sat': round(float(s[i]), 3),
                                    'hue_in': round(float(Hin[i]), 1), 'hue_out': round(float(H[i]), 1)}
                                for i, k in enumerate(MACBETH)}
        report[n]['patch_sat_max'] = round(float(s.max()), 3)
        report[n]['white_out'] = [round(float(x), 3) for x in apply_lut(np.ones((1, 3), np.float32), t)[0]]
        report[n]['black_in_0.02'] = [round(float(x), 4) for x in apply_lut(np.full((1, 3), 0.02, np.float32), t)[0]]
    # 3 natural images
    from skimage import data
    nat = {'astronaut': data.astronaut(), 'coffee': data.coffee(), 'chelsea': data.chelsea(), 'rocket': data.rocket()}
    rows = []
    for k, im in nat.items():
        a = im.astype(np.float32) / 255
        s = 360 / max(a.shape[:2])
        a = np.asarray(to_img(a).resize((int(a.shape[1] * s), int(a.shape[0] * s)), Image.LANCZOS)).astype(np.float32) / 255
        row = [a]
        stats = {'before': {'sat_mean': round(float(hsv(a)[0].mean()), 3), 'zones': zones(a)}}
        for n in ('Violet', 'Blue', 'Kitchen'):
            o = apply_lut(a, tables[n])
            row.append(o)
            ss = hsv(o)[0]
            stats[n] = {'sat_mean': round(float(ss.mean()), 3), 'sat_p90': round(float(np.percentile(ss, 90)), 3), 'zones': zones(o)}
        report.setdefault('natural', {})[k] = stats
        rows.append(row)
    sheet(rows, os.path.join(out, 'natural_before_violet_blue_kitchen.png'), row_h=240)
    # 4 inverse test on reference frames
    n65 = 65
    v = np.linspace(0, 1, n65)
    bb, gg, rr = np.meshgrid(v, v, v, indexing='ij')
    grid = np.stack([rr, gg, bb], -1).reshape(-1, 3)
    inv_rows = []
    refs = [f for f in sorted(os.listdir(refdir)) if f.endswith('.png')]
    for look_name in ('Violet', 'Blue'):
        P = B.LOOKS[look_name]
        outs = B.look(grid.reshape(n65, n65, n65, 3), P).reshape(-1, 3)
        tree = cKDTree(outs)
        for f in refs:
            if (look_name == 'Blue') != f.startswith(('kiosk', 'moonhouse')):
                continue
            if f in ('reel_1.0.png', 'reel_3.8.png', 'greenhouse.png'):
                continue
            a = load(os.path.join(refdir, f), 420)
            d, ix = tree.query(a.reshape(-1, 3), k=1)
            ung = grid[ix].reshape(a.shape)
            reg = apply_lut(ung, tables[look_name])
            err = float(np.abs(reg - a).mean())
            report.setdefault('inverse', {})[f'{look_name}:{f}'] = {
                'regrade_mae': round(err, 4), 'ungraded_luma_p50': round(float(np.median(ung @ LUMA)), 3),
                'ungraded_zones': zones(ung), 'ref_zones': zones(a)}
            inv_rows.append([a, ung, reg])
    sheet(inv_rows, os.path.join(out, 'inverse_ref_ungraded_regraded.png'), row_h=420)
    with open(os.path.join(out, 'validation.json'), 'w') as fh:
        json.dump(report, fh, indent=1)
    # console summary
    for n in names:
        r = report[n]
        print(f"{n:8s} nan={r['nan']} grey_mono={r['grey_monotonic']} max_step={r['max_step']} at={r['max_step_at_bgr']} "
              f"white={r['white_out']} in0.02={r['black_in_0.02']} patch_sat_max={r['patch_sat_max']}")
        print('   grey:', {k: v for k, v in r['grey_ramp'].items() if k in ('0.031', '0.062', '0.125', '0.250', '0.500', '0.750', '1.000')})
        print('   patches:', {k: (v['sat'], v['hue_in'], v['hue_out']) for k, v in r['patches'].items() if k in ('blue sky', 'blue', 'green', 'orange', 'cyan', 'light skin', 'neutral 3.5', 'purple')})
    for k, v in report['natural'].items():
        print('natural', k, v)
    for k, v in report['inverse'].items():
        print('inverse', k, v)


if __name__ == '__main__':
    main()
