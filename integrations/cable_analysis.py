from math import isfinite


def analyze(data):
    from integrations.cable_life import CableSpec, estimate_conductor_temp, estimate_remaining_life

    loads = data["loads"]
    rated = data["rated"]
    ambient = data["ambient"]
    if not isinstance(loads, list) or not 1 <= len(loads) <= 5000:
        raise ValueError("Podaj od 1 do 5000 próbek.")
    if any(type(v) not in (int, float) or not isfinite(v)
           for v in [rated, ambient, *loads]):
        raise ValueError("Podaj skończone wartości liczbowe.")
    if not 0 < rated <= 1e9 or not -50 <= ambient <= 60 or any(not 0 <= v <= 1e9 for v in loads):
        raise ValueError("Sprawdź moc i temperaturę otoczenia.")
    insulation = data["insulation"]
    if insulation not in ("pvc", "xlpe", "epr"):
        raise ValueError("Wybierz typ izolacji.")
    spec = CableSpec(rated_load_w=rated, ambient_temp_c=ambient, insulation_type=insulation)
    result = estimate_remaining_life(loads, 1 / 3600, spec)
    temperatures = estimate_conductor_temp(loads, spec)
    result["peak_conductor_temp_c"] = float(max(temperatures))
    result["rows"] = [
        {"hour": hour, "load_w": load, "temperature_c": float(temperature)}
        for hour, (load, temperature) in enumerate(zip(loads, temperatures), start=1)
    ]
    return result
