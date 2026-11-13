"""Hourly PV and battery simulation with JSON-ready results."""
from dataclasses import asdict, dataclass
from math import isfinite


@dataclass(frozen=True)
class Battery:
    capacity_kwh: float
    power_kw: float
    efficiency: float = 0.95
    reserve_kwh: float = 0.0
    initial_kwh: float = 0.0


def simulate(profile, battery: Battery, export_limit_kw=None):
    """Each input row represents one hour; prices are currency per kWh."""
    values = asdict(battery)
    if any(not isfinite(x) or x < 0 for x in values.values()):
        raise ValueError("Invalid battery parameters")
    if not 0 < battery.efficiency <= 1 or max(battery.reserve_kwh, battery.initial_kwh) > battery.capacity_kwh:
        raise ValueError("Invalid efficiency, reserve or initial charge")
    if export_limit_kw is not None and (not isfinite(export_limit_kw) or export_limit_kw < 0):
        raise ValueError("Invalid export limit")

    rows = []
    soc = battery.initial_kwh
    for hour, sample in enumerate(profile):
        pv, load = sample["pv_kwh"], sample["load_kwh"]
        buy, sell = sample.get("buy_price", 0), sample.get("sell_price", 0)
        if not all(isfinite(x) for x in (pv, load, buy, sell)) or min(pv, load) < 0:
            raise ValueError(f"Invalid profile row {hour}")
        surplus, deficit = max(0, pv-load), max(0, load-pv)
        charge = min(surplus, battery.power_kw, (battery.capacity_kwh-soc)/battery.efficiency)
        discharge = min(deficit, battery.power_kw, max(0, soc-battery.reserve_kwh)*battery.efficiency)
        soc += charge*battery.efficiency-discharge/battery.efficiency
        soc = min(battery.capacity_kwh, max(0, soc))
        exported = surplus-charge
        if export_limit_kw is not None:
            exported = min(exported, export_limit_kw)
        imported = deficit-discharge
        rows.append(dict(hour=hour, pv_kwh=pv, load_kwh=load, charge_kwh=charge,
                         discharge_kwh=discharge, soc_kwh=soc, import_kwh=imported,
                         export_kwh=exported, curtailed_kwh=surplus-charge-exported,
                         cost=imported*buy-exported*sell))
    totals = {key: sum(row[key] for row in rows) for key in (
        "pv_kwh", "load_kwh", "charge_kwh", "discharge_kwh",
        "import_kwh", "export_kwh", "curtailed_kwh", "cost")}
    return {"rows": rows, "totals": totals, "battery": values,
            "export_limit_kw": export_limit_kw}
