# -*- coding: utf-8 -*-
"""
Sancara — Time-To-Failure (TTF) estimator
============================================
The vision-doc signature metric. We do not have ground-truth escalation
timestamps in the data, so TTF is a TRANSPARENT, model-derived estimate (clearly
labelled as such in the UI), composed from quantities the models DO predict:

    escalation_pressure = 0.45·P(cascade) + 0.30·(impact/3) + 0.25·fragility
                          (peak-hour adds a multiplier)

A non-escalating event effectively resolves before failing; an escalating event
fails partway through its disruption window. So:

    TTF        ≈ predicted_resolution · (1 − escalation_pressure)   [clamped]
    decision_window ≈ 0.4 · TTF        (time before intervention loses effect)

Higher cascade probability, severity and structural fragility ⇒ shorter TTF ⇒
less time for authorities to act.
"""

import numpy as np

RISK_BANDS = [
    (0.66, 'Critical', '#E74C3C'),
    (0.40, 'High', '#E67E22'),
    (0.20, 'Medium', '#F1C40F'),
    (0.00, 'Low', '#2ECC71'),
]


def escalation_pressure(cascade_prob, impact_level, fragility=0.0, is_peak_hour=False):
    p = (0.45 * float(cascade_prob)
         + 0.30 * (float(impact_level) / 3.0)
         + 0.25 * float(np.clip(fragility, 0, 1)))
    if is_peak_hour:
        p = min(1.0, p * 1.15)
    return float(np.clip(p, 0, 1))


def risk_level(pressure):
    for thr, label, color in RISK_BANDS:
        if pressure >= thr:
            return label, color
    return 'Low', '#2ECC71'


def estimate_ttf(cascade_prob, impact_level, predicted_resolution_min,
                 fragility=0.0, is_peak_hour=False):
    """
    Returns a dict with the estimated time-to-failure, decision window, the
    escalation pressure that produced it and a risk band. Times in minutes.
    """
    pressure = escalation_pressure(cascade_prob, impact_level, fragility, is_peak_hour)
    base = float(max(predicted_resolution_min, 15.0))
    ttf = base * (1.0 - pressure)
    ttf = float(np.clip(ttf, 5.0, 240.0))
    decision_window = float(np.clip(ttf * 0.4, 2.0, ttf))
    label, color = risk_level(pressure)

    if pressure < 0.20:
        headline = "Low escalation risk — no imminent network failure expected."
    else:
        headline = (f"Estimated ~{ttf:.0f} min until escalation; act within the "
                    f"~{decision_window:.0f} min decision window.")
    return {
        'time_to_failure_min': round(ttf, 1),
        'decision_window_min': round(decision_window, 1),
        'escalation_pressure': round(pressure, 3),
        'risk_level': label,
        'risk_color': color,
        'headline': headline,
        'is_estimate': True,
    }
