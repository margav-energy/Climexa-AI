# Climexa System Specifications

## System Configuration

### Default System Size
- **PV System**: 130 kW
- **Battery Capacity**: 1,320 kWh
- **Panel Efficiency**: 18% (0.18)
- **Default Battery Level**: 70% (924 kWh)

## Energy Calculations

### GTI to kWh Conversion

The system converts Global Tilted Irradiance (GTI) from Open Meteo API to kWh produced per hour using the following formula:

```
kWh = irradiance (W/m²) * panel_efficiency * system_size_kw / 1000
```

**Example Calculation:**
- GTI: 800 W/m²
- Panel Efficiency: 0.18 (18%)
- System Size: 130 kW

```
kWh = 800 * 0.18 * 130 / 1000
kWh = 18,720 / 1000
kWh = 18.72 kWh per hour
```

**Note:** For hourly calculations, kW output equals kWh produced in that hour (since power × 1 hour = energy).

### Battery Management

- **Battery Capacity**: 1,320 kWh
- **Minimum Battery Level**: 20% (264 kWh) - Irrigation paused below this
- **Maximum Battery Level**: 80% (1,056 kWh) - Full capacity for heavy usage
- **Default Starting Level**: 70% (924 kWh)

### System Loads

- **Irrigation Load**: 2 kW (when active)
- **Base Load**: 1 kW (when irrigation is off)

## Database Fields

### Farm Model
- `system_size_kw`: DecimalField (max 999,999.99 kW)
- `battery_capacity_kwh`: DecimalField (max 999,999.99 kWh)
- `panel_efficiency`: DecimalField (0.00 to 1.00)

### SystemStatus Model
- `pv_output_kw`: DecimalField (max 99,999.99 kW)
- `battery_kwh`: DecimalField (max 999,999.99 kWh)
- `battery_level`: DecimalField (0.00 to 100.00%)

## Migration Notes

When updating existing farms to the new specifications:

1. **Update System Size**: Change from 5kW to 130kW
2. **Update Battery Capacity**: Change from 20kWh to 1,320kWh
3. **Recalculate Battery kWh**: Update to 70% of new capacity (924 kWh)

### SQL Migration Example

```sql
UPDATE farms_farm 
SET system_size_kw = 130.0, 
    battery_capacity_kwh = 1320.0 
WHERE system_size_kw < 100;

UPDATE farms_systemstatus 
SET battery_kwh = (battery_level / 100.0) * 1320.0
WHERE battery_kwh < 100;
```

## Testing

To test with the new specifications, update existing farms:

```python
from farms.models import Farm, SystemStatus

# Update all farms
for farm in Farm.objects.all():
    farm.system_size_kw = 130.0
    farm.battery_capacity_kwh = 1320.0
    farm.save()
    
    # Update status
    status = SystemStatus.objects.filter(farm=farm).first()
    if status:
        status.battery_kwh = (float(status.battery_level) / 100.0) * 1320.0
        status.save()
```

