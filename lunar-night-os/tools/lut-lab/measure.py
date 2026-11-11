"""Grade fingerprint for reference footage (reference-video-to-lut skill, step 3).
Usage: measure.py OUT.json VIDEO:x0,y0,x1,y1:start[:mask=x0,y0,x1,y1;...] | IMAGE:x0,y0,x1,y1[:mask=...] ...
All crops are in source pixels. Frames are analysed at half resolution."""
import json
import subprocess
import sys

import numpy as np
from scipy import ndimage

M709 = np.array([0.2126, 0.7152, 0.0722])


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def rgb_to_lab(rgb):
    lin = srgb_to_lin(rgb)
    M = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = lin @ M.T
    xyz = xyz / np.array([0.95047, 1.0, 1.08883])
    e = 216 / 24389
    k = 24389 / 27
    f = np.where(xyz > e, np.cbrt(xyz), (k * xyz + 16) / 116)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return L, a, b


def rgb_to_hsv(rgb):
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    nz = d > 1e-6
    rc = np.where(nz, (mx - r) / np.maximum(d, 1e-6), 0)
    gc = np.where(nz, (mx - g) / np.maximum(d, 1e-6), 0)
    bc = np.where(nz, (mx - b) / np.maximum(d, 1e-6), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2 + rc - bc, 4 + gc - rc))
    h = (h / 6.0) % 1.0
    h = np.where(nz, h, 0)
    return h * 360, s, mx


def oklch(rgb):
    lin = srgb_to_lin(rgb)
    M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    lms = np.cbrt(np.maximum(lin @ M1.T, 0))
    lab = lms @ M2.T
    C = np.hypot(lab[..., 1], lab[..., 2])
    H = (np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) + 360) % 360
    return lab[..., 0], C, H


def parse_box(s):
    return [int(v) for v in s.split(',')]


def frames_from_video(path, box, start):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    w2, h2 = (w // 2) // 2 * 2, (h // 2) // 2 * 2
    vf = (f"scale=in_color_matrix=bt709:out_color_matrix=bt709:in_range=tv:out_range=pc,"
          f"crop={w}:{h}:{x0}:{y0},scale={w2}:{h2}:flags=area")
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', path, '-vf', vf,
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = w2 * h2 * 3
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h2, w2, 3).astype(np.float32) / 255.0
    p.wait()


def frame_from_image(path, box):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    w2, h2 = (w // 2) // 2 * 2, (h // 2) // 2 * 2
    vf = f"crop={w}:{h}:{x0}:{y0},scale={w2}:{h2}:flags=area"
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', vf, '-f', 'rawvideo',
                          '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(out, np.uint8).reshape(h2, w2, 3).astype(np.float32) / 255.0


def mask_for(shape, src_box, masks):
    m = np.ones(shape[:2], bool)
    x0, y0 = src_box[0], src_box[1]
    for mb in masks:
        a, b, c, d = mb
        m[max(0, (b - y0) // 2):max(0, (d - y0) // 2), max(0, (a - x0) // 2):max(0, (c - x0) // 2)] = False
    return m


def analyse(fr, m):
    Y = fr @ M709
    pix = fr[m]
    y = Y[m]
    res = {}
    for p in (1, 5, 25, 50, 75, 95, 99):
        res[f'p{p}'] = float(np.percentile(y, p))
    res['under3'] = float((y < 0.03).mean())
    res['over97'] = float((y > 0.97).mean())
    h, s, v = rgb_to_hsv(pix)
    res['sat_mean'] = float(s.mean())
    res['sat_p90'] = float(np.percentile(s, 90))
    hist = np.zeros(36)
    satm = np.zeros(36)
    cnt = np.zeros(36)
    bins = (h // 10).astype(int) % 36
    np.add.at(hist, bins, s)
    np.add.at(satm, bins, s)
    np.add.at(cnt, bins, 1)
    res['hue_hist'] = (hist / max(hist.sum(), 1e-9)).round(4).tolist()
    res['hue_sat'] = np.where(cnt > 50, satm / np.maximum(cnt, 1), 0).round(3).tolist()
    L, a, b = rgb_to_lab(pix)
    for name, lo, hi in (('shadow', 0.02, 0.18), ('mid', 0.30, 0.60), ('high', 0.75, 0.97)):
        z = (y >= lo) & (y < hi)
        res[f'{name}_frac'] = float(z.mean())
        res[f'{name}_a'] = float(a[z].mean()) if z.sum() > 100 else None
        res[f'{name}_b'] = float(b[z].mean()) if z.sum() > 100 else None
        if z.sum() > 100:
            hz, sz, _ = rgb_to_hsv(pix[z])
            ang = np.radians(hz)
            res[f'{name}_hue'] = float((np.degrees(np.arctan2((np.sin(ang) * sz).mean(), (np.cos(ang) * sz).mean())) + 360) % 360)
            res[f'{name}_sat'] = float(sz.mean())
    # practicals: bright, saturated pixels
    pr = (s > 0.55) & (v > 0.45)
    res['practical_frac'] = float(pr.mean())
    if pr.sum() > 30:
        ph = np.zeros(36)
        np.add.at(ph, bins[pr], 1)
        peaks = np.argsort(ph)[::-1][:5]
        res['practical_peaks'] = [(int(k * 10 + 5), round(float(ph[k] / pr.sum()), 3),
                                   round(float(s[pr][bins[pr] == k].mean()), 3)) for k in peaks if ph[k] > 0]
    # skin (YCrCb)
    Y8 = y * 255
    Cr = (pix[:, 0] * 255 - Y8) * 0.713 + 128
    Cb = (pix[:, 2] * 255 - Y8) * 0.564 + 128
    sk = (Cr > 135) & (Cr < 175) & (Cb > 85) & (Cb < 130) & (y > 0.08)
    res['skin_frac'] = float(sk.mean())
    if sk.sum() > 200:
        res['skin_hue'] = float(np.median(h[sk]))
        res['skin_sat'] = float(np.median(s[sk]))
        res['skin_luma'] = float(np.median(y[sk]))
    # OKLCh of shadows/sky
    Lk, Ck, Hk = oklch(pix)
    z = (y > 0.02) & (y < 0.18)
    if z.sum() > 100:
        ang = np.radians(Hk[z])
        res['shadow_oklch_h'] = float((np.degrees(np.arctan2((np.sin(ang) * Ck[z]).sum(), (np.cos(ang) * Ck[z]).sum())) + 360) % 360)
        res['shadow_oklch_c'] = float(np.median(Ck[z]))
    return res, Y


def grain_and_halo(fr, m, Y):
    out = {}
    blur = ndimage.gaussian_filter(Y, 1.5)
    hp = Y - blur
    gx = ndimage.sobel(blur, 0)
    gy = ndimage.sobel(blur, 1)
    flat = (np.hypot(gx, gy) < 0.01) & m & (Y > 0.05) & (Y < 0.6)
    out['grain_std'] = float(hp[flat].std()) if flat.sum() > 500 else None
    clip = (Y > 0.96) & m
    if clip.sum() > 10:
        d6 = ndimage.binary_dilation(clip, iterations=3)
        d2 = ndimage.binary_dilation(clip, iterations=1)
        ring = d6 & ~d2 & m
        if ring.sum() > 10:
            out['halo_rgb'] = fr[ring].mean(0).round(3).tolist()
    return out


def median_dicts(ds):
    keys = ds[0].keys()
    out = {}
    for k in keys:
        vals = [d[k] for d in ds if d.get(k) is not None]
        if not vals:
            out[k] = None
        elif isinstance(vals[0], list):
            if isinstance(vals[0][0], (list, tuple)):
                out[k] = vals[len(vals) // 2]
            else:
                out[k] = np.median(np.array(vals), 0).round(4).tolist()
        else:
            out[k] = float(np.median(vals))
    return out


def main():
    out_path = sys.argv[1]
    report = {}
    for spec in sys.argv[2:]:
        parts = spec.split(':')
        path = parts[0]
        box = parse_box(parts[1])
        masks = []
        start = None
        for extra in parts[2:]:
            if extra.startswith('mask='):
                masks = [parse_box(b) for b in extra[5:].split(';') if b]
            else:
                start = float(extra)
        stats = []
        extras = []
        if start is not None:
            for i, fr in enumerate(frames_from_video(path, box, start)):
                m = mask_for(fr.shape, box, masks)
                r, Y = analyse(fr, m)
                stats.append(r)
                if i % 10 == 0:
                    extras.append(grain_and_halo(fr, m, Y))
        else:
            fr = frame_from_image(path, box)
            m = mask_for(fr.shape, box, masks)
            r, Y = analyse(fr, m)
            stats.append(r)
            extras.append(grain_and_halo(fr, m, Y))
        med = median_dicts(stats)
        ex = median_dicts(extras) if extras else {}
        med.update(ex)
        med['frames'] = len(stats)
        report[path.split('/')[-1]] = med
    with open(out_path, 'w') as f:
        json.dump(report, f, indent=1)
    for name, r in report.items():
        print(f"\n== {name} ({r['frames']} frames)")
        print('  luma p1/p5/p25/p50/p75/p95/p99:', ' '.join(f"{r[f'p{p}']:.3f}" for p in (1, 5, 25, 50, 75, 95, 99)))
        print(f"  under3% {r['under3']:.2f}  over97% {r['over97']:.4f}  sat mean {r['sat_mean']:.2f} p90 {r['sat_p90']:.2f}")
        for z in ('shadow', 'mid', 'high'):
            if r.get(f'{z}_a') is not None:
                print(f"  {z:6s} frac {r[f'{z}_frac']:.2f}  Lab a {r[f'{z}_a']:+.1f} b {r[f'{z}_b']:+.1f}  hue {r.get(f'{z}_hue', 0):.0f} sat {r.get(f'{z}_sat', 0):.2f}")
        print('  shadow OKLCh h', r.get('shadow_oklch_h'), 'C', r.get('shadow_oklch_c'))
        print('  practicals', r.get('practical_frac'), r.get('practical_peaks'))
        print('  skin', r.get('skin_frac'), r.get('skin_hue'), r.get('skin_sat'), r.get('skin_luma'))
        print('  grain', r.get('grain_std'), ' halo ring rgb', r.get('halo_rgb'))
        hh = r['hue_hist']
        top = sorted(range(36), key=lambda k: -hh[k])[:6]
        print('  sat-weighted hue peaks:', [(k * 10 + 5, round(hh[k], 3), r['hue_sat'][k]) for k in top])


if __name__ == '__main__':
    main()
