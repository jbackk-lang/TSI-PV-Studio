from math import isfinite


def analyze(rows):
    from integrations.timdr_pv_battery_coupling import TIMDRPVBatteryCoupling
    if not isinstance(rows, list) or not 2 <= len(rows) <= 5000:
        raise ValueError("Podaj od 2 do 5000 próbek.")
    times, currents, deficits = [], [], []
    for row in rows:
        t, current, deficit = (row[key] for key in ("day", "current_a", "pv_deficit"))
        if not all(type(x) in (int, float) and isfinite(x) for x in (t, current, deficit)):
            raise ValueError("Wartości muszą być skończonymi liczbami.")
        if not 0 <= deficit <= 1 or (times and t <= times[-1]):
            raise ValueError("Czas musi rosnąć, a niedobór PV musi należeć do zakresu 0–1.")
        times.append(t)
        currents.append(current)
        deficits.append(deficit)
    model = TIMDRPVBatteryCoupling()
    current, resistance = model.joint_battery_resistance(times, currents, deficits)
    return [dict(day=t, current_a=float(i), resistance_ohm=float(r))
            for t, i, r in zip(times, current, resistance)]
