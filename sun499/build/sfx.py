"""Procedurally generated (royalty-free) sound design for the 499 short.

Every sound here is synthesised from noise and sine waves, so there are no
licensing issues. Each function returns a mono float32 numpy array at SR.
`build_bed(timeline)` lays them out on the master timeline.
"""
import numpy as np
from scipy.signal import lfilter

SR = 48000
rng = np.random.default_rng(499)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_ad(n, attack, decay_tau):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay_tau)


def lowpass(x, cutoff):
    """One-pole lowpass (cheap, fine for SFX)."""
    a = np.exp(-2 * np.pi * cutoff / SR)
    return lfilter([1 - a], [1, -a], x)


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def drone(dur):
    """Low sub-bass drone that slowly rises in level and pitch."""
    t = t_axis(dur)
    f0 = 41 + 6 * (t / dur) ** 2
    phase = 2 * np.pi * np.cumsum(f0) / SR
    x = 0.6 * np.sin(phase) + 0.25 * np.sin(2 * phase + 0.3) + 0.12 * np.sin(3.01 * phase)
    air = lowpass(rng.standard_normal(len(t)), 180) * 0.6
    lvl = 0.25 + 0.75 * (t / dur) ** 1.5
    fade = np.minimum(1, t / 1.0)
    return ((x + air) * lvl * fade).astype(np.float32)


def heartbeat():
    """Soft lub-dub thump."""
    def thump(f, dur, amp):
        t = t_axis(dur)
        f_sweep = f * (1 + 0.8 * np.exp(-t * 30))
        ph = 2 * np.pi * np.cumsum(f_sweep) / SR
        return amp * np.sin(ph) * env_ad(len(t), 0.004, 0.07)
    lub = thump(55, 0.35, 1.0)
    dub = thump(48, 0.35, 0.7)
    out = np.zeros(int(0.6 * SR))
    out[:len(lub)] += lub
    off = int(0.22 * SR)
    out[off:off + len(dub)] += dub
    return out.astype(np.float32)


def bass_hit():
    t = t_axis(2.5)
    f = 30 + 90 * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.tanh(2.2 * np.sin(ph)) * env_ad(len(t), 0.002, 0.7)
    click = highpass(rng.standard_normal(len(t)), 1500) * env_ad(len(t), 0.0005, 0.012) * 0.6
    return (body + click).astype(np.float32)


def glass_crack():
    """Bright noisy crack: a burst of short filtered ticks + resonant ring."""
    dur = 1.6
    n = int(dur * SR)
    out = np.zeros(n)
    times = np.sort(np.concatenate([[0.0], rng.uniform(0, 0.22, 26)]))
    for k, tt in enumerate(times):
        i = int(tt * SR)
        ln = int(0.03 * SR)
        tick = highpass(rng.standard_normal(ln), 2500) * env_ad(ln, 0.0003, 0.004)
        out[i:i + ln] += tick * (1.0 if k == 0 else rng.uniform(0.2, 0.7))
    t = t_axis(dur)
    ring = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * rng.uniform(.3, 1)
               for f in (3150, 4410, 5230, 6870, 8120))
    out += 0.08 * ring * env_ad(n, 0.001, 0.25)
    return (out / np.max(np.abs(out))).astype(np.float32)


def whoosh(dur=1.4):
    t = t_axis(dur)
    noise = rng.standard_normal(len(t))
    # sweep: blend low/high passed noise over time
    lo = lowpass(noise, 400)
    hi = highpass(lowpass(noise, 4000), 900)
    mix = np.clip(t / dur, 0, 1)
    x = lo * (1 - mix) + hi * mix * 0.7
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return (x * shape / 3).astype(np.float32)


def wind(dur):
    """Cold wind: band-limited noise with slow amplitude + brightness wobble,
    plus sparse low ice creaks."""
    n = int(dur * SR)
    t = t_axis(dur)
    noise = rng.standard_normal(n)
    w1 = lowpass(noise, 700)
    w2 = highpass(lowpass(noise, 2500), 600)
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * 0.13 * t + 1) * np.sin(2 * np.pi * 0.31 * t)
    x = (w1 * 0.8 + w2 * 0.35 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.21 * t))) * mod
    # ice creaks: short, slowly pitch-bending low resonances
    for tc in rng.uniform(1.5, dur - 1.5, 4):
        ln = int(0.9 * SR)
        i = int(tc * SR)
        tt = np.arange(ln) / SR
        f = 110 + 60 * tt + 25 * np.sin(2 * np.pi * 7 * tt)
        crk = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * env_ad(ln, 0.05, 0.25)
        crk = lowpass(crk, 900)
        x[i:i + ln] += crk * 0.5
    fade = np.minimum(1, t / 1.5)
    return (x * fade).astype(np.float32)


def place(bus, clip, at, gain=1.0):
    i = int(round(at * SR))
    if i < 0:
        clip, i = clip[-i:], 0
    if i >= len(bus):
        return
    n = min(len(clip), len(bus) - i)
    bus[i:i + n] += gain * clip[:n]
