"""LunarNight v2 LUT builder (Rec.709 in -> Rec.709 out, 33 point).
Model (reference-video-to-lut skill, adapted to a crushed night look):
 1 BT.1886 linearise, exposure offset
 2 tone: PCHIP curve in the encoded domain (crush <2.5% to black, paper white 0.94),
   65 % per-channel + 35 % ratio-preserving
 3 OKLab shaping: shadow split-tone pushes dark neutrals to the look hue; hue-vs-hue
   Gaussian rotations; chroma-vs-hue gains; chroma-vs-lightness
 4 gamut mapping by chroma bisection at constant L,h (never hard-clamp)
Usage: build_lut.py OUTDIR"""
import json
import os
import sys

import numpy as np
from scipy.interpolate import PchipInterpolator

LUMA = np.array([0.2126, 0.7152, 0.0722])
M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
               [0.2119034982, 0.6806995451, 0.1073969566],
               [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
               [1.9779984951, -2.4285922050, 0.4505937099],
               [0.0259040371, 0.7827717662, -0.8086757660]])
M1i = np.linalg.inv(M1)
M2i = np.linalg.inv(M2)


def lin_to_oklab(lin):
    lms = np.cbrt(np.maximum(lin, 0) @ M1.T)
    return lms @ M2.T


def oklab_to_lin(lab):
    lms = lab @ M2i.T
    return (lms ** 3) @ M1i.T


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def gauss_hue(h, center, width):
    d = (h - center + 180) % 360 - 180
    return np.exp(-0.5 * (d / width) ** 2)


LOOKS = {
    # Default: the green-house reel. Dark neutrals to violet, blues rotate toward purple.
    'Violet': dict(
        expo=0.0,
        curve=[(0.0, 0.0), (0.025, 0.0), (0.055, 0.012), (0.10, 0.042), (0.20, 0.13),
               (0.35, 0.275), (0.55, 0.47), (0.75, 0.67), (0.90, 0.84), (1.0, 0.94)],
        split_hue=300.0, split_chroma=0.085, split_lo=0.0, split_hi=0.42,
        rot=[(262.0, 14.0, 22.0), (300.0, 6.0, 18.0)],
        gains=[(140.0, 1.10, 28.0), (55.0, 1.09, 24.0), (30.0, 1.06, 18.0), (262.0, 1.12, 26.0),
               (200.0, 0.97, 20.0), (100.0, 0.98, 14.0)],
        global_c=1.0, high_c=0.80,
    ),
    # The small-town reel: same crush and white point, darks deep blue, purples pulled to blue.
    'Blue': dict(
        expo=0.0,
        curve=[(0.0, 0.0), (0.025, 0.0), (0.055, 0.012), (0.10, 0.042), (0.20, 0.13),
               (0.35, 0.275), (0.55, 0.47), (0.75, 0.67), (0.90, 0.84), (1.0, 0.94)],
        split_hue=262.0, split_chroma=0.08, split_lo=0.0, split_hi=0.42,
        rot=[(315.0, -16.0, 20.0), (230.0, 8.0, 20.0)],
        gains=[(140.0, 1.08, 28.0), (55.0, 1.09, 24.0), (30.0, 1.06, 18.0), (262.0, 1.12, 26.0)],
        global_c=1.0, high_c=0.80,
    ),
    # Food under LED/tube kitchen light: same crush and violet shadows, a gentler curve,
    # green/cyan cast pulled out of the mids, warm food hues protected and enriched.
    'Kitchen': dict(
        expo=0.0,
        curve=[(0.0, 0.0), (0.02, 0.0), (0.05, 0.014), (0.10, 0.05), (0.20, 0.15),
               (0.35, 0.30), (0.55, 0.51), (0.75, 0.71), (0.90, 0.86), (1.0, 0.95)],
        split_hue=295.0, split_chroma=0.06, split_lo=0.0, split_hi=0.30,
        rot=[(262.0, 10.0, 22.0), (115.0, 12.0, 18.0)],
        gains=[(55.0, 1.10, 22.0), (30.0, 1.08, 16.0), (140.0, 0.90, 26.0), (195.0, 0.85, 22.0),
               (262.0, 1.04, 24.0)],
        global_c=1.0, high_c=0.86, skin_protect=True,
    ),
}


def tone(rgb_enc, curve):
    xs, ys = zip(*curve)
    f = PchipInterpolator(np.array(xs), np.array(ys), extrapolate=True)
    per = np.clip(f(np.clip(rgb_enc, 0, 1)), 0, 1)
    lin = rgb_enc ** 2.4
    Y = lin @ LUMA
    Ye = np.clip(Y, 0, 1) ** (1 / 2.4)
    Yo = np.clip(f(Ye), 0, 1) ** 2.4
    ratio = np.where(Y[..., None] > 1e-9, lin / np.maximum(Y[..., None], 1e-9), 0) * Yo[..., None]
    ratio_enc = np.clip(ratio, 0, 1) ** (1 / 2.4)
    return 0.65 * per + 0.35 * ratio_enc


def look(rgb_enc, P):
    rgb_enc = np.clip(rgb_enc, 0, 1)
    lin = (rgb_enc ** 2.4) * (2 ** P['expo'])
    enc = np.clip(lin, 0, 1) ** (1 / 2.4)
    enc = tone(enc, P['curve'])
    lin = enc ** 2.4
    lab = lin_to_oklab(lin)
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.hypot(a, b)
    h = (np.degrees(np.arctan2(b, a)) + 360) % 360
    # hue-vs-hue rotations (fade to zero for near-neutrals so greys stay put)
    neutral_fade = smoothstep(0.012, 0.05, C)
    dh = np.zeros_like(h)
    for center, shift, width in P['rot']:
        dh += shift * gauss_hue(h, center, width)
    if P.get('skin_protect'):
        dh *= 1 - 0.85 * gauss_hue(h, 55.0, 22.0)
    h = h + dh * neutral_fade
    # chroma gains by hue
    g = np.ones_like(C)
    for center, gain, width in P['gains']:
        g *= 1 + (gain - 1) * gauss_hue(h, center, width)
    C = C * g * P['global_c']
    # light cores whiter: reduce chroma toward the very top
    C = C * (1 - (1 - P['high_c']) * smoothstep(0.72, 0.97, L))
    knee, slope = P.get('knee', (0.15, 0.7))
    C = np.where(C > knee, knee + (C - knee) * slope, C)
    a = C * np.cos(np.radians(h))
    b = C * np.sin(np.radians(h))
    # shadow split-tone: push dark, low-chroma pixels toward the look hue
    w_dark = (1 - smoothstep(P['split_lo'] + 0.05, P['split_hi'], L)) * smoothstep(0.0, 0.06, L)
    w_neutral = 1 - smoothstep(0.03, 0.14, np.hypot(a, b))
    warm = gauss_hue(h, 50.0, 32.0) * smoothstep(0.02, 0.06, C)
    w = w_dark * (0.35 + 0.65 * w_neutral) * (1 - 0.85 * warm)
    ang = np.radians(P['split_hue'])
    a = a + P['split_chroma'] * w * np.cos(ang)
    b = b + P['split_chroma'] * w * np.sin(ang)
    out = gamut_map(np.stack([L, a, b], -1))
    return np.clip(out, 0, 1) ** (1 / 2.4)


def gamut_map(lab, lo=0.003, hi=0.997, steps=16):
    lin = oklab_to_lin(lab)
    # floor fades in with lightness: crushed darks may reach 0, mids/highs keep a 0.003 floor
    lo = lo * smoothstep(0.30, 0.50, lab[..., 0])[..., None] * np.ones_like(lin)
    bad = (lin < lo - 1e-7).any(-1) | (lin > hi).any(-1)
    if not bad.any():
        return lin
    L = lab[..., 0][bad]
    a = lab[..., 1][bad]
    b = lab[..., 2][bad]
    lob = lo[bad]
    s_lo = np.zeros_like(L)
    s_hi = np.ones_like(L)
    for _ in range(steps):
        mid = (s_lo + s_hi) / 2
        test = oklab_to_lin(np.stack([L, a * mid, b * mid], -1))
        ok = (test >= lob - 1e-7).all(-1) & (test <= hi).all(-1)
        s_lo = np.where(ok, mid, s_lo)
        s_hi = np.where(ok, s_hi, mid)
    fixed = oklab_to_lin(np.stack([L, a * s_lo, b * s_lo], -1))
    lin = lin.copy()
    lin[bad] = np.clip(fixed, lob, hi)
    return lin


def lattice(n=33):
    v = np.linspace(0, 1, n)
    bb, gg, rr = np.meshgrid(v, v, v, indexing='ij')
    return np.stack([rr, gg, bb], -1)  # [b][g][r] -> (r,g,b)


def write_cube(path, title, table, n=33, comments=()):
    with open(path, 'w', newline='\n') as f:
        for c in comments:
            f.write(f'# {c}\n')
        f.write(f'TITLE "{title}"\n')
        f.write(f'LUT_3D_SIZE {n}\n')
        f.write('DOMAIN_MIN 0.0 0.0 0.0\nDOMAIN_MAX 1.0 1.0 1.0\n')
        flat = table.reshape(-1, 3)
        for r, g, b in flat:
            f.write(f'{r:.6f} {g:.6f} {b:.6f}\n')


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    grid = lattice(33)
    tables = {}
    for name, P in LOOKS.items():
        tables[name] = look(grid, P)
    tables['Soft'] = 0.6 * tables['Violet'] + 0.4 * grid
    meta = {
        'Violet': 'LunarNight v2 Violet: crush <2.5% to black, dark neutrals violet, blues +14 deg toward purple, practicals +6-12% chroma, paper white 0.94',
        'Blue': 'LunarNight v2 Blue: same crush and white point, darks deep blue, purples pulled toward blue',
        'Soft': 'LunarNight v2 Soft: 60% Violet + 40% identity, for burning in with Blackmagic Camera (Record LUT to Clip)',
        'Kitchen': 'LunarNight v2 Kitchen: crushed blacks and violet shadows for food under LED/tube light; green-cyan cast pulled, warm food protected',
    }
    for name, t in tables.items():
        write_cube(os.path.join(out, f'LunarNight_v2_{name}.cube'), f'LunarNight v2 {name}', t, 33,
                   comments=[meta[name], 'Rec.709 in -> Rec.709 out. Shoot Rec.709, HDR off, ~3200K, 1.5-2 stops under.',
                             'Built from measured reference reels; 33-point; validated (lattice, patches, natural images, inverse).'])
        np.save(os.path.join(out, f'{name}.npy'), t.astype(np.float32))
    json.dump({k: {kk: (vv if not isinstance(vv, np.ndarray) else vv.tolist()) for kk, vv in v.items()} for k, v in LOOKS.items()},
              open(os.path.join(out, 'params.json'), 'w'), indent=1)
    print('wrote', sorted(os.listdir(out)))


if __name__ == '__main__':
    main()
