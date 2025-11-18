# Climexa AI Simulation Guide

## Quick Start

### Accessing the Simulation

1. Log in to the Farmer Dashboard
2. Click the **"Simulation"** button in the header
3. Select a farm from the dropdown (if you have multiple farms)
4. Click **"Start Simulation"**

### Basic Controls

- **Start**: Begin the simulation
- **Pause**: Temporarily stop (can resume)
- **Reset**: Restart from beginning
- **Speed**: Adjust simulation speed (1x, 2x, 5x, 10x)

---

## Understanding the Simulation

### What Gets Simulated?

The simulation models a complete 48-hour cycle of your farm system:

1. **Solar Generation**: PV panels produce energy based on time of day
2. **Weather**: Temperature, clouds, and rain vary realistically
3. **Soil Moisture**: Decreases naturally, increases with rain/irrigation
4. **Battery**: Charges during day, discharges at night
5. **Irrigation**: Turns on/off based on soil moisture and conditions
6. **System Load**: Varies by time of day and irrigation status

### Time Progression

- Each "hour" in simulation = 1 hour of real farm time
- Update interval: Every 2 seconds (adjusted by speed)
- At 1x speed: 1 hour per 2 seconds
- At 10x speed: 1 hour per 0.2 seconds

---

## Reading the Dashboard

### Status Cards (Top Row)

#### Battery Card
- **Large Number**: Battery percentage (0-100%)
- **Progress Bar**: Visual indicator (green/yellow/red)
- **Small Text**: Current kWh / Total Capacity

**What to Watch:**
- Green (>50%): Healthy
- Yellow (20-50%): Warning
- Red (<20%): Critical

#### PV Generation Card
- **Large Number**: Current PV output in kW
- **Small Text**: GTI (solar irradiance) in W/m²

**What to Watch:**
- High during day (peak at noon)
- Zero at night
- Lower on cloudy days

#### Irrigation Card
- **Large Text**: ON (blue) or OFF (gray)
- **Reason**: Why irrigation is on/off
- **Badge**: Priority level (critical/normal/optional)

**What to Watch:**
- **Critical** (red): Soil moisture < 30% - urgent need
- **Normal** (yellow): Soil moisture 30-50% - needs attention
- **Optional** (gray): Soil moisture adequate - not needed

#### System Load Card
- **Large Number**: Total system load in kW
- **Breakdown**: Domestic load + Net power

**What to Watch:**
- Higher during day (domestic usage)
- Increases when irrigation is on
- Lower at night

### Weather & Conditions (Second Row)

#### Temperature
- Current air temperature in °C
- Warmer during day, cooler at night

#### Cloud Cover
- Percentage of sky covered by clouds
- Affects solar generation

#### Precipitation
- Rainfall in mm
- Automatically stops irrigation if > 0.5mm

#### Soil Moisture
- Current soil moisture percentage
- **Critical** (red): < 30%
- **Low** (yellow): 30-50%
- **Optimal** (green): > 50%

### Real-Time Graph

Shows system performance over the last 48 hours:

- **Green Line**: Battery percentage
- **Yellow Line**: PV output (kW)
- **Blue Line**: System load (kW)

**How to Use:**
- Hover over the graph to see values at specific hours
- Drag across to explore different time periods
- Bottom panel shows detailed info for selected hour

### Activity Timeline

Scrollable list of recent system activity:
- Hour number
- Timestamp
- PV output
- Battery level
- Irrigation status

---

## Simulation Scenarios

### Scenario 1: Sunny Day with Adequate Moisture

**What You'll See:**
- PV output peaks around noon (15-20 kW)
- Battery charges throughout the day
- Irrigation stays OFF (moisture adequate)
- System load is low (domestic only)

**Expected Behavior:**
- Battery reaches 80-100% by evening
- System load: 1.0-1.5 kW (domestic)
- Net power: Positive (charging)

### Scenario 2: Critical Irrigation Needed

**What You'll See:**
- Soil moisture drops below 30%
- Irrigation turns ON (red "critical" badge)
- System load increases (2.0 kW irrigation + domestic)
- Battery may discharge if PV < Load

**Expected Behavior:**
- Irrigation activates even if battery is low
- Domestic load reduced to prioritize irrigation
- Soil moisture increases over time
- System prioritizes crop health over energy

### Scenario 3: Rain Event

**What You'll See:**
- Precipitation increases (> 0.5mm)
- Irrigation automatically turns OFF
- Soil moisture increases naturally
- PV output may be lower (cloudy)

**Expected Behavior:**
- System recognizes rain and stops irrigation
- Soil moisture increases from rain
- Energy is conserved (no irrigation load)
- Battery charges if PV > domestic load

### Scenario 4: Night Operation

**What You'll See:**
- PV output drops to 0 kW (no sun)
- Battery discharges to power loads
- System load is lower (night domestic: 0.5 kW)
- Irrigation may continue if critical

**Expected Behavior:**
- Battery level decreases
- If irrigation is critical, battery discharges faster
- System load: 0.5-2.5 kW (depending on irrigation)

---

## Tips for Using the Simulation

### 1. Start Slow
- Begin at 1x speed to understand the system
- Watch how values change over time
- Observe the relationship between variables

### 2. Watch the Graph
- The graph shows trends over time
- Look for patterns in battery charging/discharging
- Notice how PV output follows the solar curve

### 3. Understand Priority Levels
- **Critical**: System prioritizes irrigation over energy
- **Normal**: System balances irrigation and energy
- **Optional**: System conserves energy

### 4. Monitor Soil Moisture
- This is the primary driver of irrigation
- Watch how it decreases naturally
- See how rain increases it

### 5. Experiment with Speed
- Use 1x for detailed observation
- Use 5x-10x to see long-term trends
- Pause to examine specific moments

---

## Common Questions

### Q: Why is irrigation ON when battery is low?

**A:** If soil moisture is critical (< 30%), the system prioritizes crop health over battery protection. This is intentional - crops are more important than energy storage.

### Q: Why does load vary throughout the day?

**A:** Domestic load varies by time of day:
- Night: Lower usage (0.5 kW)
- Morning/Evening: Higher usage (1.3-1.5 kW)
- Day: Moderate usage (1.0 kW)

### Q: Why is PV output zero at night?

**A:** Solar panels only generate electricity when there's sunlight. At night, there's no solar irradiance, so PV output is zero.

### Q: How does soil moisture change?

**A:** 
- **Decreases**: Naturally through evaporation and plant uptake (-0.5% per hour)
- **Increases**: With rain (+2% per mm) or irrigation
- **Temperature effect**: Decreases faster if temp > 25°C

### Q: What happens when battery reaches 0%?

**A:** The system protects the battery from over-discharge. However, if irrigation is critical, the system will prioritize it even with low battery.

### Q: Can I change the simulation parameters?

**A:** The simulation uses your farm's actual configuration (system size, battery capacity, etc.). To change parameters, update your farm settings in the database.

---

## Interpreting Results

### Healthy System Indicators

✅ **Battery**: Stays above 30% most of the time
✅ **Soil Moisture**: Maintains 50-70% range
✅ **PV Generation**: Peaks around noon
✅ **Irrigation**: Activates when needed, stops when adequate

### Warning Signs

⚠️ **Battery**: Frequently drops below 20%
⚠️ **Soil Moisture**: Consistently below 30%
⚠️ **PV Output**: Very low during day (cloudy weather)
⚠️ **Irrigation**: Always ON (may indicate sensor issue)

### Critical Alerts

🔴 **Battery**: Below 10% and still discharging
🔴 **Soil Moisture**: Below 20% for extended period
🔴 **Irrigation**: Critical priority for multiple hours

---

## Advanced Features

### Historical Analysis

The graph shows the last 48 hours of data. Use it to:
- Identify patterns in energy usage
- Understand irrigation cycles
- Plan for future energy needs

### Priority System

The system uses three priority levels:
1. **Critical**: Must irrigate (soil < 30%)
2. **Normal**: Should irrigate (soil 30-50%)
3. **Optional**: No need (soil > 70%)

### Load Prioritization

When irrigation is critical and battery is low:
- Domestic load is reduced by 50%
- Irrigation load is maintained
- System prioritizes crop health

---

## Troubleshooting

### Simulation Won't Start

1. **Check farm selection**: Make sure a farm is selected
2. **Check data loading**: Look for "Loading..." message
3. **Refresh page**: Reload the simulation view
4. **Check console**: Open browser DevTools (F12) for errors

### Values Not Updating

1. **Check speed**: Make sure speed is set correctly
2. **Check if paused**: Verify simulation is running
3. **Refresh**: Reload the page
4. **Check network**: Verify connection to backend

### Unexpected Behavior

1. **Check soil moisture**: This drives most decisions
2. **Check weather**: Rain affects irrigation
3. **Check battery**: Low battery may prevent non-critical irrigation
4. **Review priority**: Critical irrigation overrides battery protection

---

## Best Practices

1. **Start with 1x speed** to understand the system
2. **Watch the graph** to see trends over time
3. **Monitor soil moisture** - it's the key variable
4. **Understand priorities** - critical irrigation overrides battery
5. **Use pause** to examine specific moments
6. **Experiment with speed** to see long-term patterns

---

## Next Steps

After understanding the simulation:

1. **Review System Documentation**: See `SYSTEM_DOCUMENTATION.md` for technical details
2. **Check Real Farm Data**: Compare simulation with actual farm status
3. **Adjust Parameters**: Modify thresholds if needed
4. **Monitor Trends**: Use the graph to identify patterns

---

**Need Help?** Check the main documentation in `SYSTEM_DOCUMENTATION.md` or review the code comments in `backend/automation/services.py`.

