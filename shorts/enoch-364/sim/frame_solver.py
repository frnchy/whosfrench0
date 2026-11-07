"""Search a camera (relative to Earth's orbit frame) that puts the Sun upper-left, Earth lower-right, Earth day side visible.
Coordinates: dir = unit vector Sun→Earth, perp = dir rotated +90° in the orbit plane, y up. R = 9 (wide orbit radius)."""
import itertools, math
import numpy as np
R, ER, SR = 9.0, 0.8, 1.6
FOV, ASP = math.radians(45), 9 / 16

def project(cam, tgt, p):
    f = tgt - cam; f /= np.linalg.norm(f)
    if abs(f[1]) > 0.98: return 0, 0, -1   # looking straight up/down: skip
    r = np.cross(f, [0, 1, 0]); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    d = p - cam; z = d @ f
    th = math.tan(FOV / 2)
    return (d @ r) / (z * th * ASP), (d @ u) / (z * th), z

def score(cam, tgt, want_e, want_s, want_er):
    dirv, perp = np.array([1., 0, 0]), np.array([0., 0, 1])
    E, S = dirv * R, np.zeros(3)
    ex, ey, ez = project(cam, tgt, E); sx, sy, sz = project(cam, tgt, S)
    if ez <= 0 or sz <= 0 or np.linalg.norm(cam - E) < 1: return 1e9, None
    er = ER / (ez * math.tan(FOV / 2) * ASP)                 # Earth radius as a fraction of half-width
    phase = math.degrees(math.acos(np.clip(np.dot((cam - E) / np.linalg.norm(cam - E), (S - E) / R), -1, 1)))
    pen = (ex - want_e[0])**2 + (ey - want_e[1])**2 + (sx - want_s[0])**2 + (sy - want_s[1])**2 + 4 * (er - want_er)**2
    pen += ((phase - 100) / 15) ** 2   # ~41% of the disc lit
    if max(abs(ex) + er, abs(sx)) > 0.95 or abs(ey) + er * ASP > 0.9 or abs(sy) > 0.85: pen += 10
    return pen, dict(earth=(round(ex,2), round(ey,2)), sun=(round(sx,2), round(sy,2)), er=round(er,3), phase=round(phase))

def solve(want_e, want_s, want_er):
    best = (1e9, None, None)
    for a, b, h, ta, tb, th in itertools.product(np.linspace(9.5, 17, 16), np.linspace(-1, 5, 13), np.linspace(-6, 6, 13),
                                                np.linspace(3, 9, 13), np.linspace(-1, 1, 5), np.linspace(-2, 2, 9)):
        cam = np.array([a, h, b]); tgt = np.array([ta, th, tb])
        s, info = score(cam, tgt, want_e, want_s, want_er)
        if s < best[0]: best = (s, (a, b, h, ta, tb, th), info)
    return best

for name, we, ws, wr in [("chase", (0.2, -0.5), (-0.3, 0.1), 0.2), ("sunShot", (0.3, -0.55), (-0.2, 0.15), 0.16), ("sunClose", (0.35, -0.6), (-0.15, 0.2), 0.13)]:
    s, p, info = solve(we, ws, wr)
    print(name, "dir,perp,y / target dir,perp,y =", [round(float(x), 2) for x in p], info, "err", round(s, 4))
